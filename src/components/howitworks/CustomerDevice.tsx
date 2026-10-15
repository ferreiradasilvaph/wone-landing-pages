"use client";

import { BatteryMedium, Check, Mic, SignalHigh, Smile, Wifi } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "@/components/Chip";
import { CtaButton } from "@/components/CtaButton";
import { WoneIcon } from "@/components/WoneMark";
import { StepLayer } from "./StepLayer";

/**
 * A HORA da venda, num lugar só.
 *
 * Ela aparece quatro vezes dentro do aparelho — barra de status, pílula no alto
 * do chat e o carimbo de cada bolha — e é a MESMA transação que a linha nova do
 * extrato, no painel ao lado, marca como "agora". Duas horas diferentes para um
 * pagamento só se contradizem, então o valor é um.
 *
 * Não existe no dicionário palavra para "hoje" nos blocos desta seção, e esta
 * rodada não toca em `pt.ts`/`en.ts`: a pílula leva a hora, sem inventar texto.
 */
const HORA = "21:47";

/**
 * A MOLDURA, degraus 1 e 2: o rim de 1px em creme a 18% (a luz pegando na quina
 * do chassi) e o chassi em degradê vertical, de 5px.
 *
 * Fica numa constante, e não no template da classe, por um motivo mecânico: o
 * varredor do Tailwind NÃO extrai uma classe colada num `${`. Escrita direto no
 * template — `... p-[5px]${className ? ...}` —, a última classe antes do buraco
 * some do CSS gerado, e foi o que aconteceu: medido em 15/10, o chassi deste
 * aparelho estava com `padding: 0px` no computado desde que nasceu, e a moldura
 * inteira era o 1px da borda. Terminada por aspas, a classe é extraída.
 */
const CHASSI =
  "rounded-device relative border border-[rgba(255,255,227,0.18)] bg-gradient-to-b from-ink-750 via-ink-850 to-ink-900 p-[5px]";

/**
 * O carimbo de hora no canto de uma bolha. 11px é o piso de dentro do mockup —
 * os 10px de um relógio de chat de verdade não existem nesta escala.
 *
 * Só BOLHA leva carimbo. O cartão verde de aprovado e a linha do convite são
 * cartões de sistema, e a 412 a hora ali comeria a largura de "Pagamento
 * aprovado", que é o que o passo 04 existe para dizer.
 */
const CARIMBO = "text-[11px] leading-4 text-faint";

/**
 * O APARELHO do cliente, em pé no palco, com o chat em quatro estados.
 *
 * Era uma segunda "tela de painel" ao lado da sua — duas caixas iguais, que foi
 * metade do "visualmente está ruim" de 15/10. Agora é um OBJETO diferente do
 * painel: moldura de aparelho, ilha dinâmica, barra de status, compositor no
 * pé. A linguagem é a do painel (mesmo rim de 1px, mesmo cabeçalho de bot,
 * mesmo cartão verde de aprovado), mas o componente é outro porque o conteúdo é
 * outro: aqui o chat conta os quatro passos, não os quatro países.
 *
 * SEGUNDA RODADA, no mesmo dia, com o pedido seguinte do dono: "melhore a
 * aparência e disposição do celular na onde ficam os fluxos". Três coisas
 * mudaram, e as três vinham do mesmo defeito — o objeto lia como RECORTE:
 *
 *  1. MOLDURA EM DOIS DEGRAUS. Era um retângulo com uma borda só. Agora: rim
 *     externo de 1px em creme a 18% (a luz pegando na quina do chassi), o
 *     chassi em degradê vertical (o que já havia) e um BISEL preto de 6px entre
 *     o chassi e o vidro. São os três degraus que todo aparelho tem de verdade,
 *     e é o que dá espessura à peça agora que ela está virada em perspectiva.
 *  2. LUZ DE VIDRO. Um degradê de 7% no canto superior esquerdo (`.hiw-vidro`),
 *     sem blur e sem glow: a tela deixa de ser um buraco preto e passa a ter
 *     superfície, que é o que a perspectiva precisa para convencer.
 *  3. A TELA LÊ COMO CHAT MESMO VAZIA. O papel de parede de pontos
 *     (`.hiw-papel`), a pílula de hora no alto e o carimbo em cada bolha fazem
 *     o passo 01 — duas bolhas e ~220px de tela livre — ler como conversa que
 *     ainda vai encher, em vez de caixa vazia.
 *
 * A ficção se declara no cabeçalho do chat.
 *
 * Nos passos 01-03 o aparelho reage ao que VOCÊ fez no painel; no 04 ele AGE
 * primeiro — o cliente paga, e é o painel que recebe a notícia. A inversão é o
 * ponto da seção, e quem a desenha é o atraso do fio e a ordem das camadas.
 *
 * Tudo aqui dentro é `aria-hidden` pelo palco: o piso de tamanho é 11px.
 */
