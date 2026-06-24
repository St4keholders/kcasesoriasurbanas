import { login } from './actions';
import { SITE } from '@/lib/constants';

export default function LoginPage() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
          </div>
          <div className="text-center">
            <div className="login-name">{SITE.name.split(' ')[0]} <em>{SITE.name.split(' ')[1]}</em> {SITE.name.split(' ').slice(2).join(' ')}</div>
            <div className="login-sub">Panel Administrativo</div>
          </div>
        </div>

        <form className="login-form">
          <div className="field">
            <label htmlFor="email" className="field-label">Correo electrónico</label>
            <input 
              type="email" 
              name="email" 
              id="email" 
              className="input" 
              placeholder="tu@kcasesorias.com" 
              required 
            />
          </div>

          <div className="field">
            <label htmlFor="password" className="field-label">Contraseña</label>
            <input 
              type="password" 
              name="password" 
              id="password" 
              className="input" 
              placeholder="••••••••" 
              required 
            />
          </div>

          <button type="submit" formAction={login} className="btn btn-primary btn-lg w-full mt-2">
            Iniciar sesión
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </form>

        <div className="login-footer">
          Acceso restringido — solo personal autorizado
        </div>
      </div>
    </div>
  );
}
