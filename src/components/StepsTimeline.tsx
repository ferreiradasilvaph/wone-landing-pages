"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";
import { HOW_IT_WORKS } from "@/data/content";

/**
 * Linha do tempo das 4 etapas. O traço vertical se preenche conforme a seção
 * rola — é o que amarra os quatro passos em um percurso só, em vez de quatro
 * cartões soltos.
 */
export function StepsTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 55%"],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-3xl pl-12 sm:pl-16">
      {/* Trilho e preenchimento */}
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px bg-line sm:left-[1.6875rem]"
      />
      <motion.span
        aria-hidden
        style={{ scaleY: fill }}
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px origin-top bg-gradient-to-b from-brand via-brand to-brand/0 sm:left-[1.6875rem]"
      />

      {HOW_IT_WORKS.map((step) => (
        <motion.li
          key={step.step}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="group relative pb-10 last:pb-0"
        >
          {/* Nó na linha */}
          <span className="absolute top-0 -left-12 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink-900 font-mono text-sm font-bold text-cream transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-ink-950 sm:-left-16">
            {step.step}
          </span>

          <div className="pt-1.5">
            <h3 className="font-display text-xl font-semibold text-cream">{step.title}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {step.description}
            </p>
          </div>

          {/* Fio horizontal ligando o nó ao texto, só em telas largas */}
          <span
            aria-hidden
            className="absolute top-5 -left-6 hidden h-px w-5 bg-line transition-colors duration-300 group-hover:bg-brand/60 sm:block"
          />
        </motion.li>
      ))}
    </ol>
  );
}
