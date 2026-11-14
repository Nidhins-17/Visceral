-- Article thumbnails are public assets. Uploads are performed by the API only
-- after it verifies the configured Supabase Auth owner.

ALTER TABLE public.truths
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'truth-thumbnails',
  'truth-thumbnails',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
