/* ============================================
   laSolutions - Admin Module
   Port of admin.js - uses DOM manipulation
   (called from useEffect in admin page component).
   ============================================ */

import { supabase } from './supabase-config';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const window: any;

/**
 * Calls an internal admin API endpoint forwarding the current Supabase session
 * token so the server can resolve auth.uid() and let RLS (is_admin) authorize.
 */
async function adminFetch(path: string, init?: RequestInit): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(path, { ...init, headers });
  return res.json().catch(() => ({ success: false }));
}

// Module-level caches (like the original globals)
let PRODUCTS_CACHE: any[] = [];
let PROMOS_CACHE: any[] = [];
let currentProductId: number | null = null;
let currentPromoId: number | null = null;
let LOAD_TIMES: Record<string, number | null> = { products: null, promos: null, messages: null };

/* ---------- Helpers ---------- */
function _escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _fmtPrice(n: any): string {
  const num = parseFloat(n);
  if (isNaN(num)) return '';
  const fixed = num.toFixed(2);
  const neg = fixed.charAt(0) === '-';
  const abs = neg ? fixed.substring(1) : fixed;
  const parts = abs.split('.');
  let intPart = parts[0];
  let out = '';
  while (intPart.length > 3) {
    out = '.' + intPart.slice(-3) + out;
    intPart = intPart.slice(0, intPart.length - 3);
  }
  return (neg ? '-' : '') + '$' + intPart + out + ',' + parts[1];
}

function _formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function _findProductById(id: number): any {
  for (let i = 0; i < PRODUCTS_CACHE.length; i++) {
    if (PRODUCTS_CACHE[i].id === id) return PRODUCTS_CACHE[i];
  }
  return null;
}

function _parseSpecs(raw: string): string[] {
  const text = (raw || '').trim();
  if (text === '') return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    return [text];
  } catch {
    return text.split(',').map(s => s.trim()).filter(s => s !== '');
  }
}

/* ---------- Image URL safety ---------- */

const _DANGEROUS_URL_RE = /^(javascript|data|vbscript|file):/i;

function _safeImageSrc(url: any): string {
  const str = String(url || '').trim();
  if (!str) return '';
  if (_DANGEROUS_URL_RE.test(str)) return 'assets/placeholder.svg';
  return str;
}

function _isValidImageUrl(url: string): boolean {
  if (!url) return true; // empty is allowed (placeholder)
  if (_DANGEROUS_URL_RE.test(url)) return false;
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|assets\/)/i.test(url)) return true;
  return false;
}

function _safeId(val: any): string | null {
  if (typeof val === 'number' && Number.isFinite(val)) return String(val);
  return null;
}

/* ---------- Recording ---------- */
function recordLoadTime(key: string, startedAt: number): void {
  LOAD_TIMES[key] = Math.round(performance.now() - startedAt);
  renderLoadTimes();
}

function renderLoadTimes(): void {
  const el = document.getElementById('load-stats');
  if (!el) return;
  const parts: string[] = [];
  if (LOAD_TIMES.products !== null) parts.push('productos: ' + LOAD_TIMES.products + 'ms');
  if (LOAD_TIMES.promos !== null) parts.push('promos: ' + LOAD_TIMES.promos + 'ms');
  if (LOAD_TIMES.messages !== null) parts.push('mensajes: ' + LOAD_TIMES.messages + 'ms');
  el.textContent = parts.length ? 'Tiempo de carga - ' + parts.join(' | ') : '';
}

/* ---------- Error helpers ---------- */
function setLoginError(msg: string): void {
  const el = document.getElementById('login-error');
  if (el) el.textContent = msg || '';
}

function showAdminError(msg: string): void {
  const el = document.getElementById('panel-error');
  if (!el) return;
  el.textContent = msg || '';
  el.style.display = 'block';
}

