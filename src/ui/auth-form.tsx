'use client';
import { useState } from 'react';
import { resetSessionNavigation } from './session-navigation';
import { ArrowRight, ShieldCheck, Users, CalendarDays, Wallet } from 'lucide-react';
export function AuthForm() {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: register ? 'register' : 'login',
          email: data.get('email'),
          password: data.get('password'),
          ...(register ? { name: data.get('name'), organization: data.get('organization') } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      resetSessionNavigation('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos conectar.');
      setPending(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand-word">
          kano<span>.</span>
        </div>
        <div>
          <p className="eyebrow">ESPACIO DEL ENTRENADOR</p>
          <h1>
            Tu energía,
            <br />
            en el entrenamiento.
          </h1>
          <p className="auth-intro">
            Alumnos, servicios y pagos.
            <br />
            Cada cosa en su lugar.
          </p>
          <div className="auth-features">
            <span>
              <Users size={18} /> Tu equipo
            </span>
            <span>
              <CalendarDays size={18} /> Tus servicios
            </span>
            <span>
              <Wallet size={18} /> Tus cuentas
            </span>
          </div>
        </div>
        <p className="auth-foot">ARTES MARCIALES / PREPARACIÓN FÍSICA</p>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <span className="environment-tag">DESARROLLO LOCAL · 0.1</span>
          <h2>{register ? 'Creá tu espacio' : 'Bienvenido de vuelta'}</h2>
          <p>
            {register
              ? 'Configurá tu organización. Podés cambiar sus datos después.'
              : 'Ingresá para organizar tu próxima sesión.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  Tu nombre
                  <input name="name" required maxLength={120} autoComplete="name" />
                </label>
                <label>
                  Nombre del espacio
                  <input
                    name="organization"
                    required
                    maxLength={120}
                    placeholder="Tu gimnasio o tu marca"
                  />
                </label>
              </>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vos@tuespacio.com"
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                required
                minLength={register ? 12 : 1}
                maxLength={128}
                autoComplete={register ? 'new-password' : 'current-password'}
              />
            </label>
            {register && <small>Al menos 12 caracteres.</small>}
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
            <button className="button primary wide" disabled={pending}>
              {pending ? 'Un momento…' : register ? 'Crear espacio' : 'Ingresar'}
              <ArrowRight size={18} />
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Ya tengo una cuenta' : 'Crear un espacio nuevo'}
          </button>
          <div className="auth-note">
            <ShieldCheck size={18} />
            <span>Sesión privada. Tus cambios se guardan en este equipo.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
