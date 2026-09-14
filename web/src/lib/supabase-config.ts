import { createClient } from '@supabase/supabase-js';

// La anon key es publishable por diseno (protegida por RLS en el backend).
// El fallback permite que el build estatico y el dev funcionen sin .env.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qyyyeiyjqwsfaqwazfgb.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable__FN3l2wMeRt4DgWB7LS7Fw_zhAcGDdv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);