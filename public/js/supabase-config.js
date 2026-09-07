/* ============================================
   laSolutions - Supabase Client Configuration
   ============================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // IMPORTANTE: valores del proyecto Supabase (Data API).
  // La publishable key es publica por diseno (el RLS protege
  // los datos); la service_role jamas va en el cliente.
  // ---------------------------------------------------------
  window.SUPABASE_URL = 'https://qyyyeiyqjwsfaqwazfgb.supabase.co';
  window.SUPABASE_ANON_KEY = 'sb_publishable__FN3l2wMeRt4DgWB7LS7Fw_zhAcGDdv';

  // Crea el cliente SIEMPRE y reemplaza el global: el UMD del CDN ya define
  // "supabase" como el contenedor del modulo (createClient y helpers), NO como
  // el cliente conectado. Sin este reemplazo, supabase.auth / supabase.from
  // quedan indefinidos y el login / catalogo fallan en silencio.
  try {
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      throw new Error('Supabase JS SDK no disponible');
    }
    window.supabase = supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  } catch (e) {
    console.warn('Supabase SDK no disponible, usando datos locales:', e.message);
    window.supabase = null;
  }
})();