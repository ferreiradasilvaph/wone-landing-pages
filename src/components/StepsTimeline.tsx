"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useInView, useScroll, useSpring } from "motion/react";
import { useContent } from "@/i18n";
import { StepIcon } from "./StepIcons";

/** O three fica fora do bundle inicial e nunca roda no servidor. */
const StepIcon3D = dynamic(() => import("./StepIcon3D"), { ssr: false });

/**
 * Uma etapa: nó numerado, texto e o ícone 3D.
 *
 * A entrada animada (opacidade e 24px de deslocamento por etapa) saiu com as
 * outras dezoito da página: nada nasce invisível. O que restou de movimento é a
 * linha que se preenche com a rolagem, lá embaixo.
 */
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
  // Margem generosa: o canvas monta um pouco antes de aparecer, para o ícone
  // nunca surgir vazio. Sem isso seriam quatro contextos WebGL abertos já no
  // carregamento da página, mesmo com a seção fora da tela.
  const near = useInView(ref, { once: true, margin: "300px" });
  /* Este não é `once`: enquanto a etapa está fora da tela, o canvas para de
     desenhar. São quatro deles na seção, e no celular os quatro girando ao mesmo
     tempo cobravam caro por nada. */
  const onScreen = useInView(ref, { amount: 0.2 });
  const [hovered, setHovered] = useState(false);

  return (
    <li ref={ref} className="group relative pb-12 last:pb-0">
      <span className="absolute top-0 -left-12 flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 text-[15px] font-semibold text-cream transition-colors duration-300 group-hover:bg-brand group-hover:text-ink-950 sm:-left-16">
        <span className="tnum">{step}</span>
      </span>

      <span
        aria-hidden
        className="absolute top-5 -left-6 hidden h-px w-5 bg-line transition-colors duration-300 group-hover:bg-brand/60 sm:block"
      />

      <div className="flex items-center gap-4 sm:gap-5">
        <div className="min-w-0 flex-1 pt-1.5">
          <h3 className="t-h3 text-cream">{title}</h3>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
            {description}
          </p>
        </div>

        {/* O brilho laranja desfocado que acendia por trás do ícone no hover
            saiu: nenhum halo, nenhum blur decorativo (regra 8). */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative h-14 w-14 shrink-0 rounded-field bg-ink-850 sm:h-24 sm:w-24"
        >
          {near ? (
            <StepIcon3D name={icon} hovered={hovered} visible={onScreen} />
          ) : (
            // Enquanto o canvas não monta, o traço 2D segura o lugar.
            <span className="flex h-full w-full items-center justify-center p-5">
              <StepIcon name={icon} />
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Linha do tempo das 4 etapas. O traço vertical se preenche conforme a seção
 * rola — é o que amarra os quatro passos em um percurso só.
 *
 * E3 substitui esta lista pelo palco de uma cena 3D só, com os quatro passos
 * avançando pela rolagem; até lá ela fica, já vestida com o kit.
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
    <ol ref={ref} className="relative pl-12 sm:pl-16">
      <span
        aria-hidden
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px bg-line sm:left-[1.6875rem]"
      />
      {/* Laranja chapado: o degradê que esmaecia a ponta do traço era mais um
          degradê a menos na página. */}
      <motion.span
        aria-hidden
        style={{ scaleY: fill }}
        className="absolute top-2 bottom-2 left-[1.1875rem] w-px origin-top bg-brand sm:left-[1.6875rem]"
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
