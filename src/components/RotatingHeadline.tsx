"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const INTERVAL_MS = 3800;

/**
 * Gira a segunda metade do título do hero entre as variações.
 *
 * O texto é absoluto sobre um gêmeo invisível que contém a variação mais longa:
 * assim a altura da linha é a mesma em todas as frases e o conteúdo abaixo não
 * pula a cada troca. Com `prefers-reduced-motion`, fica parado na primeira.
 */
export function RotatingHeadline({ variants }: { variants: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (reduced || variants.length < 2) return;

    const id = window.setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % variants.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reduced, variants.length]);

  // O idioma pode mudar com um índice fora do novo intervalo.
  const safeIndex = index % variants.length;
  const longest = variants.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span
      className="relative inline-block align-top"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* Reserva de espaço: nunca visível, só define a caixa. */}
      <span aria-hidden className="invisible block">
        {longest}
      </span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={safeIndex}
          initial={{ opacity: 0, y: "0.35em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: reduced ? 0 : "-0.35em", filter: "blur(6px)" }}
          transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-gradient absolute inset-0 block"
        >
          {variants[safeIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