function clearAdminError(): void {
  const el = document.getElementById('panel-error');
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

/* ---------- Views ---------- */
function showLogin(): void {
  const pv = document.getElementById('panel-view');
  const lv = document.getElementById('login-view');
  if (pv) pv.style.display = 'none';
  if (lv) lv.style.display = 'flex';
}

function showPanel(): void {
  const lv = document.getElementById('login-view');
  const pv = document.getElementById('panel-view');
  const bl = document.getElementById('btn-logout');
  if (lv) lv.style.display = 'none';
  if (pv) pv.style.display = 'block';
  if (bl) bl.style.display = 'inline-flex';
  showTab('products');
  loadProducts();
  loadPromotions();
  loadMessages();
}

function showDenied(msg: string): void {
  showLogin();
  setLoginError(msg);
  const bl = document.getElementById('btn-logout');
  if (bl) bl.style.display = 'inline-flex';
}

/* ---------- Tabs ---------- */
export function showTab(tab: string): void {
  const panels: Record<string, string> = { products: 'tab-products', promos: 'tab-promos', messages: 'tab-messages' };
  const names = ['products', 'promos', 'messages'];
  for (const name of names) {
    const panel = document.getElementById(panels[name]);
    if (panel) panel.style.display = (name === tab) ? 'block' : 'none';
  }
  const buttons = document.querySelectorAll('.admin-tab');
  buttons.forEach((btn: any) => {
    btn.className = 'admin-tab' + (btn.getAttribute('data-tab') === tab ? ' active' : '');
  });
}

/* ---------- Init ---------- */
export async function initAdmin(): Promise<void> {
  if (!supabase) {
    showLogin();
    setLoginError('No se pudo conectar con Supabase. Revisa tu conexion.');
    return;
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      showLogin();
      setLoginError(sessionError.message);
      return;
    }
    if (!session) {
      showLogin();
      return;
    }

    let payload: any; try { payload = await adminFetch('/api/admin/me'); } catch (err: any) { showDenied('Error verificando permisos: ' + (err?.message || err)); return; }
    if (payload.isAdmin === true) { showPanel(); } else { showDenied(payload?.error || 'Acceso denegado: no sos administrador'); }
  } catch (err: any) {
    showLogin();
    setLoginError('Error obteniendo sesion: ' + (err?.message || err));
  }
}

