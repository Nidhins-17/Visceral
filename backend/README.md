# The Truth API

Express API for public articles, owner-only publishing, and consultation messages. The React frontend reads articles and submits contact messages through this API. The owner signs in with Supabase Auth to publish articles and manage the private consultation inbox.

## Setup

Requirements: Node.js 20 or newer and npm.

1. Run [`supabase/migrations/202611130001_initial_schema.sql`](./supabase/migrations/202611130001_initial_schema.sql), then [`supabase/migrations/202611130002_article_thumbnails.sql`](./supabase/migrations/202611130002_article_thumbnails.sql) in the Supabase SQL Editor. The second migration adds the article thumbnail field and public-read Storage bucket.
2. Copy `.env.example` to `.env` and set:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_SECRET_KEY`: a Supabase secret key (`sb_secret_...`), used only by this server.
   - `ADMIN_USER_ID`: the UUID of your Supabase Auth account.
   - `CORS_ORIGIN`: the frontend URL(s), comma-separated if needed.
   - `RESEND_API_KEY` and `CONTACT_FROM_EMAIL`: the Resend API key and a sender address on a domain verified in Resend. `CONTACT_TO_EMAIL` defaults to `ns7professional@gmail.com`.
3. In Supabase Auth, create your one owner account and disable public sign-ups. The API has no endpoint to register or create users.
4. Install and run:

```sh
npm install
npm run dev
```

The API listens on port 3001 by default. In production, set `PORT` from the hosting platform. Keep `.env` and the secret key out of source control and out of all `VITE_` frontend variables.

## Authentication and roles

Supabase Auth is used for admin authorization. It is included in Supabase's Free plan, which currently includes 50,000 monthly active users; this site needs only one owner account. [Supabase pricing](https://supabase.com/pricing)

Create the owner account in Supabase, turn off public sign-ups, and put its Auth user UUID in `ADMIN_USER_ID`. For admin actions, send its Supabase access token as `Authorization: Bearer <access_token>`. The backend checks the token with Supabase Auth and allows writes only when the verified user ID matches `ADMIN_USER_ID`. No public user table, registration API, or role-management UI is added.

The frontend signs the owner in with Supabase Auth using the project's publishable key, then sends the returned access token to this API for owner actions. The publishable key may be in the frontend; the Supabase secret key must remain in Render.

The API uses the Supabase secret key to access Postgres. Supabase secret keys have full access and bypass RLS, so they belong only in a trusted backend. The migration enables RLS and revokes `anon` and `authenticated` table privileges as defense in depth; all client access goes through this API. [Supabase key security](https://supabase.com/docs/guides/database/secure-data), [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)

## API

IDs are UUIDs and timestamps are UTC ISO values. Article bodies are plain text. Requests with a JSON body use `Content-Type: application/json`.

### Public articles

- `GET /truths?limit=20&offset=0` — returns `{ "items": [...], "pagination": { "limit", "offset", "total" } }`; page size is capped at 100.
- `GET /truths/:truthId` — returns the article detail. A non-premium body is public. A premium response has `content: null` and `locked: true` for readers; the verified owner can read the body.

The list contains summaries only. Premium articles include the teaser excerpt, not their full content.

### Owner articles

All routes below require the owner access token:

- `GET /admin/session` — returns `{ "isAdmin": true }` after verifying that the signed-in account is the configured owner.
- `POST /truths` — JSON `{ "title": "...", "content": "...", "isPremium": false, "excerpt": "optional preview" }`; returns `201`.
- `PUT /truths/:truthId` — same fields; `title` and `content` are required. If `isPremium` is omitted, its current value is kept. If `excerpt` is omitted, a preview is regenerated from the body.
- `DELETE /truths/:truthId` — returns `204`.

`isPremium` defaults to `false`. An excerpt is generated from the content when omitted. Articles publish immediately; draft and scheduled states are not modeled.

The owner editor uploads optional cover images through `POST /truths/thumbnail` as raw JPEG, PNG, or WebP bytes with the matching `Content-Type`. Uploads are limited to 5 MB, stored in Supabase Storage, and require the owner access token. The returned `thumbnailUrl` is included with article create/update requests; set it to `null` to clear a cover.

### Consultation contact

- `POST /contacts` — public JSON `{ "name": "...", "email": "...", "subject": "optional", "message": "..." }`; stores the message in Supabase and sends an email notification to the configured contact address. Limited to five submissions per IP per 15 minutes.
- `GET /contacts?status=new` — owner only; returns up to 200 messages, newest first. Status may be `new`, `in_progress`, or `closed`.
- `PATCH /contacts/:contactId` — owner only; JSON `{ "status": "in_progress" }` updates its status.

Messages are saved to Supabase before sending the notification. If email is unconfigured or the provider is temporarily unavailable, the API still returns success for the saved message and includes `emailSent: false`; retrieve the message through the protected inbox endpoint. Email replies go directly to the sender using the message's validated address as `reply_to`.

### Errors

Invalid input returns `400`, missing/invalid owner credentials return `401`, missing records return `404`, oversized JSON returns `413`, contact rate limits return `429`, and unexpected server/database failures return a generic `500` response.

## Database decisions

The schema is in the versioned SQL migration under `supabase/migrations/`.

| Table | Purpose and fields |
| --- | --- |
| `truths` | UUID primary key; required title and plain-text content; teaser excerpt; optional `thumbnail_url`; `is_premium` boolean; creation and update timestamps. |
| `consultation_messages` | UUID primary key; sender name/email; optional subject; message; `new` / `in_progress` / `closed` status; timestamps. |

The `truths` table has a descending publication-time index for the public feed. The contact inbox has a status/date index for filtering new and open consultations. RLS is enabled, and direct `anon`/`authenticated` table access is revoked. No separate application users table is needed: Supabase Auth owns the single admin identity. There is no slug because article routes use stable UUIDs. The `is_premium` flag hides content at the API boundary; it does not implement subscriptions, payments, or paid-user entitlements.

## Deploying

### Render backend

Create a Web Service for this repository with root directory `backend`, build command `npm ci`, and start command `npm start`. Add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ADMIN_USER_ID`, `CORS_ORIGIN`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and optionally `CONTACT_TO_EMAIL` as Render environment variables. Set `CONTACT_TO_EMAIL` to `ns7professional@gmail.com` (or leave it unset to use that default). Set `CORS_ORIGIN` to the exact Vercel site origin (and any preview origins you use). Render supplies `PORT`.

Create a Resend account, verify a domain you control, and use an address on that domain for `CONTACT_FROM_EMAIL`. The recipient can be your Gmail address. Keep the Resend key only in the backend environment, never in Vercel or a `VITE_` variable. The email is sent with Resend's HTTPS API; this also works on Render's free web services, which block outbound SMTP ports.

### Vercel frontend

Set `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. The contact form submits to `/contacts`; the owner sign-in and inbox use Supabase Auth and the protected API routes. Never use `SUPABASE_SECRET_KEY` in Vercel frontend variables.

Supabase Free projects can pause after a week of inactivity and do not include automatic database backups, so account for that in production expectations. [Supabase plan details](https://supabase.com/pricing)

## Security and limits

Helmet headers, strict field validation, request size limits, configured CORS, UUID route validation, and contact rate limiting provide a basic baseline. CORS is not authentication. The rate limiter uses in-memory state, which is suitable for one Render instance; multiple backend instances need a shared rate-limit store. Use HTTPS in production. Contact messages can contain personal information; provide a retention/deletion process before collecting them at scale.
Thank you
