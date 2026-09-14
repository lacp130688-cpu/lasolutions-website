/* ============================================
   laSolutions - Panel de Administracion (admin.js)
   ES5: var, function, sin arrow functions.
   Strings de UI en espanol sin tildes.
   ============================================ */

var PRODUCTS_CACHE = [];   // cache de productos cargados
var PROMOS_CACHE = [];     // cache de promociones cargadas
var currentProductId = null; // null = modo crear
var currentPromoId = null;   // null = modo crear

// Cualquier error de JS se muestra en pantalla (no falla en silencio)
window.addEventListener('error', function (e) {
  var errEl = document.getElementById('login-error');
  var msg = 'Error interno: ' + (e.message || 'desconocido');
  if (errEl && errEl.textContent.indexOf(msg) === -1) {
    errEl.textContent = msg;
  }
});

/* ------------------------------------------------------------
   Init: sesion + verificacion de admin
   ------------------------------------------------------------ */
function initAdmin() {
  if (!window.supabase) {
    showLogin();
    setLoginError('No se pudo conectar con Supabase. Revisa tu conexion.');
    return;
  }

  supabase.auth.getSession().then(function (res) {
    if (res.error) {
      showLogin();
      setLoginError(res.error.message);
      return;
    }

    if (!res.data.session) {
      // Sin sesion: solo login
      showLogin();
      return;
    }

    // Hay sesion: verificar que el usuario sea admin
    supabase.rpc('is_admin').then(function (rpcRes) {
      if (rpcRes.error) {
        showDenied('Error verificando permisos: ' + rpcRes.error.message);
        return;
      }
      if (rpcRes.data === true) {
        showPanel();
      } else {
        showDenied('Acceso denegado: no sos administrador');
      }
    }).catch(function (err) {
      showDenied('Error verificando permisos: ' + (err && err.message ? err.message : err));
    });
  }).catch(function (err) {
    showLogin();
    setLoginError('Error obteniendo sesion: ' + (err && err.message ? err.message : err));
  });
}

function adminLogin() {
  try {
    if (!window.supabase) {
      setLoginError('No se pudo conectar con Supabase. Revisa tu conexion.');
      return;
    }

    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    setLoginError('');

    if (!email || !password) {
      setLoginError('Ingresa email y password.');
      return;
    }

    supabase.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) {
        setLoginError(res.error.message);
        return;
      }
      initAdmin();
    }).catch(function (err) {
      setLoginError('Error en el login: ' + (err && err.message ? err.message : err));
    });
  } catch (err) {
    setLoginError('Error en el login: ' + (err && err.message ? err.message : err));
  }
}

function adminLogout() {
  if (!window.supabase) {
    location.reload();
    return;
  }
  supabase.auth.signOut().then(function () {
    location.reload();
  });
}

/* ------------------------------------------------------------
   Vistas: login / panel / acceso denegado
   ------------------------------------------------------------ */
function showLogin() {
  document.getElementById('panel-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'flex';
}

function showPanel() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('panel-view').style.display = 'block';
  document.getElementById('btn-logout').style.display = 'inline-flex';
  showTab('products');
  loadProducts();
  loadPromotions();
  loadMessages();
}

function showDenied(msg) {
  showLogin();
  setLoginError(msg);
  document.getElementById('btn-logout').style.display = 'inline-flex';
}

function setLoginError(msg) {
  document.getElementById('login-error').textContent = msg || '';
}

function showAdminError(msg) {
  var el = document.getElementById('panel-error');
  el.textContent = msg || '';
  el.style.display = 'block';
}

function clearAdminError() {
  var el = document.getElementById('panel-error');
  el.textContent = '';
  el.style.display = 'none';
}

function showTab(tab) {
  var panels = {
    products: 'tab-products',
    promos: 'tab-promos',
    messages: 'tab-messages'
  };
  var names = ['products', 'promos', 'messages'];
  for (var i = 0; i < names.length; i++) {
    var panel = document.getElementById(panels[names[i]]);
    if (panel) {
      panel.style.display = (names[i] === tab) ? 'block' : 'none';
    }
  }
  var buttons = document.querySelectorAll('.admin-tab');
  for (var j = 0; j < buttons.length; j++) {
    buttons[j].className = 'admin-tab' + (buttons[j].getAttribute('data-tab') === tab ? ' active' : '');
  }
}

/* ------------------------------------------------------------
   Productos
   ------------------------------------------------------------ */
