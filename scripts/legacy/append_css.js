const fs = require('fs');

const cssToAdd = `
/* =====================================================================
   ADMIN PANEL NEUMORPHIC SYSTEM
   ===================================================================== */
:root {
  --admin-bg: #e8f1fa;
  --shadow-light: rgba(255, 255, 255, 0.85);
  --shadow-dark: rgba(91, 163, 217, 0.28);
  --success: #10b981;
  --success-bg: #d1fae5;
  --warning: #f59e0b;
  --warning-bg: #fef3c7;
  --danger: #ef4444;
  --danger-bg: #fee2e2;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.admin-theme {
  background: var(--admin-bg) !important;
}

/* Superficie elevada — para cards principales, paneles */
.neu-raised {
  background: var(--admin-bg);
  border-radius: 20px;
  box-shadow:
    -8px -8px 20px var(--shadow-light),
    8px 8px 20px var(--shadow-dark);
  transition: all 0.3s var(--ease);
}

/* Superficie elevada pequeña — para items de lista, cards secundarios */
.neu-raised-sm {
  background: var(--admin-bg);
  border-radius: 14px;
  box-shadow:
    -4px -4px 10px var(--shadow-light),
    4px 4px 10px var(--shadow-dark);
  transition: all 0.3s var(--ease);
}

/* Superficie hundida — para inputs, search, item activo del nav */
.neu-inset {
  background: var(--admin-bg);
  border-radius: 14px;
  box-shadow:
    inset -3px -3px 8px var(--shadow-light),
    inset 3px 3px 8px var(--shadow-dark);
}

/* Botón neumórfico secundario */
.neu-btn {
  background: var(--admin-bg);
  border: none;
  border-radius: 12px;
  padding: 12px 22px;
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  cursor: pointer;
  box-shadow:
    -5px -5px 12px var(--shadow-light),
    5px 5px 12px var(--shadow-dark);
  transition: all 0.2s var(--ease);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.neu-btn:hover {
  transform: translateY(-1px);
  color: var(--sky-deep);
  box-shadow:
    -6px -6px 14px var(--shadow-light),
    6px 6px 14px var(--shadow-dark);
}
.neu-btn:active {
  transform: translateY(0);
  box-shadow:
    inset -3px -3px 6px var(--shadow-light),
    inset 3px 3px 6px var(--shadow-dark);
}
.neu-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: inset -1px -1px 2px var(--shadow-light), inset 1px 1px 2px var(--shadow-dark);
}

/* Botón primario (CTA principal) */
.neu-btn-primary {
  background: linear-gradient(135deg, var(--sky) 0%, var(--sky-deep) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 22px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow:
    -5px -5px 12px var(--shadow-light),
    5px 5px 12px var(--shadow-dark),
    inset 1px 1px 2px rgba(255, 255, 255, 0.35);
  transition: all 0.2s var(--ease);
}
.neu-btn-primary:hover {
  transform: translateY(-2px);
  color: white;
  box-shadow:
    -6px -6px 16px var(--shadow-light),
    6px 6px 16px var(--shadow-dark),
    inset 1px 1px 2px rgba(255, 255, 255, 0.35);
}
.neu-btn-primary:active {
  transform: translateY(0);
  box-shadow:
    inset -3px -3px 6px rgba(0,0,0,0.15),
    inset 3px 3px 6px rgba(0,0,0,0.2);
}
.neu-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  background: var(--sky);
}

/* Contenedor de icono circular */
.neu-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--admin-bg);
  display: grid;
  place-items: center;
  box-shadow:
    -3px -3px 8px var(--shadow-light),
    3px 3px 8px var(--shadow-dark);
  color: var(--sky-deep);
  flex-shrink: 0;
  transition: all 0.3s var(--ease);
}

.neu-icon.blue   { color: var(--sky-deep); }
.neu-icon.green  { color: var(--success); }
.neu-icon.orange { color: var(--warning); }
.neu-icon.purple { color: #a855f7; }

/* Status badges */
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  flex-shrink: 0;
  display: inline-flex;
}
.status-badge.scheduled {
  color: var(--sky-deep);
  background: var(--admin-bg);
  box-shadow:
    inset -2px -2px 4px var(--shadow-light),
    inset 2px 2px 4px var(--shadow-dark);
}
.status-badge.attended { background: var(--success-bg); color: var(--success); }
.status-badge.pending { background: var(--warning-bg); color: var(--warning); }
.status-badge.cancelled { background: var(--danger-bg); color: var(--danger); }

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;

fs.appendFileSync('app/globals.css', cssToAdd);
console.log('CSS updated');
