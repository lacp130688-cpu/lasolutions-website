/* ============================================
   laSolutions - Admin Module
   Port of admin.js - uses DOM manipulation
   (called from useEffect in admin page component).
   ============================================ */

import { supabase, SUPABASE_URL } from './supabase-config';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const window: any;

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

    const { data, error: rpcError } = await supabase.rpc('is_admin');
    if (rpcError) {
      showDenied('Error verificando permisos: ' + rpcError.message);
      return;
    }
    if (data === true) {
      showPanel();
    } else {
      showDenied('Acceso denegado: no sos administrador');
    }
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
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
    recordLoadTime('products', t0);
    if (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error cargando productos: ' + _escapeHtml(error.message) + '</td></tr>';
      return;
    }
    PRODUCTS_CACHE = data || [];
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
    let action;
    if (currentProductId === null) {
      action = supabase.from('products').insert(obj);
    } else {
      action = supabase.from('products').update(obj).eq('id', currentProductId);
    }
    const { error } = await action;
    if (error) { showAdminError('No se pudo guardar el producto: ' + error.message); return; }
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

  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '-').toLowerCase();
  const path = 'productos/' + Date.now() + '-' + cleanName;

  supabase.storage.from('product-images').upload(path, file).then(({ error }) => {
    if (error) { callback(error.message, null); return; }
    const url = SUPABASE_URL + '/storage/v1/object/public/product-images/' + path;
    callback(null, url);
  }).catch((err: any) => {
    callback(err?.message || String(err), null);
  });
}

export async function deleteProduct(id: number): Promise<void> {
  const p = _findProductById(id);
  const name = p ? p.name : '#' + id;
  if (!confirm('Borrar el producto "' + name + '"? Se eliminaran tambien sus promociones.')) return;

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { showAdminError('No se pudo borrar el producto: ' + error.message); return; }
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
    const { data, error } = await supabase.from('promotions').select('*').order('product_id', { ascending: true });
    recordLoadTime('promos', t0);
    if (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error cargando promociones: ' + _escapeHtml(error.message) + '</td></tr>';
      return;
    }
    PROMOS_CACHE = data || [];
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
    let action;
    if (currentPromoId === null) {
      action = supabase.from('promotions').insert(obj);
    } else {
      action = supabase.from('promotions').update(obj).eq('id', currentPromoId);
    }
    const { error } = await action;
    if (error) { showAdminError('No se pudo guardar la promocion: ' + error.message); return; }
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
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) { showAdminError('No se pudo borrar la promocion: ' + error.message); return; }
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
    const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    recordLoadTime('messages', t0);
    if (error) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error cargando mensajes: ' + _escapeHtml(error.message) + '</td></tr>';
      return;
    }

    const rows = data || [];
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
