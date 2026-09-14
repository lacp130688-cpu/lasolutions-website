import { createClient } from '@supabase/supabase-js';

// La anon key es publishable por diseno (protegida por RLS en el backend).
// El fallback permite que el build estatico y el dev funcionen sin .env.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lafdevrlrecenzsiqzvl.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_B1ihAc0-F9qcIHvq-cTRvg_SfspZCXZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);