"use client";

import { useEffect } from "react";

export function AmbientBackground() {
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    const ambient = document.getElementById("ambient");
    if (!ambient) return;

    const CLOUD_COUNT = 6;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const cloud = document.createElement("div");
      cloud.className = "cloud";
      const size = 200 + Math.random() * 400;
      cloud.style.width = size + "px";
      cloud.style.height = size + "px";
      cloud.style.left = Math.random() * 100 + "%";
      cloud.style.top = Math.random() * 100 + "%";
      cloud.style.animationDuration = 40 + Math.random() * 40 + "s";
      cloud.style.animationDelay = Math.random() * -40 + "s";
      ambient.appendChild(cloud);
    }

    return () => {
      ambient.innerHTML = "";
    };
  }, []);

  return (
    <>
      <div className="ambient" id="ambient" aria-hidden="true" />
      <div className="dot-pattern" />
    </>
  );
}