export function CustomerDevice({ step, className = "" }: { step: number; className?: string }) {
  const { howItWorks, highlights, payments, phone, ui } = useContent();
  const { demo } = howItWorks;
  const { checkout, delivery } = highlights.demos;
  const chat = demo.chat;
  /* Uma moeda só na demo (`phone.transactions[0]`): a bolha de oferta, o cartão
     de aprovado e a linha do extrato no painel mostram o MESMO texto. A moeda
     de cada país é assunto da seção Pagamentos. */
  const sale = phone.transactions[0];
  const method = payments.table.countries[0].methods[0];
  /* O comando que abre a conversa é o do rastreio — o mesmo `/start` que a
     seção Pagamentos mostra no caminho do dado. */
  const startCommand = payments.tracking.flow[1].code;

  /* O chat ACUMULA: o que chegou num passo continua na tela no seguinte, como
     numa conversa de verdade. É o que tira do aparelho a cara de tela vazia com
     uma bolha no pé — o passo 02 mostrava uma bolha só em 368px de chat — e o
     que faz a leitura de que é a MESMA conversa andando, não quatro telas
     diferentes. */
  const welcome = (
    <span className="mr-auto block max-w-[92%] rounded-field bg-ink-850 px-3 py-2">
      <span className="block text-[11px] leading-4 text-cream">{chat.welcome}</span>
      {/* O carimbo vai em linha própria porque o texto do bot quebra em duas
          linhas: encaixado no fim da última, ele empurraria a quebra. */}
      <span className={`mt-0.5 block text-right leading-none ${CARIMBO}`}>
        <code>{HORA}</code>
      </span>
    </span>
  );

  /** A bolha da oferta, igual nos passos 02 a 04 — muda só o que vem depois. */
  const offer = (
    <span className="block rounded-field bg-ink-850 px-3 py-2.5">
      <span className="block text-[11px] font-semibold text-cream">{checkout.product}</span>
      <span className="mt-0.5 block text-[11px] leading-4 text-faint">{checkout.productNote}</span>
      {/* Aqui o carimbo sobe para a linha do preço: ela é curta e a hora ocupa
          o vão à direita sem custar altura nenhuma à bolha. */}
      <span className="mt-1.5 flex items-baseline gap-2">
        <span className="tnum text-[15px] leading-5 font-semibold text-cream">{sale.amount}</span>
        <span className={`ml-auto ${CARIMBO}`}>
          <code>{HORA}</code>
        </span>
      </span>
    </span>
  );

  return (
    <div
      /* O rim é mais forte que o do painel (6%) de propósito: o aparelho está
         virado para o centro e é a aresta dele que recebe a luz do palco. */
      className={`${CHASSI}${className ? ` ${className}` : ""}`}
    >
      {/* Botões laterais: 2px, do degrau de tom da moldura. É o detalhe que faz
          o objeto ler como aparelho e não como cartão arredondado. */}
      <span className="absolute top-[86px] -left-[2px] h-6 w-[2px] rounded-full bg-ink-700" />
      <span className="absolute top-[118px] -left-[2px] h-6 w-[2px] rounded-full bg-ink-700" />
      <span className="absolute top-[104px] -right-[2px] h-10 w-[2px] rounded-full bg-ink-700" />

      {/* Degrau 3: o BISEL preto de 6px entre o chassi e o vidro. O raio é a
          conta do aninhamento — 2,6rem do aparelho menos o rim e o chassi —, e
          o do vidro é este menos os 6 do bisel. Sem o bisel a tela encostava no
          chassi e a peça lia como um cartão com uma foto dentro. */}
      <div className="h-full rounded-[2.2rem] bg-black p-[6px]">
        <div className="phone-screen relative flex h-full flex-col overflow-hidden rounded-[1.8rem] bg-ink-950 shadow-[inset_0_0_0_1px_rgba(255,255,227,0.10)]">
          {/* Barra de status — 26. A hora é a da venda: a linha nova do extrato,
              no painel ao lado, é a MESMA transação, e as linhas abaixo dela são
              mais antigas (21:31, 20:58). */}
          <div className="flex h-[26px] shrink-0 items-center justify-between px-4">
            <span className="text-[11px] font-medium text-cream">
              <code>{HORA}</code>
            </span>
            <span className="flex items-center gap-1 text-cream/70">
              <SignalHigh className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryMedium className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Ilha dinâmica, com o furo da câmera recuado à direita */}
          <span className="absolute top-[7px] left-1/2 flex h-[18px] w-[68px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[8px]">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-800" />
          </span>

          {/* Cabeçalho do chat — 44. É nele que o fio do palco chega: a notícia
              entra POR CIMA da conversa, não pelo meio da tela. */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15">
              <WoneIcon className="h-3 w-auto" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[11px] font-semibold text-cream">
                {phone.botName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                {phone.online}
              </span>
            </span>
            <span className="ml-auto shrink-0 text-[11px] font-medium tracking-[0.08em] text-faint uppercase">
              {ui.simulation}
            </span>
          </div>

          {/* O CHAT. As quatro camadas ficam montadas e ancoradas no RODAPÉ, como
              conversa de verdade: é o que faz o passo 01, com duas bolhas, parecer
              um chat novo em vez de uma tela vazia. O papel de parede faz o
              resto — ver `.hiw-papel`. */}
          <div className="hiw-papel relative min-h-0 flex-1">
            {/* PASSO 01 — o bot acorda */}
            <StepLayer active={step === 0} className="flex flex-col justify-end gap-2 p-3">
              <p className="text-center text-[11px] text-faint">{demo.connected}</p>
              {/* O cliente TOCA no botão de começar; ele não escreve. O que sai
                  dele é o comando. */}
              <span className="ml-auto flex max-w-[80%] items-baseline gap-2 rounded-field bg-ink-800 px-2.5 py-1.5">
                <code>{startCommand}</code>
                <span className={CARIMBO}>
                  <code>{HORA}</code>
                </span>
              </span>
              {welcome}
            </StepLayer>

            {/* PASSO 02 — a oferta chega, e ANTES dela o bot digita */}
            <StepLayer active={step === 1} className="flex flex-col justify-end gap-2 p-3">
              {welcome}
              {/* O indicador fica ABSOLUTO sobre o pé da bolha, e não em linha
                  antes dela: assim a conversa não dá um pulo de 70px quando a
                  oferta entra, e o chat continua ancorado no rodapé o tempo
                  todo. Durante os 900 ms a bolha está invisível e o espaço dela
                  já está reservado. */}
              <span className="relative block">
                <span className="hiw-digitando absolute bottom-0 left-0 flex items-center gap-1 rounded-field bg-ink-850 px-3 py-2.5">
                  <span className="hiw-ponto block h-1.5 w-1.5 rounded-full bg-cream/45" />
                  <span className="hiw-ponto block h-1.5 w-1.5 rounded-full bg-cream/45" />
                  <span className="hiw-ponto block h-1.5 w-1.5 rounded-full bg-cream/45" />
                </span>
                <span className="hiw-bolha-entra block">{offer}</span>
              </span>
            </StepLayer>

            {/* PASSO 03 — o checkout, com o botão que o gateway acabou de ligar */}
            <StepLayer active={step === 2} className="flex flex-col justify-end gap-2 p-3">
              {/* A boas-vindas só onde há altura para ela: a 412 a tela útil do
                  chat tem 214px e as três peças do checkout (oferta, método e
                  botão) são o que o passo PRECISA mostrar — mesma conta que
                  esconde a oferta no passo 04. */}
              <span className="hidden xl:block">{welcome}</span>
              {offer}
              <span className="flex items-center gap-2">
                <Chip tone="brand">{method}</Chip>
              </span>
              {/* `disabled` de propósito: nada dentro de uma ilustração
                  `aria-hidden` pode ser focável (precedente: `CheckoutDemo`). O
                  botão só existe a partir do passo 03 porque é o gateway que o
                  liga — a causalidade do produto dita sem uma palavra. */}
              <CtaButton size="object" disabled className="w-full">
                {checkout.payWith} {method}
              </CtaButton>
            </StepLayer>

            {/* PASSO 04 — pago, entregue, e daqui em diante é o cliente */}
            <StepLayer active={step === 3} className="flex flex-col justify-end gap-2 p-3">
              {/* A oferta continua na conversa, mas só onde há altura para ela:
                  a 412 o aparelho tem 360px e as três peças do desfecho (a régua,
                  o cartão verde e o convite) são o que ele PRECISA mostrar. */}
              <span className="hidden xl:block">{offer}</span>
              <p className="border-t border-line pt-2 text-center text-[11px] text-faint">
                {demo.hand}
              </p>
              <span className="hiw-pop flex items-center gap-2.5 rounded-field bg-emerald-500/12 px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-3 w-3 stroke-[3] text-emerald-400" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="tnum block text-[13px] font-semibold text-emerald-400">
                    +{sale.amount}
                  </span>
                  <span className="block truncate text-[11px] text-cream/60">{phone.approved}</span>
                </span>
              </span>
              <span className="flex flex-col gap-1 rounded-field bg-ink-850 px-3 py-2">
                <span className="truncate text-[11px] leading-4">
                  <span className="font-medium text-cream">{demo.inviteSent}</span>
                  <span className="text-faint"> · {phone.inviteNote}</span>
                </span>
                <Chip tone="ok" className="w-max">
                  {delivery.done}
                </Chip>
              </span>
            </StepLayer>

            {/* A PÍLULA DE HORA, no alto do chat e igual nos quatro passos. Fica
                FORA das camadas (e por último, para pintar por cima) porque é o
                separador do dia: num chat de verdade ele flutua no topo
                enquanto a conversa corre por baixo. Absoluta, não em fluxo, para
                não custar altura às camadas — a 412 o passo 03 já usa a tela
                inteira. */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-ink-800 px-2 py-0.5 text-[11px] leading-4 text-faint">
              <code>{HORA}</code>
            </span>
          </div>

          {/* Compositor — 52. INERTE de propósito (`<span>`, não `<input>`): isto
              é ilustração, e um campo de verdade seria focável e convidaria a
              digitar numa tela que não responde. */}
          <div className="flex h-[52px] shrink-0 items-start gap-2 border-t border-line px-3 pt-2.5">
            <span className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-ink-850 px-3">
              <span className="truncate text-[11px] text-faint">{phone.composer}</span>
              <Smile className="ml-auto h-3.5 w-3.5 shrink-0 text-cream/35" />
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15">
              <Mic className="h-3.5 w-3.5 text-brand" />
            </span>
          </div>

          {/* Barra de gesto */}
          <span className="absolute bottom-1.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-cream/25" />

          {/* A luz de vidro, por último para pegar a tela inteira. Não recebe
              ponteiro e não escurece nada: é 7% de creme apagando em 40% da
              altura (ver `.hiw-vidro`). */}
          <span className="hiw-vidro pointer-events-none absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
