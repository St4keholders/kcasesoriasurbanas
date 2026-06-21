export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-content">
        {/* SVG: Building with shield (property protection) */}
        <div className="hero-icon" aria-hidden="true">
          <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
            {/* Main building */}
            <rect x="30" y="50" width="50" height="60" rx="2" />
            <rect x="85" y="65" width="30" height="45" rx="2" />
            {/* Windows */}
            <rect x="38" y="58" width="8" height="8" rx="1" />
            <rect x="52" y="58" width="8" height="8" rx="1" />
            <rect x="38" y="72" width="8" height="8" rx="1" />
            <rect x="52" y="72" width="8" height="8" rx="1" />
            <rect x="92" y="73" width="7" height="7" rx="1" />
            <rect x="92" y="86" width="7" height="7" rx="1" />
            {/* Door */}
            <rect x="47" y="92" width="14" height="18" rx="2" />
            <circle cx="58" cy="102" r="1.5" />
            {/* Roof line */}
            <line x1="26" y1="50" x2="84" y2="50" />
            <line x1="82" y1="65" x2="118" y2="65" />
            {/* Shield (legal protection) */}
            <g className="accent">
              <path d="M20 20 L20 32 C20 40 30 46 30 46 C30 46 40 40 40 32 L40 20 L30 15 Z" />
              <polyline points="24 30 28 34 36 24" />
            </g>
            {/* Small tree */}
            <line x1="122" y1="110" x2="122" y2="98" />
            <circle cx="122" cy="93" r="7" />
            {/* Ground line */}
            <line x1="20" y1="110" x2="130" y2="110" opacity="0.4" />
            {/* Sparkle accents */}
            <g opacity="0.5">
              <line x1="10" y1="45" x2="10" y2="52" />
              <line x1="6.5" y1="48.5" x2="13.5" y2="48.5" />
              <circle cx="130" cy="40" r="2" />
              <circle cx="8" cy="80" r="1.5" />
            </g>
          </svg>
        </div>

        <div className="hero-badge">
          <svg viewBox="0 0 24 24">
            <path d="M12 2L3 7V12C3 17.5 7 22.3 12 23.5C17 22.3 21 17.5 21 12V7L12 2Z" />
            <polyline points="8 12 11 15 16 9" />
          </svg>
          Medellín · Área Metropolitana
        </div>

        <h1 className="hero-title">
          Tu propiedad
          <br />
          merece estar <em>legalizada</em>.
        </h1>

        <p className="hero-sub">
          Somos expertos en trámites inmobiliarios, urbanismo y legalización de
          propiedades. Protegemos tu patrimonio y formalizamos tus bienes con
          respaldo profesional.
        </p>

        <a className="hero-cta" href="#agenda">
          Agendar consulta →
        </a>
      </div>

      <div className="scroll-hint">
        <span>Descubre más</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
