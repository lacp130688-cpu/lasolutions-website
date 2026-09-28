import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';

/**
 * Creates a Supabase client for server-side use.
 * When a user token is provided it is forwarded as the Authorization header so
 * auth.uid() resolves on the server and RLS (is_admin) gates admin operations.
 */
export function createServerSupabase(token?: string) {
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    token ? { global: { headers: { Authorization: 'Bearer ' + token } } } : undefined
  );
}

export type AdminContextResult =
  | { status: 401 | 403; error: string }
  | { status: 200; isAdmin: true; client: ReturnType<typeof createServerSupabase> };

/**
 * Resolves the admin context for a request:
 * - valid session token required (401)
 * - is_admin() must return true (403)
 */
export async function getAdminContext(request: NextRequest): Promise<AdminContextResult> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return { status: 401, error: 'Sesion no encontrada.' };
  }

  const client = createServerSupabase(token);

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    return { status: 401, error: 'Sesion invalida o expirada.' };
  }

  const { data: isAdmin } = await client.rpc('is_admin');
  if (isAdmin !== true) {
    return { status: 403, error: 'Acceso denegado: no sos administrador.' };
  }

  return { status: 200, isAdmin: true, client };
}
