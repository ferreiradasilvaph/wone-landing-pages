"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

type CounterProps = {
  to: number;
  /** Casas decimais exibidas. Útil para valores como 1,2s. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
};

/**
 * Número que conta a partir de zero quando entra na tela, uma única vez.
 *
 * Usa `requestAnimationFrame` com desaceleração exponencial em vez de um
 * `setInterval`, para o valor chegar ao alvo exato em qualquer taxa de quadros.
 * Com `prefers-reduced-motion` o valor final aparece direto.
 */
export function Counter({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1600,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    // Com movimento reduzido o alvo é atingido no primeiro quadro. O valor
    // precisa continuar vindo do estado: `useReducedMotion` é `null` no
    // servidor e `true` no cliente, então derivá-lo direto no corpo do
    // componente faria o texto do HTML divergir e quebraria a hidratação.
    const duration = reduced ? 1 : durationMs;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo: arranca rápido e assenta no alvo sem sobressalto
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(to * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, to, durationMs]);

  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={`tnum ${className ?? ""}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
