"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const AUTOPLAY_MS = 90;

function PlaqueSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-48 w-36 animate-pulse rounded-2xl border border-line bg-ink-900/80" />
    </div>
  );
}

/**
 * Carrossel dos marcos, controlado por uma barra de progresso contínua.
 *
 * A barra vai de 0 a 100% e cada quarto corresponde a um marco: 0–25% é o 10K,
 * 25–50% o 100K, e assim por diante. É arrastável e avança sozinha, então o
 * lead percebe os marcos como uma escada de faturamento, não como abas soltas.
 */
export function AwardsShowcase() {
  const { awards } = useContent();
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  // `next/dynamic` só adia o download até o componente RENDERIZAR — e ele
  // renderizaria de imediato, mesmo com a seção fora da tela, trazendo os
  // ~960KB do three para o carregamento inicial. Montar o canvas apenas quando
  // a seção se aproxima é o que de fato tira esse peso da primeira visita.
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useInView(stageRef, { once: true, margin: "600px" });

  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);

  const count = awards.items.length;
  // 99.999 evita que progress === 100 estoure o índice para fora do array.
  const index = Math.min(count - 1, Math.floor((progress / 100) * count));
  const active = awards.items[index];

  useEffect(() => {
    if (reduced || dragging || paused) return;

    const id = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + 0.25));
    }, AUTOPLAY_MS);

    return () => window.clearInterval(id);
  }, [reduced, dragging, paused]);

  const setFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setProgress(Math.min(100, Math.max(0, ratio * 100)));
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => setFromPointer(event.clientX);
    const up = () => setDragging(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, setFromPointer]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Barra de progresso com os marcos */}
      <div className="mb-10">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={awards.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={active.tier}
          onPointerDown={(event) => {
            setDragging(true);
            setFromPointer(event.clientX);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setProgress((v) => Math.min(100, v + 5));
            if (event.key === "ArrowLeft") setProgress((v) => Math.max(0, v - 5));
          }}
          className="relative h-2 cursor-pointer rounded-full bg-cream/8 select-none"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-colors duration-500"
            style={{ width: `${progress}%`, background: active.accent }}
          />

          {/* Marcadores de cada marco */}
          {awards.items.map((item, idx) => {
            const position = ((idx + 1) / count) * 100;
            const reached = progress >= position - 100 / count;
            return (
              <span
                key={item.tier}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position}%` }}
              >
                <span
                  className="block h-3.5 w-3.5 rounded-full border-2 transition-colors duration-300"
                  style={{
                    borderColor: reached ? item.accent : "rgba(255,255,227,0.2)",
                    background: reached ? item.accent : "#0f0f14",
                  }}
                />
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex justify-between">
          {awards.items.map((item, idx) => (
            <button
              key={item.tier}
              type="button"
              onClick={() => setProgress(((idx + 0.5) / count) * 100)}
              className={`cursor-pointer font-mono text-xs font-bold transition-colors ${
                idx === index ? "text-cream" : "text-faint hover:text-muted"
              }`}
            >
              {item.tier}
            </button>
          ))}
        </div>

        <p className="t-eyebrow mt-4 text-center text-faint">
          {awards.progressLabel} · {Math.round(progress)}%
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
            className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full blur-[110px]"
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

                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-ink-950/60 p-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: `${active.accent}55`,
                      backgroundColor: `${active.accent}1a`,
                      color: active.accent,
                    }}
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
            {near ? <AwardPlaque3D accent={active.accent} /> : <PlaqueSkeleton />}

            <div
              className="absolute bottom-2 left-2 z-10 flex items-center gap-2 rounded-xl border bg-ink-950/75 px-3 py-2 backdrop-blur-sm"
              style={{ borderColor: `${active.accent}66` }}
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
