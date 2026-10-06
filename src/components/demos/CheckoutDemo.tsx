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
 *
 * Título e subtítulo vivem no cabeçalho do painel, em `Highlights`.
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
    /* A lista de países em coluna única, ao lado do checkout e centrada contra
       ele: em duas colunas ela terminava na metade da altura do card e sobrava
       um buraco embaixo à esquerda. */
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(0,1fr)_20rem] sm:gap-7">
      <ul className="grid min-w-0 grid-cols-1 gap-2">
        {countries.map((entry, entryIndex) => {
          const isActive = entryIndex === index;
          /* O preço daquele país na própria linha: a lista deixa de ser um
             seletor com meia linha de texto e passa a mostrar, de uma vez, o
             que a seção promete — o mesmo plano em quatro moedas. */
          const entryPrice = demo.prices.find((item) => item.code === entry.code);

          return (
            <li key={entry.code}>
              <button
                type="button"
                onClick={() => setIndex(entryIndex)}
                aria-pressed={isActive}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors duration-300 ${
                  isActive ? "bg-ink-750" : "bg-ink-900/60 hover:bg-ink-800"
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
                <span
                  className={`tnum ml-auto shrink-0 font-mono text-xs transition-colors duration-300 ${
                    isActive ? "text-cream" : "text-faint"
                  }`}
                >
                  {entry.symbol} {entryPrice?.display}
                </span>
                {/* O visto ocupa lugar mesmo apagado: sem isso o preço escorrega
                    para o lado a cada troca de país. */}
                <Check
                  aria-hidden
                  className={`h-3.5 w-3.5 shrink-0 stroke-[3] text-brand transition-opacity duration-300 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Card de checkout */}
      <div className="surface relative overflow-hidden rounded-2xl p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 hidden h-40 w-40 rounded-full bg-brand/15 blur-[70px] sm:block"
        />

        <div className="relative">
          <span className="t-eyebrow text-faint">{demo.product}</span>
          <p className="mt-1 text-xs text-faint">{demo.productNote}</p>

          {/* Preço: troca com animação ao mudar de país */}
          <div className="mt-4 flex items-end gap-2">
            <FlagMark code={country.code} active className="mb-1 h-5 w-8" />
            <span className="pb-0.5 font-mono text-base font-semibold text-brand">
              {country.symbol}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={country.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                className="tnum text-[2rem] leading-none font-bold text-cream"
              >
                {price.display}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Métodos daquele país */}
          <div className="mt-4 border-t border-line pt-3.5">
            <span className="t-eyebrow text-faint">{demo.payWith}</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={country.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                className="mt-1.5 text-sm font-medium text-cream"
              >
                {country.method}
              </motion.p>
            </AnimatePresence>
          </div>

          <button
            type="button"
            disabled
            className="btn-solid mt-4 w-full cursor-default rounded-xl py-2.5 text-sm font-bold opacity-90"
          >
            {country.symbol} {price.display}
          </button>

          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            {demo.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
