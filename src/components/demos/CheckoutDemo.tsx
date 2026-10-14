"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { FlagMark } from "../FlagMark";
import { CtaButton } from "../CtaButton";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Alvo de toque do botão `object`: 36px de pílula + 4px de pseudo-elemento em
   cima e embaixo = os 44 do portão, sem mudar o desenho. Repetido nas três
   demos com botão porque `cta.ts` é kit e não se toca nesta rodada — ver o
   comentário em DeliveryDemo.tsx. */
const ALVO_44 =
  "relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']";

/* O globo num chunk próprio: o three só é baixado por quem abre esta aba. */
const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="h-full rounded-full bg-ink-900" />
  ),
});

/**
 * Checkout do mesmo plano, na moeda de cada país.
 *
 * Os países, bandeiras, símbolos e métodos de pagamento vêm de
 * `payments.table.countries` — a mesma lista que a seção de Pagamentos usa, para
 * não existirem duas verdades sobre onde a Wone cobra.
 *
 * O designer achou esta demo simples perto das outras, apontando a parte das
 * bandeiras: era uma lista de quatro linhas num canto. Agora a coluna da
 * esquerda é um globo de pontos que gira até pôr o país escolhido de frente
 * (`GlobeScene`), com as quatro bandeiras logo abaixo servindo de seletor — a
 * bandeira ficou do tamanho de bandeira, e o país virou lugar no mundo em vez
 * de linha numa lista.
 *
 * Título e subtítulo vivem no cabeçalho do painel, em `Highlights`.
 */
export function CheckoutDemo() {
  const { highlights, payments } = useContent();
  const demo = highlights.demos.checkout;
  const reduced = useReducedMotion();
  const countries = payments.table.countries;

  const [index, setIndex] = useState(0);
  const country = countries[index];
  const price =
    demo.prices.find((entry) => entry.code === country.code) ?? demo.prices[0];

  /* Identidade estável da lista: sem isto o globo recalcularia os marcadores a
     cada renderização, e ele só precisa saber quando a lista muda de idioma. */
  const codes = useMemo(() => countries.map((entry) => entry.code), [countries]);

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-7">
      <div className="mx-auto w-[15rem] max-w-full">
        <div className="h-[13rem] w-full">
          <GlobeScene codes={codes} active={index} reduced={!!reduced} />
        </div>

        {/* País de frente no globo, escrito */}
        <div className="-mt-1 flex flex-col items-center leading-tight">
          <AnimatePresence mode="wait">
            <motion.p
              key={country.code}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
              className="text-sm font-semibold text-cream"
            >
              {country.name}
            </motion.p>
          </AnimatePresence>
          <p className="mt-0.5 text-[13px] text-faint">{country.methods.join(", ")}</p>
        </div>

        {/* As bandeiras: o seletor. Quatro, lado a lado, do tamanho de bandeira */}
        <ul className="mt-3.5 grid grid-cols-4 gap-1.5">
          {countries.map((entry, entryIndex) => {
            const isActive = entryIndex === index;

            return (
              <li key={entry.code}>
                <button
                  type="button"
                  onClick={() => setIndex(entryIndex)}
                  aria-pressed={isActive}
                  aria-label={entry.name}
                  className={`rounded-field flex w-full cursor-pointer flex-col items-center gap-1 px-1 py-2 transition-colors duration-300 ${
                    isActive ? "bg-ink-750" : "bg-ink-900 hover:bg-ink-800"
                  }`}
                >
                  {/* Bandeira estática de 36×24: o brilho que varria a do país
                      ativo saiu junto com os relógios decorativos. O que marca
                      a escolha é o tom do fundo, não o contorno (regra 8). */}
                  <FlagMark
                    code={entry.code}
                    className={`h-6 w-9 transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-60"
                    }`}
                  />
                  {/* ISO da moeda: valor de máquina, logo `<code>`. */}
                  <code>{entry.code}</code>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Card de checkout: é a tela do cliente dentro da demo, então segue a
          forma de mini-mockup — fundo ink-950 com moldura de 1px e r-12, a
          única exceção de card dentro de card. O halo laranja desfocado no
          canto saiu com todos os outros blurs da página. */}
      <div className="rounded-field border border-line bg-ink-950 p-5">
        <div>
          <span className="t-label">{demo.product}</span>
          <p className="mt-1 text-[13px] text-faint">{demo.productNote}</p>

          {/* Preço: troca com animação ao mudar de país */}
          <div className="mt-4 flex items-end gap-2">
            <FlagMark code={country.code} className="mb-1 h-5 w-8" />
            <span className="pb-0.5 text-base font-semibold text-brand">
              {country.symbol}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={country.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                className="tnum text-[2rem] leading-none font-semibold text-cream"
              >
                {price.display}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Métodos daquele país */}
          <div className="mt-4 border-t border-line pt-3.5">
            <span className="t-label">{demo.payWith}</span>
            <AnimatePresence mode="wait">
              <motion.p
                key={country.code}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                className="mt-1.5 text-sm font-medium text-cream"
              >
                {country.methods.join(", ")}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Botão de produto: o `object` do CtaButton, a mesma pílula de
              "Rodar" e "Simular de novo". Desabilitado de propósito — é o
              checkout do cliente, não uma ação desta página. */}
          <CtaButton size="object" disabled className={`mt-4 w-full ${ALVO_44}`}>
            {country.symbol} {price.display}
          </CtaButton>

          <p className="mt-3 flex items-start gap-1.5 text-[13px] leading-relaxed text-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {demo.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
