/* ============================================================
   laSolutions - E2E probe (producción Cloudflare)
   Cubre: storefront, login admin real, CRUD productos,
   CRUD promociones, mensajes, upload de imagen con cleanup,
   logout. Crea datos de prueba en BD real y los elimina.
   Uso: node probe.e2e.js
   ============================================================ */
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = 'https://lasolutions-website.lacp130688.workers.dev';
const SUPABASE_URL = 'https://lafdevrlrecenzsiqzvl.supabase.co';
const ANON_KEY = 'sb_publishable_B1ihAc0-F9qcIHvq-cTRvg_SfspZCXZ';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASS = process.env.E2E_ADMIN_PASS;
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const SHOTS = path.join(__dirname, 'shots');

const results = [];
const created = { productId: null, promoId: null, uploadProductId: null, storagePath: null, storageUrl: null };

function log(step) { results.push(step); console.log((step.ok ? 'PASS' : 'FAIL') + ' | ' + step.name + (step.detail ? ' | ' + step.detail : '')); }
function step(name, detail, ok) { log({ name, detail, ok }); return ok; }

async function waitText(page, selector, text, timeout = 45000) {
  await page.waitForFunction(
    (sel, txt) => {
      const el = document.querySelector(sel);
      return el && el.textContent.includes(txt);
    },
    { timeout }, selector, text
  );
}

async function waitNoText(page, selector, text, timeout = 45000) {
  await page.waitForFunction(
    (sel, txt) => {
      const el = document.querySelector(sel);
      return el && !el.textContent.includes(txt);
    },
    { timeout }, selector, text
  );
}

async function waitVisible(page, selector, timeout = 45000) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && getComputedStyle(el).display !== 'none';
    },
    { timeout }, selector
  );
}

function fill(page, selector, value) {
  return page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('Campo no encontrado: ' + sel);
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

async function rowInfo(page, tbodySel, name) {
  return page.evaluate((sel, txt) => {
    const rows = Array.from(document.querySelectorAll(sel + ' tr'));
    const row = rows.find((r) => r.textContent.includes(txt));
    if (!row) return null;
    const edit = row.querySelector('[data-action="edit-product"], [data-action="edit-promotion"]');
    const del = row.querySelector('[data-action="delete-product"], [data-action="delete-promotion"]');
    const thumb = row.querySelector('img.thumb');
    return { id: edit ? Number(edit.getAttribute('data-id')) : null, thumbSrc: thumb ? thumb.src : null };
  }, tbodySel, name);
}

async function clickByText(page, containerSel, text) {
  return page.evaluate((sel, txt) => {
    const root = document.querySelector(sel);
    if (!root) throw new Error('Contenedor no encontrado: ' + sel);
    const btn = Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === txt);
    if (!btn) throw new Error('Boton no encontrado: ' + txt);
    btn.click();
  }, containerSel, text);
}

