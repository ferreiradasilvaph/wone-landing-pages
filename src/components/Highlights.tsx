"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Zap, Boxes, ShieldCheck, Globe, type LucideIcon } from "lucide-react";
import { useContent } from "@/i18n";
import { Counter } from "./Counter";
import { Reveal } from "./Reveal";
import { DeliveryDemo } from "./demos/DeliveryDemo";
import { BlocksDemo } from "./demos/BlocksDemo";
import { ConfirmationDemo } from "./demos/ConfirmationDemo";
import { CheckoutDemo } from "./demos/CheckoutDemo";

const ICONS: Record<string, LucideIcon> = { Zap, Boxes, ShieldCheck, Globe };
const EASE = [0.16, 1, 0.3, 1] as const;
const ROTATE_MS = 6000;

const DEMOS = [DeliveryDemo, BlocksDemo, ConfirmationDemo, CheckoutDemo];

/**
 * Os quatro números do produto, cada um demonstrando o que significa.
 *
 * Os cards são as abas (`tablist` com ativação manual: as setas movem o foco e
 * Enter/Espaço seleciona — o padrão correto quando trocar de aba troca um painel
 * pesado) e o painel abaixo executa a demonstração correspondente.
 *
 * A rotação automática para de vez no primeiro clique: quem está explorando não
 * pode ter o conteúdo trocado debaixo do cursor.
 */
export function Highlights() {
  const { highlights } = useContent();
  const reduced = useReducedMotion();
  const items = highlights.items;

  const [active, setActive] = useState(0);
  const [tookOver, setTookOver] = useState(false);
  const [hovering, setHovering] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (reduced || tookOver || hovering) return;

    const id = window.setInterval(
      () => setActive((value) => (value + 1) % items.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced, tookOver, hovering, items.length]);

  const select = useCallback((index: number) => {
    setActive(index);
    setTookOver(true);
  }, []);

  /** Setas movem o foco; Enter e Espaço confirmam a aba focada. */
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = items.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;

    if (next !== null) {
      event.preventDefault();
      tabRefs.current[next]?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(index);
    }
  };

  const Demo = DEMOS[active] ?? DeliveryDemo;

  return (
    <section
      className="relative px-5 py-20 sm:px-6"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="mx-auto max-w-7xl">
        <div className="hairline mb-12" />

        <Reveal>
          <p className="t-eyebrow mb-5 text-center text-faint">
            {highlights.demos.tabHint}
          </p>

          {/* Abas. No celular viram faixa rolável com encaixe. */}
          <div
            role="tablist"
            aria-label={highlights.title}
            className="mask-edges -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:mask-none sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
          >
            {items.map((item, index) => {
              const Icon = ICONS[item.icon] ?? Zap;
              const isActive = index === active;

              return (
                <button
                  key={item.title}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  role="tab"
                  id={`highlight-tab-${index}`}
                  aria-selected={isActive}
                  aria-controls="highlight-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  className={`surface group relative w-[17rem] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 sm:w-auto ${
                    isActive
                      ? "border-brand/50 opacity-100 shadow-[0_18px_50px_-24px_rgba(255,119,0,0.75)]"
                      : "opacity-55 hover:opacity-85"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-brand/25 blur-2xl transition-opacity duration-500 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent transition-opacity duration-500 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <span className="relative block">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-500 ${
                        isActive
                          ? "border-brand/40 bg-brand/15 text-brand"
                          : "border-line bg-ink-900 text-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <span className="mt-5 block text-4xl font-semibold tracking-tight text-cream">
                      <Counter
                        to={item.value}
                        decimals={item.decimals}
                        suffix={item.suffix}
                      />
                    </span>

                    <span className="font-display mt-1 block text-base font-semibold text-brand">
                      {item.title}
                    </span>
                    <span className="mt-2.5 block text-sm leading-relaxed text-muted">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Painel da aba ativa. A altura mínima evita que a seção salte. */}
        <Reveal delay={0.1}>
          <div
            role="tabpanel"
            id="highlight-panel"
            aria-labelledby={`highlight-tab-${active}`}
            tabIndex={0}
            className="surface mt-6 min-h-[28rem] rounded-3xl p-6 sm:p-8 lg:p-10"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
              >
                <Demo />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
