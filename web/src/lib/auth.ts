/* ============================================
   laSolutions - Auth Module
   Unified auth: local session first, Supabase
   as fallback (admin panel keeps using Supabase).
   ============================================ */

import { supabase } from './supabase-config';
import { localGetCurrentUser, localLogout, onLocalAuthChange, LOCAL_SESSION_KEY } from './auth-local';

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

  // Local (demo) sessions live in localStorage and are not visible to
  // supabase-js. Recompute the current user whenever the local session
  // changes (same tab) or when another tab writes it (storage event).
  const refreshLocal = () => { getCurrentUser().then(callback); };
  const unsubLocal = onLocalAuthChange(refreshLocal);

  let unsubStorage: (() => void) | null = null;
  if (typeof window !== 'undefined') {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_SESSION_KEY || e.key === null) refreshLocal();
    };
    window.addEventListener('storage', onStorage);
    unsubStorage = () => window.removeEventListener('storage', onStorage);
  }

  return () => {
    subscription.unsubscribe();
    unsubLocal();
    if (unsubStorage) unsubStorage();
  };
}
