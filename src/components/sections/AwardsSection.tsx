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

      <div className="mt-10 lg:mt-14">
        <AwardsShowcase />
      </div>
    </Section>
  );
}
