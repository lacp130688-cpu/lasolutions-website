/* ============================================
   laSolutions - Auth Module
   Register, Login, Logout with localStorage
   ============================================ */

// Simple hash simulation (not real crypto, just obfuscation for demo)
function simpleHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  // Return hex-like string
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length.toString(36);
}

// Get all registered users from localStorage
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('lasolutions_users')) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('lasolutions_users', JSON.stringify(users));
}

// Get current session user
function getCurrentUser() {
  try {
    var user = JSON.parse(localStorage.getItem('lasolutions_session'));
    return user || null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem('lasolutions_session', JSON.stringify(user));
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

// ---------- Register ----------
function register(name, email, password) {
  var users = getUsers();
  email = email.toLowerCase().trim();

  // Check if user already exists
  var exists = users.find(function (u) { return u.email === email; });
  if (exists) {
    return { success: false, message: 'Este correo ya esta registrado.' };
  }

  // Validate
  if (!name || name.trim().length < 2) {
    return { success: false, message: 'El nombre debe tener al menos 2 caracteres.' };
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, message: 'El correo electronico no es valido.' };
  }

  if (!password || password.length < 6) {
    return { success: false, message: 'La contrasena debe tener al menos 6 caracteres.' };
  }

  // Create user
  var newUser = {
    id: Date.now(),
    name: name.trim(),
    email: email,
    password: simpleHash(password),
    phone: '',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Auto-login
  var sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email };
  setCurrentUser(sessionUser);

  return { success: true, message: 'Registro exitoso. Bienvenido, ' + newUser.name + '!', user: sessionUser };
}

// ---------- Login ----------
function login(email, password) {
  var users = getUsers();
  email = email.toLowerCase().trim();

  var user = users.find(function (u) { return u.email === email; });
  if (!user) {
    return { success: false, message: 'Correo electronico no encontrado.' };
  }

  if (user.password !== simpleHash(password)) {
    return { success: false, message: 'Contrasena incorrecta.' };
  }

  // Set session
  var sessionUser = { id: user.id, name: user.name, email: user.email };
  setCurrentUser(sessionUser);

  return { success: true, message: 'Inicio de sesion exitoso. Bienvenido, ' + user.name + '!', user: sessionUser };
}

// ---------- Logout ----------
function logout() {
  localStorage.removeItem('lasolutions_session');
}
