"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Clock, RotateCcw } from "lucide-react";
import { useContent } from "@/i18n";
import { CtaButton } from "../CtaButton";

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
 *
 * Título e subtítulo não estão mais aqui: vivem no cabeçalho do painel, em
 * `Highlights`, igual para as quatro demos.
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
    /* Duas colunas de medida fixa: a lista à esquerda e o cronômetro à direita,
       centrados um contra o outro. A lista ocupava a largura inteira do painel
       antigo, o que deixava meio metro de vazio entre "PIX confirmado" e o
       "0,1s" encostado na borda direita. Agora o carimbo de tempo fica a um
       palmo do texto a que pertence. */
    <div className="grid grid-cols-1 items-center gap-7 sm:grid-cols-[minmax(0,1fr)_12rem] sm:gap-8">
      <ol className="min-w-0">
        {demo.steps.map((step, index) => {
          const active = shown >= STEP_AT[index];

          return (
            <li key={step.label} className="relative flex gap-3.5 pb-4 last:pb-0">
              {index < demo.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-8 left-[0.84375rem] h-[calc(100%-1.25rem)] w-px bg-line"
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
                className={`tnum relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-300 ${
                  active ? "bg-brand text-ink-950" : "bg-ink-800 text-faint"
                }`}
              >
                {active ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : index + 1}
              </span>

              <span className="min-w-0 flex-1 pt-0.5 leading-tight">
                <span
                  className={`block text-[13px] font-semibold transition-colors duration-300 ${
                    active ? "text-cream" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 block text-[13px] text-faint">{step.detail}</span>
              </span>

              {/* Carimbo de tempo: número humano, então Geist com `tnum` — a
                  mono do site vive só dentro de `<code>`, e isto é a duração
                  que a demo promete, não um valor de máquina. */}
              <span className="tnum shrink-0 pt-1 text-[13px] text-faint">
                {STEP_AT[index].toFixed(1).replace(".", ",")}s
              </span>
            </li>
          );
        })}
      </ol>

      {/* Cronômetro, relógio e o botão de repetir, empilhados na coluna estreita */}
      <div className="flex shrink-0 flex-col items-center gap-3.5">
        {/* 8,5rem e não 7,5: o rótulo sob o cronômetro subiu para 13px (piso do
            portão) e, no diâmetro antigo, encostava no anel. */}
        <div className="relative flex h-[8.5rem] w-[8.5rem] items-center justify-center">
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

          <span className="relative flex flex-col items-center">
            <span className="tnum block text-[1.75rem] leading-none font-semibold text-cream">
              {shown.toFixed(1).replace(".", ",")}s
            </span>
            <span
              className={`mt-1 block text-[13px] font-semibold transition-colors duration-300 ${
                finished ? "text-emerald-400" : "text-faint"
              }`}
            >
              {finished ? demo.done : "…"}
            </span>
          </span>
        </div>

        <div className="rounded-field flex w-full items-center gap-2 bg-ink-750 px-3 py-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span className="min-w-0 leading-tight">
            {/* Hora do relógio: valor de máquina, logo `<code>` — é o único
                lugar onde a mono do sistema aparece (regra 2). A cor e o
                tamanho são os do seletor global: o cinza de máquina. */}
            <code>{demo.clock}</code>
            <span className="mt-0.5 block text-[13px] text-faint">{demo.clockNote}</span>
          </span>
        </div>

        {/* Botão de produto dentro da demo: o `object` do CtaButton, a mesma
            pílula dos outros ("Pagar com PIX", "Rodar"), nunca um terceiro
            formato inventado aqui. */}
        <CtaButton size="object" onClick={replay} className="w-full">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {demo.replay}
        </CtaButton>
      </div>
    </div>
  );
}
