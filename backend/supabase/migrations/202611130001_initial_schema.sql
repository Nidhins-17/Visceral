-- Run this migration in the Supabase SQL Editor, or apply it with the Supabase CLI.
-- Public visitors use the Express API. Direct Data API access is reserved for the
-- server's secret key; never put that key in the frontend.

CREATE TABLE IF NOT EXISTS public.truths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 100000),
  excerpt TEXT NOT NULL CHECK (char_length(btrim(excerpt)) BETWEEN 1 AND 500),
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS truths_created_at_idx
  ON public.truths (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.consultation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (char_length(btrim(email)) BETWEEN 3 AND 254),
  subject TEXT CHECK (subject IS NULL OR char_length(btrim(subject)) <= 200),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 10000),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consultation_messages_status_created_idx
  ON public.consultation_messages (status, created_at DESC);

ALTER TABLE public.truths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.truths FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.consultation_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.truths TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consultation_messages TO service_role;
