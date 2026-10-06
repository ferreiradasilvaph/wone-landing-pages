"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Globe, Info } from "lucide-react";
import { FlagMark } from "./FlagMark";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Intervalo com que o quadro troca de país sozinho. */
const ROTATE_MS = 2800;

/**
 * Quadro de moedas do checkout internacional.
 *
 * O "Checkout internacional" era meia coluna de um card dividido com o
 * rastreamento: um parágrafo e quatro linhinhas com bandeira e método. O
 * designer foi direto — "está muito pequena, tinha de ser mais agressiva; os
 * superiores batem muito nessa tecla, isso tem de ser essencial" — e pediu
 * atenção às moedas: qual moeda de qual país, com os termos escritos, ocupando
 * espaço com dado de verdade.
 *
 * Então ele virou a faixa que abre a seção, do tamanho da promessa: o mesmo
 * plano anual trocando de moeda num número grande, e abaixo as quatro colunas
 * com país, moeda por extenso, código ISO, símbolo, valor local e método de
 * pagamento. Nada inventado — os quatro países, métodos e símbolos vêm da mesma
 * lista que o resto do site usa (`payments.card.countries`), e os valores são os
 * mesmos da demo do checkout, com o aviso de ilustrativos no pé.
 *
 * O quadro anda sozinho a cada 2,8 s, para a troca de moeda acontecer na frente
 * de quem só passou o olho. Para com o ponteiro em cima ou com o foco dentro, e
 * o primeiro clique numa coluna desliga o rodízio — quem está lendo manda.
 */
export function CheckoutBoard() {
  const { payments, highlights } = useContent();
  const card = payments.card;
  const countries = card.countries;
  const prices = highlights.demos.checkout.prices;
  const reduced = useReducedMotion();

  const [active, setActive] = useState(0);
  const [tookOver, setTookOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef(0);

  const priceOf = useCallback(
    (code: string) => prices.find((entry) => entry.code === code) ?? prices[0],
    [prices],
  );

  useEffect(() => {
    if (reduced || tookOver || paused) return;

    timer.current = window.setInterval(
      () => setActive((current) => (current + 1) % countries.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer.current);
  }, [reduced, tookOver, paused, countries.length]);

  const choose = (index: number) => {
    setActive(index);
    setTookOver(true);
  };

  const country = countries[active];
  const price = priceOf(country.code);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      className="surface-lit relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
    >
      {/* Luz atrás do número: é o que dá o peso que o pedido cobrava */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/4 hidden h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand/12 blur-[110px] sm:block"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <span className="t-eyebrow text-brand">{card.title}</span>
            <h3 className="t-h2 mt-2 text-balance text-cream">{card.headline}</h3>
          </div>

          <span className="flex shrink-0 items-center gap-2 rounded-full bg-brand/12 px-3.5 py-2 text-[11px] font-semibold text-brand">
            <Globe className="h-3.5 w-3.5" />
            {card.badge}
          </span>
        </div>

        <p className="t-lead mt-4 max-w-2xl text-pretty">{card.lead}</p>

        {/* O mesmo plano, trocando de moeda */}
        <div className="mt-8 border-t border-line pt-7">
          <span className="t-eyebrow block text-faint">{card.priceLabel}</span>

          {/* `initial={false}`: o primeiro valor nasce pronto na tela, sem
              depender da animação de entrada — só as trocas seguintes deslizam. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={country.code}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
              className="mt-3 flex items-end gap-3"
            >
              <FlagMark code={country.code} active className="mb-2 h-7 w-10" />
              <span className="pb-1.5 font-mono text-xl font-semibold text-brand">
                {country.symbol}
              </span>
              <span className="tnum text-5xl leading-none font-bold text-cream sm:text-6xl">
                {price.display}
              </span>
              <span className="pb-2 font-mono text-sm text-faint">{country.code}</span>
            </motion.span>
          </AnimatePresence>
        </div>

        {/* As quatro moedas, lado a lado */}
        <ul className="mt-7 grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 lg:grid-cols-4">
          {countries.map((entry, index) => {
            const isActive = index === active;
            const entryPrice = priceOf(entry.code);

            return (
              <li key={entry.code}>
                <button
                  type="button"
                  onClick={() => choose(index)}
                  aria-pressed={isActive}
                  className={`relative flex w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all duration-500 ${
                    isActive ? "bg-ink-750" : "bg-ink-900/70 hover:bg-ink-800"
                  }`}
                >
                  {/* Fio laranja no topo marca a coluna em foco */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent transition-opacity duration-500 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <span className="flex items-center gap-2.5">
                    <FlagMark
                      code={entry.code}
                      active={isActive}
                      className="h-6 w-9 shrink-0"
                    />
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm font-semibold transition-colors duration-500 ${
                          isActive ? "text-cream" : "text-muted"
                        }`}
                      >
                        {entry.name}
                      </span>
                      <span className="block truncate text-[11px] text-faint">
                        {entry.currency}
                      </span>
                    </span>
                  </span>

                  <span className="flex items-baseline gap-1.5">
                    <span
                      className={`font-mono text-sm font-semibold transition-colors duration-500 ${
                        isActive ? "text-brand" : "text-faint"
                      }`}
                    >
                      {entry.symbol}
                    </span>
                    <span
                      className={`tnum text-lg font-bold transition-colors duration-500 ${
                        isActive ? "text-cream" : "text-muted"
                      }`}
                    >
                      {entryPrice.display}
                    </span>
                    <span className="tnum ml-auto font-mono text-[11px] text-faint">
                      {entry.code}
                    </span>
                  </span>

                  <span className="border-t border-line pt-2.5 leading-tight">
                    <span className="t-eyebrow block text-[9px] text-faint">
                      {card.methodLabel}
                    </span>
                    <span
                      className={`mt-1 block text-xs transition-colors duration-500 ${
                        isActive ? "text-cream" : "text-muted"
                      }`}
                    >
                      {entry.method}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {card.priceNote}
        </p>
      </div>
    </div>
  );
}
