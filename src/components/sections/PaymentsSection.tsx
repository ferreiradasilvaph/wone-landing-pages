"use client";

import { useContent } from "@/i18n";
import { CheckoutBoard } from "@/components/CheckoutBoard";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TrackingFlow } from "@/components/TrackingFlow";

/**
 * O cartaz "Checkout INTERNACIONAL" (variante A, caps) sobre a tabela dos
 * quatro países, e abaixo o bloco das garantias e do rastreio.
 *
 * As garantias eram cards com ícone e lista de checks; viraram três itens
 * numerados com régua, em texto. Nada aqui é card: o que é tabela está na
 * tabela, o resto é texto sobre o fundo da seção.
 */
export function PaymentsSection() {
  const { payments } = useContent();

  return (
    <Section anchor="pagamentos" tone="ink-950">
      <SectionHead
        variant="A"
        id="pagamentos"
        kicker={payments.kicker}
        title={payments.title}
        caps
        lead={payments.lead}
      />

      <div className="mt-10 lg:mt-14">
        <CheckoutBoard />
      </div>

      {/* À esquerda a ficção declarada, à direita o fato. */}
      <div className="mt-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:justify-between">
        {payments.table.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>

      <div className="mt-10 lg:mt-14">
        <h3 className="t-h3 text-cream">{payments.block2Title}</h3>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-x-8">
          <ol className="lg:col-span-5">
            {payments.guarantees.map((item) => (
              <li key={item.num} className="mt-6 border-t border-line pt-5 first:mt-0">
                <p className="tnum text-[13px] text-faint">{item.num}</p>
                <p className="mt-2 text-[15px] font-semibold text-cream">{item.term}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ol>

          <div className="lg:col-span-6 lg:col-start-7">
            <h3 className="t-h3 text-cream">{payments.tracking.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {payments.tracking.lead}
            </p>
            <div className="mt-6">
              <TrackingFlow />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
