"use client";

import { useEffect, useRef } from "react";

/**
 * Halo laranja que acompanha o cursor pela página inteira.
 *
 * `mix-blend-screen` faz a luz somar em vez de cobrir o conteúdo, e z-30 a
 * mantém acima do fundo das seções, abaixo do grão (z-60) e do header (z-50).
 * Os eventos de mousemove são agrupados em um repaint por frame, e ponteiros
 * grosseiros (toque) nem registram o listener.
 */
export function InteractiveBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (noMotion || coarse) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
      el.style.opacity = "1";
    };

    const handleMouseMove = (event: MouseEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const handleMouseLeave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 opacity-0 mix-blend-screen transition-opacity duration-500"
      style={{
        background:
          "radial-gradient(34rem circle at var(--mouse-x, -50rem) var(--mouse-y, -50rem), rgba(255, 119, 0, 0.11), transparent 70%)",
      }}
    />
  );
}
