import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SkyDivider } from "@/components/ui/SkyDivider";

const SERVICES_DATA = [
  {
    number: "01",
    name: "Legalización de posesiones",
    desc: "Te ayudamos a obtener títulos de propiedad y registro predial cuando tienes bienes sin escrituras. Formalizamos tu posesión con respaldo legal.",
    icon: (
      <svg viewBox="0 0 28 28">
        <rect x="3" y="6" width="22" height="18" rx="2" />
        <line x1="3" y1="11" x2="25" y2="11" />
        <line x1="8" y1="16" x2="20" y2="16" />
        <line x1="8" y1="19.5" x2="16" y2="19.5" />
        <path d="M19 2V6" opacity="0.6" />
        <path d="M9 2V6" opacity="0.6" />
      </svg>
    ),
  },
  {
    number: "02",
    name: "Trámites notariales y urbanos",
    desc: "Gestión profesional de licencias de construcción, desenglobes y reconocimiento de edificaciones ante las autoridades competentes.",
    icon: (
      <svg viewBox="0 0 28 28">
        <path d="M14 3L3 9V14C3 20.5 7.5 25.5 14 27C20.5 25.5 25 20.5 25 14V9L14 3Z" />
        <polyline points="9 14 12.5 17.5 19 11" />
      </svg>
    ),
  },
  {
    number: "03",
    name: "Escrituración y mejoras",
    desc: "Formalización de escrituras de posesión material y declaraciones de construcción sobre el terreno para asegurar tu inversión.",
    icon: (
      <svg viewBox="0 0 28 28">
        <path d="M14 3L4 10V25H11V18H17V25H24V10L14 3Z" />
        <rect x="10" y="12" width="3.5" height="3.5" rx="0.5" />
        <rect x="15" y="12" width="3.5" height="3.5" rx="0.5" />
      </svg>
    ),
  },
  {
    number: "04",
    name: "Consultoría legal inmobiliaria",
    desc: "Asesoría especializada sobre protección de patrimonio familiar, prevención de riesgos y análisis de viabilidad para tus proyectos.",
    icon: (
      <svg viewBox="0 0 28 28">
        <circle cx="14" cy="11" r="7" />
        <path d="M7.5 21C7.5 17 10 15 14 15C18 15 20.5 17 20.5 21" />
        <path d="M14 8V11L16 13" strokeWidth="1.3" />
        <line x1="23" y1="21" x2="25" y2="25" opacity="0.7" />
        <line x1="25" y1="21" x2="23" y2="25" opacity="0.7" />
      </svg>
    ),
  },
];

export function Servicios() {
  return (
    <section className="servicios" id="servicios">
      <div className="container">
        <RevealOnScroll>
          <div className="section-header">
            <div className="section-eyebrow">Nuestros servicios</div>
            <h2 className="section-title">
              Soluciones integrales
              <br />
              para tu <em>patrimonio</em>.
            </h2>
            <SkyDivider />
            <p className="section-lead">
              Ofrecemos un portafolio completo de servicios inmobiliarios para
              que tu propiedad esté debidamente formalizada y protegida ante la
              ley.
            </p>
          </div>
        </RevealOnScroll>

        <div className="services-grid">
          {SERVICES_DATA.map((service, i) => (
            <RevealOnScroll
              key={service.number}
              delay={(i + 1) as 1 | 2 | 3 | 4}
            >
              <div className="service-card">
                <div className="service-icon">{service.icon}</div>
                <div className="service-number">{service.number}</div>
                <h3 className="service-name">{service.name}</h3>
                <p className="service-desc">{service.desc}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
