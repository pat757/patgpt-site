// Read from Vercel environment variables (see README).
// New Supabase projects show a "publishable" key; older ones call it the "anon" key. Either works.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);
