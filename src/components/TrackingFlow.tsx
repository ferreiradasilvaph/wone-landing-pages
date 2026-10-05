"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { MousePointerClick, Bot, QrCode, CheckCircle2, Target } from "lucide-react";
import { useContent } from "@/i18n";

const STEP_ICONS = [MousePointerClick, Bot, QrCode, CheckCircle2, Target];
const STEP_MS = 900;

/**
 * Caminho do dado, do clique no anúncio até o pixel de volta.
 *
 * Os nós acendem em sequência quando a seção entra na tela, e o traço entre
 * eles se preenche junto — a ideia é o lead *ver* que o rastreio é uma cadeia,
 * não uma lista de logos.
 */
export function TrackingFlow() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const { payments } = useContent();
  const steps = payments.tracking.flow;

  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;

    let current = 0;
    const id = window.setInterval(() => {
      current += 1;
      setAnimated(current);
      if (current >= steps.length) window.clearInterval(id);
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, [inView, reduced, steps.length]);

  // Sem movimento, todos já aparecem acesos — derivado, não via setState num
  // efeito, que dispararia renderização em cascata.
  const lit = reduced && inView ? steps.length : animated;

  return (
    <ol ref={ref} className="relative space-y-1">
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[index] ?? Target;
        const active = index < lit;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.label} className="relative flex gap-4 pb-5 last:pb-0">
            {/* Trilho entre os nós */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute top-10 left-[1.1875rem] h-[calc(100%-1.5rem)] w-px bg-line"
              >
                <motion.span
                  className="block w-px bg-brand"
                  initial={{ height: 0 }}
                  animate={{ height: active ? "100%" : 0 }}
                  transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            )}

            <span
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
                active ? "bg-brand text-ink-950" : "bg-ink-800 text-faint"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 pt-1.5">
              <p
                className={`text-sm font-semibold transition-colors duration-500 ${
                  active ? "text-cream" : "text-muted"
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-faint">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