let failed = false;
async function guard(stepName, fn) {
  try {
    const detail = await fn();
    step(stepName, detail, true);
  } catch (err) {
    failed = true;
    step(stepName, 'ERROR: ' + String(err?.message || err).split('\n')[0], false);
    console.log('  stack:', err?.stack ? err.stack.split('\n').slice(0, 3).join(' ') : '');
  }
}

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    console.log('Faltan credenciales. Uso: $env:E2E_ADMIN_EMAIL=... $env:E2E_ADMIN_PASS=... node probe.e2e.js');
    process.exit(2);
  }
  const fs = require('fs');
  fs.mkdirSync(SHOTS, { recursive: true });

  // tiny 1x1 red PNG
  const PNG_BUF = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const PNG_PATH = path.join(__dirname, 'e2e.png');
  fs.writeFileSync(PNG_PATH, PNG_BUF);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('pageerror', (e) => console.log('  [pageerror]', String(e).split('\n')[0]));

  // ---------- 1. Storefront ----------
  await guard('storefront: catalog se renderiza desde la API', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForFunction(() => document.body.innerText.includes('Pro Desktop'), { timeout: 45000 });
    await page.screenshot({ path: path.join(SHOTS, '01-storefront.png') });
    return 'home 200, catalogo renderizado';
  });

  // ---------- 2. Login admin ----------
  await guard('login: formulario visible', async () => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForSelector('#login-email', { timeout: 45000 });
    return 'login-view OK';
  });

  await guard('login: credenciales reales -> panel admin', async () => {
    await page.type('#login-email', ADMIN_EMAIL);
    await page.type('#login-password', ADMIN_PASS);
    await page.click('#login-view .btn-primary');
    await waitVisible(page, '#panel-view', 60000);
    await page.screenshot({ path: path.join(SHOTS, '02-panel.png') });
    return 'panel-view visible';
  });

  // ---------- 3. Panel: datos cargados ----------
  await guard('panel: tabla productos (>=29)', async () => {
    await waitNoText(page, '#products-tbody', 'Cargando productos', 60000);
    const count = await page.evaluate(() => document.querySelectorAll('#products-tbody tr').length);
    await waitText(page, '#products-tbody', 'Pro Desktop');
    step('panel: productos cargados', 'filas=' + count, count >= 29);
    return count >= 29 ? 'productos=' + count : 'faltan filas: ' + count;
  });

  await guard('promos: tabla promociones (>=6)', async () => {
    await page.click('[data-tab="promos"]');
    await waitNoText(page, '#promos-tbody', 'Cargando promociones', 60000);
    const count = await page.evaluate(() => document.querySelectorAll('#promos-tbody tr').length);
    step('promos: tabla cargada', 'filas=' + count, count >= 6);
    return count >= 6 ? 'promociones=' + count : 'faltan filas: ' + count;
  });

  await guard('mensajes: tabla carga sin error', async () => {
    await page.click('[data-tab="messages"]');
    await waitNoText(page, '#messages-tbody', 'Cargando mensajes', 60000);
    const txt = await page.evaluate(() => document.getElementById('messages-tbody').textContent.trim().slice(0, 120));
    return 'mensajes-tbody: "' + txt + '"';
  });
  await page.click('[data-tab="products"]');

  // ---------- 4. Producto: crear ----------
  const P_NAME = 'E2E Test ' + Date.now();
  const P_NAME_EDIT = P_NAME + ' EDIT';

  await guard('producto: crear (POST)', async () => {
    await clickByText(page, '#tab-products .admin-tab-head', 'Nuevo producto');
    await waitVisible(page, '#product-form', 30000);
    await fill(page, '#product-name', P_NAME);
    await page.select('#product-category', 'Gaming');
    await fill(page, '#product-brand', 'E2E Test');
    await fill(page, '#product-price', '1234.50');
    await fill(page, '#product-original-price', '1500');
    await fill(page, '#product-description', 'Creado por el probe E2E');
    await fill(page, '#product-specs', '["Spec A","Spec B"]');
    await fill(page, '#product-image-url', 'assets/placeholder.svg');
    await page.click('#product-form .btn-primary');
    await waitText(page, '#products-tbody', P_NAME, 60000);
    const info = await rowInfo(page, '#products-tbody', P_NAME);
    created.productId = info ? info.id : null;
    if (!created.productId) throw new Error('no se pudo leer el id del producto creado');
    return 'id=' + created.productId;
  });

  // ---------- 5. Producto: editar (PUT) ----------
  await guard('producto: editar (PUT)', async () => {
    await page.evaluate((name) => {
      const row = Array.from(document.querySelectorAll('#products-tbody tr')).find((r) => r.textContent.includes(name));
      row.querySelector('[data-action="edit-product"]').click();
    }, P_NAME);
    await waitVisible(page, '#product-form', 30000);
    const title = await page.evaluate(() => document.getElementById('product-form-title').textContent);
    if (!title.includes(String(created.productId))) throw new Error('title inesperado: ' + title);
    await fill(page, '#product-name', P_NAME_EDIT);
    await fill(page, '#product-price', '1500');
    await page.click('#product-form .btn-primary');
    await waitText(page, '#products-tbody', P_NAME_EDIT, 60000);
    return 'nombre actualizado';
  });

  // ---------- 6. Promocion: crear (POST) ----------
  const PROMO_LABEL = 'E2E promo ' + Date.now();
  await guard('promo: crear (POST)', async () => {
    await page.click('[data-tab="promos"]');
    await clickByText(page, '#tab-promos .admin-tab-head', 'Nueva promocion');
    await waitVisible(page, '#promo-form', 30000);
    await page.select('#promo-product-id', String(created.productId));
    await fill(page, '#promo-discount', '10');
    await fill(page, '#promo-sale-price', '1111');
    await fill(page, '#promo-label', PROMO_LABEL);
    await page.click('#promo-form .btn-primary');
    await waitText(page, '#promos-tbody', PROMO_LABEL, 60000);
    const info = await rowInfo(page, '#promos-tbody', PROMO_LABEL);
    created.promoId = info ? info.id : null;
    if (!created.promoId) throw new Error('no se pudo leer el id de la promo');
    return 'id=' + created.promoId;
  });

  // ---------- 7. Promocion: editar (PUT) ----------
  await guard('promo: editar (PUT)', async () => {
    await page.evaluate((id) => {
      const row = Array.from(document.querySelectorAll('#promos-tbody tr')).find((r) => {
        const b = r.querySelector('[data-action="edit-promotion"]');
        return b && Number(b.getAttribute('data-id')) === id;
      });
      if (!row) throw new Error('fila promo no encontrada');
      row.querySelector('[data-action="edit-promotion"]').click();
    }, created.promoId);
    await waitVisible(page, '#promo-form', 30000);
    await fill(page, '#promo-discount', '15');
    await page.click('#promo-form .btn-primary');
    await waitText(page, '#promos-tbody', '15%', 60000);
    return 'descuento 10 -> 15 ok';
  });

  // ---------- 8. Upload de imagen + producto (POST upload) ----------
  const U_NAME = 'E2E Upload ' + Date.now();
  await guard('upload: imagen + crear producto (POST)', async () => {
    await page.click('[data-tab="products"]');
    await clickByText(page, '#tab-products .admin-tab-head', 'Nuevo producto');
    await waitVisible(page, '#product-form', 30000);
    await fill(page, '#product-name', U_NAME);
    await fill(page, '#product-price', '999');
    await fill(page, '#product-brand', 'E2E Test');
    await page.select('#product-category', 'Laptop');
    const fileInput = await page.$('#product-image-file');
    await fileInput.uploadFile(PNG_PATH);
    await page.click('#product-form .btn-primary');
    await waitText(page, '#products-tbody', U_NAME, 90000);
    const info = await rowInfo(page, '#products-tbody', U_NAME);
    created.uploadProductId = info ? info.id : null;
    created.storageUrl = info ? info.thumbSrc : null;
    if (!created.storageUrl || !created.storageUrl.includes('/storage/v1/object/public/product-images/')) {
      throw new Error('imagen no quedo en Supabase Storage: ' + (created.storageUrl || 'sin src'));
    }
    created.storagePath = created.storageUrl.slice(created.storageUrl.indexOf('product-images/') + 'product-images/'.length);
    return 'id=' + created.uploadProductId + ' | objeto en storage: ' + created.storagePath;
  });

  // ---------- 9. Cleanup: borrar promo, upload y producto ----------
  async function deleteRow(page, tbodySel, action, name, id) {
    await page.evaluate((sel, act, idVal, nm) => {
      const rows = Array.from(document.querySelectorAll(sel + ' tr'));
      const row = rows.find((r) => {
        const b = r.querySelector('[data-action="' + act + '"]');
        return b && (idVal === null || Number(b.getAttribute('data-id')) === idVal) && (nm === null || r.textContent.includes(nm));
      });
      if (!row) throw new Error('fila a borrar no encontrada');
      row.querySelector('[data-action="' + act + '"]').click();
    }, tbodySel, action, id, name);
    await waitNoText(page, tbodySel, name, 60000);
    // espera la recarga asincrona de la tabla (loadProducts/loadPromotions fire-and-forget)
    const probeTxt = tbodySel === '#products-tbody' ? 'Pro Desktop' : 'Oferta de escritorio';
    await waitText(page, tbodySel, probeTxt, 60000);
  }

  await guard('cleanup: borrar promo', async () => {
    await page.click('[data-tab="promos"]');
    await deleteRow(page, '#promos-tbody', 'delete-promotion', PROMO_LABEL, created.promoId);
    return 'promo #' + created.promoId + ' eliminada';
  });

  await guard('cleanup: borrar producto upload', async () => {
    await page.click('[data-tab="products"]');
    await deleteRow(page, '#products-tbody', 'delete-product', U_NAME, created.uploadProductId);
    return 'producto up #' + created.uploadProductId + ' eliminado';
  });

  await guard('cleanup: borrar producto E2E Test', async () => {
    await deleteRow(page, '#products-tbody', 'delete-product', P_NAME_EDIT, created.productId);
    return 'producto #' + created.productId + ' eliminado';
  });

  // ---------- 10. Cleanup objeto de storage via REST (token admin) ----------
  await guard('cleanup: objeto de storage eliminado', async () => {
    if (!created.storagePath) throw new Error('sin storagePath');
    const token = await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (!k.includes('auth-token')) continue;
        try { const s = JSON.parse(localStorage[k]); if (s && s.access_token) return s.access_token; } catch (_) {}
      }
      return null;
    });
    if (!token) throw new Error('no se obtuvo el access_token de la sesion');
    const res = await fetch(SUPABASE_URL + '/storage/v1/object/product-images/' + created.storagePath, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('storage DELETE ' + res.status);
    return 'objeto ' + created.storagePath + ' eliminado';
  });

  // ---------- 10b. Barrido de residuos E2E de runs anteriores ----------
  await guard('cleanup: barrido de productos E2E sobrantes', async () => {
    await page.click('[data-tab="products"]');
    await waitText(page, '#products-tbody', 'Pro Desktop', 30000);
    for (let i = 0; i < 10; i++) {
      const leftover = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#products-tbody tr'));
        const row = rows.find((r) => {
          const b = r.querySelector('[data-action="delete-product"]');
          return b && r.textContent.includes('E2E ');
        });
        if (!row) return null;
        row.querySelector('[data-action="delete-product"]').click();
        return row.textContent.slice(0, 40);
      });
      if (!leftover) break;
      await waitNoText(page, '#products-tbody', 'E2E ', 60000);
      await waitText(page, '#products-tbody', 'Pro Desktop', 60000);
    }
    const remaining = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#products-tbody tr')).filter((r) => r.textContent.includes('E2E ')).length
    );
    return remaining === 0 ? 'sin residuos E2E' : 'quedan ' + remaining;
  });

  // ---------- 11. Logout ----------
  await guard('logout: vuelve al login', async () => {
    await page.click('#btn-logout');
    await page.waitForSelector('#login-email', { timeout: 45000 });
    await page.screenshot({ path: path.join(SHOTS, '03-logout.png') });
    return 'login-view de nuevo visible';
  });

  await browser.close();

  console.log('\n========== RESUMEN ==========');
  const pass = results.filter((r) => r.ok).length;
  for (const r of results) console.log((r.ok ? '  PASS' : '  FAIL') + ' ' + r.name + ' | ' + (r.detail || ''));
  console.log(pass + '/' + results.length + ' pasaron. FAIL=1 en caso contrario.');
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});