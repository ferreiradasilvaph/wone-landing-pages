"use client";

import { Chip } from "./Chip";
import { FlagMark } from "./FlagMark";
import { useContent } from "@/i18n";

/* O método principal do Brasil é o único em laranja: mais de um destaque por
   bloco e o destaque deixa de destacar. */
const DESTAQUE = "PIX";

/**
 * A tabela dos quatro países do checkout internacional: país, com o que o
 * cliente paga, em que moeda e quanto custa o mesmo plano anual.
 *
 * Era um quadro de quatro tiles com um cabeçalho grande em cima, e o cabeçalho
 * repetia o tile escolhido — a mesma bandeira, o mesmo "R$ 197,00" e o mesmo
 * "BRL" duas vezes, a 60px de distância. No celular os dois blocos ficavam um
 * sobre o outro e a seção chegava a 2.422px, o maior bloco da página. A tabela
 * mostra os quatro de uma vez, na metade da altura, sem repetir nada.
 *
 * Estática: não há seleção, porque não há nada para selecionar — toda a
 * informação está à vista. O rodízio de 2,8 s que girava os países sozinho já
 * tinha saído com os outros relógios da página.
 *
 * Nada inventado: países, métodos, símbolos e moedas vêm de
 * `payments.table.countries` e os valores de `highlights.demos.checkout.prices`,
 * a mesma lista que a demo do checkout usa. As duas notas que avisam que são
 * valores ilustrativos ficam na seção, abaixo do card.
 *
 * O ISO da moeda aparece UMA vez, na coluna Moeda e em `<code>`: é valor de
 * máquina, e repeti-lo ao lado do nome do país seria o defeito que esta forma
 * veio corrigir. E4 refina o resto (mini-cabeçalhos no celular, larguras).
 */
export function CheckoutBoard() {
  const { payments, highlights } = useContent();
  const table = payments.table;
  const prices = highlights.demos.checkout.prices;

  /* Grade de quatro colunas a partir de `lg`; abaixo disso cada país é um card
     empilhado, na ordem em que se lê: quem é, como paga, quanto custa. */
  const COLUNAS = "lg:grid lg:grid-cols-[1.1fr_2.4fr_1fr_1.4fr] lg:items-center lg:gap-x-8";

  return (
    <div className="rounded-card overflow-hidden bg-ink-850">
      {/* Cabeçalho de tabela: só onde existe tabela. */}
      <div className={`hidden border-b border-line-strong bg-ink-900 px-6 py-3.5 ${COLUNAS}`}>
        <span className="t-label">{table.headers.country}</span>
        <span className="t-label">{table.headers.methods}</span>
        <span className="t-label">{table.headers.currency}</span>
        <span className="t-label">{table.headers.plan}</span>
      </div>

      <ul className="divide-y divide-line">
        {table.countries.map((country) => {
          const price = prices.find((entry) => entry.code === country.code) ?? prices[0];

          return (
            <li key={country.code} className={`px-6 py-5 ${COLUNAS}`}>
              <div className="flex items-center gap-3">
                <FlagMark code={country.code} className="h-6 w-9 shrink-0" />
                <span className="text-[17px] font-semibold text-cream">{country.name}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
                {country.methods.map((method) => (
                  <Chip key={method} tone={method === DESTAQUE ? "brand" : "neutral"}>
                    {method}
                  </Chip>
                ))}
              </div>

              <div className="mt-4 flex items-baseline gap-2 lg:mt-0 lg:block">
                <code>{country.code}</code>
                <span className="block text-sm text-muted">{country.currency}</span>
              </div>

              <div className="mt-4 lg:mt-0">
                <span className="block text-[13px] text-muted">{table.planLabel}</span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[15px] font-semibold text-brand">{country.symbol}</span>
                  <span className="tnum text-xl font-semibold text-cream">{price.display}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
