/* ============================================
   laSolutions - Local Auth Module
   Capa de autenticacion local DEMO (sin servidor
   de email); el almacenamiento en localStorage no
   es seguro contra XSS — usar Supabase Auth para
   produccion.

   100% in-browser auth: register, email
   verification (simulated), login. localStorage only.
   ============================================ */

export const LOCAL_USERS_KEY = 'lasolutions_local_users';
export const LOCAL_SESSION_KEY = 'lasolutions_local_session';
export const LOCAL_PENDING_KEY = 'lasolutions_local_pending';
export const LOCAL_CODE_TTL_MS = 10 * 60 * 1000;

/* ---------- Limits ---------- */
const MAX_NAME_LEN = 100;
const MAX_EMAIL_LEN = 254;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 128;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 min

/* ---------- storage helpers ---------- */

function _localRead(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _localWrite(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function _localRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

/* ---------- Legacy hash (djb2) — kept for migration only ---------- */
function _localHashLegacy(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return 'h' + h.toString(16);
}

/* ---------- PBKDF2 hash via Web Crypto API ---------- */

function _toBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function _fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function _localHashPBKDF2(
  email: string,
  password: string,
): Promise<{ salt: string; hash: string }> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = _toBase64(saltBytes.buffer);

  const passwordBytes = new TextEncoder().encode(password) as Uint8Array<ArrayBuffer>;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return { salt, hash: _toBase64(derivedBits) };
}

async function _verifyPBKDF2(
  email: string,
  password: string,
  stored: { salt: string; hash: string },
): Promise<boolean> {
  const saltBytes = _fromBase64(stored.salt);

  const passwordBytes = new TextEncoder().encode(password) as Uint8Array<ArrayBuffer>;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return _toBase64(derivedBits) === stored.hash;
}

/* ---------- Verification code: crypto-random 6 digits ---------- */

function _localNewCode(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  // Map each byte to a digit 0-9
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += (arr[i] % 10).toString();
  }
  return code;
}

function _localKey(email: string): string {
  return (email || '').toLowerCase().trim();
}

/* ---------- Input validation ---------- */

function _validateInputs(
  name: string,
  email: string,
  password: string,
): string | null {
  if (!name || !email || !password) {
    return 'Completa todos los campos.';
  }
  if (name.length > MAX_NAME_LEN) {
    return 'El nombre es demasiado largo (maximo ' + MAX_NAME_LEN + ' caracteres).';
  }
  if (email.length > MAX_EMAIL_LEN) {
    return 'El correo es demasiado largo.';
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return 'La contrasena debe tener al menos ' + MIN_PASSWORD_LEN + ' caracteres.';
  }
  if (password.length > MAX_PASSWORD_LEN) {
    return 'La contrasena es demasiada larga (maximo ' + MAX_PASSWORD_LEN + ' caracteres).';
  }
  return null;
}

/* ---------- Rate limit helpers ---------- */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

function _checkRateLimit(
  storageKey: string,
  maxAttempts: number,
  windowMs: number,
): { allowed: boolean; remainingMs: number } {
  const entry = _localRead(storageKey) as RateLimitEntry | null;
  if (!entry) return { allowed: true, remainingMs: 0 };

  const elapsed = Date.now() - entry.windowStart;
  if (elapsed > windowMs) {
    // Window expired — clear and allow
    _localRemove(storageKey);
    return { allowed: true, remainingMs: 0 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remainingMs: windowMs - elapsed };
  }

  return { allowed: true, remainingMs: 0 };
}

function _incrementRateLimit(storageKey: string, windowMs: number): void {
  const entry = _localRead(storageKey) as RateLimitEntry | null;
  if (!entry || Date.now() - entry.windowStart > windowMs) {
    _localWrite(storageKey, { count: 1, windowStart: Date.now() });
  } else {
    _localWrite(storageKey, { count: entry.count + 1, windowStart: entry.windowStart });
  }
}

function _clearRateLimit(storageKey: string): void {
  _localRemove(storageKey);
}

/* ---------- Public API ---------- */

export interface LocalRegisterResult {
  success: boolean;
  error?: string;
  code?: string;
}

export async function localRegister(
  name: string,
  email: string,
  password: string,
): Promise<LocalRegisterResult> {
  const validationError = _validateInputs(name, email, password);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const users = (_localRead(LOCAL_USERS_KEY) || {}) as Record<
    string,
    { name: string; email: string; passwordHash: string | { salt: string; hash: string }; createdAt: number; verified: boolean }
  >;
  const key = _localKey(email);

  if (users[key]) {
    return { success: false, error: 'Ese correo ya tiene una cuenta. Inicia sesion.' };
  }

  const code = _localNewCode();
  const passwordHash = await _localHashPBKDF2(key, password);

  // New code issued — reset any previous verify attempt counter
  _clearRateLimit('lasolutions_local_attempts_verify');

  const ok = _localWrite(LOCAL_PENDING_KEY, {
    name: name.trim(),
    email: key,
    passwordHash,
    code,
    expiresAt: Date.now() + LOCAL_CODE_TTL_MS,
  });
  if (!ok) {
    return { success: false, error: 'No se pudo guardar en el navegador.' };
  }
  return { success: true, code };
}

export interface LocalVerifyResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function localVerify(code: string): Promise<LocalVerifyResult> {
  // Rate limit on verify attempts
  const verifyLimit = _checkRateLimit(
    'lasolutions_local_attempts_verify',
    MAX_VERIFY_ATTEMPTS,
    LOCAL_CODE_TTL_MS,
  );
  if (!verifyLimit.allowed) {
    return {
      success: false,
      error: 'Demasiados intentos. Debes reenviar el codigo.',
    };
  }

