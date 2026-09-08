/* ============================================
   laSolutions - Local Auth Module
   Register, email verification (simulated) and
   login 100% in-browser. No Supabase, no
   external services. Uses localStorage only.
   ============================================ */

var LOCAL_USERS_KEY = 'lasolutions_local_users';
var LOCAL_SESSION_KEY = 'lasolutions_local_session';
var LOCAL_PENDING_KEY = 'lasolutions_local_pending';
var LOCAL_CODE_TTL_MS = 10 * 60 * 1000;

/* ---------- storage helpers ---------- */

function _localRead(key) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function _localWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function _localRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

/* Deterministic non-crypto hash (djb2).
   This is NOT real security - it only avoids
   storing passwords in plain text on this device. */
function _localHash(text) {
  var h = 5381;
  var i;
  for (i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return 'h' + h.toString(16);
}

function _localNewCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function _localKey(email) {
  return (email || '').toLowerCase().trim();
}

function _localShowAlert(id, message, isError) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('show');
  // force reflow to restart the CSS animation
  void el.offsetWidth;
  el.classList.add('show');
}

function _localBoardValue(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ---------- public API ---------- */

// Toggle a local auth panel (used by login/register buttons)
function localTogglePanel(panelId) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var hidden = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = hidden ? 'block' : 'none';
}

// Register: creates a pending account and returns the
// simulated verification code (email delivery is mocked).
function localRegister(name, email, password) {
  var users = _localRead(LOCAL_USERS_KEY) || {};
  var key = _localKey(email);

  if (!name || !key || !password) {
    return { success: false, error: 'Completa todos los campos.' };
  }
  if (String(password).length < 6) {
    return { success: false, error: 'La contrasena debe tener al menos 6 caracteres.' };
  }
  if (users[key]) {
    return { success: false, error: 'Ese correo ya tiene una cuenta. Inicia sesion.' };
  }

  var code = _localNewCode();
  var ok = _localWrite(LOCAL_PENDING_KEY, {
    name: name.trim(),
    email: key,
    passwordHash: _localHash(key + '::' + password),
    code: code,
    expiresAt: Date.now() + LOCAL_CODE_TTL_MS
  });
  if (!ok) {
    return { success: false, error: 'No se pudo guardar en el navegador.' };
  }
  return { success: true, code: code };
}

// Verify the pending code and create the account.
function localVerify(code) {
  var pending = _localRead(LOCAL_PENDING_KEY);
  if (!pending) {
    return { success: false, error: 'No hay registro pendiente de verificacion.' };
  }
  if (Date.now() > pending.expiresAt) {
    _localRemove(LOCAL_PENDING_KEY);
    return { success: false, error: 'El codigo expiro. Registrate de nuevo.' };
  }
  if (String(code).trim() !== pending.code) {
    return { success: false, error: 'Codigo incorrecto. Revisa los 6 digitos.' };
  }

  var users = _localRead(LOCAL_USERS_KEY) || {};
  users[pending.email] = {
    name: pending.name,
    email: pending.email,
    passwordHash: pending.passwordHash,
    createdAt: Date.now(),
    verified: true
  };
  if (!_localWrite(LOCAL_USERS_KEY, users)) {
    return { success: false, error: 'No se pudo guardar la cuenta.' };
  }

  _localRemove(LOCAL_PENDING_KEY);
  _localWrite(LOCAL_SESSION_KEY, { name: pending.name, email: pending.email, isLocal: true });
  return { success: true, message: 'Cuenta verificada. Sesion local iniciada.' };
}

// Login with an existing local account. If the account is
// not verified yet, regenerates a code and flags pending.
function localLogin(email, password) {
  var key = _localKey(email);
  var users = _localRead(LOCAL_USERS_KEY) || {};
  var user = users[key];

  if (!user) {
    return { success: false, error: 'No existe una cuenta local con ese correo.' };
  }
  if (user.passwordHash !== _localHash(key + '::' + password)) {
    return { success: false, error: 'Correo o contrasena incorrectos.' };
  }
  if (!user.verified) {
    var code = _localNewCode();
    _localWrite(LOCAL_PENDING_KEY, {
      name: user.name,
      email: key,
      passwordHash: user.passwordHash,
      code: code,
      expiresAt: Date.now() + LOCAL_CODE_TTL_MS
    });
    return { success: false, error: 'La cuenta no esta verificada.', code: code, pending: true };
  }

  _localWrite(LOCAL_SESSION_KEY, { name: user.name, email: key, isLocal: true });
  return { success: true, message: 'Sesion local iniciada. Bienvenido, ' + user.name + '!' };
}

// Logout from the local session.
function localLogout() {
  _localRemove(LOCAL_SESSION_KEY);
}

// Current local session user (or null).
function localGetCurrentUser() {
  return _localRead(LOCAL_SESSION_KEY);
}

/* ---------- UI glue (login.html) ---------- */

function localLoginSubmit() {
  var email = _localBoardValue('local-email');
  var password = _localBoardValue('local-password');
  if (!email || !password) {
    _localShowAlert('local-login-error', 'Completa el correo y la contrasena.', true);
    return;
  }
  var result = localLogin(email, password);
  if (result.success) {
    _localShowAlert('local-login-error', result.message, false);
    setTimeout(function () { window.location.href = '../index.html'; }, 1000);
    return;
  }
  if (result.pending) {
    _localShowAlert('local-login-error', result.error, true);
    var box = document.getElementById('local-verify-box');
    if (box) box.style.display = 'block';
    var codeEl = document.getElementById('local-verify-code');
    if (codeEl) {
      codeEl.textContent = 'Simulacion de email: tu codigo de verificacion es ' + result.code;
      codeEl.classList.add('show');
    }
    return;
  }
  _localShowAlert('local-login-error', result.error, true);
}

function localVerifySubmit() {
  var code = _localBoardValue('local-code');
  if (!code) {
    _localShowAlert('local-login-error', 'Ingresa el codigo de 6 digitos.', true);
    return;
  }
  var result = localVerify(code);
  if (result.success) {
    _localShowAlert('local-login-error', result.message, false);
    setTimeout(function () { window.location.href = '../index.html'; }, 1000);
    return;
  }
  _localShowAlert('local-login-error', result.error, true);
}

/* ---------- UI glue (register.html) ---------- */

function localRegisterSubmit() {
  var name = _localBoardValue('local-reg-name');
  var email = _localBoardValue('local-reg-email');
  var password = _localBoardValue('local-reg-password');

  var result = localRegister(name, email, password);
  if (!result.success) {
    _localShowAlert('local-reg-error', result.error, true);
    return;
  }

  var step1 = document.getElementById('local-reg-step1');
  var step2 = document.getElementById('local-reg-step2');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';

  var codeEl = document.getElementById('local-reg-code');
  if (codeEl) {
    codeEl.textContent = 'Simulacion de email: tu codigo de verificacion es ' + result.code +
      '. En produccion llegaria por correo. Expiracion: 10 minutos.';
    codeEl.classList.add('show');
  }
}

function localVerifyFromRegister() {
  var code = _localBoardValue('local-reg-verify-code');
  if (!code) {
    _localShowAlert('local-reg-error', 'Ingresa el codigo de 6 digitos.', true);
    return;
  }
  var result = localVerify(code);
  if (result.success) {
    var step2 = document.getElementById('local-reg-step2');
    if (step2) step2.style.display = 'none';
    _localShowAlert('local-reg-error', result.message, false);
    setTimeout(function () { window.location.href = '../index.html'; }, 1500);
    return;
  }
  _localShowAlert('local-reg-error', result.error, true);
}