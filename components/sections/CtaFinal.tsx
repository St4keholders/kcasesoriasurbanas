import { SITE } from "@/lib/constants";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const WA_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z";

const WA_OUTLINE_PATH =
  "M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.306-.183-2.87.852.852-2.87-.183-.306A8 8 0 1112 20z";

export function CtaFinal() {
  return (
    <section className="cta-final" id="contacto">
      <div className="container">
        <RevealOnScroll>
          <div className="cta-final-inner">
            <div className="cta-final-icon">
              {/* Chat/message icon */}
              <svg viewBox="0 0 24 24">
                <path d="M21 11.5C21 16.2 16.97 20 12 20C10.36 20 8.82 19.56 7.5 18.8L3 20L4.2 15.5C3.44 14.18 3 12.64 3 11C3 6.03 7.03 2 12 2C16.97 2 21 6.03 21 11Z" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="13" y2="14" />
              </svg>
            </div>
            <h2>
              ¿Listo para formalizar
              <br />
              tu <em>propiedad</em>?
            </h2>
            <p>
              Agenda una consulta y déjanos evaluar tu caso. Nuestro
              equipo te guiará en cada paso del proceso para proteger tu
              patrimonio.
            </p>
            <a className="btn btn-sky" href="#agenda">
              <svg className="wa-icon" viewBox="0 0 24 24">
                <path d={WA_ICON_PATH} />
                <path d={WA_OUTLINE_PATH} />
              </svg>
              Agendar mi consulta →
            </a>

            <div className="cta-contact-info">
              <div className="cta-contact-item">
                <svg viewBox="0 0 24 24">
                  <path d="M22 16.92V19.92C22 20.48 21.56 20.93 21 20.97C20.25 21.03 19.51 21 18.78 20.88C16.02 20.38 13.43 19.19 11.24 17.45C9.23 15.85 7.57 13.87 6.35 11.63C5.5 9.95 4.94 8.14 4.7 6.28C4.66 5.71 5.1 5.22 5.67 5.18L8.67 5C9.14 4.98 9.56 5.28 9.7 5.73L10.6 8.73C10.72 9.14 10.58 9.59 10.23 9.83L8.79 10.83C10.09 13.27 12.03 15.21 14.47 16.51L15.47 15.07C15.71 14.72 16.16 14.58 16.57 14.7L19.57 15.6C20.02 15.74 20.32 16.16 20.3 16.63L20.3 16.92Z" />
                </svg>
                +57 301 128 1492
              </div>
              <div className="cta-contact-item">
                <svg viewBox="0 0 24 24">
                  <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.03 7.03 1 12 1S21 5.03 21 10Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {SITE.address.replace("Oficina", "Ofc.")}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