  const pending = _localRead(LOCAL_PENDING_KEY) as {
    name: string;
    email: string;
    passwordHash: string | { salt: string; hash: string };
    code: string;
    expiresAt: number;
  } | null;

  if (!pending) {
    return { success: false, error: 'No hay registro pendiente de verificacion.' };
  }
  if (Date.now() > pending.expiresAt) {
    _localRemove(LOCAL_PENDING_KEY);
    _clearRateLimit('lasolutions_local_attempts_verify');
    return { success: false, error: 'El codigo expiro. Registrate de nuevo.' };
  }

  _incrementRateLimit('lasolutions_local_attempts_verify', LOCAL_CODE_TTL_MS);

  if (String(code).trim() !== pending.code) {
    return { success: false, error: 'Codigo incorrecto. Revisa los 6 digitos.' };
  }

  // Code is correct — clear verify rate limit
  _clearRateLimit('lasolutions_local_attempts_verify');

  const users = (_localRead(LOCAL_USERS_KEY) || {}) as Record<
    string,
    { name: string; email: string; passwordHash: string | { salt: string; hash: string }; createdAt: number; verified: boolean }
  >;

  users[pending.email] = {
    name: pending.name,
    email: pending.email,
    passwordHash: pending.passwordHash,
    createdAt: Date.now(),
    verified: true,
  };

  if (!_localWrite(LOCAL_USERS_KEY, users)) {
    return { success: false, error: 'No se pudo guardar la cuenta.' };
  }

  _localRemove(LOCAL_PENDING_KEY);
  _localWrite(LOCAL_SESSION_KEY, {
    name: pending.name,
    email: pending.email,
    isLocal: true,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return { success: true, message: 'Cuenta verificada. Sesion iniciada.' };
}

export interface LocalLoginResult {
  success: boolean;
  error?: string;
  message?: string;
  code?: string;
  pending?: boolean;
}

export async function localLogin(
  email: string,
  password: string,
): Promise<LocalLoginResult> {
  if (!email || !password) {
    return { success: false, error: 'Completa el correo y la contrasena.' };
  }
  if (password.length > MAX_PASSWORD_LEN) {
    return { success: false, error: 'La contrasena es demasiada larga.' };
  }

  // Rate limit on login attempts
  const loginLimit = _checkRateLimit(
    'lasolutions_local_attempts_login',
    MAX_LOGIN_ATTEMPTS,
    LOGIN_LOCKOUT_MS,
  );
  if (!loginLimit.allowed) {
    return {
      success: false,
      error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
    };
  }

  const key = _localKey(email);
  const users = (_localRead(LOCAL_USERS_KEY) || {}) as Record<
    string,
    { name: string; email: string; passwordHash: string | { salt: string; hash: string }; verified: boolean }
  >;
  const user = users[key];

  if (!user) {
    _incrementRateLimit('lasolutions_local_attempts_login', LOGIN_LOCKOUT_MS);
    return { success: false, error: 'No existe una cuenta local con ese correo.' };
  }

  // Verify password — handle both legacy (djb2 string) and new (PBKDF2 object)
  let passwordMatches = false;
  if (typeof user.passwordHash === 'string' && user.passwordHash.startsWith('h')) {
    // Legacy djb2 hash
    passwordMatches = user.passwordHash === _localHashLegacy(key + '::' + password);
  } else if (
    typeof user.passwordHash === 'object' &&
    user.passwordHash !== null &&
    'salt' in user.passwordHash &&
    'hash' in user.passwordHash
  ) {
    // New PBKDF2 hash
    passwordMatches = await _verifyPBKDF2(key, password, user.passwordHash);
  }

  if (!passwordMatches) {
    _incrementRateLimit('lasolutions_local_attempts_login', LOGIN_LOCKOUT_MS);
    return { success: false, error: 'Correo o contrasena incorrectos.' };
  }

  // Password correct — clear login rate limit
  _clearRateLimit('lasolutions_local_attempts_login');

  // Legacy migration: if password was djb2, re-hash with PBKDF2 and persist
  if (typeof user.passwordHash === 'string' && user.passwordHash.startsWith('h')) {
    const newHash = await _localHashPBKDF2(key, password);
    user.passwordHash = newHash;
    users[key] = user;
    _localWrite(LOCAL_USERS_KEY, users);
  }

  if (!user.verified) {
    const code = _localNewCode();

    // New code issued — reset any previous verify attempt counter
    _clearRateLimit('lasolutions_local_attempts_verify');

    _localWrite(LOCAL_PENDING_KEY, {
      name: user.name,
      email: key,
      passwordHash: user.passwordHash,
      code,
      expiresAt: Date.now() + LOCAL_CODE_TTL_MS,
    });
    return { success: false, error: 'La cuenta no esta verificada.', code, pending: true };
  }

  _localWrite(LOCAL_SESSION_KEY, {
    name: user.name,
    email: key,
    isLocal: true,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return { success: true, message: 'Sesion iniciada. Bienvenido, ' + user.name + '!' };
}

export function localLogout(): void {
  _localRemove(LOCAL_SESSION_KEY);
}

export interface LocalUser {
  name: string;
  email: string;
  isLocal: boolean;
}

export async function localGetCurrentUser(): Promise<LocalUser | null> {
  const session = _localRead(LOCAL_SESSION_KEY) as (LocalUser & { expiresAt?: number }) | null;
  if (!session) return null;

  // Check session expiration
  if (session.expiresAt && Date.now() > session.expiresAt) {
    _localRemove(LOCAL_SESSION_KEY);
    return null;
  }

  return session;
}
