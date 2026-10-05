"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Info } from "lucide-react";
import { FlagMark } from "../FlagMark";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Checkout do mesmo plano, na moeda de cada país.
 *
 * Os países, bandeiras, símbolos e métodos de pagamento vêm de
 * `payments.card.countries` — a mesma lista que a seção de Pagamentos usa, para
 * não existirem duas verdades sobre onde a Wone cobra.
 */
export function CheckoutDemo() {
  const { highlights, payments } = useContent();
  const demo = highlights.demos.checkout;
  const reduced = useReducedMotion();
  const countries = payments.card.countries;

  const [index, setIndex] = useState(0);
  const country = countries[index];
  const price =
    demo.prices.find((entry) => entry.code === country.code) ?? demo.prices[0];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold text-cream">{demo.title}</h3>
        <p className="mt-1.5 text-sm text-muted">{demo.subtitle}</p>

        {/* Seletor de país */}
        <ul className="mt-7 grid grid-cols-1 gap-2.5 min-[26rem]:grid-cols-2">
          {countries.map((entry, entryIndex) => {
            const isActive = entryIndex === index;

            return (
              <li key={entry.code}>
                <button
                  type="button"
                  onClick={() => setIndex(entryIndex)}
                  aria-pressed={isActive}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors duration-300 ${
                    isActive
                      ? "border-brand/45 bg-brand/10"
                      : "border-line bg-ink-950/50 hover:border-line-strong"
                  }`}
                >
                  <FlagMark code={entry.code} active={isActive} className="h-5 w-7" />
                  <span className="min-w-0 leading-tight">
                    <span
                      className={`block truncate text-xs font-semibold transition-colors ${
                        isActive ? "text-cream" : "text-muted"
                      }`}
                    >
                      {entry.name}
                    </span>
                    <span className="block font-mono text-[10px] text-faint">
                      {entry.code}
                    </span>
                  </span>
                  {isActive && (
                    <Check className="ml-auto h-3.5 w-3.5 shrink-0 stroke-[3] text-brand" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Card de checkout */}
      <div className="surface relative overflow-hidden rounded-2xl p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-brand/15 blur-[70px]"
        />

        <div className="relative">
          <span className="t-eyebrow text-faint">{demo.product}</span>
          <p className="mt-1 text-xs text-faint">{demo.productNote}</p>

          {/* Preço: troca com animação ao mudar de país */}
          <div className="mt-5 flex items-end gap-2">
            <FlagMark code={country.code} active className="mb-1.5 h-6 w-9" />
            <span className="pb-1 font-mono text-lg font-semibold text-brand">
              {country.symbol}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={country.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                className="tnum text-4xl leading-none font-bold text-cream"
              >
                {price.display}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Métodos daquele país */}
          <div className="mt-6 border-t border-line pt-5">
            <span className="t-eyebrow text-faint">{demo.payWith}</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={country.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                className="mt-2 text-sm font-medium text-cream"
              >
                {country.method}
              </motion.p>
            </AnimatePresence>
          </div>

          <button
            type="button"
            disabled
            className="btn-brand mt-6 w-full cursor-default rounded-xl py-3 text-sm font-bold opacity-90"
          >
            {country.symbol} {price.display}
          </button>

          <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {demo.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
