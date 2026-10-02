"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Wifi, BatteryMedium, SignalHigh } from "lucide-react";
import { useContent } from "@/i18n";
import { WoneIcon } from "./WoneMark";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Valores do PIX que aparece e some, entre R$ 50 e R$ 250.
 *
 * Lista fixa percorrida em ordem, nunca `Math.random()`: um valor sorteado no
 * render sairia diferente no servidor e no cliente e quebraria a hidratação —
 * erro que já apareceu duas vezes nesta base.
 */
const PIX_AMOUNTS = [197, 67, 247, 97, 147, 57, 227, 117, 187, 77];

const NOTIFICATION_MS = 2600;
const PIX_CYCLE_MS = 4200;
/** Quantas entregas ficam visíveis na janela do carrossel. */
const VISIBLE = 3;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/**
 * Aparelho desenhado em HTML/CSS, no lugar de uma foto: texto nítido em
 * qualquer densidade, cores vindas dos tokens da marca e nada de PNG pesado na
 * primeira dobra.
 *
 * Para leitores de tela é uma ilustração única (`role="img"` com um resumo), e
 * o interior fica escondido — solto, viraria uma enxurrada de números.
 */
export function PhoneMockup() {
  const reduced = useReducedMotion();
  const { phone } = useContent();

  // Índice da primeira entrega visível; avança sozinho e faz a lista girar.
  const [offset, setOffset] = useState(0);
  // `null` = o cartão do PIX está fora da tela, no intervalo entre aparições.
  const [pixIndex, setPixIndex] = useState<number | null>(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setOffset((value) => value + 1),
      NOTIFICATION_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;

    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      // Alterna entre mostrar o próximo valor e sumir por um instante.
      setPixIndex(step % 2 === 1 ? null : Math.floor(step / 2) % PIX_AMOUNTS.length);
    }, PIX_CYCLE_MS / 2);

    return () => window.clearInterval(id);
  }, [reduced]);

  const transactions = phone.transactions;
  const visible = Array.from({ length: VISIBLE }, (_, slot) => {
    const index = (offset + slot) % transactions.length;
    return { ...transactions[index], key: `${offset + slot}` };
  });

  return (
    <div role="img" aria-label={phone.ariaLabel} className="relative mx-auto w-fit">
      {/* Único fundo do bloco: um halo laranja que respira. A centralização fica
          no pai e a animação no filho — `breathe` anima `transform` e apagaria
          o `-translate-*` se estivesse no mesmo elemento. */}
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

          <div className="absolute top-2.5 left-1/2 h-6 w-20 -translate-x-1/2 rounded-full bg-black" />

          {/* Cabeçalho do chat */}
          <div className="mt-2 flex items-center gap-2.5 border-b border-line px-5 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
              <WoneIcon className="h-3.5 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-cream">
                {phone.botName}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                {phone.online}
              </span>
            </span>
          </div>

          {/* Anéis + logo */}
          <div className="relative flex h-[134px] items-center justify-center">
            {[132, 102, 72].map((size, index) => (
              <span
                key={size}
                className="absolute rounded-full border border-brand"
                style={{ height: size, width: size, opacity: 0.22 - index * 0.05 }}
              />
            ))}

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

          {/* Confirmação do PIX: aparece e some com valores diferentes. A altura
              é reservada para a lista abaixo não subir quando ele sai. */}
          <div className="mx-4 h-[58px]">
            <AnimatePresence mode="wait">
              {pixIndex !== null && (
                <motion.div
                  key={pixIndex}
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 6 }}
                  transition={{ duration: reduced ? 0 : 0.42, ease: EASE }}
                  className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />
                  </span>
                  <span className="leading-tight">
                    <span className="tnum block text-base font-bold text-emerald-400">
                      +{BRL.format(PIX_AMOUNTS[pixIndex])}
                    </span>
                    <span className="block text-[10px] text-cream/60">
                      {phone.approved}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Saldo */}
          <div className="px-5 pt-3">
            <span className="t-eyebrow text-faint">{phone.received}</span>
            <p className="tnum mt-0.5 text-xl font-bold text-cream">{phone.total}</p>
          </div>

          {/* Entregas em carrossel vertical: entram por baixo e saem por cima */}
          <div className="relative mt-3 h-[152px] overflow-hidden px-4 pb-6">
            <AnimatePresence initial={false}>
              {visible.map((item, slot) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 48 }}
                  animate={{ opacity: 1, y: slot * 48 }}
                  exit={{ opacity: 0, y: reduced ? 0 : -48 }}
                  transition={{ duration: reduced ? 0 : 0.55, ease: EASE }}
                  className="absolute inset-x-4 top-0 flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-900/70 px-3 py-2"
                >
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[11px] font-medium text-cream">
                      {item.label}
                    </span>
                    <span className="tnum block text-[10px] text-faint">
                      {item.amount}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    {phone.success}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Desvanece a base, para a entrega que sai não cortar em linha reta */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-950 to-transparent" />
          </div>

          <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-cream/25" />
        </div>
      </div>
    </div>
  );
}
