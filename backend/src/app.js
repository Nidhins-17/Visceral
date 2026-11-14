import cors from 'cors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { sendContactNotification } from './email.js';

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 100_000;
const MAX_EXCERPT_LENGTH = 500;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
const THUMBNAIL_BUCKET = 'truth-thumbnails';
const THUMBNAIL_TYPES = {
  'image/jpeg': { extension: 'jpg', matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', matches: (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', matches: (bytes) => bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' },
};
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createApp({
  supabase,
  adminUserId = process.env.ADMIN_USER_ID,
  corsOrigin = process.env.CORS_ORIGIN,
  emailSender = sendContactNotification,
}) {
  if (!supabase) throw new Error('A Supabase client is required.');
  if (typeof adminUserId !== 'string' || !UUID_PATTERN.test(adminUserId)) {
    throw new Error('ADMIN_USER_ID must be set to the UUID of your Supabase Auth user.');
  }

  const app = express();
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  const allowedOrigins = (corsOrigin || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '512kb', strict: true }));

  const adminOnly = requireAdmin(supabase, adminUserId);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/admin/session', adminOnly, (_req, res) => res.json({ isAdmin: true }));

  app.get('/truths', async (req, res) => {
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = parseNonNegativeInteger(req.query.offset, 0);
    const end = offset + limit - 1;
    const { data, count, error } = await supabase
      .from('truths')
      .select('id, title, excerpt, thumbnail_url, is_premium, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, end);
    if (error) throw error;

    res.json({
      items: data.map(toPublicSummary),
      pagination: { limit, offset, total: count ?? 0 },
    });
  });

  app.get('/truths/:truthId', async (req, res) => {
    if (!UUID_PATTERN.test(req.params.truthId)) return res.status(400).json({ error: 'truthId must be a UUID.' });

    const { data, error } = await supabase
      .from('truths')
      .select('*')
      .eq('id', req.params.truthId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Truth not found.' });

    res.json(toPublicTruth(data, await isAdminRequest(req, supabase, adminUserId)));
  });

  app.post('/truths', adminOnly, async (req, res) => {
    const input = validateTruthInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    const { data, error } = await supabase
      .from('truths')
      .insert({
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        thumbnail_url: input.thumbnailUrl,
        is_premium: input.isPremium,
      })
      .select('*')
      .single();
    if (error) throw error;

    res.status(201).json({ truth: toPublicTruth(data, true) });
  });

  app.post('/truths/thumbnail', adminOnly, express.raw({ type: Object.keys(THUMBNAIL_TYPES), limit: MAX_THUMBNAIL_SIZE }), async (req, res) => {
    const contentType = (req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const imageType = THUMBNAIL_TYPES[contentType];
    if (!imageType) return res.status(415).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: 'Choose an image to upload.' });
    if (!imageType.matches(req.body)) return res.status(400).json({ error: 'The image contents do not match its file type.' });

    const objectPath = `${adminUserId}/${randomUUID()}.${imageType.extension}`;
    const { error } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .upload(objectPath, req.body, { contentType, cacheControl: '31536000', upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(objectPath);
    res.status(201).json({ thumbnailUrl: data.publicUrl });
  });

  app.put('/truths/:truthId', adminOnly, async (req, res) => {
    if (!UUID_PATTERN.test(req.params.truthId)) return res.status(400).json({ error: 'truthId must be a UUID.' });

    const { data: existing, error: readError } = await supabase
      .from('truths')
      .select('*')
      .eq('id', req.params.truthId)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing) return res.status(404).json({ error: 'Truth not found.' });

    const input = validateTruthInput(req.body, existing);
    if (input.error) return res.status(400).json({ error: input.error });

    const { data, error } = await supabase
      .from('truths')
      .update({
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        thumbnail_url: input.thumbnailUrl,
        is_premium: input.isPremium,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.truthId)
      .select('*')
      .single();
    if (error) throw error;

    res.json({ truth: toPublicTruth(data, true) });
  });

  app.delete('/truths/:truthId', adminOnly, async (req, res) => {
    if (!UUID_PATTERN.test(req.params.truthId)) return res.status(400).json({ error: 'truthId must be a UUID.' });

    const { data, error } = await supabase
      .from('truths')
      .delete()
      .eq('id', req.params.truthId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Truth not found.' });

    res.status(204).end();
  });

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many messages. Please try again later.' },
  });

  app.post('/contacts', contactLimiter, async (req, res) => {
    const input = validateContactInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });

    const { data, error } = await supabase
      .from('consultation_messages')
      .insert(input)
      .select('id')
      .single();
    if (error) throw error;

    let notification = { sent: false, status: 'failed' };
    try {
      notification = await emailSender(input);
    } catch (emailError) {
      console.error('Contact notification email failed:', emailError?.message || 'Unknown email error.');
    }

    res.status(201).json({
      received: true,
      id: data.id,
      emailSent: notification.sent === true,
      emailStatus: notification.status,
    });
  });

  app.get('/contacts', adminOnly, async (req, res) => {
    const status = req.query.status;
    if (status !== undefined && !['new', 'in_progress', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status must be new, in_progress, or closed.' });
    }

    let query = supabase
      .from('consultation_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(200);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ items: data.map(toContactMessage) });
  });

  app.patch('/contacts/:contactId', adminOnly, async (req, res) => {
    if (!UUID_PATTERN.test(req.params.contactId)) return res.status(400).json({ error: 'contactId must be a UUID.' });
    const { status } = req.body ?? {};
    if (!['new', 'in_progress', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'status must be new, in_progress, or closed.' });
    }

    const { data, error } = await supabase
      .from('consultation_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.contactId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contact message not found.' });

    res.json({ contact: toContactMessage(data) });
  });

  app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.', requestId: req.requestId });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'Request body must contain valid JSON.', requestId: req.requestId });
    }

    const failure = classifyApiError(error, req);
    const logEntry = {
      level: failure.status >= 500 ? 'error' : 'warn',
      event: 'api_request_failed',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: failure.status,
      errorCode: failure.code,
      upstreamCode: getUpstreamCode(error),
      errorName: error?.name || 'Error',
      message: sanitizeLogValue(error?.message || 'Unknown API error.'),
    };
    if (process.env.NODE_ENV !== 'production' && error?.details) {
      logEntry.details = sanitizeLogValue(error.details).slice(0, 1000);
    }
    console.error(JSON.stringify(logEntry));

    res.status(failure.status).json({
      error: failure.message,
      code: failure.code,
      requestId: req.requestId,
    });
  });

  return app;
}

