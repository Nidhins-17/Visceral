import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient({ url = process.env.SUPABASE_URL, secretKey = process.env.SUPABASE_SECRET_KEY } = {}) {
  if (!url) throw new Error('SUPABASE_URL must be configured.');
  if (!secretKey) throw new Error('SUPABASE_SECRET_KEY must be configured.');

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
