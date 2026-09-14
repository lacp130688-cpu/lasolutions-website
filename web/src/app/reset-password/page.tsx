'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-config';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'saving' | 'done' | 'error'>('checking');
  const [msg, setMsg] = useState('');
  const passRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  // 1. Verifica que el link traiga el token de recuperacion en el hash
  useEffect(() => {
    const hash = window.location.hash || '';
    const hasRecovery = hash.includes('type=recovery') && hash.includes('access_token');
    if (!hasRecovery) {
      setStatus('invalid');
      return;
    }
    // supabase-js detecta el token en la URL de forma asincrona.
    // El evento PASSWORD_RECOVERY se dispara cuando ya procesó el hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setStatus('ready');
      }
    });
    // Respaldo: si el evento ya ocurrió antes de suscribirnos, chequear la sesión
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) setStatus('ready');
        else window.setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) setStatus('ready');
            else setStatus('invalid');
          });
        }, 1500);
      })
      .catch(() => setStatus('invalid'));
    return () => { subscription.unsubscribe(); };
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const pass = passRef.current?.value || '';
    const confirm = confirmRef.current?.value || '';
    setMsg('');

    if (pass.length < 6) {
      setMsg('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (pass !== confirm) {
      setMsg('Las contrasenas no coinciden.');
      return;
    }

    setStatus('saving');
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) {
      setStatus('error');
      setMsg(error.message || 'No se pudo cambiar la contrasena.');
      return;
    }
    setStatus('done');
    window.setTimeout(() => router.push('/admin'), 1800);
  }

  return (
    <main className="auth-wrapper">
      <div className="auth-card">
        <h2>Nueva contrasena</h2>

        {status === 'checking' && <p className="auth-subtitle">Verificando el enlace...</p>}

        {status === 'invalid' && (
          <>
            <p className="auth-subtitle">El enlace no es valido o ya expiro.</p>
            <p className="auth-subtitle">Envia un nuevo correo desde el panel de Supabase (Users &rarr; Send password recovery).</p>
            <Link href="/login" className="btn btn-primary auth-submit" style={{ textAlign: 'center' }}>Volver a iniciar sesion</Link>
          </>
        )}

        {(status === 'ready' || status === 'saving') && (
          <form id="reset-form" noValidate onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new-password">Nueva contrasena</label>
              <input type="password" id="new-password" placeholder="Minimo 6 caracteres" required ref={passRef} maxLength={128} />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirmar contrasena</label>
              <input type="password" id="confirm-password" placeholder="Repeti la contrasena" required ref={confirmRef} maxLength={128} />
            </div>
            {msg && <div className="alert alert-error show" id="reset-error">{msg}</div>}
            <button type="submit" className="btn btn-primary auth-submit" disabled={status === 'saving'}>
              {status === 'saving' ? 'Guardando...' : 'Guardar contrasena'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <div className="alert alert-success show" id="reset-success">
            Contrasena actualizada. Redirigiendo al panel admin...
          </div>
        )}

        {status === 'error' && (
          <div className="alert alert-error show" id="reset-error">
            {msg}
          </div>
        )}
      </div>
    </main>
  );
}