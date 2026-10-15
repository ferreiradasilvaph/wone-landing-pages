"use client";

import { useContent } from "@/i18n";
import { StepLayer } from "./StepLayer";
import type { StepShow } from "./useStepShow";

/**
 * Os TRÊS FATOS do passo escolhido, abaixo do palco.
 *
 * É a outra metade do pedido do dono em 15/10 — "adicione mais informações nas
 * seções com poucas informações". O palco mostra o produto funcionando, mas
 * mockup não afirma nada: quem lê a seção precisava de três frases por passo em
 * texto de verdade, do tamanho do corpo da página.
 *
 * Cada fato já é afirmado em outra seção (FAQ, as garantias de Pagamentos, o
 * lead de Análises) e vem do dicionário, em `steps[].facts` — nenhum número e
 * nenhuma promessa nascem aqui (regra 4).
 *
 * Mesma mecânica do palco: os quatro conjuntos ficam montados em camadas
 * absolutas e a troca é crossfade, com altura cravada por breakpoint. A régua
 * de 1px no alto de cada fato é o que faz a fileira ler como ficha técnica em
 * vez de três parágrafos soltos.
 */
export function StepFacts({ show }: { show: StepShow }) {
  const { howItWorks } = useContent();
  const { active } = show;

  return (
    /* Altura medida pelo estado mais alto: a 1440 cada fato cabe em duas linhas
       de 14px (84px com a régua e o termo); a 412 os três empilham. */
    <div className="relative mt-8 h-[244px] sm:h-[132px] lg:mt-10 lg:h-[96px]">
      {howItWorks.steps.map((step, index) => (
        <StepLayer key={step.step} active={index === active}>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-3 sm:gap-y-6">
            {step.facts.map((fact) => (
              <div key={fact.term} className="border-t border-line pt-3">
                <dt className="text-[15px] leading-snug font-semibold text-cream">{fact.term}</dt>
                <dd className="mt-1 text-[14px] leading-[1.5] text-muted">{fact.text}</dd>
              </div>
            ))}
          </dl>
        </StepLayer>
      ))}
    </div>
  );
}
