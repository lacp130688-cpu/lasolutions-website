import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';

/**
 * Creates a Supabase client for server-side use.
 * When a user token is provided it is forwarded as the Authorization header so
 * auth.uid() resolves on the server and RLS (is_admin) gates admin operations.
 *
 * JWT verification and admin checks live in './api-auth'.
 */
export function createServerSupabase(token?: string) {
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    token ? { global: { headers: { Authorization: 'Bearer ' + token } } } : undefined
  );
}