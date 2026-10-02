"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Wifi, BatteryMedium, SignalHigh } from "lucide-react";
import { PHONE_TRANSACTIONS } from "@/data/content";
import { WoneIcon } from "./WoneMark";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Aparelho desenhado em HTML/CSS, no lugar de uma foto.
 *
 * A troca resolve três coisas que a imagem não resolvia: o texto da tela fica
 * nítido em qualquer densidade, as cores saem dos tokens da marca (então o
 * fundo é o mesmo preto da página, sem o cinza da foto), e o maior elemento da
 * dobra deixa de ser um PNG pesado.
 *
 * Para leitores de tela é uma ilustração única: `role="img"` com um resumo da
 * cena, e o interior escondido — solto, viraria uma enxurrada de números sem
 * contexto.
 */
export function PhoneMockup() {
  const reduced = useReducedMotion();

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.6, delay: reduced ? 0 : delay, ease: EASE },
  });

  return (
    <div
      role="img"
      aria-label="Tela do Wone Bot: um PIX de R$ 197,00 aprovado, R$ 142.580,00 recebidos no mês e três entregas com status de sucesso."
      className="relative mx-auto w-fit"
    >
      {/* Único fundo do bloco: um halo laranja que respira. Sem superfície
          sólida atrás, o aparelho fica sobre o preto da própria página.
          A centralização fica no pai e a animação no filho — `breathe` anima
          `transform`, e no mesmo elemento ela apagaria o `-translate-*`. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="animate-breathe h-full w-full rounded-full bg-brand/30 blur-[100px]" />
      </div>

      {/* Moldura — a única borda visível do bloco */}
      <div
        aria-hidden
        className="relative w-[268px] rounded-[2.6rem] border border-line-strong bg-gradient-to-b from-ink-750 via-ink-850 to-ink-900 p-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] sm:w-[300px]"
      >
        <div className="relative overflow-hidden rounded-[2.35rem] bg-ink-950">
          {/* Barra de status */}
          <div className="flex items-center justify-between px-6 pt-3.5 pb-1 text-[11px] font-medium text-cream">
            <span className="tnum">21:47</span>
            <span className="flex items-center gap-1 text-cream/70">
              <SignalHigh className="h-3.5 w-3.5" />
              <Wifi className="h-3.5 w-3.5" />
              <BatteryMedium className="h-4 w-4" />
            </span>
          </div>

          {/* Ilha da câmera */}
          <div className="absolute top-2.5 left-1/2 h-6 w-20 -translate-x-1/2 rounded-full bg-black" />

          {/* Cabeçalho do chat */}
          <div className="mt-2 flex items-center gap-2.5 border-b border-line px-5 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
              <WoneIcon className="h-4 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-cream">Wone Bot</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                online
              </span>
            </span>
          </div>

          {/* Anéis + logo */}
          <div className="relative flex h-[148px] items-center justify-center">
            {/* Anéis fixos: garantem o desenho mesmo sem animação */}
            {[132, 102, 72].map((size, index) => (
              <span
                key={size}
                className="absolute rounded-full border border-brand"
                style={{
                  height: size,
                  width: size,
                  opacity: 0.22 - index * 0.05,
                }}
              />
            ))}

            {/* Ondas: somem com prefers-reduced-motion, sem prejuízo */}
            {[0, 1.6].map((delay) => (
              <span
                key={delay}
                className="animate-pulse-ring absolute h-[72px] w-[72px] rounded-full border border-brand/50"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}

            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 shadow-[0_0_28px_rgba(255,119,0,0.45)]">
              <WoneIcon className="h-6 w-auto" />
            </span>
          </div>

          {/* Confirmação do PIX */}
          <motion.div
            {...enter(0.5)}
            className="mx-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
            </span>
            <span className="leading-tight">
              <span className="tnum block text-base font-bold text-emerald-400">
                +R$ 197,00
              </span>
              <span className="block text-[10px] text-cream/60">PIX aprovado</span>
            </span>
          </motion.div>

          {/* Saldo */}
          <motion.div {...enter(0.68)} className="px-5 pt-4">
            <span className="t-eyebrow text-faint">Recebido no mês</span>
            <p className="tnum mt-0.5 text-xl font-bold text-cream">R$ 142.580,00</p>
          </motion.div>

          {/* Entregas */}
          <ul className="mt-3 space-y-1.5 px-4 pb-7">
            {PHONE_TRANSACTIONS.map((item, index) => (
              <motion.li
                key={item.label}
                {...enter(0.82 + index * 0.1)}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-900/70 px-3 py-2"
              >
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[11px] font-medium text-cream">
                    {item.label}
                  </span>
                  <span className="tnum block text-[10px] text-faint">{item.amount}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                  Sucesso
                </span>
              </motion.li>
            ))}
          </ul>

          {/* Indicador de home */}
          <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-cream/25" />
        </div>
      </div>
    </div>
  );
}
