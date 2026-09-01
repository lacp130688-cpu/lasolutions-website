/* ============================================
   laSolutions - Contact Module
   Supabase insert for contact messages
   ============================================ */

function submitContactMessage(data) {
  return supabase.from('contact_messages').insert([{
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message
  }])
    .then(function (result) {
      if (result.error) {
        return { success: false, message: 'No se pudo enviar el mensaje. Intenta de nuevo.' };
      }
      return { success: true, message: 'Mensaje enviado correctamente. Te responderemos a la brevedad.' };
    })
    .catch(function () {
      return { success: false, message: 'No se pudo enviar el mensaje. Intenta de nuevo.' };
    });
}