export async function adminLogin(): Promise<void> {
  try {
    if (!supabase) {
      setLoginError('No se pudo conectar con Supabase. Revisa tu conexion.');
      return;
    }

    const emailEl = document.getElementById('login-email') as HTMLInputElement;
    const passwordEl = document.getElementById('login-password') as HTMLInputElement;
    const email = emailEl?.value.trim() || '';
    const password = passwordEl?.value || '';

    setLoginError('');
    if (!email || !password) {
      setLoginError('Ingresa email y password.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
      return;
    }
    initAdmin();
  } catch (err: any) {
    setLoginError('Error en el login: ' + (err?.message || err));
  }
}

export async function adminLogout(): Promise<void> {
  if (!supabase) {
    window.location.reload();
    return;
  }
  await supabase.auth.signOut();
  window.location.reload();
}

/* ---------- Products ---------- */
async function loadProducts(): Promise<void> {
  const t0 = performance.now();
  const tbody = document.getElementById('products-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Cargando productos...</td></tr>';

  try {
    const data = await adminFetch('/api/admin/products'); const { error } = data || {}; const rows = data?.data || [];
    recordLoadTime('products', t0);
    if (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error cargando productos: ' + _escapeHtml(error) + '</td></tr>';
      return;
    }
    PRODUCTS_CACHE = rows;
    renderProductsTable();
  } catch (err: any) {
    recordLoadTime('products', t0);
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error cargando productos: ' + _escapeHtml(err?.message || err) + '</td></tr>';
  }
}

function renderProductsTable(): void {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (PRODUCTS_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No hay productos cargados.</td></tr>';
    return;
  }

  let html = '';
  for (const p of PRODUCTS_CACHE) {
    const safeId = _safeId(p.id);
    let actionsHtml = '';
    if (safeId !== null) {
      actionsHtml =
        '<button type="button" class="btn btn-sm btn-outline" data-action="edit-product" data-id="' + safeId + '">Editar</button> ' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="delete-product" data-id="' + safeId + '">Borrar</button>';
    }
    html += '<tr>' +
      '<td>' + _escapeHtml(p.id) + '</td>' +
      '<td>' + (p.image ? '<img class="thumb" src="' + _escapeHtml(_safeImageSrc(p.image)) + '" alt="' + _escapeHtml(p.name) + '">' : '') + '</td>' +
      '<td>' + _escapeHtml(p.name) + '</td>' +
      '<td>' + _escapeHtml(p.brand) + '</td>' +
      '<td>' + _fmtPrice(p.price) + '</td>' +
      '<td>' + (p.featured ? 'Si' : 'No') + '</td>' +
      '<td>' + (p.active !== false ? 'Si' : 'No') + '</td>' +
      '<td class="table-actions">' + actionsHtml + '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

export function newProductForm(): void {
  currentProductId = null;
  const fields: [string, string][] = [
    ['product-id', ''], ['product-name', ''], ['product-description', ''],
    ['product-image-url', ''], ['product-specs', ''],
  ];
  fields.forEach(([id, val]) => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value = val; });
  const cat = document.getElementById('product-category') as HTMLSelectElement;
  if (cat) cat.value = 'Escritorio';
  const brand = document.getElementById('product-brand') as HTMLInputElement;
  if (brand) brand.value = 'laSolutions';
  const price = document.getElementById('product-price') as HTMLInputElement;
  if (price) price.value = '';
  const origPrice = document.getElementById('product-original-price') as HTMLInputElement;
  if (origPrice) origPrice.value = '';
  const featured = document.getElementById('product-featured') as HTMLInputElement;
  if (featured) featured.checked = false;
  const active = document.getElementById('product-active') as HTMLInputElement;
  if (active) active.checked = true;
  const fileEl = document.getElementById('product-image-file') as HTMLInputElement;
  if (fileEl) fileEl.value = '';
  hideProductImagePreview();
  const titleEl = document.getElementById('product-form-title');
  if (titleEl) titleEl.textContent = 'Nuevo producto';
  const form = document.getElementById('product-form');
  if (form) form.style.display = 'block';
}

export function editProduct(id: number): void {
  const p = _findProductById(id);
  if (!p) { alert('Producto no encontrado en cache.'); return; }

  currentProductId = id;
  const setVal = (eid: string, val: string) => { const el = document.getElementById(eid) as HTMLInputElement; if (el) el.value = val; };
  setVal('product-id', String(id));
  setVal('product-name', p.name || '');
  const cat = document.getElementById('product-category') as HTMLSelectElement;
  if (cat) cat.value = p.category || 'Escritorio';
  setVal('product-brand', p.brand || '');
  setVal('product-price', String(p.price));
  setVal('product-original-price', (p.original_price != null && p.original_price !== '') ? String(p.original_price) : '');
  setVal('product-description', p.description || '');
  const specs = p.specs || [];
  setVal('product-specs', Array.isArray(specs) ? JSON.stringify(specs) : String(specs));
  setVal('product-image-url', p.image || '');
  const fileEl = document.getElementById('product-image-file') as HTMLInputElement;
  if (fileEl) fileEl.value = '';
  const featured = document.getElementById('product-featured') as HTMLInputElement;
  if (featured) featured.checked = !!p.featured;
  const active = document.getElementById('product-active') as HTMLInputElement;
  if (active) active.checked = (p.active !== false);
  showProductImagePreview(p.image);
  const titleEl = document.getElementById('product-form-title');
  if (titleEl) titleEl.textContent = 'Editar producto #' + id;
  const form = document.getElementById('product-form');
  if (form) form.style.display = 'block';
}

export async function saveProduct(): Promise<void> {
  const nameEl = document.getElementById('product-name') as HTMLInputElement;
  const priceEl = document.getElementById('product-price') as HTMLInputElement;
  const name = nameEl?.value.trim() || '';
  const priceRaw = priceEl?.value.trim() || '';
  const price = parseFloat(priceRaw);

  if (!name) { alert('El nombre es obligatorio.'); return; }
  if (priceRaw === '' || isNaN(price) || price < 0) { alert('Ingresa un precio valido (mayor o igual a 0).'); return; }

  const origPriceEl = document.getElementById('product-original-price') as HTMLInputElement;
  const origPriceRaw = origPriceEl?.value.trim() || '';
  const originalPrice = origPriceRaw === '' ? null : parseFloat(origPriceRaw);
  if (origPriceRaw !== '' && (isNaN(originalPrice as number) || (originalPrice as number) < 0)) {
    alert('El precio original debe ser un numero valido.'); return;
  }

  const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';
  const getChecked = (id: string) => (document.getElementById(id) as HTMLInputElement)?.checked || false;

  const obj: any = {
    name,
    category: getVal('product-category'),
    brand: getVal('product-brand').trim() || 'laSolutions',
    price,
    original_price: originalPrice,
    description: getVal('product-description'),
    specs: _parseSpecs(getVal('product-specs')),
    featured: getChecked('product-featured'),
    active: getChecked('product-active'),
  };

  const urlField = getVal('product-image-url').trim();
  const fileInput = document.getElementById('product-image-file') as HTMLInputElement;

  if (fileInput?.files && fileInput.files.length > 0) {
    uploadProductImage(fileInput.files[0], async (err: string | null, url: string | null) => {
      if (err) { showAdminError('No se pudo subir la imagen: ' + err); return; }
      obj.image = url;
      await persistProduct(obj);
    });
  } else {
    if (urlField && !_isValidImageUrl(urlField)) {
      showAdminError('La URL de imagen debe ser https o una ruta relativa.');
      return;
    }
    obj.image = urlField || 'assets/placeholder.svg';
    await persistProduct(obj);
  }
}

async function persistProduct(obj: any): Promise<void> {
  try {
    const path2 = currentProductId === null ? '/api/admin/products' : '/api/admin/products/' + currentProductId;
    const method = currentProductId === null ? 'POST' : 'PUT';
    const json = await adminFetch(path2, { method, body: JSON.stringify(obj) });
    if (json?.error) { showAdminError('No se pudo guardar el producto: ' + json.error); return; }
    clearAdminError();
    hideProductForm();
    loadProducts();
  } catch (err: any) {
    showAdminError('No se pudo guardar el producto: ' + (err?.message || err));
  }
}

function uploadProductImage(file: File, callback: (err: string | null, url: string | null) => void): void {
  const MAX_SIZE = 2 * 1024 * 1024;
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowed.includes(file.type)) {
    callback('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.', null); return;
  }
  if (file.size > MAX_SIZE) {
    callback('El archivo supera los 2MB.', null); return;
  }

  const fd = new FormData();
  fd.append('file', file);
  supabase.auth.getSession().then(({ data: { session } }) => {
    const headers: Record<string, string> = {};
    if (session?.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
    fetch('/api/admin/upload', { method: 'POST', headers, body: fd })
      .then(r => r.json())
      .then((json: any) => {
        if (json?.error) { callback(json.error, null); return; }
        callback(null, json.url);
      })
      .catch((err: any) => callback(err?.message || String(err), null));
  });
}

export async function deleteProduct(id: number): Promise<void> {
  const p = _findProductById(id);
  const name = p ? p.name : '#' + id;
  if (!confirm('Borrar el producto "' + name + '"? Se eliminaran tambien sus promociones.')) return;

  try {
    const json = await adminFetch('/api/admin/products/' + id, { method: 'DELETE' }); const error = json?.error;
    if (error) { showAdminError('No se pudo borrar el producto: ' + error); return; }
    clearAdminError();
    loadProducts();
    loadPromotions();
  } catch (err: any) {
    showAdminError('No se pudo borrar el producto: ' + (err?.message || err));
  }
}

function hideProductForm(): void {
  const form = document.getElementById('product-form');
  if (form) form.style.display = 'none';
  const fileEl = document.getElementById('product-image-file') as HTMLInputElement;
  if (fileEl) fileEl.value = '';
}

export function cancelProductForm(): void { hideProductForm(); }

function showProductImagePreview(url: string): void {
  const img = document.getElementById('product-image-preview') as HTMLImageElement;
  if (!img) return;
  if (!url) { img.src = ''; img.style.display = 'none'; return; }
  img.src = url;
  img.style.display = 'block';
}

function hideProductImagePreview(): void {
  const img = document.getElementById('product-image-preview') as HTMLImageElement;
  if (!img) return;
  img.src = '';
  img.style.display = 'none';
}

export function onProductImageUrlChange(): void {
  const url = (document.getElementById('product-image-url') as HTMLInputElement)?.value.trim() || '';
  showProductImagePreview(url);
}

/* ---------- Promotions ---------- */
async function loadPromotions(): Promise<void> {
  const t0 = performance.now();
  const tbody = document.getElementById('promos-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Cargando promociones...</td></tr>';

  try {
    const data = await adminFetch('/api/admin/promotions'); const { error } = data || {}; const rows = data?.data || [];
    recordLoadTime('promos', t0);
    if (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error cargando promociones: ' + _escapeHtml(error) + '</td></tr>';
      return;
    }
    PROMOS_CACHE = rows;
    renderPromosTable();
    populatePromoProductSelect();
  } catch (err: any) {
    recordLoadTime('promos', t0);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error cargando promociones: ' + _escapeHtml(err?.message || err) + '</td></tr>';
  }
}

function renderPromosTable(): void {
  const tbody = document.getElementById('promos-tbody');
  if (!tbody) return;

  if (PROMOS_CACHE.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No hay promociones cargadas.</td></tr>';
    return;
  }

  let html = '';
  for (const pr of PROMOS_CACHE) {
    const prod = _findProductById(pr.product_id);
    const prodName = prod ? prod.name : 'Producto #' + pr.product_id;
    const safeId = _safeId(pr.id);
    let actionsHtml = '';
    if (safeId !== null) {
      actionsHtml =
        '<button type="button" class="btn btn-sm btn-outline" data-action="edit-promotion" data-id="' + safeId + '">Editar</button> ' +
        '<button type="button" class="btn btn-sm btn-danger" data-action="delete-promotion" data-id="' + safeId + '">Borrar</button>';
    }
    html += '<tr>' +
      '<td>' + _escapeHtml(pr.product_id) + ' - ' + _escapeHtml(prodName) + '</td>' +
      '<td>' + _escapeHtml(pr.discount) + '%</td>' +
      '<td>' + _fmtPrice(pr.sale_price) + '</td>' +
      '<td>' + _escapeHtml(pr.label) + '</td>' +
      '<td>' + (pr.active !== false ? 'Si' : 'No') + '</td>' +
      '<td class="table-actions">' + actionsHtml + '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

function populatePromoProductSelect(selectedProductId?: number): void {
  const select = document.getElementById('promo-product-id') as HTMLSelectElement;
  if (!select) return;
  let html = '';

  for (const p of PRODUCTS_CACHE) {
    let hasPromo = false;
    for (const j of PROMOS_CACHE) {
      if (j.product_id === p.id) { hasPromo = true; break; }
    }
    const label = p.id + ' - ' + p.name + (hasPromo ? ' (tiene promo)' : '');
    const sel = (selectedProductId !== undefined && p.id === selectedProductId) ? ' selected' : '';
    html += '<option value="' + p.id + '"' + sel + '>' + _escapeHtml(label) + '</option>';
  }
  select.innerHTML = html || '<option value="">Sin productos</option>';
}

export function newPromoForm(): void {
  currentPromoId = null;
  const idEl = document.getElementById('promo-id') as HTMLInputElement;
  if (idEl) idEl.value = '';
  populatePromoProductSelect();
  const discEl = document.getElementById('promo-discount') as HTMLInputElement;
  if (discEl) discEl.value = '';
  const spEl = document.getElementById('promo-sale-price') as HTMLInputElement;
  if (spEl) spEl.value = '';
  const labelEl = document.getElementById('promo-label') as HTMLInputElement;
  if (labelEl) labelEl.value = 'Oferta';
  const activeEl = document.getElementById('promo-active') as HTMLInputElement;
  if (activeEl) activeEl.checked = true;
  const titleEl = document.getElementById('promo-form-title');
  if (titleEl) titleEl.textContent = 'Nueva promocion';
  const form = document.getElementById('promo-form');
  if (form) form.style.display = 'block';
}

export function editPromotion(id: number): void {
  let pr: any = null;
  for (const p of PROMOS_CACHE) { if (p.id === id) { pr = p; break; } }
  if (!pr) { alert('Promocion no encontrada en cache.'); return; }

  currentPromoId = id;
  const idEl = document.getElementById('promo-id') as HTMLInputElement;
  if (idEl) idEl.value = String(id);
  populatePromoProductSelect(pr.product_id);
  const discEl = document.getElementById('promo-discount') as HTMLInputElement;
  if (discEl) discEl.value = pr.discount;
  const spEl = document.getElementById('promo-sale-price') as HTMLInputElement;
  if (spEl) spEl.value = pr.sale_price;
  const labelEl = document.getElementById('promo-label') as HTMLInputElement;
  if (labelEl) labelEl.value = pr.label || '';
  const activeEl = document.getElementById('promo-active') as HTMLInputElement;
  if (activeEl) activeEl.checked = (pr.active !== false);
  const titleEl = document.getElementById('promo-form-title');
  if (titleEl) titleEl.textContent = 'Editar promocion #' + id;
  const form = document.getElementById('promo-form');
  if (form) form.style.display = 'block';
}

export async function savePromotion(): Promise<void> {
  const pidEl = document.getElementById('promo-product-id') as HTMLSelectElement;
  const discEl = document.getElementById('promo-discount') as HTMLInputElement;
  const spEl = document.getElementById('promo-sale-price') as HTMLInputElement;
  const labelEl = document.getElementById('promo-label') as HTMLInputElement;
  const activeEl = document.getElementById('promo-active') as HTMLInputElement;

  const productId = parseInt(pidEl?.value || '0', 10);
  const discount = parseInt(discEl?.value || '0', 10);
  const salePriceRaw = spEl?.value.trim() || '';
  const salePrice = parseFloat(salePriceRaw);

  if (!productId || isNaN(productId)) { alert('Selecciona un producto.'); return; }
  if (isNaN(discount) || discount < 1 || discount > 99) { alert('El descuento debe ser un numero entre 1 y 99.'); return; }
  if (salePriceRaw === '' || isNaN(salePrice) || salePrice < 0) { alert('Ingresa un precio de oferta valido.'); return; }

  const obj = {
    product_id: productId,
    discount,
    sale_price: salePrice,
    label: labelEl?.value.trim() || 'Oferta',
    active: activeEl?.checked || false,
  };

  try {
    const path2 = currentPromoId === null ? '/api/admin/promotions' : '/api/admin/promotions/' + currentPromoId;
    const method = currentPromoId === null ? 'POST' : 'PUT';
    const json = await adminFetch(path2, { method, body: JSON.stringify(obj) });
    if (json?.error) { showAdminError('No se pudo guardar la promocion: ' + json.error); return; }
    clearAdminError();
    hidePromoForm();
    loadPromotions();
  } catch (err: any) {
    showAdminError('No se pudo guardar la promocion: ' + (err?.message || err));
  }
}

export async function deletePromotion(id: number): Promise<void> {
  if (!confirm('Borrar esta promocion?')) return;

  try {
    const json = await adminFetch('/api/admin/promotions/' + id, { method: 'DELETE' }); const error = json?.error;
    if (error) { showAdminError('No se pudo borrar la promocion: ' + error); return; }
    clearAdminError();
    loadPromotions();
  } catch (err: any) {
    showAdminError('No se pudo borrar la promocion: ' + (err?.message || err));
  }
}

function hidePromoForm(): void {
  const form = document.getElementById('promo-form');
  if (form) form.style.display = 'none';
}

export function cancelPromoForm(): void { hidePromoForm(); }

/* ---------- Messages ---------- */
async function loadMessages(): Promise<void> {
  const t0 = performance.now();
  const tbody = document.getElementById('messages-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Cargando mensajes...</td></tr>';

  try {
    const data = await adminFetch('/api/admin/messages'); const { error } = data || {}; const rows = data?.data || [];
    recordLoadTime('messages', t0);
    if (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error cargando mensajes: ' + _escapeHtml(error) + '</td></tr>';
      return;
    }

    if (rows.length === 0) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No hay mensajes de contacto.</td></tr>';
      return;
    }

    let html = '';
    for (const m of rows) {
      html += '<tr>' +
        '<td>' + _escapeHtml(m.name) + '</td>' +
        '<td>' + _escapeHtml(m.email) + '</td>' +
        '<td>' + _escapeHtml(m.subject) + '</td>' +
        '<td>' + _escapeHtml(m.message) + '</td>' +
        '<td>' + _escapeHtml(_formatDate(m.created_at)) + '</td>' +
      '</tr>';
    }
    if (tbody) tbody.innerHTML = html;
  } catch (err: any) {
    recordLoadTime('messages', t0);
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error cargando mensajes: ' + _escapeHtml(err?.message || err) + '</td></tr>';
  }
}
