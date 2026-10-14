"use client";

import { useContent } from "@/i18n";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";

/**
 * Os dez recursos, um por vez, no carrossel (variante C: cabeçalho invertido,
 * demo larga embaixo).
 *
 * `overflow-x-clip` na seção é o que deixa o carrossel sangrar além do
 * container sem abrir barra de rolagem horizontal na página.
 */
export function FeaturesSection() {
  const { features } = useContent();

  return (
    <Section anchor="recursos" tone="ink-850" className="overflow-x-clip">
      {/* O índice 01–10 que navega o carrossel entra na E4, pela prop `index`
          do SectionHead (coluna 1–4, `hidden lg:block`). */}
      <SectionHead
        variant="C"
        id="recursos"
        kicker={features.kicker}
        title={features.title}
        lead={features.lead}
      />

      <div className="mt-10 lg:mt-14">
        <FeatureCarousel />
      </div>
    </Section>
  );
}
