"use client";

import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { SecurityCarousel } from "@/components/SecurityCarousel";

/**
 * O fecho curto da página: fundo ink-800 (o bloco invertido, o contraste antes
 * da vitrine) e `--secao-y-curta` no lugar do ritmo normal.
 *
 * Sem lead, de propósito: o lugar dele é ocupado pelo card de detalhe do item
 * ativo, que mora dentro do `SecurityCarousel`. E sem CTA: o fecho da Wone é a
 * Lista de espera, não esta seção.
 */
export function SecuritySection() {
  const { security } = useContent();

  return (
    <Section anchor="seguranca" tone="ink-800" short>
      <SectionHead
        variant="A"
        id="seguranca"
        kicker={security.kicker}
        title={security.title}
      />

      <div className="mt-10 lg:mt-14">
        <SecurityCarousel />
      </div>
    </Section>
  );
}
