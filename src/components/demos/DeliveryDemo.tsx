"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Clock, RotateCcw } from "lucide-react";
import { useContent } from "@/i18n";

/** Duração total da simulação — é o número que o card promete. */
const TOTAL_S = 1.2;
/** Em que segundo cada etapa acende. */
const STEP_AT = [0.15, 0.45, 0.8, 1.2];

/**
 * Cronômetro que percorre de 0,0s a 1,2s enquanto as quatro etapas acendem.
 *
 * O tempo vem de `requestAnimationFrame` e não de um `setInterval` por etapa:
 * assim o relógio chega exatamente em 1,2s em qualquer taxa de quadros, que é
 * o ponto da demonstração.
 */
export function DeliveryDemo() {
  const { highlights } = useContent();
  const demo = highlights.demos.delivery;
  const reduced = useReducedMotion();

  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    // Sem movimento, a simulação salta para o fim no primeiro quadro em vez de
    // correr. O valor precisa continuar vindo do estado: `useReducedMotion` é
    // `null` no servidor e `true` no cliente, e derivá-lo no corpo do
    // componente faria o texto do HTML divergir e quebraria a hidratação.
    const duration = reduced ? 1 : TOTAL_S * 1000;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setElapsed(progress * TOTAL_S);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [reduced, run]);

  const replay = useCallback(() => {
    setElapsed(0);
    setRun((value) => value + 1);
  }, []);

  const shown = elapsed;
  const finished = shown >= TOTAL_S;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold text-cream">{demo.title}</h3>
        <p className="mt-1.5 text-sm text-muted">{demo.subtitle}</p>

        <ol className="mt-7 space-y-1">
          {demo.steps.map((step, index) => {
            const active = shown >= STEP_AT[index];

            return (
              <li key={step.label} className="relative flex gap-4 pb-5 last:pb-0">
                {index < demo.steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-9 left-[0.9375rem] h-[calc(100%-1.25rem)] w-px bg-line"
                  >
                    <motion.span
                      className="block w-px bg-brand"
                      initial={{ height: 0 }}
                      animate={{ height: active ? "100%" : 0 }}
                      transition={{ duration: reduced ? 0 : 0.3 }}
                    />
                  </span>
                )}

                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300 ${
                    active ? "bg-brand text-ink-950" : "bg-ink-800 text-faint"
                  }`}
                >
                  {active ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
                </span>

                <span className="min-w-0 pt-1">
                  <span
                    className={`block text-sm font-semibold transition-colors duration-300 ${
                      active ? "text-cream" : "text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="block text-xs text-faint">{step.detail}</span>
                </span>

                <span className="tnum ml-auto shrink-0 pt-1.5 font-mono text-[11px] text-faint">
                  {STEP_AT[index].toFixed(1).replace(".", ",")}s
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Cronômetro e relógio */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-5 lg:w-56">
        <div className="relative flex h-40 w-40 items-center justify-center">
          {/* Anel de progresso */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFE3" strokeOpacity="0.1" strokeWidth="5" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#FF7700"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - shown / TOTAL_S)}
            />
          </svg>

          <span className="relative text-center">
            <span className="tnum block text-4xl font-bold text-cream">
              {shown.toFixed(1).replace(".", ",")}s
            </span>
            <span
              className={`mt-1 block text-[11px] font-semibold transition-colors duration-300 ${
                finished ? "text-emerald-400" : "text-faint"
              }`}
            >
              {finished ? demo.done : "…"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-ink-800 px-3 py-2 text-center">
          <Clock className="h-4 w-4 shrink-0 text-brand" />
          <span className="leading-tight">
            <span className="tnum block font-mono text-sm font-bold text-cream">
              {demo.clock}
            </span>
            <span className="block text-[10px] text-faint">{demo.clockNote}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={replay}
          className="btn-ghost inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {demo.replay}
        </button>
      </div>
    </div>
  );
}
