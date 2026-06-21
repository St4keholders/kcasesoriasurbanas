import { login } from './actions';
import { SITE } from '@/lib/constants';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7fbff]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#a8c4d9]/30 p-8">
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 30 30" className="w-12 h-12 text-[#3b7dbf]" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 3L3 13V27H12V19H18V27H27V13L15 3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <rect x="11" y="14" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="16" y="14" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <h2 className="text-center text-2xl font-[var(--font-display)] text-[#1a2d3d] mb-2">
          {SITE.name}
        </h2>
        <p className="text-center text-[#7a99b5] text-sm uppercase tracking-widest font-[var(--font-mono)] mb-8">
          Panel Administrativo
        </p>

        <form className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#3d5a73] mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#3d5a73] mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 bg-[#f7fbff] border border-[#a8c4d9]/50 rounded-lg focus:outline-none focus:border-[#5ba3d9] focus:ring-2 focus:ring-[#5ba3d9]/20 transition-colors"
            />
          </div>
          <button
            formAction={login}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#5ba3d9] hover:bg-[#3b7dbf] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5ba3d9] transition-colors"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
