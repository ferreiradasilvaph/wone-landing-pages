"use client";

import { useContent } from "@/i18n";
import { AwardsShowcase } from "@/components/AwardsShowcase";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";

/**
 * A vitrine dos quatro marcos, no chão quente (`--floor`): é o único fundo da
 * página fora da escala ink, e ocupa o degrau que a alternância daria ao
 * ink-850 — mesma luminância, tom de vitrine.
 */
export function AwardsSection() {
  const { awards } = useContent();

  return (
    <Section anchor="premios" tone="floor">
      <SectionHead
        variant="A"
        id="premios"
        kicker={awards.kicker}
        title={awards.title}
        lead={awards.lead}
      />

      {/* 40px e não os 56 de antes: o palco passou de 480 para 600px em 15/10
          ("capriche na disposição dessa sessão") e a seção inteira cresceu com
          ele. O vão entre o cabeçalho e a vitrine é o único lugar de onde dá
          para tirar altura sem encolher o objeto — o ritmo vertical da página
          vem de `--secao-y` e não se mexe por uma seção. */}
      <div className="mt-10 lg:mt-10">
        <AwardsShowcase />
      </div>
    </Section>
  );
}
