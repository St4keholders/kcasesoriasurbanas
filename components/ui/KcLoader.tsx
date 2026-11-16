'use client';

import React, { useEffect, useState } from 'react';
import { useLinkStatus } from 'next/link';

export interface KcLoaderProps {
  size?: number;
  label?: string;
  delayMs?: number;
  className?: string;
}

export function KcLoader({
  size = 36,
  label = 'Cargando...',
  delayMs = 150,
  className = '',
}: KcLoaderProps) {
  const [delayedReady, setDelayedReady] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setDelayedReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (delayMs > 0 && !delayedReady) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="kc-loader-svg"
      >
        <defs>
          <linearGradient id="kc-glass-shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes kcDraw {
            0% { stroke-dashoffset: 140; opacity: 0.45; }
            55% { stroke-dashoffset: 0; opacity: 1; }
            85% { stroke-dashoffset: 0; opacity: 0.95; }
            100% { stroke-dashoffset: -140; opacity: 0.45; }
          }
          @keyframes kcShimmer {
            0% { transform: translateX(-48px) rotate(22deg); opacity: 0; }
            45% { opacity: 0.75; }
            100% { transform: translateX(56px) rotate(22deg); opacity: 0; }
          }
          @keyframes kcPulse {
            0%, 100% { opacity: 0.45; }
            50% { opacity: 1; }
          }
          .kc-monogram {
            stroke-dasharray: 140;
            animation: kcDraw 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .kc-shimmer-bar {
            animation: kcShimmer 1.2s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .kc-monogram {
              stroke-dasharray: none;
              stroke-dashoffset: 0;
              animation: kcPulse 1.5s ease-in-out infinite;
            }
            .kc-shimmer-bar {
              display: none;
            }
          }
        `}</style>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill="rgba(255,255,255,0.65)"
          stroke="rgba(14,165,233,0.28)"
          strokeWidth="1.5"
        />
        {/* Monograma K + C */}
        <path
          className="kc-monogram"
          d="M17 18V46 M17 32L30 18 M21 28L31 46 M49 22C46 18.5 41 18 37.5 20.5C33.5 23.5 33.5 40.5 37.5 43.5C41 46 46 45.5 49 42"
          stroke="url(#kc-glass-shimmer)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Brillo glass que recorre el monograma */}
        <rect
          className="kc-shimmer-bar"
          x="24"
          y="6"
          width="8"
          height="52"
          rx="4"
          fill="rgba(255,255,255,0.55)"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Indicador para enlaces de Next.js 16 usando `useLinkStatus`.
 * Se muestra solo si la navegación lleva más de 150 ms pendiente.
 */
export function KcLinkPendingIndicator({ size = 16 }: { size?: number }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <KcLoader size={size} delayMs={150} label="Abriendo sección..." className="ml-auto shrink-0" />;
}