function classifyApiError(error, req) {
  const combined = [error?.name, error?.message, error?.details, error?.cause?.message, error?.cause?.code]
    .filter(Boolean)
    .join(' ');

  if (/AuthRetryableFetchError|fetch failed|EACCES|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET/i.test(combined)) {
    return {
      status: 503,
      code: 'SUPABASE_UNAVAILABLE',
      message: 'The backend could not reach Supabase. Check outbound HTTPS access, SUPABASE_URL, and the Supabase project status.',
    };
  }

  if (error?.code === '42703' && /thumbnail_url/i.test(`${error.message || ''} ${error.details || ''}`)) {
    return {
      status: 503,
      code: 'THUMBNAIL_MIGRATION_REQUIRED',
      message: 'The article thumbnail database migration has not been applied. Run the thumbnail migration in Supabase.',
    };
  }

  if (/bucket.*not found|not found.*bucket/i.test(String(error?.message || '')) && req.path === '/truths/thumbnail') {
    return {
      status: 503,
      code: 'THUMBNAIL_BUCKET_MISSING',
      message: 'The Supabase thumbnail bucket is missing. Run the thumbnail migration in Supabase.',
    };
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error.' };
}

function getUpstreamCode(error) {
  if (error?.cause?.code) return error.cause.code;
  if (error?.code) return error.code;
  const text = `${error?.details || ''} ${error?.cause?.message || ''}`;
  return text.match(/\b(EACCES|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET)\b/i)?.[1] || null;
}

function sanitizeLogValue(value) {
  return String(value)
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, '[secret key redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[token redacted]');
}

