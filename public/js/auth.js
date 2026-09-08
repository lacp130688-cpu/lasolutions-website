/* ============================================
   laSolutions - Auth Module
   Supabase Auth: Register, Login, Logout
   ============================================ */

// Get current session user (async)
function getCurrentUser() {
  return supabase.auth.getSession().then(function (result) {
    var session = result.data.session;
    if (!session) return null;
    var meta = session.user.user_metadata || {};
    var name = meta.name || meta.full_name || (meta.phone ? meta.phone : '');
    return {
      id: session.user.id,
      name: name,
      email: session.user.email
    };
  }).catch(function () {
    return null;
  });
}

// Check if user is logged in (async)
function isLoggedIn() {
  return getCurrentUser().then(function (user) {
    return user !== null;
  });
}

// Login with email and password
function login(email, password) {
  return supabase.auth.signInWithPassword({ email: email, password: password })
    .then(function (result) {
      if (result.error) {
        var msg = 'Correo electronico o contrasena incorrectos.';
        if (result.error.message && result.error.message.indexOf('network') !== -1) {
          msg = 'Error de conexion. Intenta de nuevo.';
        }
        return { success: false, message: msg };
      }
      var user = result.data.user;
      var meta = user.user_metadata || {};
      var name = meta.name || '';
      return { success: true, message: 'Inicio de sesion exitoso. Bienvenido, ' + name + '!' };
    })
    .catch(function (err) {
      var msg = 'Correo electronico o contrasena incorrectos.';
      if (err && err.message && err.message.indexOf('network') !== -1) {
        msg = 'Error de conexion. Intenta de nuevo.';
      }
      return { success: false, message: msg };
    });
}

// Register new user
function register(name, email, password, phone) {
  return supabase.auth.signUp({
    email: email,
    password: password,
    options: { data: { name: name, phone: phone || '' } }
  })
    .then(function (result) {
      if (result.error) {
        var msg = 'Error al registrar. Intenta de nuevo.';
        if (result.error.message && result.error.message.indexOf('already') !== -1) {
          msg = 'Este correo ya esta registrado.';
        }
        return { success: false, message: msg };
      }
      var userName = name || email;
      return { success: true, message: 'Registro exitoso. Bienvenido, ' + userName + '!' };
    })
    .catch(function (err) {
      var msg = 'Error al registrar. Intenta de nuevo.';
      if (err && err.message && err.message.indexOf('already') !== -1) {
        msg = 'Este correo ya esta registrado.';
      }
      return { success: false, message: msg };
    });
}

// Logout
function logout() {
  return supabase.auth.signOut().then(function () {
    localStorage.removeItem('lasolutions_session');
  }).catch(function () {
    localStorage.removeItem('lasolutions_session');
  });
}

// Listen to auth state changes
function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(function (_event, session) {
    if (session) {
      var meta = session.user.user_metadata || {};
      var name = meta.name || meta.full_name || (meta.phone ? meta.phone : '');
      callback({ id: session.user.id, name: name, email: session.user.email });
    } else {
      callback(null);
    }
  });
}

// Login with Google (OAuth via Supabase)
function loginWithGoogle() {
  if (!supabase || !supabase.auth || typeof supabase.auth.signInWithOAuth !== 'function') {
    alert('El login con Google no esta disponible ahora. Intenta de nuevo.');
    return;
  }
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  }).catch(function (err) {
    alert('No se pudo iniciar con Google: ' + (err && err.message ? err.message : 'error desconocido'));
  });
}
