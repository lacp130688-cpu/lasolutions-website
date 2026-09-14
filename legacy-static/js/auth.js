/* ============================================
   laSolutions - Auth Module
   Unified auth: local session first, Supabase
   as fallback (the admin panel keeps using
   Supabase Auth with is_admin).
   ============================================ */

// Get current session user (local first, then Supabase)
function getCurrentUser() {
  var local = (typeof localGetCurrentUser === 'function') ? localGetCurrentUser() : null;
  if (local) {
    return Promise.resolve({
      id: 'local-' + local.email,
      name: local.name,
      email: local.email
    });
  }
  if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== 'function') {
    return Promise.resolve(null);
  }
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

// Logout from local session and Supabase
function logout() {
  if (typeof localLogout === 'function') {
    localLogout();
  }
  localStorage.removeItem('lasolutions_session');
  if (!supabase || !supabase.auth || typeof supabase.auth.signOut !== 'function') {
    return Promise.resolve();
  }
  return supabase.auth.signOut().then(function () {
    localStorage.removeItem('lasolutions_session');
  }).catch(function () {
    localStorage.removeItem('lasolutions_session');
  });
}

// Listen to auth state changes (Supabase only; local changes are
// reflected by getCurrentUser on the next page load)
function onAuthChange(callback) {
  if (!supabase || !supabase.auth || typeof supabase.auth.onAuthStateChange !== 'function') {
    callback(null);
    return null;
  }
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