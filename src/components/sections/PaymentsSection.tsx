"use client";

import { useContent } from "@/i18n";
import { CheckoutBoard } from "@/components/CheckoutBoard";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TrackingFlow } from "@/components/TrackingFlow";

/**
 * O cartaz "Checkout INTERNACIONAL" (variante A, caps) sobre a tabela dos sete
 * países, e abaixo o bloco das garantias e do rastreio.
 *
 * As garantias eram cards com ícone e lista de checks; viraram itens numerados
 * com régua, em texto. Nada aqui é card: o que é tabela está na tabela, o resto
 * é texto sobre o fundo da seção.
 *
 * São QUATRO desde 15/10, e o PRIMEIRO é laranja: "Integrações próprias" é a
 * frase que a diretoria do dono mandou destacar ("não é via Stripe, e sim
 * integrações próprias" — palavras do diretor), e o laranja é como esta página
 * destaca. Um só: o lead da seção já carrega a mesma mensagem em prosa, e dois
 * laranjas no mesmo bloco não destacam nada. O item 04 ("Taxas sob medida") é a
 * outra metade do pedido — menores taxas do mercado, personalizadas por
 * operação — e fica em creme, como os outros.
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
          {/* O respiro caiu de 24/20 para 20/16: com o quarto item e as sete
              linhas da tabela, a seção passava de 1.900px a 1440, e é a altura
              que a espec limita. */}
          <ol className="lg:col-span-5">
            {payments.guarantees.map((item, posicao) => (
              <li key={item.num} className="mt-5 border-t border-line pt-4 first:mt-0">
                <p className="tnum text-[13px] text-faint">{item.num}</p>
                <p
                  className={`mt-2 text-[15px] font-semibold ${
                    posicao === 0 ? "text-brand" : "text-cream"
                  }`}
                >
                  {item.term}
                </p>
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
