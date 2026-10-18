"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Chip } from "./Chip";
import { CtaButton } from "./CtaButton";
import { FlagMark } from "./FlagMark";
import { useContent } from "@/i18n";
import { eMoeda, numero, simbolo } from "@/lib/money";

/* A LATÊNCIA QUE A SIMULAÇÃO ENCENA, em ms. Não é duração de animação: é o que
   o estado leva para virar "Pagamento aprovado", com movimento ou sem ele. O
   mesmo número está na travessia da bolinha (`.pix-carro`, leva2.css, 0,7s) —
   lá como o tempo do percurso, aqui como o relógio. Se um mudar, o outro muda:
   a bolinha tem de encostar no botão no quadro em que ele troca de rótulo. */
const SIM_MS = 700;

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
 * E O BOTÃO RODA, desde 18/10 (leva 2): três estados em sequência — parado,
 * rodando, aprovado —, 700ms entre o clique e o "Pagamento aprovado", a bolinha
 * da leva 1 atravessando a fileira de métodos durante a espera (de `xl` para
 * cima) e o "Acesso liberado" entrando ao lado da palavra "Simulação". Nenhum
 * rótulo novo: os dois são os do telefone do hero e os da demo da Plataforma. O
 * porquê de cada medida está em `leva2.css`, no bloco "O CHECKOUT DO CLIENTE".
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
  const { payments, highlights, ui, phone } = useContent();
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

  /* A SIMULAÇÃO, em três estados: "idle" → "rodando" → "aprovado".
     Um estado só para o quadro inteiro, e não um por linha, porque há sempre
     exactamente UM painel aberto (o do país escolhido) — e trocar de país ou de
     método devolve tudo a "idle": o que foi aprovado foi aquele método naquele
     país, não este. Nasce "idle", igual no servidor e no cliente; quem pede a
     corrida é o clique. */
  const [sim, setSim] = useState<"idle" | "rodando" | "aprovado">("idle");

  /* Movimento permitido, lido DEPOIS da montagem (regra: `matchMedia` só dentro
     de efeito, para o primeiro render do cliente ser o do servidor). Ele decide
     só o ENFEITE — a bolinha que atravessa a fileira e a subida do chip de
     acesso. O clique, os 700ms e o "Pagamento aprovado" acontecem igual sem
     ele: a simulação é informação, não animação. */
  const [movimento, setMovimento] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMovimento(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* O ÚNICO RELÓGIO DO QUADRO, e ele só existe enquanto a corrida corre: o
     `return` do efeito cancela o `setTimeout` se o leitor trocar de país ou de
     método no meio, então nenhum "aprovado" chega para um painel que já é
     outro. Clicar de novo depois de aprovado passa por "rodando" outra vez, e
     a corrida repete sem nenhum relógio novo. */
  useEffect(() => {
    if (sim !== "rodando") return;

    const id = window.setTimeout(() => setSim("aprovado"), SIM_MS);
    return () => window.clearTimeout(id);
  }, [sim]);

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
        {/* A coluna de VALOR fecha a direita, e o cabecalho acompanha. E a
            convencao de coluna de dinheiro, e aqui ela resolve um defeito
            concreto: alinhados a esquerda, "R$197,00" comecava 10px depois de
            "$650" (o simbolo do real tem dois caracteres) e os numeros nao
            partilhavam eixo nenhum. Fechando a direita, os sete terminam no
            mesmo pixel - que e a borda do conteudo. */}
        <span className="t-label lg:text-right">{table.headers.plan}</span>
      </div>

      <ul className="divide-y divide-line">
        {table.countries.map((country, indice) => {
          /* Sem recurso a um preço qualquer quando o código não casa: o
             `?? prices[0]` que estava aqui faria a linha do México exibir o
             preço do Brasil se a lista da demo do checkout mudasse de código,
             e um número errado apresentado como verdadeiro é pior que uma
             célula vazia. Nada de tipo ou de runtime acusaria a troca. */
          const price = prices.find((entry) => entry.code === country.code);
          /* `eMoeda` alem do `find`: um codigo que nao esta nas sete de
             money.ts e tao "sem par" quanto um que nao esta na lista de precos,
             e a celula vazia e a mesma resposta certa para os dois. Vem em
             variavel propria e nao dentro do `find` porque o guarda de tipo so
             estreita quando o compilador o ve como condicao. */
          const moeda = price && eMoeda(price.code) ? price.code : null;
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
                  daquele país.

                  `pais-linha` é o GATILHO da resposta ao ponteiro (leva2.css):
                  o `:hover`/`:focus-visible` dela é que faz a bandeira bater os
                  3px da leva 1 e as pílulas de "Paga com" acenderem em fila, de
                  60 em 60ms. Nenhuma lógica nova, nenhum estado: é CSS pendurado
                  no botão que já existia. */}
              <button
                type="button"
                onClick={() => {
                  setPais(indice);
                  /* Método volta ao primeiro do país novo: o índice 3 do
                     Brasil ("Cartão até 12x · 3DS") não quer dizer nada em
                     Portugal, que tem um método só. */
                  setMetodo(0);
                  /* País novo, corrida nova: o "Pagamento aprovado" que estava
                     no botão era do método do país anterior. */
                  setSim("idle");
                }}
                aria-expanded={escolhido}
                className={`pais-linha w-full cursor-pointer px-5 py-3.5 text-left transition-colors lg:px-6 lg:py-5 ${COLUNAS} ${
                  escolhido ? "bg-ink-800" : "hover:bg-ink-800/60"
                }`}
              >
                <span className="flex items-center gap-3">
                  {/* `pais-bandeira` soma às medidas, não as substitui: 36×24 é
                      a medida da tabela e continua aqui. */}
                  <FlagMark code={country.code} className="pais-bandeira h-6 w-9 shrink-0" />
                  <span className="text-[17px] font-semibold text-cream">{country.name}</span>
                  {/* No celular esta é a única aparição do ISO. */}
                  <code className="lg:hidden">{country.code}</code>
                </span>

                {/* O primeiro método de cada país em laranja: é o principal
                    dele, e é o que a diretoria pediu para se ler primeiro
                    (15/10). Pelo índice, nunca pelo nome — ver o cabeçalho.

                    `pais-chip` em todos, sem atraso inline: o atraso de 60ms
                    por pílula vem do `nth-child` do CSS (seis regras, que é o
                    máximo da tabela — o Brasil), e é por isso que estes chips
                    são os ÚNICOS filhos desta caixa. Pôr qualquer outro nó aqui
                    desloca a contagem e a fila acende fora de ordem. */}
                <span className="mt-2.5 flex flex-wrap gap-2 lg:mt-0">
                  {country.methods.map((method, posicao) => (
                    <Chip
                      key={method}
                      tone={posicao === 0 ? "brand" : "neutral"}
                      className="pais-chip"
                    >
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
                <span className="mt-2.5 flex items-baseline justify-between gap-3 lg:mt-0 lg:block lg:text-right">
                  <span className="text-[13px] text-muted">{table.planLabel}</span>
                  {/* Símbolo e valor colados (gap-0.5, não 1.5): o espaço largo
                      abria um buraco no meio de um preço. E os dois saem de
                      `money.ts` — símbolo e forma do número na mesma mão, para
                      nunca discordarem de moeda. */}
                  {price && moeda ? (
                    <span className="flex items-baseline gap-0.5 lg:mt-0.5 lg:justify-end">
                      <span className="text-[15px] font-semibold text-cream">
                        {simbolo(moeda)}
                      </span>
                      <span className="tnum text-xl font-semibold text-cream">
                        {numero(price.amount, moeda)}
                      </span>
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
                    {/* A LINHA DO RÓTULO TEM ALTURA CRAVADA (h-7, os 28px do
                        chip) desde o primeiro quadro, vazia: é o que deixa o
                        "Acesso liberado" entrar sem empurrar a nota de baixo
                        nem a fileira de métodos ao lado (CLS 0). O chip é o que
                        a simulação AFIRMA, e por isso ele fica ao lado da
                        palavra "Simulação", não dentro da fileira. */}
                    <span className="flex h-7 items-center gap-3">
                      <span className="t-label">{ui.simulation}</span>
                      {sim === "aprovado" ? (
                        <Chip tone="ok" className={movimento ? "pix-liberado" : ""}>
                          {highlights.demos.delivery.done}
                        </Chip>
                      ) : null}
                    </span>
                    <p className="mt-1 text-[13px] leading-snug text-faint">
                      {checkout.productNote}
                    </p>
                  </div>

                  {/* `relative` por causa da bolinha: ela é absoluta dentro
                      desta fileira, e o percurso dela é a largura dela. */}
                  <div className="relative flex flex-wrap items-center gap-3">
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
                            /* Método novo, corrida nova — pelo mesmo motivo da
                               troca de país. */
                            setSim("idle");
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
                        "Rodar" e "Simular de novo". O rótulo é o método
                        escolhido, nunca o preço: o preço está na coluna Plano,
                        a 40px daqui.

                        ERA `disabled` DE PROPÓSITO — "é o botão do CLIENTE, não
                        uma ação desta página" — e deixou de ser porque a linha
                        inteira se declara "Simulação" a 40px dali: quem clica
                        não paga nada, RODA a simulação, que é exactamente o que
                        a palavra diz. Aprovado, o rótulo passa a ser o
                        "Pagamento aprovado" que o telefone do hero já usa
                        (`phone.approved`) — nenhum texto novo no dicionário —, e
                        um clique a mais roda de novo.

                        `loading` enquanto roda: ele desabilita o botão durante
                        os 700ms (sem corrida dupla) e marca `aria-busy`, que é
                        o que diz a quem não vê a tela que algo está em curso. */}
                    <CtaButton
                      size="object"
                      loading={sim === "rodando"}
                      onClick={() => setSim("rodando")}
                      className="whitespace-nowrap"
                    >
                      {sim === "aprovado"
                        ? phone.approved
                        : `${checkout.payWith} ${metodoAtivo}`}
                    </CtaButton>

                    {/* A BOLINHA DA LEVA 1 ATRAVESSANDO A FILEIRA, da primeira
                        pílula ao botão, nos mesmos 700ms do relógio. Montada só
                        enquanto roda — e o `.pix-carro` tem a animação no
                        próprio montar, então cada corrida recomeça o percurso
                        sem `key` e sem relógio nenhum.

                        `absolute inset-x-0 top-1/2`: ela sai do fluxo, então o
                        `flex-wrap` da fileira não vê diferença, e o trilho é a
                        largura inteira da fileira (é o que faz `translateX(100%)`
                        bastar, sem medir um pixel no DOM).

                        SÓ DE `xl` PARA CIMA, e é geometria: de 1280 em diante a
                        fileira cabe numa linha só e um fio horizontal atravessa
                        pílulas; abaixo disso ela quebra em três ou quatro linhas
                        e o fio cortaria o vazio entre elas. No celular ficam a
                        aprovação e o acesso, que são o que a simulação afirma.

                        A cauda aponta para a ESQUERDA (`--cx: -5px`): é de lá
                        que ela veio. */}
                    {sim === "rodando" && movimento ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-1/2 hidden xl:block"
                      >
                        <span className="pix-carro">
                          <span
                            className="bolinha"
                            style={{ "--cx": "-5px", "--cy": "0px" } as CSSProperties}
                          >
                            <i />
                            <i />
                            <i />
                            <i />
                          </span>
                        </span>
                      </span>
                    ) : null}
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
