/* ============================================
   laSolutions - Supabase Client Configuration
   ============================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------
  // IMPORTANTE: reemplaza estos valores con los de tu proyecto
  // Supabase (Project Settings > API). Nunca subas la anon key
  // de un proyecto con datos sensibles a un repo publico.
  // ---------------------------------------------------------
  window.SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
  window.SUPABASE_ANON_KEY = 'TU-ANON-KEY';

  // Crea el cliente una sola vez y lo expone globalmente
  if (!window.supabase) {
    window.supabase = supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  }
})();