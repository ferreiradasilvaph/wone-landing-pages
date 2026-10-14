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
 * sobre o outro e a seção chegava a 2.358px, o maior bloco da página. A tabela
 * mostra os quatro de uma vez e sem repetir nada: medido, 103px por linha no
 * desktop e 138 por card no celular (552 o quadro inteiro, contra os ~920 de
 * antes).
 *
 * Estática: não há seleção, porque não há nada para selecionar — toda a
 * informação está à vista. O rodízio de 2,8 s que girava os países sozinho já
 * tinha saído com os outros relógios da página.
 *
 * Nada inventado: países, métodos, símbolos e moedas vêm de
 * `payments.table.countries` e os valores de `highlights.demos.checkout.prices`,
 * a mesma lista que a demo do checkout usa — um preço, um lugar. As duas notas
 * que avisam que são valores ilustrativos ficam na seção, abaixo do card.
 *
 * Nenhum dado aparece duas vezes na mesma linha, e é por isso que o ISO da
 * moeda muda de lugar conforme a largura: no desktop ele é a coluna Moeda (com
 * o nome por extenso ao lado); no celular, onde não há coluna Moeda, ele fecha
 * a primeira linha, ao lado do nome do país. Em `<code>` nos dois casos — é
 * valor de máquina.
 */
export function CheckoutBoard() {
  const { payments, highlights } = useContent();
  const table = payments.table;
  const prices = highlights.demos.checkout.prices;

  /* Grade de quatro colunas a partir de `lg`; abaixo disso cada país é um card
     empilhado de três linhas, na ordem em que se lê: quem é, como paga, quanto
     custa. */
  const COLUNAS = "lg:grid lg:grid-cols-[1.2fr_1.8fr_1fr_1.3fr] lg:items-center lg:gap-x-8";

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
          /* Sem recurso a um preço qualquer quando o código não casa: o
             `?? prices[0]` que estava aqui faria a linha do México exibir o
             preço do Brasil se a lista da demo do checkout mudasse de código,
             e um número errado apresentado como verdadeiro é pior que uma
             célula vazia. Nada de tipo ou de runtime acusaria a troca. */
          const price = prices.find((entry) => entry.code === country.code);

          return (
            <li key={country.code} className={`px-5 py-4 lg:px-6 lg:py-6 ${COLUNAS}`}>
              <div className="flex items-center gap-3">
                <FlagMark code={country.code} className="h-6 w-9 shrink-0" />
                <span className="text-[17px] font-semibold text-cream">{country.name}</span>
                {/* No celular esta é a única aparição do ISO. */}
                <code className="lg:hidden">{country.code}</code>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 lg:mt-0">
                {country.methods.map((method) => (
                  <Chip key={method} tone={method === DESTAQUE ? "brand" : "neutral"}>
                    {method}
                  </Chip>
                ))}
              </div>

              <div className="hidden lg:block">
                <code>{country.code}</code>
                <span className="block text-sm text-muted">{country.currency}</span>
              </div>

              {/* Celular: rótulo e preço dividem a terceira linha. Desktop: o
                  rótulo fica acima do preço, como nas outras colunas. */}
              <div className="mt-3 flex items-baseline justify-between gap-3 lg:mt-0 lg:block">
                <span className="text-[13px] text-muted">{table.planLabel}</span>
                {price ? (
                  <span className="flex items-baseline gap-1.5 lg:mt-0.5">
                    <span className="text-[15px] font-semibold text-cream">{country.symbol}</span>
                    <span className="tnum text-xl font-semibold text-cream">{price.display}</span>
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
