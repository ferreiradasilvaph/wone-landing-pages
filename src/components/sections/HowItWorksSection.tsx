"use client";

import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { StepsTimeline } from "@/components/StepsTimeline";
import { TextLink } from "@/components/TextLink";

/**
 * A tese da página (variante D, o único `t-h2-tese` do site) com o palco dos
 * quatro passos ao lado.
 *
 * Absorveu a seção "Dois caminhos", que era duas colunas de cards com pílula
 * "Completo" e dois botões repetindo o CTA: virou os dois itens com régua desta
 * coluna, com os mesmos fatos e uma ação de menos peso no fim.
 */
export function HowItWorksSection() {
  const { howItWorks } = useContent();
  const tese = howItWorks.thesis;

  return (
    <Section anchor="como-funciona" tone="ink-950">
      <SectionHead
        variant="D"
        id="como-funciona"
        kicker={howItWorks.kicker}
        /* As três linhas vêm literais porque o dicionário não leva `as const`
           (é `en.ts` que precisa satisfazer o mesmo tipo), e a tese é uma tupla
           de três: a terceira é a que sai em laranja. */
        titleLines={[tese[0], tese[1], tese[2]]}
        lead={howItWorks.lead}
        /* Provisório: a E3 troca o `StepsTimeline` pelo palco 3D dos 4 passos. */
        aside={<StepsTimeline />}
      >
        {/* A mesma forma da lista "termo — complemento" da Lista de espera: a
            régua é do conjunto (`divide-y` no pai), não de cada item. */}
        <div className="max-w-[29rem]">
          <dl className="divide-y divide-line border-t border-line">
            {howItWorks.paths.map((path) => (
              <div key={path.name} className="py-4">
                <dt className="text-[15px] font-semibold text-cream">{path.name}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted">{path.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <TextLink href="#fila-de-espera">{howItWorks.listLink}</TextLink>
          </div>
        </div>
      </SectionHead>
    </Section>
  );
}
