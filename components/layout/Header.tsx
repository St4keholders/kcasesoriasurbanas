"use client";

import { useEffect, useRef } from "react";
import { SITE } from "@/lib/constants";

export function Header() {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    function onScroll() {
      header!.classList.toggle("scrolled", window.scrollY > 40);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="site-header" id="siteHeader" ref={headerRef}>
      <a className="brand" href="#inicio">
        {/* Building/house icon */}
        <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 3L3 13V27H12V19H18V27H27V13L15 3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect
            x="11"
            y="14"
            width="3"
            height="3"
            rx="0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <rect
            x="16"
            y="14"
            width="3"
            height="3"
            rx="0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1="15"
            y1="8"
            x2="15"
            y2="11"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
        </svg>
        <div className="brand-text">
          <span className="brand-name">{SITE.name}</span>
          <span className="brand-sub">{SITE.tagline}</span>
        </div>
      </a>
      <nav className="nav">
        <a href="#agenda">Agendar</a>
        <a href="#servicios">Servicios</a>
        <a href="#horarios">Horarios</a>
        <a href="#ubicacion">Ubicación</a>
        <a className="nav-cta" href="#agenda">
          Agendar Consulta
        </a>
      </nav>
    </header>
  );
}
