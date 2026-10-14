"use client";

import { useState } from "react";
import { useContent } from "@/i18n";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";

/**
 * Os dez recursos, um por vez, no carrossel (variante C: cabeçalho invertido,
 * demo larga embaixo).
 *
 * O estado de qual card está no centro mora AQUI, e não no carrossel, porque
 * duas peças o usam: o carrossel e o índice 01–10 ao lado do título. O índice é
 * o que a referência põe na coluna estreita da variante invertida — uma lista
 * numerada que também é o sumário da seção: dá para ver os dez nomes sem
 * esperar o rodízio passar por eles.
 *
 * `overflow-x-clip` na seção é o que deixa o carrossel sangrar além do
 * container sem abrir barra de rolagem horizontal na página.
 */
export function FeaturesSection() {
  const { features } = useContent();
  const [active, setActive] = useState(0);

  return (
    <Section anchor="recursos" tone="ink-850" className="overflow-x-clip">
      <SectionHead
        variant="C"
        id="recursos"
        kicker={features.kicker}
        title={features.title}
        lead={features.lead}
        index={
          /* Duas colunas de cinco, não dez linhas de 24px: cada item precisa de
             44px de alvo (portão de acessibilidade), e dez linhas de 44 dariam
             440px de índice — mais alto que o palco que ele comanda. Em 5×2 o
             bloco fecha em 220px, com os números em coluna como na referência.

             `hidden lg:grid`: abaixo de lg a seção é uma coluna só e o índice
             sairia entre o título e o carrossel, repetindo o que a barra de
             progresso do próprio carrossel já diz. */
          <ol className="mt-1 hidden grid-flow-col grid-rows-5 justify-start gap-x-8 lg:grid">
            {features.items.map((item, index) => {
              const isActive = index === active;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-current={isActive}
                    className={`flex h-11 cursor-pointer items-center gap-3 text-[13px] transition-colors ${
                      isActive ? "text-cream" : "text-faint hover:text-cream"
                    }`}
                  >
                    <span className="tnum">{String(index + 1).padStart(2, "0")}</span>
                    <span>{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        }
      />

      <div className="mt-10 lg:mt-14">
        <FeatureCarousel active={active} onSelect={setActive} />
      </div>
    </Section>
  );
}
