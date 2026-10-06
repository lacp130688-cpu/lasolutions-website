import type { NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createServerSupabase } from './supabase-server';

export function extractBearerToken(request: NextRequest): string {
  const header = request.headers.get('authorization');
  return header && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export type FailedAuth = { ok: false; status: 401 | 403; error: string };
export type VerifiedUser = { ok: true; token: string; client: SupabaseClient; user: User };
export type AuthResult = VerifiedUser | FailedAuth;

export async function verifyUser(request: NextRequest): Promise<AuthResult> {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: 'No se recibio el token de sesion.' };
  }

  const client = createServerSupabase(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Sesion invalida o expirada.' };
  }

  return { ok: true, token, client, user: data.user };
}

export async function verifyOptionalUser(
  request: NextRequest
): Promise<{ user: User | null } | FailedAuth> {
  const token = extractBearerToken(request);
  if (!token) return { user: null };
  const result = await verifyUser(request);
  if (!result.ok) return result;
  return { user: result.user };
}

export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await verifyUser(request);
  if (!auth.ok) return auth;

  const { data: isAdmin } = await auth.client.rpc('is_admin');
  if (isAdmin !== true) {
    return { ok: false, status: 403, error: 'Acceso denegado: no sos administrador.' };
  }

  return auth;
}

export type AdminContextResult =
  | { status: 401 | 403; error: string }
  | { status: 200; isAdmin: true; client: ReturnType<typeof createServerSupabase> };

export async function getAdminContext(request: NextRequest): Promise<AdminContextResult> {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return { status: auth.status, error: auth.error };
  }
  return { status: 200, isAdmin: true, client: auth.client };
}