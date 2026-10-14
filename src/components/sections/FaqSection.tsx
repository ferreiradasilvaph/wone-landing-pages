"use client";

import { useContent } from "@/i18n";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";

/**
 * As sete perguntas, em variante B: título em cinco colunas e o acordeão nas
 * colunas 6–12, começando na mesma linha do kicker.
 *
 * Em quatro colunas (`narrow`) o H2 saía em CINCO linhas, duas delas com uma
 * palavra só: "O que todo" já ocupa 269 dos 384px da coluna, e "O que todo
 * mundo" pede 430. Com cinco colunas (488px) ele cai nas 3–4 linhas que a régua
 * de copy dá a um título de coluna estreita, e o acordeão não se mexe — o
 * `aside` começa na coluna 6 de qualquer jeito.
 */
export function FaqSection() {
  const { faq } = useContent();

  return (
    <Section anchor="faq" tone="ink-950">
      <SectionHead
        variant="B"
        id="faq"
        kicker={faq.kicker}
        title={faq.title}
        aside={<FaqAccordion />}
      />
    </Section>
  );
}
