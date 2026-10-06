"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useInView, useScroll, useSpring, useReducedMotion } from "motion/react";
import { useContent } from "@/i18n";
import { StepIcon } from "./StepIcons";

/** O three fica fora do bundle inicial e nunca roda no servidor. */
const StepIcon3D = dynamic(() => import("./StepIcon3D"), { ssr: false });

const EASE = [0.16, 1, 0.3, 1] as const;

/** Uma etapa: nó numerado, texto e o ícone 3D que entra junto com a linha. */
function Step({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  // Margem generosa: o canvas monta um pouco antes de aparecer, para o ícone
  // nunca surgir vazio. Sem isso seriam quatro contextos WebGL abertos já no
  // carregamento da página, mesmo com a seção fora da tela.
  const near = useInView(ref, { once: true, margin: "300px" });
  /* Este não é `once`: enquanto a etapa está fora da tela, o canvas para de
     desenhar. São quatro deles na seção, e no celular os quatro girando ao mesmo
     tempo cobravam caro por nada. */
  const onScreen = useInView(ref, { amount: 0.2 });
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
      className="group relative pb-12 last:pb-0"
    >
      <span className="absolute top-0 -left-12 flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 font-mono text-sm font-bold text-cream transition-colors duration-300 group-hover:bg-brand group-hover:text-ink-950 sm:-left-16">
        {step}
      </span>

      <span
        aria-hidden
        className="absolute top-5 -left-6 hidden h-px w-5 bg-line transition-colors duration-300 group-hover:bg-brand/60 sm:block"
      />

      <div className="flex items-center gap-4 sm:gap-5">
        <div className="min-w-0 flex-1 pt-1.5">
          <h3 className="font-display text-xl font-semibold text-cream">{title}</h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {description}
          </p>
        </div>

        {/* O ícone entra quando a linha do tempo alcança esta etapa */}
        <motion.div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          /* Entrada sem `scale`: a caixa do ícone carrega um canvas, e o canvas
             se dimensiona pelo retângulo medido do elemento. Animando a escala,
             a medida saía no meio do caminho — 33 px de buffer esticados para
             56 — e o ícone nascia borrado. Opacidade e deslocamento não mexem no
             tamanho medido. */
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: reduced ? 0 : 0.7,
            ease: EASE,
            delay: reduced ? 0 : 0.15,
          }}
          /* No celular o ícone ficava escondido para dar largura ao texto —
             mas aí a etapa perdia justamente a cena que a conta. Ele entra
             menor (3,5rem) e cresce a partir de sm. */
          className="relative h-14 w-14 shrink-0 rounded-2xl bg-ink-850 transition-colors duration-500 group-hover:bg-ink-800 sm:h-24 sm:w-24"
        >
          {/* Brilho que acende por trás do sólido no hover */}
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl bg-brand/25 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
          />

          {near ? (
            <StepIcon3D name={icon} hovered={hovered} visible={onScreen} />
          ) : (
            // Enquanto o canvas não monta, o traço 2D segura o lugar.
            <span className="flex h-full w-full items-center justify-center p-5">
              <StepIcon name={icon} />
            </span>
          )}
        </motion.div>
      </div>
    </motion.li>
  );
}

/**
 * Linha do tempo das 4 etapas. O traço vertical se preenche conforme a seção
 * rola — é o que amarra os quatro passos em um percurso só.
 */
export function StepsTimeline() {
  const ref = useRef<HTMLOListElement>(null);
  const { howItWorks } = useContent();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 55%"],
  });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-3xl pl-12 sm:pl-16">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px bg-line sm:left-[1.6875rem]"
      />
      <motion.span
        aria-hidden
        style={{ scaleY: fill }}
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px origin-top bg-gradient-to-b from-brand via-brand to-brand/0 sm:left-[1.6875rem]"
      />

      {howItWorks.steps.map((step) => (
        <Step
          key={step.step}
          step={step.step}
          title={step.title}
          description={step.description}
          icon={step.icon}
        />
      ))}
    </ol>
  );
}
