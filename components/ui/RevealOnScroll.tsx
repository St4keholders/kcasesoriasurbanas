"use client";

import { useEffect, useRef, useState } from "react";

export function RevealOnScroll({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: 0 | 1 | 2 | 3 | 4;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (visible) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  const delayClass = delay ? ` d${delay}` : "";
  return (
    <div
      ref={ref}
      className={`reveal${delayClass}${visible ? " in" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
