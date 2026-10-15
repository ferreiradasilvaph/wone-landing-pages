"use client";

import { useState } from "react";
import { Chip } from "./Chip";
import { CtaButton } from "./CtaButton";
import { FlagMark } from "./FlagMark";
import { useContent } from "@/i18n";

/**
 * A tabela dos sete países do checkout internacional — país, com o que o
 * cliente paga, em que moeda e quanto custa o mesmo plano anual — e, embaixo do
 * país escolhido, o CHECKOUT DO CLIENTE.
 *
 * Eram quatro até 15/10, quando a diretoria do dono pediu "colocar portugal,
 * reino unido e afins" e "os pagamentos por moeda local, mbway, cop e afins".
 * A lista agora tem sete e alguns países trazem seis métodos: para a tabela não
 * estourar, a linha perdeu 8px de respiro (py-5 no lugar de py-6, ~96px por
 * linha medidos) e a coluna "Paga com" ficou com 2,6fr das 5,45 — é nela que os
 * chips se acumulam, e com essa largura só o Brasil quebra em duas fileiras.
 * O LARANJA é agora um por LINHA, não um por bloco: o primeiro método de cada
 * país é o principal dele (PIX, SPEI, Transferência CVU / CBU, Nequi,
 * Transferência, MB WAY, Cartão) e é o que a diretoria quer que se leia
 * primeiro. Por isso a marca é o ÍNDICE 0, e não um nome fixo: "PIX" só vale
 * para o Brasil, e um nome fixo não sobreviveria à troca de idioma.
 *
 * O resto do desenho vem de antes, e segue valendo:
 *
 * Era um quadro de quatro tiles com um cabeçalho grande em cima, e o cabeçalho
 * repetia o tile escolhido — a mesma bandeira, o mesmo "R$ 197,00" e o mesmo
 * "BRL" duas vezes, a 60px de distância. No celular os dois blocos ficavam um
 * sobre o outro e a seção chegava a 2.358px, o maior bloco da página. A tabela
 * mostra todos de uma vez e sem repetir nada: medido com os sete, 95px por
 * linha no desktop (1.837 de seção a 1440, dentro dos 1.900 da espec) e 130 por
 * card no celular.
 *
 * INTERATIVA desde 15/10, e é pedido do dono, literal: "a sessão de pagamentos
 * o checkout internacional deve ser interativo e atrativo ao mesmo tempo.
 * melhore isso". Ela era estática de propósito — "não há nada para selecionar,
 * toda a informação está à vista" —, e o que faltava não era informação: era o
 * CLIENTE. A linha diz quanto custa; o painel que se abre nela mostra o que o
 * comprador do país vê na hora de pagar, com o método escolhido por quem está
 * lendo a página.
 *
 * Três coisas que o desenho mantém de pé:
 *
 *  - os sete países continuam visíveis AO MESMO TEMPO. A escolha troca o
 *    painel, não a tabela: comparar os preços é o ponto da seção, e um
 *    acordeão que esconde seis linhas perderia isso;
 *  - há sempre exactamente um painel aberto (nasce no Brasil, renderizado no
 *    servidor), e os sete têm a mesma anatomia. A altura do quadro era a mesma
 *    nos quatro países; com os métodos da Dotfy ela varia um pouco, porque o
 *    painel do Brasil tem seis pílulas de método e o de Portugal tem uma. Não
 *    volta a ser CLS: a página só se move depois do clique, e o que o CLS mede
 *    é o que mexe sem o dedo de quem lê. Fixar a altura no pior caso custaria
 *    ~100px de vazio em cinco dos sete países, e isso é pior que o degrau;
 *  - nenhum dado aparece duas vezes. O valor mora na coluna Plano, e o botão do
 *    painel é "Pagar com PIX" — o nome do método, que é a escolha de quem
 *    clica —, nunca o preço de novo, que foi exatamente o defeito do quadro
 *    antigo.
 *
 * Nada inventado: países, métodos, símbolos e moedas vêm de
 * `payments.table.countries`, os valores de `highlights.demos.checkout.prices`
 * e os rótulos do painel (`payWith`, `productNote`) do mesmo bloco do checkout
 * — um preço, um lugar. As duas notas que avisam que são valores ilustrativos
 * ficam na seção, abaixo do quadro.
 *
 * Nenhum dado aparece duas vezes na mesma linha, e é por isso que o ISO da
 * moeda muda de lugar conforme a largura: no desktop ele é a coluna Moeda (com
 * o nome por extenso ao lado); no celular, onde não há coluna Moeda, ele fecha
 * a primeira linha, ao lado do nome do país. Em `<code>` nos dois casos — é
 * valor de máquina.
 */
