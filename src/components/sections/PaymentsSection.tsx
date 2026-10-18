"use client";

import { useRef, type CSSProperties } from "react";
import { useContent } from "@/i18n";
import { CheckoutBoard } from "@/components/CheckoutBoard";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TrackingFlow } from "@/components/TrackingFlow";
import { useContagem } from "@/lib/useContagem";

/* O CURSO DA CASCATA DAS GARANTIAS, em ms: 3 × 80 de atraso entre os quatro
   numerais, mais os 480 que cada um leva para assentar de laranja em `faint`. É
   o tempo total do percurso, que é o que o `useContagem` espera receber — este
   bloco não tem número contando, então o `t` serve só para dizer "já largou". */
const GARANTIAS_MS = 720;

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

  /* A CASCATA DOS NUMERAIS, no par `gar`/`gar--roda` da leva 1 (é exactamente o
     que a trilha do prefácio da vitrine faz com `trilha`/`trilha--roda`):
     `animar` diz que esta visita tem movimento e a lista foi ARMADA abaixo da
     dobra — só então as classes são penduradas —, e `t > 0` diz que o percurso
     largou, o que solta o `animation-play-state`. Sem isto o HTML do servidor
     traria os quatro numerais já na tela e o leitor veria o "01" piscar de volta
     ao começo. Um gancho, um relógio, quatro atrasos. */
  const garantias = useRef<HTMLOListElement>(null);
  const { t, animar } = useContagem(garantias, GARANTIAS_MS, { amount: 0.3 });

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
          <ol
            ref={garantias}
            className={`lg:col-span-5${animar ? " gar" : ""}${
              animar && t > 0 ? " gar--roda" : ""
            }`}
          >
            {payments.guarantees.map((item, posicao) => (
              <li key={item.num} className="mt-5 border-t border-line pt-4 first:mt-0">
                {/* 80ms por item, na ordem em que vão ser lidos. O numeral nasce
                    LARANJA e assenta em `faint`: é a marca de chegada do motivo
                    da página — onde a bolinha passa, acende e esfria — no único
                    lugar deste bloco em que ela cabe sem tirar o destaque do
                    item 01, que é o único laranja de repouso que a diretoria
                    pediu aqui. */}
                <p
                  className="gar-num tnum text-[13px] text-faint"
                  style={{ "--d": `${posicao * 80}ms` } as CSSProperties}
                >
                  {item.num}
                </p>
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
