'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { localLogin, localVerify } from '@/lib/auth-local';
import { isLoggedIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyVisible, setVerifyVisible] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Redirect if already logged in (local session or Supabase admin)
  useEffect(() => {
    isLoggedIn().then((logged) => {
      if (logged) {
        router.replace('/');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showAlert(kind: 'success' | 'error', message: string): void {
    if (kind === 'success') { setSuccessMsg(message); setErrorMsg(''); }
    else { setErrorMsg(message); setSuccessMsg(''); }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    showAlert('error', '');
    showAlert('success', '');

    const email = emailRef.current?.value.trim() || '';
    const password = passwordRef.current?.value || '';
    if (!email || !password) {
      showAlert('error', 'Completa el correo y la contrasena.');
      return;
    }

    const result = await localLogin(email, password);
    if (result.success) {
      showAlert('success', result.message || 'Sesion iniciada.');
      window.setTimeout(() => router.push('/'), 1000);
      return;
    }
    if (result.pending) {
      showAlert('error', result.error || 'La cuenta no esta verificada.');
      setVerifyVisible(true);
      setVerifyMsg('Simulacion de email: tu codigo de verificacion es ' + (result.code || ''));
      return;
    }
    showAlert('error', result.error || 'No se pudo iniciar sesion.');
  }

  async function handleVerifySubmit(): Promise<void> {
    showAlert('error', '');
    showAlert('success', '');

    const code = codeRef.current?.value.trim() || '';
    if (!code) {
      showAlert('error', 'Ingresa el codigo de 6 digitos.');
      return;
    }
    const result = await localVerify(code);
    if (result.success) {
      showAlert('success', result.message || 'Cuenta verificada. Sesion iniciada.');
      window.setTimeout(() => router.push('/'), 1000);
      return;
    }
    showAlert('error', result.error || 'No se pudo verificar el codigo.');
  }

  return (
    <main className="auth-wrapper">
      <div className="auth-card">
        <h2>Iniciar sesion</h2>
        <p className="auth-subtitle">Ingresa a tu cuenta laSolutions</p>

        {successMsg && <div className="alert alert-success show" id="login-success">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error show" id="login-error">{errorMsg}</div>}

        <form id="login-form" noValidate onSubmit={handleSubmit}>
          <div className="form-group" id="fg-email">
            <label htmlFor="email">Correo electronico</label>
            <input type="email" id="email" placeholder="tu@email.com" required ref={emailRef} maxLength={254} />
            <div className="error-msg">Ingresa un correo valido.</div>
          </div>

          <div className="form-group" id="fg-password">
            <label htmlFor="password">Contrasena</label>
            <input type="password" id="password" placeholder="Tu contrasena" required ref={passwordRef} maxLength={128} />
            <div className="error-msg">La contrasena es requerida.</div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit">Iniciar sesion</button>

          <div id="verify-box" style={{ display: verifyVisible ? 'block' : 'none', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #343b4b' }}>
            {verifyMsg && <div className="alert alert-success show" id="verify-code">{verifyMsg}</div>}
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="verify-code-input">Codigo de verificacion</label>
              <input type="text" id="verify-code-input" maxLength={6} inputMode="numeric" placeholder="6 digitos" ref={codeRef} />
            </div>
            <button type="button" className="btn btn-outline auth-submit" onClick={handleVerifySubmit}>Verificar codigo</button>
          </div>
        </form>

        <div className="auth-footer">
          No tienes cuenta? <Link href="/register">Registrate aqui</Link> · <Link href="/admin">Admin</Link>
        </div>
      </div>
    </main>
  );
}