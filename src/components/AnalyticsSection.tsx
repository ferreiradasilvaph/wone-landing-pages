"use client";

import { useContent } from "@/i18n";
import { Section } from "./Section";
import { SectionHead } from "./SectionHead";
import { DashboardPreview } from "./DashboardPreview";

/**
 * Análises: cabeçalho da variante A (título à esquerda, lead ao lado com a
 * barra) e o painel em largura total embaixo.
 *
 * Era uma grade de duas colunas com as cinco métricas numa lista de botões à
 * esquerda e o painel apertado na metade direita — e a lista de controle vivia
 * fora do objeto que ela controlava. As abas passaram para dentro do
 * `DashboardPreview`, como cabeçalho de tabela, e o painel ficou com a largura
 * inteira da seção, que é o que um dashboard pede.
 *
 * A linha "Clique em cada métrica…" não voltou: virou o fecho do lead, no
 * dicionário.
 */
export function AnalyticsSection() {
  const { analytics } = useContent();

  return (
    <Section anchor="analises" tone="ink-850">
      <SectionHead
        id="analises"
        variant="A"
        kicker={analytics.kicker}
        title={analytics.title}
        lead={analytics.lead}
      />

      {/* Do cabeçalho até a demo: 56px no desktop, 40 no celular (a régua da
          espec, igual em todas as seções). */}
      <div className="mt-10 lg:mt-14">
        <DashboardPreview />
      </div>
    </Section>
  );
}