// Timing de carga por seccion (diagnostico de lentitud del panel)
var LOAD_TIMES = { products: null, promos: null, messages: null };

function recordLoadTime(key, startedAt) {
  LOAD_TIMES[key] = Math.round(performance.now() - startedAt);
  renderLoadTimes();
}

function renderLoadTimes() {
  var el = document.getElementById('load-stats');
  if (!el) return;
  var parts = [];
  if (LOAD_TIMES.products !== null) parts.push('productos: ' + LOAD_TIMES.products + 'ms');
  if (LOAD_TIMES.promos !== null) parts.push('promos: ' + LOAD_TIMES.promos + 'ms');
  if (LOAD_TIMES.messages !== null) parts.push('mensajes: ' + LOAD_TIMES.messages + 'ms');
  el.textContent = parts.length ? 'Tiempo de carga - ' + parts.join(' | ') : '';
}

function loadProducts() {
  var t0 = performance.now();
  var tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Cargando productos...</td></tr>';

  supabase.from('products').select('*').order('id', { ascending: true }).then(function (res) {
    if (res.error) {
      recordLoadTime('products', t0);
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error cargando productos: ' + escapeHtml(res.error.message) + '</td></tr>';
      return;
    }
    recordLoadTime('products', t0);
    PRODUCTS_CACHE = res.data || [];
    renderProductsTable();
  }).catch(function (err) {
    recordLoadTime('products', t0);
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error cargando productos: ' + escapeHtml(err && err.message ? err.message : err) + '</td></tr>';
  });
}

