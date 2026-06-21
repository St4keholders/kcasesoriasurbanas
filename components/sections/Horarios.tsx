"use client";

import { useEffect } from "react";
import { SITE, SCHEDULE } from "@/lib/constants";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SkyDivider } from "@/components/ui/SkyDivider";

export function Horarios() {
  useEffect(() => {
    const dayOfWeek = new Date().getDay();
    const scheduleRows = document.querySelectorAll(".schedule-table tr");
    scheduleRows.forEach((row, i) => {
      // i: 0=Lunes(1), 1=Martes(2), ..., 4=Viernes(5), 5=Sábado(6), 6=Domingo(0)
      const rowDay = i < 6 ? i + 1 : 0;
      if (rowDay === dayOfWeek) {
        (row as HTMLElement).style.background = "rgba(91,163,217,0.08)";
        (row as HTMLElement).style.fontWeight = "600";
      }
    });
  }, []);

  return (
    <section className="horarios" id="horarios">
      <div className="container">
        <RevealOnScroll>
          <div className="section-header">
            <div className="section-eyebrow">Horario de atención</div>
            <h2 className="section-title">
              Estamos aquí
              <br />
              para <em>ayudarte</em>.
            </h2>
            <SkyDivider />
            <p className="section-lead">
              Nuestro equipo está disponible de lunes a viernes en horario de
              oficina. Agenda tu cita y te atenderemos con la dedicación que tu
              caso requiere.
            </p>
          </div>
        </RevealOnScroll>

        <div className="horarios-grid">
          <RevealOnScroll delay={1}>
            <div className="schedule-card">
              <div className="schedule-card-header">
                <h3>Horario Semanal</h3>
                <p>{SITE.name}</p>
              </div>
              <table className="schedule-table">
                <tbody>
                  {SCHEDULE.map((item) => (
                    <tr
                      key={item.day}
                      className={item.open ? "active" : "closed"}
                    >
                      <td>{item.day}</td>
                      <td>{item.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={2} className="schedule-illustration">
            {/* Animated clock */}
            <div className="clock-widget" aria-hidden="true">
              <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
                {/* Outer ring */}
                <circle cx="110" cy="110" r="100" />
                <circle cx="110" cy="110" r="95" />
                {/* Hour markers */}
                <line x1="110" y1="18" x2="110" y2="28" />
                <line x1="110" y1="192" x2="110" y2="202" />
                <line x1="18" y1="110" x2="28" y2="110" />
                <line x1="192" y1="110" x2="202" y2="110" />
                {/* Diagonal markers */}
                <line x1="177" y1="43" x2="171" y2="52" />
                <line x1="177" y1="177" x2="171" y2="168" />
                <line x1="43" y1="43" x2="49" y2="52" />
                <line x1="43" y1="177" x2="49" y2="168" />
                {/* Small markers */}
                <line x1="153" y1="24" x2="150" y2="32" />
                <line x1="67" y1="24" x2="70" y2="32" />
                <line x1="188" y1="67" x2="180" y2="70" />
                <line x1="32" y1="67" x2="40" y2="70" />
                {/* Clock hands */}
                <g className="key">
                  <line
                    className="clock-hand-h"
                    x1="110"
                    y1="110"
                    x2="110"
                    y2="65"
                    strokeWidth="2.5"
                  />
                  <line
                    className="clock-hand-m"
                    x1="110"
                    y1="110"
                    x2="110"
                    y2="35"
                    strokeWidth="1.5"
                  />
                </g>
                {/* Center dot */}
                <circle cx="110" cy="110" r="4" className="key" />
                {/* Small house icon at 12 o'clock position */}
                <g className="key" opacity="0.7">
                  <path
                    d="M105 12 L110 7 L115 12 L115 17 L105 17 Z"
                    strokeWidth="1"
                  />
                </g>
              </svg>
            </div>
            <div className="schedule-note">
              <b>{SITE.name}</b> — Gestión inmobiliaria profesional
              <br />
              Lunes a viernes · 10:00 AM a 4:00 PM
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
