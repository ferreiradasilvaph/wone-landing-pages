"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Award, Sparkles } from "lucide-react";
import { useContent } from "@/i18n";

/** O three fica fora do bundle inicial e nunca roda no servidor. */
const AwardPlaque3D = dynamic(() => import("./AwardPlaque3D"), {
  ssr: false,
  loading: () => <PlaqueSkeleton />,
});

const EASE = [0.16, 1, 0.3, 1] as const;
/** Quanto tempo a barra leva para percorrer um marco. */
const TIER_MS = 4200;
const FRAME_MS = 40;

function PlaqueSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-48 w-36 animate-pulse rounded-2xl bg-ink-850" />
    </div>
  );
}

/**
 * Carrossel dos marcos com barra de progresso contínua.
 *
 * A barra anda sozinha de 0 a 100% e o marco exibido é o quarto em que ela
 * está — 0–25% é o 10K, 25–50% o 100K, e assim por diante. Passar o cursor
 * sobre um dos rótulos trava a barra naquele marco; ao sair, ela retoma de
 * onde parou.
 */
export function AwardsShowcase() {
  const { awards } = useContent();
  const reduced = useReducedMotion();

  // `next/dynamic` só adia o download até o componente RENDERIZAR — e ele
  // renderizaria de imediato, mesmo com a seção fora da tela, trazendo os
  // ~960KB do three para o carregamento inicial. Montar o canvas apenas quando
  // a seção se aproxima é o que de fato tira esse peso da primeira visita.
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useInView(stageRef, { once: true, margin: "600px" });
  /* Este não é `once`: fora da tela, a placa para de girar. */
  const onScreen = useInView(stageRef, { amount: 0.2 });

  const count = awards.items.length;
  const [progress, setProgress] = useState(0);
  /** Marco sob o cursor; enquanto existe, a barra fica parada nele. */
  const [pinned, setPinned] = useState<number | null>(null);

  useEffect(() => {
    if (reduced || pinned !== null) return;

    const stepPerFrame = 100 / ((TIER_MS * count) / FRAME_MS);
    const id = window.setInterval(() => {
      setProgress((value) => (value + stepPerFrame) % 100);
    }, FRAME_MS);

    return () => window.clearInterval(id);
  }, [reduced, pinned, count]);

  // Com um marco preso, ele manda; senão, vale o quarto em que a barra está.
  const index =
    pinned ?? Math.min(count - 1, Math.floor((progress / 100) * count));
  const active = awards.items[index];
  // A barra mostra o meio do marco preso, para o preenchimento bater com o rótulo.
  const shown = pinned !== null ? ((pinned + 0.5) / count) * 100 : progress;

  return (
    <div>
      {/* Barra de progresso com os marcos */}
      <div className="mb-10">
        <div
          className="relative h-2 rounded-full bg-cream/8"
          role="progressbar"
          aria-label={awards.title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(shown)}
          aria-valuetext={active.tier}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: active.accent }}
            animate={{ width: `${shown}%` }}
            transition={{
              duration: pinned !== null && !reduced ? 0.45 : 0,
              ease: EASE,
            }}
          />

          {awards.items.map((item, idx) => {
            const position = ((idx + 1) / count) * 100;
            const reached = shown >= position - 100 / count;
            return (
              <span
                key={item.tier}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position}%` }}
              >
                <span
                  className="block h-3 w-3 rounded-full transition-colors duration-300"
                  style={{ background: reached ? item.accent : "rgba(255,255,227,0.22)" }}
                />
              </span>
            );
          })}
        </div>

        {/* Rótulos: o cursor sobre um deles trava a barra naquele marco */}
        <div className="mt-3 flex justify-between">
          {awards.items.map((item, idx) => (
            <button
              key={item.tier}
              type="button"
              onMouseEnter={() => setPinned(idx)}
              onMouseLeave={() => setPinned(null)}
              onFocus={() => setPinned(idx)}
              onBlur={() => setPinned(null)}
              onClick={() => setProgress(((idx + 0.5) / count) * 100)}
              aria-pressed={idx === index}
              className={`cursor-pointer rounded px-2 py-1 font-mono text-xs font-bold transition-colors ${
                idx === index ? "text-cream" : "text-faint hover:text-muted"
              }`}
            >
              {item.tier}
            </button>
          ))}
        </div>

        <p className="t-eyebrow mt-4 text-center text-faint">
          {awards.progressLabel}
        </p>
      </div>

      <div className="surface relative overflow-hidden rounded-3xl p-6 shadow-2xl sm:p-10 lg:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.tier}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute -top-32 -right-24 hidden h-80 w-80 rounded-full blur-[110px] sm:block"
            style={{ background: active.accent }}
          />
        </AnimatePresence>

        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.tier}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <span className="t-eyebrow" style={{ color: active.accent }}>
                  {awards.milestoneLabel} {active.tier}
                </span>
                <h3 className="t-h3 mt-2 text-cream">{active.title}</h3>
                <p
                  className="mt-1.5 text-sm font-semibold"
                  style={{ color: active.accent }}
                >
                  {active.subtitle}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {active.description}
                </p>

                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-ink-800 p-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                    style={{ color: active.accent }}
                  >
                    <Award className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="t-eyebrow block text-faint">
                      {awards.physicalItem}
                    </span>
                    <p className="mt-0.5 text-xs font-semibold text-cream">
                      {active.awardItem}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Placa 3D, sem imagem de fundo: o canvas é transparente */}
          <div ref={stageRef} className="relative aspect-square w-full">
            {near ? (
              <AwardPlaque3D
                accent={active.accent}
                image={active.image}
                visible={onScreen}
              />
            ) : (
              <PlaqueSkeleton />
            )}

            <div
              className="absolute bottom-2 left-2 z-10 flex items-center gap-2 rounded-xl bg-ink-900/80 px-3 py-2 backdrop-blur-sm"
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: active.accent }} />
              <span className="leading-tight">
                <span className="t-eyebrow block text-faint">Wone Club</span>
                <span className="block font-mono text-sm font-bold text-cream">
                  {active.tier}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
