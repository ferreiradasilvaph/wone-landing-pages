"use client";

import React, { useCallback, useRef, useState } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

/**
 * Cartão com dois efeitos ligados ao ponteiro:
 *  1. um halo radial difuso sobre a superfície;
 *  2. uma borda de 1px que acende só no trecho mais próximo do cursor
 *     (`.border-glow` recorta o degradê em uma moldura via mask-composite).
 *
 * As coordenadas vão para variáveis CSS e são atualizadas uma vez por frame,
 * então mover o mouse sobre uma grade inteira de cartões não dispara re-render.
 */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(255, 119, 0, 0.16)",
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [active, setActive] = useState(false);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || frame.current) return;

    const { clientX, clientY } = event;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${clientX - rect.left}px`);
      el.style.setProperty("--spot-y", `${clientY - rect.top}px`);
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    setActive(false);
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={handleMouseLeave}
      className={`surface group/card relative isolate overflow-hidden rounded-2xl p-6 transition-transform duration-500 ease-out ${className}`}
      {...props}
    >
      {/* Halo difuso sobre a superfície */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px transition-opacity duration-500"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(22rem circle at var(--spot-x, 50%) var(--spot-y, 50%), ${spotlightColor}, transparent 65%)`,
        }}
      />

      {/* Moldura de 1px que acende perto do cursor */}
      <div
        aria-hidden
        className="border-glow transition-opacity duration-500"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(14rem circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255, 157, 69, 0.85), transparent 60%)`,
        }}
      />

      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