function requireAdmin(supabase, adminUserId) {
  return async (req, res, next) => {
    try {
      if (!(await isAdminRequest(req, supabase, adminUserId))) {
        return res.status(401).json({ error: 'A signed-in admin account is required.' });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

async function isAdminRequest(req, supabase, adminUserId) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return false;

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error) {
    if (error.status === 401 || error.status === 403) return false;
    throw error;
  }
  return data.user?.id === adminUserId;
}

function validateTruthInput(body, existing = null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be a JSON object.' };
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return { error: `title is required and must be at most ${MAX_TITLE_LENGTH} characters.` };
  }
  if (!content || content.length > MAX_CONTENT_LENGTH) {
    return { error: `content is required and must be at most ${MAX_CONTENT_LENGTH} characters.` };
  }
  if (body.isPremium !== undefined && typeof body.isPremium !== 'boolean') {
    return { error: 'isPremium must be a boolean.' };
  }
  if (body.excerpt !== undefined && body.excerpt !== null && typeof body.excerpt !== 'string') {
    return { error: 'excerpt must be a string or null.' };
  }
  if (body.thumbnailUrl !== undefined && body.thumbnailUrl !== null && typeof body.thumbnailUrl !== 'string') {
    return { error: 'thumbnailUrl must be a URL string or null.' };
  }

  let thumbnailUrl = existing?.thumbnail_url ?? null;
  if (body.thumbnailUrl !== undefined) {
    const submittedUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
    if (!submittedUrl) {
      thumbnailUrl = null;
    } else {
      let parsedUrl;
      try {
        parsedUrl = new URL(submittedUrl);
      } catch {
        return { error: 'thumbnailUrl must be a valid HTTPS URL.' };
      }
      if (parsedUrl.protocol !== 'https:' || submittedUrl.length > 2048) {
        return { error: 'thumbnailUrl must be a valid HTTPS URL of at most 2048 characters.' };
      }
      thumbnailUrl = submittedUrl;
    }
  }

  let excerpt;
  if (typeof body.excerpt === 'string' && body.excerpt.trim()) {
    excerpt = body.excerpt.trim();
    if (excerpt.length > MAX_EXCERPT_LENGTH) {
      return { error: `excerpt must be at most ${MAX_EXCERPT_LENGTH} characters.` };
    }
  } else {
    excerpt = makeExcerpt(content);
  }

  return {
    title,
    content,
    excerpt,
    thumbnailUrl,
    isPremium: body.isPremium ?? Boolean(existing?.is_premium),
  };
}

function validateContactInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body must be a JSON object.' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || name.length > 120) return { error: 'name is required and must be at most 120 characters.' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'A valid email address is required.' };
  }
  if (subject.length > 200) return { error: 'subject must be at most 200 characters.' };
  if (!message || message.length > 10_000) {
    return { error: 'message is required and must be at most 10000 characters.' };
  }

  return { name, email, subject: subject || null, message };
}

function toPublicSummary(row) {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    thumbnailUrl: row.thumbnail_url ?? null,
    isPremium: row.is_premium,
    publishedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublicTruth(row, isAdmin) {
  const locked = row.is_premium && !isAdmin;
  return {
    ...toPublicSummary(row),
    content: locked ? null : row.content,
    locked,
  };
}

function toContactMessage(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function makeExcerpt(content) {
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  if (cleanContent.length <= MAX_EXCERPT_LENGTH) return cleanContent;
  return `${cleanContent.slice(0, MAX_EXCERPT_LENGTH - 1).trimEnd()}…`;
}

function parsePositiveInteger(value, fallback, maximum) {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function parseNonNegativeInteger(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
