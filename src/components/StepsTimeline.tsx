"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useSpring, useReducedMotion } from "motion/react";
import { useContent } from "@/i18n";
import { StepIcon } from "./StepIcons";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Uma etapa: nó numerado, texto e o ícone que entra junto com a linha. */
function Step({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
      className="group relative pb-12 last:pb-0"
    >
      <span className="absolute top-0 -left-12 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ink-900 font-mono text-sm font-bold text-cream transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-ink-950 sm:-left-16">
        {step}
      </span>

      <span
        aria-hidden
        className="absolute top-5 -left-6 hidden h-px w-5 bg-line transition-colors duration-300 group-hover:bg-brand/60 sm:block"
      />

      <div className="flex items-center gap-5">
        <div className="min-w-0 flex-1 pt-1.5">
          <h3 className="font-display text-xl font-semibold text-cream">{title}</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {description}
          </p>
        </div>

        {/* O ícone entra quando a linha do tempo alcança esta etapa */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={
            inView
              ? { opacity: 1, scale: 1, rotate: 0 }
              : { opacity: 0, scale: reduced ? 1 : 0.6, rotate: reduced ? 0 : -12 }
          }
          transition={{ duration: reduced ? 0 : 0.7, ease: EASE, delay: reduced ? 0 : 0.15 }}
          className="relative hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-line bg-ink-900/60 p-4 sm:flex"
        >
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl bg-brand/10 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
          />
          <StepIcon name={icon} />
        </motion.div>
      </div>
    </motion.li>
  );
}

/**
 * Linha do tempo das 4 etapas. O traço vertical se preenche conforme a seção
 * rola — é o que amarra os quatro passos em um percurso só.
 */
export function StepsTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const { howItWorks } = useContent();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 55%"],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-3xl pl-12 sm:pl-16">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px bg-line sm:left-[1.6875rem]"
      />
      <motion.span
        aria-hidden
        style={{ scaleY: fill }}
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px origin-top bg-gradient-to-b from-brand via-brand to-brand/0 sm:left-[1.6875rem]"
      />

      {howItWorks.steps.map((step) => (
        <Step
          key={step.step}
          step={step.step}
          title={step.title}
          description={step.description}
          icon={step.icon}
        />
      ))}
    </ol>
  );
}
