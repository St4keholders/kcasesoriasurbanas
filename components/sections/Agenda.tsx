"use client";

import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SkyDivider } from "@/components/ui/SkyDivider";
import { AppointmentForm } from "@/components/calendar/AppointmentForm";

export function Agenda() {
  return (
    <section className="agenda" id="agenda">
      <div className="container">
        <div className="agenda-grid">
          <RevealOnScroll>
            <div className="section-eyebrow">Agenda tu consulta</div>
            <h2>
              Reserva tu cita
              <br />
              y <em>formaliza</em> tu propiedad.
            </h2>
            <SkyDivider />
            <p className="agenda-sub">
              Selecciona el día, hora y tipo de servicio. Al confirmar, tu
              solicitud se enviará directamente a nuestro WhatsApp con todos los
              detalles. Te contactaremos para confirmar.
            </p>
            <div className="agenda-note">
              Respuesta rápida por WhatsApp
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={2}>
            <AppointmentForm />
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