function renderProductsTable() {
  var tbody = document.getElementById('products-tbody');

  if (PRODUCTS_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No hay productos cargados.</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < PRODUCTS_CACHE.length; i++) {
    var p = PRODUCTS_CACHE[i];
    html += '<tr>' +
      '<td>' + p.id + '</td>' +
      '<td>' + (p.image ? '<img class="thumb" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '">' : '') + '</td>' +
      '<td>' + escapeHtml(p.name) + '</td>' +
      '<td>' + escapeHtml(p.brand) + '</td>' +
      '<td>' + fmtPrice(p.price) + '</td>' +
      '<td>' + (p.featured ? 'Si' : 'No') + '</td>' +
      '<td>' + (p.active ? 'Si' : 'No') + '</td>' +
      '<td class="table-actions">' +
        '<button type="button" class="btn btn-sm btn-outline" onclick="editProduct(' + p.id + ')">Editar</button> ' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="deleteProduct(' + p.id + ')">Borrar</button>' +
      '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

function newProductForm() {
  currentProductId = null;
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-category').value = 'Escritorio';
  document.getElementById('product-brand').value = 'laSolutions';
  document.getElementById('product-price').value = '';
  document.getElementById('product-original-price').value = '';
  document.getElementById('product-description').value = '';
  document.getElementById('product-specs').value = '';
  document.getElementById('product-image-url').value = '';
  document.getElementById('product-image-file').value = '';
  document.getElementById('product-featured').checked = false;
  document.getElementById('product-active').checked = true;
  hideProductImagePreview();
  document.getElementById('product-form-title').textContent = 'Nuevo producto';
  document.getElementById('product-form').style.display = 'block';
}

function editProduct(id) {
  var p = findProductById(id);
  if (!p) {
    alert('Producto no encontrado en cache.');
    return;
  }

  currentProductId = id;
  document.getElementById('product-id').value = id;
  document.getElementById('product-name').value = p.name || '';
  document.getElementById('product-category').value = p.category || 'Escritorio';
  document.getElementById('product-brand').value = p.brand || '';
  document.getElementById('product-price').value = p.price;
  document.getElementById('product-original-price').value = (p.original_price !== null && p.original_price !== undefined && p.original_price !== '') ? p.original_price : '';
  document.getElementById('product-description').value = p.description || '';
  var specs = p.specs || [];
  document.getElementById('product-specs').value = Array.isArray(specs) ? JSON.stringify(specs) : String(specs);
  document.getElementById('product-image-url').value = p.image || '';
  document.getElementById('product-image-file').value = '';
  document.getElementById('product-featured').checked = !!p.featured;
  document.getElementById('product-active').checked = (p.active !== false);
  showProductImagePreview(p.image);
  document.getElementById('product-form-title').textContent = 'Editar producto #' + id;
  document.getElementById('product-form').style.display = 'block';
}

function saveProduct() {
  var name = document.getElementById('product-name').value.trim();
  var priceRaw = document.getElementById('product-price').value.trim();
  var price = parseFloat(priceRaw);

  if (!name) {
    alert('El nombre es obligatorio.');
    return;
  }
  if (priceRaw === '' || isNaN(price) || price < 0) {
    alert('Ingresa un precio valido (mayor o igual a 0).');
    return;
  }

  var originalPriceRaw = document.getElementById('product-original-price').value.trim();
  var originalPrice = originalPriceRaw === '' ? null : parseFloat(originalPriceRaw);
  if (originalPriceRaw !== '' && (isNaN(originalPrice) || originalPrice < 0)) {
    alert('El precio original debe ser un numero valido.');
    return;
  }

  var obj = {
    name: name,
    category: document.getElementById('product-category').value,
    brand: document.getElementById('product-brand').value.trim() || 'laSolutions',
    price: price,
    original_price: originalPrice,
    description: document.getElementById('product-description').value,
    specs: parseSpecs(document.getElementById('product-specs').value),
    featured: document.getElementById('product-featured').checked,
    active: document.getElementById('product-active').checked
  };

  var urlField = document.getElementById('product-image-url').value.trim();
  var fileInput = document.getElementById('product-image-file');

  if (fileInput.files && fileInput.files.length > 0) {
    uploadProductImage(fileInput.files[0], function (err, url) {
      if (err) {
        showAdminError('No se pudo subir la imagen: ' + err);
        return;
      }
      obj.image = url;
      persistProduct(obj);
    });
  } else {
    obj.image = urlField || 'assets/placeholder.svg';
    persistProduct(obj);
  }
}

function persistProduct(obj) {
  var action;
  if (currentProductId === null) {
    action = supabase.from('products').insert(obj);
  } else {
    action = supabase.from('products').update(obj).eq('id', currentProductId);
  }

  action.then(function (res) {
    if (res.error) {
      showAdminError('No se pudo guardar el producto: ' + res.error.message);
      return;
    }
    clearAdminError();
    hideProductForm();
    loadProducts();
  }).catch(function (err) {
    showAdminError('No se pudo guardar el producto: ' + (err && err.message ? err.message : err));
  });
}

function uploadProductImage(file, callback) {
  var MAX_SIZE = 2 * 1024 * 1024; // 2MB
  var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (allowed.indexOf(file.type) === -1) {
    callback('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.', null);
    return;
  }
  if (file.size > MAX_SIZE) {
    callback('El archivo supera los 2MB.', null);
    return;
  }

  var cleanName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '-').toLowerCase();
  var path = 'productos/' + Date.now() + '-' + cleanName;

  supabase.storage.from('product-images').upload(path, file).then(function (res) {
    if (res.error) {
      callback(res.error.message, null);
      return;
    }
    var url = window.SUPABASE_URL + '/storage/v1/object/public/product-images/' + path;
    callback(null, url);
  }).catch(function (err) {
    callback(err && err.message ? err.message : String(err), null);
  });
}

function deleteProduct(id) {
  var p = findProductById(id);
  var name = p ? p.name : '#' + id;
  if (!confirm('Borrar el producto "' + name + '"? Se eliminaran tambien sus promociones.')) {
    return;
  }

  supabase.from('products').delete().eq('id', id).then(function (res) {
    if (res.error) {
      showAdminError('No se pudo borrar el producto: ' + res.error.message);
      return;
    }
    clearAdminError();
    loadProducts();
    loadPromotions();
  }).catch(function (err) {
    showAdminError('No se pudo borrar el producto: ' + (err && err.message ? err.message : err));
  });
}

function parseSpecs(raw) {
  var text = (raw || '').trim();
  if (text === '') {
    return [];
  }
  try {
    var parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [text];
  } catch (e) {
    // Fallback amigable: separar por comas
    var items = text.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
    return items;
  }
}

function hideProductForm() {
  document.getElementById('product-form').style.display = 'none';
  document.getElementById('product-image-file').value = '';
}

function cancelProductForm() {
  hideProductForm();
}

function showProductImagePreview(url) {
  var img = document.getElementById('product-image-preview');
  if (!url) {
    img.src = '';
    img.style.display = 'none';
    return;
  }
  img.src = url;
  img.style.display = 'block';
}

function hideProductImagePreview() {
  var img = document.getElementById('product-image-preview');
  img.src = '';
  img.style.display = 'none';
}

function onProductImageUrlChange() {
  showProductImagePreview(document.getElementById('product-image-url').value.trim());
}

/* ------------------------------------------------------------
   Promociones
   ------------------------------------------------------------ */
function loadPromotions() {
  var t0 = performance.now();
  var tbody = document.getElementById('promos-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Cargando promociones...</td></tr>';

  supabase.from('promotions').select('*').order('product_id', { ascending: true }).then(function (res) {
    if (res.error) {
      recordLoadTime('promos', t0);
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error cargando promociones: ' + escapeHtml(res.error.message) + '</td></tr>';
      return;
    }
    recordLoadTime('promos', t0);
    PROMOS_CACHE = res.data || [];
    renderPromosTable();
    populatePromoProductSelect();
  }).catch(function (err) {
    recordLoadTime('promos', t0);
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error cargando promociones: ' + escapeHtml(err && err.message ? err.message : err) + '</td></tr>';
  });
}

function renderPromosTable() {
  var tbody = document.getElementById('promos-tbody');

  if (PROMOS_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No hay promociones cargadas.</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < PROMOS_CACHE.length; i++) {
    var pr = PROMOS_CACHE[i];
    var prod = findProductById(pr.product_id);
    var prodName = prod ? prod.name : 'Producto #' + pr.product_id;

    html += '<tr>' +
      '<td>' + pr.product_id + ' - ' + escapeHtml(prodName) + '</td>' +
      '<td>' + pr.discount + '%</td>' +
      '<td>' + fmtPrice(pr.sale_price) + '</td>' +
      '<td>' + escapeHtml(pr.label) + '</td>' +
      '<td>' + (pr.active ? 'Si' : 'No') + '</td>' +
      '<td class="table-actions">' +
        '<button type="button" class="btn btn-sm btn-outline" onclick="editPromotion(' + pr.id + ')">Editar</button> ' +
        '<button type="button" class="btn btn-sm btn-danger" onclick="deletePromotion(' + pr.id + ')">Borrar</button>' +
      '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

function populatePromoProductSelect(selectedProductId) {
  var select = document.getElementById('promo-product-id');
  var html = '';

  for (var i = 0; i < PRODUCTS_CACHE.length; i++) {
    var p = PRODUCTS_CACHE[i];
    var hasPromo = false;
    for (var j = 0; j < PROMOS_CACHE.length; j++) {
      if (PROMOS_CACHE[j].product_id === p.id) {
        hasPromo = true;
        break;
      }
    }
    var label = p.id + ' - ' + p.name + (hasPromo ? ' (tiene promo)' : '');
    var sel = (selectedProductId !== undefined && p.id === selectedProductId) ? ' selected' : '';
    html += '<option value="' + p.id + '"' + sel + '>' + escapeHtml(label) + '</option>';
  }

  select.innerHTML = html || '<option value="">Sin productos</option>';
}

function newPromoForm() {
  currentPromoId = null;
  document.getElementById('promo-id').value = '';
  populatePromoProductSelect();
  document.getElementById('promo-discount').value = '';
  document.getElementById('promo-sale-price').value = '';
  document.getElementById('promo-label').value = 'Oferta';
  document.getElementById('promo-active').checked = true;
  document.getElementById('promo-form-title').textContent = 'Nueva promocion';
  document.getElementById('promo-form').style.display = 'block';
}

function editPromotion(id) {
  var pr = null;
  for (var i = 0; i < PROMOS_CACHE.length; i++) {
    if (PROMOS_CACHE[i].id === id) {
      pr = PROMOS_CACHE[i];
      break;
    }
  }
  if (!pr) {
    alert('Promocion no encontrada en cache.');
    return;
  }

  currentPromoId = id;
  document.getElementById('promo-id').value = id;
  populatePromoProductSelect(pr.product_id);
  document.getElementById('promo-discount').value = pr.discount;
  document.getElementById('promo-sale-price').value = pr.sale_price;
  document.getElementById('promo-label').value = pr.label || '';
  document.getElementById('promo-active').checked = (pr.active !== false);
  document.getElementById('promo-form-title').textContent = 'Editar promocion #' + id;
  document.getElementById('promo-form').style.display = 'block';
}

function savePromotion() {
  var productId = parseInt(document.getElementById('promo-product-id').value, 10);
  var discount = parseInt(document.getElementById('promo-discount').value, 10);
  var salePriceRaw = document.getElementById('promo-sale-price').value.trim();
  var salePrice = parseFloat(salePriceRaw);

  if (!productId || isNaN(productId)) {
    alert('Selecciona un producto.');
    return;
  }
  if (isNaN(discount) || discount < 1 || discount > 99) {
    alert('El descuento debe ser un numero entre 1 y 99.');
    return;
  }
  if (salePriceRaw === '' || isNaN(salePrice) || salePrice < 0) {
    alert('Ingresa un precio de oferta valido.');
    return;
  }

  var obj = {
    product_id: productId,
    discount: discount,
    sale_price: salePrice,
    label: document.getElementById('promo-label').value.trim() || 'Oferta',
    active: document.getElementById('promo-active').checked
  };

  var action;
  if (currentPromoId === null) {
    action = supabase.from('promotions').insert(obj);
  } else {
    action = supabase.from('promotions').update(obj).eq('id', currentPromoId);
  }

  action.then(function (res) {
    if (res.error) {
      showAdminError('No se pudo guardar la promocion: ' + res.error.message);
      return;
    }
    clearAdminError();
    hidePromoForm();
    loadPromotions();
  }).catch(function (err) {
    showAdminError('No se pudo guardar la promocion: ' + (err && err.message ? err.message : err));
  });
}

function deletePromotion(id) {
  if (!confirm('Borrar esta promocion?')) {
    return;
  }

  supabase.from('promotions').delete().eq('id', id).then(function (res) {
    if (res.error) {
      showAdminError('No se pudo borrar la promocion: ' + res.error.message);
      return;
    }
    clearAdminError();
    loadPromotions();
  }).catch(function (err) {
    showAdminError('No se pudo borrar la promocion: ' + (err && err.message ? err.message : err));
  });
}

function hidePromoForm() {
  document.getElementById('promo-form').style.display = 'none';
}

function cancelPromoForm() {
  hidePromoForm();
}

/* ------------------------------------------------------------
   Mensajes de contacto (solo lectura)
   ------------------------------------------------------------ */
function loadMessages() {
  var t0 = performance.now();
  var tbody = document.getElementById('messages-tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Cargando mensajes...</td></tr>';

  supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).then(function (res) {
    if (res.error) {
      recordLoadTime('messages', t0);
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error cargando mensajes: ' + escapeHtml(res.error.message) + '</td></tr>';
      return;
    }
    recordLoadTime('messages', t0);

    var rows = res.data || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No hay mensajes de contacto.</td></tr>';
      return;
    }

    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var m = rows[i];
      html += '<tr>' +
        '<td>' + escapeHtml(m.name) + '</td>' +
        '<td>' + escapeHtml(m.email) + '</td>' +
        '<td>' + escapeHtml(m.subject) + '</td>' +
        '<td>' + escapeHtml(m.message) + '</td>' +
        '<td>' + escapeHtml(formatDate(m.created_at)) + '</td>' +
      '</tr>';
    }
    tbody.innerHTML = html;
  }).catch(function (err) {
    recordLoadTime('messages', t0);
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error cargando mensajes: ' + escapeHtml(err && err.message ? err.message : err) + '</td></tr>';
  });
}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function findProductById(id) {
  for (var i = 0; i < PRODUCTS_CACHE.length; i++) {
    if (PRODUCTS_CACHE[i].id === id) {
      return PRODUCTS_CACHE[i];
    }
  }
  return null;
}

function escapeHtml(str) {
  if (str === null || str === undefined) {
    return '';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtPrice(n) {
  var num = parseFloat(n);
  if (isNaN(num)) {
    return '';
  }
  var fixed = num.toFixed(2);
  var neg = fixed.charAt(0) === '-';
  if (neg) {
    fixed = fixed.substring(1);
  }
  var parts = fixed.split('.');
  var intPart = parts[0];
  var out = '';
  while (intPart.length > 3) {
    out = '.' + intPart.slice(-3) + out;
    intPart = intPart.slice(0, intPart.length - 3);
  }
  return (neg ? '-' : '') + '$' + intPart + out + ',' + parts[1];
}

function formatDate(iso) {
  if (!iso) {
    return '';
  }
  var d = new Date(iso);
  if (isNaN(d.getTime())) {
    return String(iso);
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function () {
  initAdmin();
});