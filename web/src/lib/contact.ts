/* ============================================
   laSolutions - Contact Module
   Supabase insert for contact messages
   ============================================ */

const CONTACT_THROTTLE_KEY = 'lasolutions_contact_last_sent';
const CONTACT_THROTTLE_MS = 30 * 1000;

export async function submitContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Throttle: no reenvio antes de 30s desde el ultimo envio exitoso
    const lastSent = Number(localStorage.getItem(CONTACT_THROTTLE_KEY) || 0);
    if (lastSent && Date.now() - lastSent < CONTACT_THROTTLE_MS) {
      return { success: false, message: 'Espera un momento antes de enviar otro mensaje.' };
    }

    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json().catch(() => ({ success: false }));
    if (!res.ok || !json.success) {
      return { success: false, message: 'No se pudo enviar el mensaje. Intenta de nuevo.' };
    }
    localStorage.setItem(CONTACT_THROTTLE_KEY, String(Date.now()));
    return { success: true, message: 'Mensaje enviado correctamente. Te responderemos a la brevedad.' };
  } catch {
    return { success: false, message: 'No se pudo enviar el mensaje. Intenta de nuevo.' };
  }
}
