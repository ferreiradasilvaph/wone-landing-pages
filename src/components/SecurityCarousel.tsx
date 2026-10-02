"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  KeyRound,
  CopySlash,
  Network,
  Vault,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";

const ICONS: Record<string, LucideIcon> = { KeyRound, CopySlash, Network, Vault };
const EASE = [0.16, 1, 0.3, 1] as const;
const AUTOPLAY_MS = 5200;

/**
 * Carrossel dos itens de segurança: os cards derivam para a esquerda e, à
 * direita, um painel ilustra o item ativo.
 *
 * O painel não é decorativo — ele mostra o detalhe que não cabe no card, então
 * trocar de item realmente entrega informação nova.
 */
export function SecurityCarousel() {
  const { security } = useContent();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % security.items.length),
      AUTOPLAY_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced, paused, security.items.length]);

  const item = security.items[active];
  const ActiveIcon = ICONS[item.icon] ?? ShieldCheck;

  return (
    <div
      className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Trilho dos cards */}
      <div className="min-w-0">
        {/* Máscara só à direita: o card ativo fica na borda esquerda, e um
            desvanecer dos dois lados apagaria justamente ele. */}
        <div
          className="-mx-1 overflow-hidden px-1 py-1"
          style={{
            maskImage:
              "linear-gradient(to right, #000 0%, #000 78%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 0%, #000 78%, transparent 100%)",
          }}
        >
          <motion.ul
            className="flex gap-4"
            animate={{ x: `calc(${-active} * (min(20rem, 72vw) + 1rem))` }}
            transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
          >
            {security.items.map((entry, index) => {
              const Icon = ICONS[entry.icon] ?? ShieldCheck;
              const isActive = index === active;

              return (
                <li key={entry.title} className="w-[min(20rem,72vw)] shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-current={isActive}
                    className={`surface h-full w-full cursor-pointer rounded-2xl p-6 text-left transition-all duration-500 ${
                      isActive
                        ? "border-brand/40 opacity-100"
                        : "opacity-45 hover:opacity-75"
                    }`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-500 ${
                        isActive
                          ? "border-brand/40 bg-brand/15 text-brand"
                          : "border-line bg-ink-900 text-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display mt-5 text-lg font-semibold text-cream">
                      {entry.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {entry.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        </div>

        {/* Indicadores */}
        <div className="mt-6 flex gap-1.5">
          {security.items.map((entry, index) => (
            <button
              key={entry.title}
              type="button"
              onClick={() => setActive(index)}
              aria-label={entry.title}
              className="h-1.5 cursor-pointer rounded-full transition-all duration-300"
              style={{
                width: index === active ? "2rem" : "0.75rem",
                background:
                  index === active ? "#FF7700" : "rgba(255,255,227,0.18)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Painel do item ativo */}
      <div className="surface relative min-h-[18rem] overflow-hidden rounded-3xl p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-brand/15 blur-[80px]"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -16 }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
            className="relative"
          >
            {/* Emblema grande do item */}
            <div className="relative mb-6 flex h-28 items-center justify-center">
              {[112, 84, 60].map((size, index) => (
                <span
                  key={size}
                  className="absolute rounded-full border border-brand"
                  style={{ height: size, width: size, opacity: 0.2 - index * 0.04 }}
                />
              ))}
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand shadow-[0_0_32px_rgba(255,119,0,0.35)]">
                <ActiveIcon className="h-7 w-7" />
              </span>
            </div>

            <h4 className="font-display text-center text-base font-semibold text-cream">
              {item.title}
            </h4>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              {item.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
