import { SITE } from "@/lib/constants";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SkyDivider } from "@/components/ui/SkyDivider";

export function Ubicacion() {
  return (
    <section className="ubicacion" id="ubicacion">
      <div className="container">
        <RevealOnScroll>
          <div className="section-header">
            <div className="section-eyebrow">Nuestra ubicación</div>
            <h2 className="section-title">
              Visítanos en el
              <br />
              corazón de <em>Medellín</em>.
            </h2>
            <SkyDivider />
            <p className="section-lead">
              Estamos ubicados en una zona céntrica y de fácil acceso. Programa
              tu visita y recibe asesoría personalizada de nuestro equipo de
              expertos.
            </p>
          </div>
        </RevealOnScroll>
        <RevealOnScroll delay={1}>
          <div className="map-wrapper">
            <iframe
              src={SITE.mapsEmbedUrl}
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Ubicación de ${SITE.name} en Google Maps`}
            />
            <div className="map-overlay">
              <div className="map-address">
                <b>{SITE.name}</b> · {SITE.address}
              </div>
              <a
                href={SITE.mapsLink}
                target="_blank"
                rel="noopener"
                className="map-link"
              >
                Abrir en Maps →
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
