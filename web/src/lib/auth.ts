/* ============================================
   laSolutions - Auth Module
   Unified auth: local session first, Supabase
   as fallback (admin panel keeps using Supabase).
   ============================================ */

import { supabase } from './supabase-config';
import { localGetCurrentUser, localLogout } from './auth-local';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const local = await localGetCurrentUser();
  if (local) {
    return {
      id: 'local-' + local.email,
      name: local.name,
      email: local.email,
    };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const meta = session.user.user_metadata || {};
    const name = meta.name || meta.full_name || (meta.phone ? meta.phone : '');
    return { id: session.user.id, name, email: session.user.email || '' };
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

export async function logout(): Promise<void> {
  localLogout();
  localStorage.removeItem('lasolutions_session');
  try {
    await supabase.auth.signOut();
  } catch {
    // noop
  }
  localStorage.removeItem('lasolutions_session');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AuthChangeCallback = (user: AuthUser | null) => void;

export function onAuthChange(callback: AuthChangeCallback): (() => void) | null {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      const meta = session.user.user_metadata || {};
      const name = meta.name || meta.full_name || (meta.phone ? meta.phone : '');
      callback({ id: session.user.id, name, email: session.user.email || '' });
    } else {
      callback(null);
    }
  });
  return () => { subscription.unsubscribe(); };
}
