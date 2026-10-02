"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Award, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { PLAQUES } from "@/data/content";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Carrossel dos marcos de faturamento. Cada troféu tem a sua cor de destaque,
 * que tinge a aura do cartão, o selo e a aba ativa — então trocar de nível muda
 * a temperatura da seção inteira, não só a foto.
 */
export function AwardsShowcase() {
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const active = PLAQUES[index];

  const go = useCallback((next: number, dir: number) => {
    setState([(next + PLAQUES.length) % PLAQUES.length, dir]);
  }, []);

  return (
    <div className="relative">
      {/* Abas dos níveis */}
      <div
        role="tablist"
        aria-label="Marcos de faturamento"
        className="mb-8 flex flex-wrap items-center justify-center gap-2"
      >
        {PLAQUES.map((item, idx) => {
          const isActive = idx === index;
          return (
            <button
              key={item.tier}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => go(idx, idx > index ? 1 : -1)}
              className={`relative cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? "text-ink-950" : "text-muted hover:text-cream"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="award-tab"
                  className="absolute inset-0 -z-10 rounded-full"
                  style={{ background: item.accent }}
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                />
              )}
              {!isActive && (
                <span className="absolute inset-0 -z-10 rounded-full border border-line bg-ink-850" />
              )}
              {item.tier}
            </button>
          );
        })}
      </div>

      <div className="surface relative overflow-hidden rounded-3xl p-6 shadow-2xl sm:p-10 lg:p-12">
        {/* Aura na cor do nível ativo */}
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
          {/* Texto */}
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
                  Marco {active.tier}
                </span>
                <h3 className="t-h3 mt-2 text-cream">{active.title}</h3>
                <p className="mt-1.5 text-sm font-semibold" style={{ color: active.accent }}>
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
                    <span className="t-eyebrow block text-faint">Item físico enviado</span>
                    <p className="mt-0.5 text-xs font-semibold text-cream">
                      {active.awardItem}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controles */}
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => go(index - 1, -1)}
                aria-label="Marco anterior"
                className="cursor-pointer rounded-xl border border-line bg-ink-850 p-3 text-cream transition-colors hover:border-brand/50 hover:text-brand"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1, 1)}
                aria-label="Próximo marco"
                className="cursor-pointer rounded-xl border border-line bg-ink-850 p-3 text-cream transition-colors hover:border-brand/50 hover:text-brand"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="ml-3 flex gap-1.5">
                {PLAQUES.map((item, dotIdx) => (
                  <button
                    key={item.tier}
                    type="button"
                    onClick={() => go(dotIdx, dotIdx > index ? 1 : -1)}
                    aria-label={`Ir para o marco ${item.tier}`}
                    className="h-2 cursor-pointer rounded-full transition-all duration-300"
                    style={{
                      width: dotIdx === index ? "1.5rem" : "0.5rem",
                      background: dotIdx === index ? active.accent : "rgba(255,255,227,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Foto do troféu */}
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-line bg-ink-950">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={active.tier}
                custom={direction}
                initial={{ opacity: 0, scale: 1.06, x: direction * 40 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98, x: direction * -40 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="absolute inset-0"
              >
                <Image
                  src={active.image}
                  alt={active.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(to top, rgba(5,5,6,0.85), transparent 55%)`,
              }}
            />

            <div
              className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-xl border bg-ink-950/75 px-3 py-2 backdrop-blur-sm"
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
