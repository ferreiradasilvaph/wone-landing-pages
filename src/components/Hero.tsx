"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Zap, ShieldCheck, Radar } from "lucide-react";
import { Marquee } from "./Marquee";
import { PhoneMockup } from "./PhoneMockup";

const EASE = [0.16, 1, 0.3, 1] as const;

const BADGES = [
  { icon: Zap, label: "Entrega em 1,2s" },
  { icon: ShieldCheck, label: "Revogação imediata" },
  { icon: Radar, label: "Rastreio servidor a servidor" },
];

/**
 * Abertura da página: aurora em movimento, malha técnica, título em degradê e,
 * abaixo, o aparelho do `PhoneMockup` ao lado da descrição do motor de vendas.
 */
export function Hero() {
  const reduced = useReducedMotion();

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0 : 0.8, delay: reduced ? 0 : delay, ease: EASE },
  });

  return (
    <section id="topo" className="relative overflow-hidden pt-28 pb-16 sm:pt-36">
      {/* Fundo em três camadas: malha, aurora e vinheta */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-mesh absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_10%,transparent_75%)] opacity-70" />
        <div className="aurora animate-drift absolute inset-x-0 -top-40 h-[42rem] opacity-70" />
        <div className="aurora animate-drift-slow absolute inset-x-0 -top-20 h-[36rem] opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink-950 to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-5 text-center sm:px-6">
        <motion.div {...rise(0)}>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-xs font-semibold text-brand">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Infraestrutura de monetização para Telegram
          </span>
        </motion.div>

        <motion.h1 {...rise(0.08)} className="t-display mt-7 text-balance text-cream">
          Automatize suas vendas no Telegram,{" "}
          <span className="text-gradient">do primeiro contato à entrega</span>
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="t-lead mx-auto mt-6 max-w-2xl text-pretty"
        >
          Funil de vendas, PIX instantâneo, cartão, upsell, remarketing ativo e
          liberação de link único com revogação automática.
        </motion.p>

        <motion.div
          {...rise(0.24)}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href="#fila-de-espera"
            className="btn-brand inline-flex w-full items-center justify-center gap-2 rounded-xl px-7 py-3.5 font-semibold sm:w-auto"
          >
            Lista de espera
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </a>
          <a
            href="#como-funciona"
            className="btn-ghost inline-flex w-full items-center justify-center rounded-xl px-7 py-3.5 font-medium sm:w-auto"
          >
            Ver como funciona
          </a>
        </motion.div>
      </div>

      {/* Mockup: texto à esquerda e aparelho à direita a partir de lg; abaixo
          disso, empilhado e centralizado. */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 1, delay: reduced ? 0 : 0.3, ease: EASE }}
        className="mx-auto mt-20 grid max-w-4xl grid-cols-1 items-center gap-12 px-5 sm:mt-28 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-14"
      >
        <div className="text-center lg:text-left">
          <span className="font-display text-xl font-semibold text-cream sm:text-2xl">
            Wone Bot Engine
          </span>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted lg:mx-0">
            Disparos instantâneos, fallback de gateway, validação por webhook e link
            único descartável gerado em segundos.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {BADGES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-line bg-ink-900/70 px-3 py-1.5 text-[11px] font-medium text-cream/80"
              >
                <Icon className="h-3 w-3 text-brand" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMockup />
      </motion.div>

      {/* Integrações */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.6 }}
        className="mt-14"
      >
        <p className="t-eyebrow mb-4 text-center text-faint">
          Conectado de ponta a ponta
        </p>
        <Marquee />
      </motion.div>
    </section>
  );
}
