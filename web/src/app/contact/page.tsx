'use client';

import { useState } from 'react';
import Footer from '@/components/Footer';
import { submitContactMessage } from '@/lib/contact';

export default function ContactPage() {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  function setField(field: string, value: string): void {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setErrors({});

    const name = formData.name.trim();
    const email = formData.email.trim();
    const subject = formData.subject.trim();
    const message = formData.message.trim();

    const newErrors: Record<string, boolean> = {};
    if (!name) newErrors.name = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = true;
    if (!subject) newErrors.subject = true;
    if (!message) newErrors.message = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result = await submitContactMessage({ name, email, subject, message });
    if (result.success) {
      setSuccessMsg(result.message);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } else {
      setErrorMsg(result.message);
    }
  }

  return (
    <>
      <main className="container section" style={{ paddingTop: 'calc(var(--nav-height) + 3rem)' }}>
        <h1 className="section-title">Contactanos</h1>
        <p style={{ textAlign: 'center', maxWidth: 600, margin: '-2rem auto 3rem' }}>
          Tienes preguntas? Estamos para ayudarte. Escribinos y te respondemos lo antes posible.
        </p>

        <div className="contact-layout">
          {/* Contact Form */}
          <div className="contact-form-card">
            <h3>Envianos un mensaje</h3>

            {successMsg && <div className="alert alert-success show" id="contact-success">{successMsg}</div>}
            {errorMsg && <div className="alert alert-error show" id="contact-error">{errorMsg}</div>}

            <form id="contact-form" noValidate onSubmit={handleSubmit}>
              <div className={`form-group ${errors.name ? 'error' : ''}`} id="fg-name">
                <label htmlFor="name">Nombre *</label>
                <input type="text" id="name" placeholder="Tu nombre" maxLength={100} value={formData.name} onChange={e => setField('name', e.target.value)} />
                <div className="error-msg">El nombre es requerido.</div>
              </div>

              <div className={`form-group ${errors.email ? 'error' : ''}`} id="fg-email">
                <label htmlFor="email">Correo electronico *</label>
                <input type="email" id="email" placeholder="tu@email.com" maxLength={254} value={formData.email} onChange={e => setField('email', e.target.value)} />
                <div className="error-msg">Ingresa un correo valido.</div>
              </div>

              <div className={`form-group ${errors.subject ? 'error' : ''}`} id="fg-subject">
                <label htmlFor="subject">Asunto *</label>
                <input type="text" id="subject" placeholder="Consulta sobre..." maxLength={200} value={formData.subject} onChange={e => setField('subject', e.target.value)} />
                <div className="error-msg">El asunto es requerido.</div>
              </div>

              <div className={`form-group ${errors.message ? 'error' : ''}`} id="fg-message">
                <label htmlFor="message">Mensaje *</label>
                <textarea id="message" placeholder="Escribe tu mensaje aqui..." maxLength={5000} value={formData.message} onChange={e => setField('message', e.target.value)}></textarea>
                <div className="error-msg">El mensaje es requerido.</div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Enviar mensaje</button>
            </form>
          </div>

          {/* Contact Info */}
          <div>
            <div className="contact-info-card">
              <h3>Informacion de contacto</h3>

              <div className="contact-item">
                <div className="contact-item-icon">&#9993;</div>
                <div className="contact-item-text">
                  <h4>Correo electronico</h4>
                  <p><a href="mailto:lacp130688@gmail.com">lacp130688@gmail.com</a></p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-item-icon">&#9873;</div>
                <div className="contact-item-text">
                  <h4>Ubicacion</h4>
                  <p>Buenos Aires, Argentina</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-item-icon">&#9200;</div>
                <div className="contact-item-text">
                  <h4>Horarios de atencion</h4>
                  <p>Lunes a Viernes: 9:00 - 18:00</p>
                  <p>Sabados: 10:00 - 14:00</p>
                  <p>Domingos: Cerrado</p>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="contact-info-card" style={{ marginTop: '1.5rem' }}>
              <h3>Ubicacion</h3>
              <div className="map-placeholder">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#9906;</div>
                  <p style={{ fontSize: '0.85rem' }}>Mapa - Buenos Aires, Argentina</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}