export function CheckoutBoard() {
  const { payments, highlights, ui } = useContent();
  const table = payments.table;
  const checkout = highlights.demos.checkout;
  const prices = checkout.prices;

  /* O país escolhido e o método dentro dele. O método é guardado como ÍNDICE e
     não como nome: o nome é traduzido, e ao trocar de idioma um "Boleto
     registrado" guardado não casaria com nada na lista em inglês. Nasce no
     primeiro de cada
     — o Brasil no PIX —, igual no servidor e no cliente: o painel sai pintado
     no HTML, sem nada esperando JavaScript e sem segundo layout. */
  const [pais, setPais] = useState(0);
  const [metodo, setMetodo] = useState(0);

  /* Grade de quatro colunas a partir de `lg`; abaixo disso cada país é um card
     empilhado de três linhas, na ordem em que se lê: quem é, como paga, quanto
     custa.

     "Paga com" é a coluna larga (2,6fr de 5,45, ~520px a 1440) porque é a que
     recebeu os métodos novos de 15/10 — seis no Brasil, cinco na Colômbia. O
     gap caiu de 8 para 6 para dar esses pixels a ela; as outras três cabem com
     folga no que sobrou ("Peso colombiano" é o texto mais largo delas). */
  const COLUNAS = "lg:grid lg:grid-cols-[1fr_2.6fr_0.85fr_1fr] lg:items-center lg:gap-x-6";

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
        {table.countries.map((country, indice) => {
          /* Sem recurso a um preço qualquer quando o código não casa: o
             `?? prices[0]` que estava aqui faria a linha do México exibir o
             preço do Brasil se a lista da demo do checkout mudasse de código,
             e um número errado apresentado como verdadeiro é pior que uma
             célula vazia. Nada de tipo ou de runtime acusaria a troca. */
          const price = prices.find((entry) => entry.code === country.code);
          const escolhido = indice === pais;
          const metodoAtivo = country.methods[escolhido ? metodo : 0] ?? country.methods[0];

          return (
            <li key={country.code} className="relative">
              {/* O RAIO DE 2px do país escolhido, na borda esquerda da linha e
                  descendo pelo painel: é a única marca de seleção, e é laranja
                  porque a seção inteira é a do checkout. Fica fora do botão,
                  colado na borda do `<li>`, para atravessar linha e painel sem
                  depender da altura de nenhum dos dois. */}
              {escolhido ? (
                <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-brand" />
              ) : null}

              {/* A LINHA É O BOTÃO. O conteúdo dela não muda — os chips de
                  método continuam `<span>`, e não botões, senão haveria botão
                  dentro de botão (HTML inválido) e o alvo da linha deixaria de
                  ser a linha. Quem escolhe o método é o painel, abaixo.
                  `aria-expanded` e não só `aria-pressed`: o que o clique faz,
                  do ponto de vista de quem não vê a tela, é abrir o checkout
                  daquele país. */}
              <button
                type="button"
                onClick={() => {
                  setPais(indice);
                  /* Método volta ao primeiro do país novo: o índice 3 do
                     Brasil ("Cartão até 12x · 3DS") não quer dizer nada em
                     Portugal, que tem um método só. */
                  setMetodo(0);
                }}
                aria-expanded={escolhido}
                className={`w-full cursor-pointer px-5 py-3.5 text-left transition-colors lg:px-6 lg:py-5 ${COLUNAS} ${
                  escolhido ? "bg-ink-800" : "hover:bg-ink-800/60"
                }`}
              >
                <span className="flex items-center gap-3">
                  <FlagMark code={country.code} className="h-6 w-9 shrink-0" />
                  <span className="text-[17px] font-semibold text-cream">{country.name}</span>
                  {/* No celular esta é a única aparição do ISO. */}
                  <code className="lg:hidden">{country.code}</code>
                </span>

                {/* O primeiro método de cada país em laranja: é o principal
                    dele, e é o que a diretoria pediu para se ler primeiro
                    (15/10). Pelo índice, nunca pelo nome — ver o cabeçalho. */}
                <span className="mt-2.5 flex flex-wrap gap-2 lg:mt-0">
                  {country.methods.map((method, posicao) => (
                    <Chip key={method} tone={posicao === 0 ? "brand" : "neutral"}>
                      {method}
                    </Chip>
                  ))}
                </span>

                <span className="hidden lg:block">
                  <code>{country.code}</code>
                  <span className="block text-sm text-muted">{country.currency}</span>
                </span>

                {/* Celular: rótulo e preço dividem a terceira linha. Desktop: o
                    rótulo fica acima do preço, como nas outras colunas. */}
                <span className="mt-2.5 flex items-baseline justify-between gap-3 lg:mt-0 lg:block">
                  <span className="text-[13px] text-muted">{table.planLabel}</span>
                  {price ? (
                    <span className="flex items-baseline gap-1.5 lg:mt-0.5">
                      <span className="text-[15px] font-semibold text-cream">{country.symbol}</span>
                      <span className="tnum text-xl font-semibold text-cream">{price.display}</span>
                    </span>
                  ) : null}
                </span>
              </button>

              {/* O CHECKOUT DO CLIENTE, dentro da linha escolhida. Um por vez,
                  sempre um. Fundo ink-900 — o degrau abaixo do ink-800 da
                  linha —, sem moldura e sem sombra: ele é a continuação da
                  linha, não um card dentro do card. */}
              {escolhido ? (
                <div className="flex flex-col gap-3.5 bg-ink-900 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-6 lg:py-4">
                  <div className="min-w-0">
                    <span className="t-label">{ui.simulation}</span>
                    <p className="mt-1 text-[13px] leading-snug text-faint">
                      {checkout.productNote}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* A ESCOLHA DO MÉTODO, o único controle do quadro. Pílulas
                        de 36px com os 44 do portão vindos do `py` da fileira —
                        o alvo é medido, não o desenho. O escolhido é creme
                        sólido sobre ink-750; os outros, texto muted. Sem
                        laranja aqui: o laranja desta linha já é o chip do
                        método principal e o raio da borda. */}
                    {country.methods.map((method, posicao) => {
                      const ativo = method === metodoAtivo;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            setPais(indice);
                            setMetodo(posicao);
                          }}
                          aria-pressed={ativo}
                          className={`relative flex h-9 cursor-pointer items-center rounded-full px-4 text-[13px] font-medium transition-colors before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${
                            ativo
                              ? "bg-ink-750 text-cream"
                              : "bg-cream/6 text-muted hover:text-cream"
                          }`}
                        >
                          {method}
                        </button>
                      );
                    })}

                    {/* O botão de produto: a pílula `object`, a mesma de
                        "Rodar" e "Simular de novo". Desabilitado de propósito —
                        é o botão do CLIENTE, não uma ação desta página — e o
                        rótulo é o método escolhido, nunca o preço: o preço está
                        na coluna Plano, a 40px daqui. */}
                    <CtaButton size="object" disabled className="whitespace-nowrap">
                      {checkout.payWith} {metodoAtivo}
                    </CtaButton>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
