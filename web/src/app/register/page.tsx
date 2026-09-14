'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { localRegister, localVerify } from '@/lib/auth-local';
import { isLoggedIn } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [codeMsg, setCodeMsg] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
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

    const name = nameRef.current?.value.trim() || '';
    const email = emailRef.current?.value.trim() || '';
    const password = passwordRef.current?.value || '';
    const confirm = confirmRef.current?.value || '';

    if (name.length < 2) {
      showAlert('error', 'El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('error', 'Ingresa un correo electronico valido.');
      return;
    }
    if (password.length < 6) {
      showAlert('error', 'La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      showAlert('error', 'Las contrasenas no coinciden.');
      return;
    }

    const result = await localRegister(name, email, password);
    if (!result.success) {
      showAlert('error', result.error || 'No se pudo crear la cuenta.');
      return;
    }

    setStep(2);
    setCodeMsg('Simulacion de email: tu codigo de verificacion es ' + (result.code || '') +
      '. En produccion llegaria por correo. Expiracion: 10 minutos.');
  }

  async function handleVerify(): Promise<void> {
    showAlert('error', '');
    showAlert('success', '');

    const code = codeRef.current?.value.trim() || '';
    if (!code) {
      showAlert('error', 'Ingresa el codigo de 6 digitos.');
      return;
    }
    const result = await localVerify(code);
    if (result.success) {
      setStep(1);
      showAlert('success', result.message || 'Cuenta verificada. Sesion iniciada.');
      window.setTimeout(() => router.push('/'), 1500);
      return;
    }
    showAlert('error', result.error || 'No se pudo verificar el codigo.');
  }

  return (
    <main className="auth-wrapper">
      <div className="auth-card">
        <h2>Crear cuenta</h2>
        <p className="auth-subtitle">Registrate en laSolutions</p>

        {successMsg && <div className="alert alert-success show" id="reg-success">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error show" id="reg-error">{errorMsg}</div>}

        <div id="reg-step-1" style={{ display: step === 1 ? 'block' : 'none' }}>
          <form id="register-form" noValidate onSubmit={handleSubmit}>
            <div className="form-group" id="fg-name">
              <label htmlFor="name">Nombre completo *</label>
              <input type="text" id="name" placeholder="Tu nombre" required ref={nameRef} maxLength={100} />
              <div className="error-msg">El nombre debe tener al menos 2 caracteres.</div>
            </div>

            <div className="form-group" id="fg-email">
              <label htmlFor="email">Correo electronico *</label>
              <input type="email" id="email" placeholder="tu@email.com" required ref={emailRef} maxLength={254} />
              <div className="error-msg">Ingresa un correo electronico valido.</div>
            </div>

            <div className="form-group" id="fg-password">
              <label htmlFor="password">Contrasena *</label>
              <input type="password" id="password" placeholder="Minimo 6 caracteres" required ref={passwordRef} maxLength={128} />
              <div className="error-msg">La contrasena debe tener al menos 6 caracteres.</div>
            </div>

            <div className="form-group" id="fg-confirm">
              <label htmlFor="confirm-password">Confirmar contrasena *</label>
              <input type="password" id="confirm-password" placeholder="Repite tu contrasena" required ref={confirmRef} maxLength={128} />
              <div className="error-msg">Las contrasenas no coinciden.</div>
            </div>

            <button type="submit" className="btn btn-primary auth-submit">Crear cuenta</button>
          </form>
        </div>

        <div id="reg-step-2" style={{ display: step === 2 ? 'block' : 'none', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #343b4b' }}>
          {codeMsg && <div className="alert alert-success show" id="reg-code">{codeMsg}</div>}
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="reg-verify-code">Codigo de verificacion</label>
            <input type="text" id="reg-verify-code" maxLength={6} inputMode="numeric" placeholder="6 digitos" ref={codeRef} />
          </div>
          <button type="button" className="btn btn-outline auth-submit" onClick={handleVerify}>Verificar y crear cuenta</button>
        </div>

        <div className="auth-footer">
          Ya tienes cuenta? <Link href="/login">Inicia sesion</Link> · <Link href="/admin">Admin</Link>
        </div>
      </div>
    </main>
  );
}