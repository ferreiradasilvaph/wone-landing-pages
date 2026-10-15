"use client";

import { useId } from "react";
import {
  AlignLeft,
  Flag,
  Hourglass,
  KeyRound,
  MessagesSquare,
  Play,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";

/* ==========================================================================
   O FLUXO DO EDITOR DE VERDADE, em miniatura.

   O que havia aqui era INVENTADO: nós em pílula com um pontinho colorido por
   categoria ("Fluxo", "Conteúdo", "Venda"), ligados por linhas retas verticais.
   O dono mandou os prints do editor real em 15/10 e o diagnóstico foi curto —
   nada daquilo existe no produto. O editor de verdade desenha CARTÕES: cabeçalho
   com ícone e tipo em negrito, corpo com o conteúdo (a bolha da mensagem, o
   prompt truncado da IA), portas em pontos laranja na borda DIREITA com o nome
   da saída à esquerda do ponto, e arestas em curva de Bézier com setinha na
   chegada.

   O FLUXO É O DO PRINT, na versão PRONTA:

     Início → Texto (boas-vindas) → IA Conversa → Texto (oferta) →
     Gerar cobrança → (gerada) Aguardar pagamento → (pago) Entregar acesso →
     (entregue) Fim, e o ramo (expirou) → Texto ("Seu PIX expirou…").

   "Pronta" é a diferença que o dono pediu: no print o fluxo ainda tinha 1 erro e
   4 avisos ("Saída padrão sem destino", "Sem bot"), e nada disso entra aqui.
   A regra que isso impõe ao desenho é dura e vale a pena escrever: SÓ SE DESENHA
   A PORTA QUE TEM DESTINO. É por isso que a IA Conversa mostra uma porta
   ("limite", a que o fluxo usa quando as 5 mensagens acabam) e não as três do
   print, e que "Gerar cobrança" mostra "gerada" sem "falhou".

   GEOMETRIA EM PX, DUAS VARIANTES.

   A posição de cada nó e de cada porta é aritmética — sem medir o DOM, sem
   ResizeObserver. O SVG das arestas não tem `viewBox`: 1 unidade = 1px do
   elemento, então as curvas e as caixas (que são HTML) nunca desencontram.

     `full` — a partir de `xl`, onde a área do editor mede 529×397 e o cartão
       cabe com corpo: três fileiras de nós, bolhas de mensagem, portas com nome.
     `mini` — abaixo de `xl`, onde a área tem ~320px de largura. Os MESMOS nove
       nós e as MESMAS oito ligações, só que em cartão de cabeçalho (é o que um
       editor mostra quando se afasta o zoom): quatro fileiras, sem corpo e sem
       nome de porta. Nada de texto abaixo de 11px e nada encolhido por
       `transform` — o piso do mockup vale aqui dentro também.
   ========================================================================== */

/** Um ponto de saída: onde ele fica e, quando a saída tem nome, qual é. */
type Port = { x: number; y: number; label?: string };

/** Um nó posto no canvas: a caixa, o ponto de entrada e as portas. */
type Placed = {
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Onde a seta da aresta que chega encosta. Em geral é a borda ESQUERDA
   * (`node.y + 10`, logo abaixo do topo, como no print). Nos dois nós que
   * ABREM uma fileira é a borda de CIMA: a aresta que volta da direita não tem
   * por onde chegar pela esquerda sem atravessar o próprio cartão — a margem
   * esquerda do canvas tem 20px e a curva precisaria descer 10px dentro dela.
   */
  in: [number, number];
  ports: Port[];
};

/* --------------------------------------------------------------------------
   AS POSIÇÕES, refeitas em 15/10 contra os dois prints do editor (medidos a
   pixel: `canvas-1` e `canvas-2` são a metade esquerda e a direita do MESMO
   fluxo, e o segundo é o primeiro deslocado em −1297, −117).

   O QUE O PRINT MOSTRA, e que o desenho anterior não tinha:

   1. LARGURA ÚNICA. Os nove cartões do print medem 224..230px — a mesma caixa
      para "Início" (só cabeçalho) e para "Aguardar pagamento". A tabela antiga
      tinha nove larguras diferentes, de 78 a 200px, e era isso que fazia o
      desenho ler como um infográfico e não como um editor. Aqui a largura é
      150px para todos: três por fileira com vão de 20 (3×150 + 2×20 = 490) nos
      530 da área, 20px de margem de cada lado. 150 é também o piso para
      "Aguardar pagamento" caber sem reticências no cabeçalho de 11px.

   2. CASCATA. No print o fluxo é UMA corrida da esquerda para a direita que
      desce: topo a topo, +72, +59, +42, +92… nunca volta à margem, e o passo
      horizontal é constante (260..265px de borda a borda, ou seja largura 225 +
      vão ~37). Em 530px não cabe uma corrida só, então são três fileiras — mas
      cada nó desce 8px em relação ao anterior DENTRO da fileira, e cada fileira
      começa um degrau inteiro (+86, +78) abaixo do começo da anterior. Os nove
      topos, na ordem do fluxo: 88, 96, 104 · 190, 198, 206 · 284, 292. O olho
      lê uma descida contínua, não três listas empilhadas.

   3. ALTURA PELO CONTEÚDO, como no print (44 só-cabeçalho, ~96 duas linhas,
      ~113 três linhas, ~136 a IA, ~75 o nó de espera): 40 para Início, Gerar
      cobrança e Fim; 76 para os Textos de três linhas; 63 para o Texto do PIX
      expirado (duas linhas — no print esse cartão também é o mais baixo dos
      Textos); 76 para a IA (prompt + chip + a linha da porta, que no print fica
      ABAIXO do chip); 52 para Aguardar pagamento (cabeçalho + duas portas, com
      16px entre elas); 38 para Entregar acesso (cabeçalho + uma porta).

      Os 40 dos só-cabeçalho não são enfeite: a PORTA MORA NO CORPO. Com 24 (a
      altura do cabeçalho) o rótulo "gerada", alinhado à direita, caía em cima
      de "Gerar cobrança" e as duas palavras se encostavam — foi o que a
      primeira captura mostrou. No print é igual: "Gerar cobrança" tem 77px de
      altura e as portas ficam abaixo da faixa do título.

   4. RAMO SEM SAÍDA ENCAIXADO. No print os Textos de "erro", "expirou" e
      "falhou" não entram na corrida: ficam logo abaixo do nó irmão, recuados
      uns 8px para a direita. O nosso único ramo desses é o Texto do PIX
      expirado, que saiu do fim da fila e passou a morar embaixo de "Aguardar
      pagamento" (x +8), ligado por um gancho curto.

   O QUE A ÁREA (530×398) JÁ TEM OCUPADO, medido no DOM do `WonePanel` e não
   no olho: o cabeçalho flutuante 3..39, a barra de ferramentas 41..61, o botão
   "Nós" 65..83, o rodapé a partir de 364 — e, o que faltava na conta antiga, o
   CHIP "Rascunho salvo" em x 410..523, y 341..361. É ele, e não o rodapé, que
   decide onde o ramo encaixado pode terminar: o canto inferior direito do
   canvas não é vazio. Os nós vivem, então, entre y 88 e y 336.
   -------------------------------------------------------------------------- */

/** A largura única dos nove cartões, e as três colunas que ela forma. */
const W = 150;
const CX = [20, 190, 360] as const;

const FULL = {
  start: { x: CX[0], y: 88, w: W, h: 40, in: [CX[0], 98], ports: [{ x: CX[0] + W, y: 118 }] },
  text1: { x: CX[1], y: 96, w: W, h: 76, in: [CX[1], 106], ports: [{ x: CX[1] + W, y: 138 }] },
  ai: {
    x: CX[2],
    y: 104,
    w: W,
    h: 76,
    in: [CX[2], 114],
    /* A porta fica ABAIXO do chip de ajuste (que acaba em y 165), como no
       print — senão o rótulo "limite", alinhado à direita, deita sobre ele. */
    ports: [{ x: CX[2] + W, y: 172, label: "limit" }],
  },
  /* Abre a 2ª fileira: a seta chega pela borda de CIMA (ver `in`). */
  text2: { x: CX[0], y: 190, w: W, h: 76, in: [CX[0] + 34, 190], ports: [{ x: CX[0] + W, y: 232 }] },
  charge: {
    x: CX[1],
    y: 198,
    w: W,
    h: 40,
    in: [CX[1], 208],
    ports: [{ x: CX[1] + W, y: 228, label: "created" }],
  },
  await: {
    x: CX[2],
    y: 206,
    w: W,
    h: 52,
    in: [CX[2], 216],
    ports: [
      { x: CX[2] + W, y: 234, label: "paid" },
      { x: CX[2] + W, y: 250, label: "expired" },
    ],
  },
  /* Abre a 3ª fileira: idem, a seta chega por cima. */
  deliver: {
    x: CX[0],
    y: 284,
    w: W,
    h: 38,
    in: [CX[0] + 34, 284],
    ports: [{ x: CX[0] + W, y: 312, label: "delivered" }],
  },
  end: { x: CX[1], y: 292, w: W, h: 40, in: [CX[1], 302], ports: [] },
  /* O RAMO ENCAIXADO: 8px à direita de "Aguardar pagamento" e 17px abaixo
     dele, fora da corrida. Termina em y 336 — 5px acima do chip "Rascunho
     salvo", que é o teto real deste canto. */
  text3: { x: CX[2] + 8, y: 273, w: W, h: 63, in: [CX[2] + 8, 283], ports: [] },
} satisfies Record<string, Placed>;

/* Quatro fileiras de cartão-cabeçalho, passo de 38px, começando em 84 (abaixo de
   `xl` a moldura flutuante é 4px mais rasa). A largura de cada um é a do rótulo
   mais longo em 11px com o ícone e o respiro — medida, não chutada. */
const MINI = {
  start: { x: 16, y: 84, w: 62, h: 24, in: [16, 96], ports: [{ x: 78, y: 96 }] },
  text1: { x: 94, y: 84, w: 60, h: 24, in: [94, 96], ports: [{ x: 154, y: 96 }] },
  ai: { x: 16, y: 122, w: 94, h: 24, in: [16, 134], ports: [{ x: 110, y: 134 }] },
  text2: { x: 124, y: 122, w: 60, h: 24, in: [124, 134], ports: [{ x: 184, y: 134 }] },
  charge: { x: 16, y: 160, w: 112, h: 24, in: [16, 172], ports: [{ x: 128, y: 172 }] },
  await: {
    x: 144,
    y: 160,
    w: 142,
    h: 24,
    in: [144, 172],
    ports: [
      { x: 286, y: 167 },
      { x: 286, y: 179 },
    ],
  },
  deliver: { x: 16, y: 198, w: 118, h: 24, in: [16, 210], ports: [{ x: 134, y: 210 }] },
  end: { x: 150, y: 198, w: 50, h: 24, in: [150, 210], ports: [] },
  text3: { x: 216, y: 198, w: 60, h: 24, in: [216, 210], ports: [] },
} satisfies Record<string, Placed>;

/**
 * A barriga das curvas da `mini`. Ela não é estética: é a conta que impede a
 * aresta de atravessar um cartão na virada de fileira. A faixa vazia entre as
 * fileiras da `mini` tem 14px, e uma barriga maior jogaria a curva por cima do
 * nó de baixo e para fora da borda esquerda do canvas.
 *
 * A `full` não usa mais barriga: com a cascata, as voltas de fileira passam por
 * uma FAIXA declarada (ver `lane` em `EDGES`), que é mais firme do que uma
 * barriga — a curva corre por uma altura que se sabe vazia, em vez de depender
 * de um palpite proporcional ao salto.
 */
const BEND = { out: 48, back: 48, dip: 34 } as const;

type NodeId = keyof typeof FULL;

/** A ordem em que os nós acendem quando o passo 02 entra. É a ordem do fluxo. */
const ORDER: NodeId[] = [
  "start",
  "text1",
  "ai",
  "text2",
  "charge",
  "await",
  "deliver",
  "end",
  "text3",
];

/** O ícone e o tom de cada tipo de nó, como no print. */
const ICON: Record<NodeId, LucideIcon> = {
  start: Play,
  text1: AlignLeft,
  ai: MessagesSquare,
  text2: AlignLeft,
  charge: QrCode,
  await: Hourglass,
  deliver: KeyRound,
  end: Flag,
  text3: AlignLeft,
};

/**
 * As oito ligações: de qual porta de qual nó para qual nó.
 *
 * `lane` é a ALTURA DA FAIXA VAZIA por onde a aresta corre quando o destino
 * está à esquerda — as duas viradas de fileira e o encaixe do ramo. Só a `full`
 * usa (a `mini` tem a sua própria barriga). Os três números são medidos contra
 * a tabela: 185 corre 5px abaixo da IA e 5px acima do Texto da oferta; 266
 * corre 8px abaixo de "Aguardar pagamento" e 7px acima do ramo encaixado; 270
 * é a faixa do próprio ramo, 4px abaixo da outra para as duas voltas não se
 * sobreporem na saída. Mexer numa altura de cartão sem reconferir estes três é
 * o jeito certo de pôr uma curva por cima de um nó.
 */
const EDGES: { from: NodeId; port: number; to: NodeId; lane?: number }[] = [
  { from: "start", port: 0, to: "text1" },
  { from: "text1", port: 0, to: "ai" },
  { from: "ai", port: 0, to: "text2", lane: 185 },
  { from: "text2", port: 0, to: "charge" },
  { from: "charge", port: 0, to: "await" },
  { from: "await", port: 0, to: "deliver", lane: 266 },
  { from: "await", port: 1, to: "text3", lane: 270 },
  { from: "deliver", port: 0, to: "end" },
];

/** Quantos nós e quantas ligações o cabeçalho e o rodapé do editor anunciam. */
export const FLOW_NODES = ORDER.length;
export const FLOW_EDGES = EDGES.length;

const EDGE_COLOR = "rgba(255,255,227,0.26)";

/**
 * O caminho de uma aresta na `full`.
 *
 * ADIANTE (o caso comum, e o único que o print tem): uma cúbica com as duas
 * tangentes horizontais — a curva que todo editor de nós desenha. Com a cascata
 * o vão entre colunas é de 20px e o degrau de 10, então essas oito curvas
 * nascem curtas e quase deitadas, sem mergulho nenhum.
 *
 * PARA TRÁS (as duas viradas de fileira e o encaixe do ramo): dois pedaços. O
 * primeiro é um GANCHO de 18px à direita da porta, que desce da porta até a
 * faixa — é o que tira a curva de cima do próprio cartão antes de ela voltar.
 * O segundo corre pela faixa e entra no destino: pelo TOPO quando o destino
 * abre uma fileira (a tangente final aponta para baixo, e a seta com ela), pela
 * ESQUERDA quando é o ramo encaixado logo abaixo — aí o controle puxa a curva
 * para fora da caixa antes de descer, senão ela rasparia o canto do cartão.
 */
const HOOK = 18;

function caminhoFull(a: [number, number], b: [number, number], lane?: number) {
  const dx = b[0] - a[0];

  if (lane === undefined || dx > 12) {
    const k = Math.min(Math.max(dx * 0.55, 16), 56);
    return `M ${a[0]} ${a[1]} C ${a[0] + k} ${a[1]}, ${b[0] - k} ${b[1]}, ${b[0]} ${b[1]}`;
  }

  const gancho = `M ${a[0]} ${a[1]} C ${a[0] + HOOK} ${a[1]}, ${a[0] + HOOK} ${lane}, ${a[0]} ${lane}`;
  const resto =
    a[0] - b[0] > 200
      ? ` C ${a[0] - 120} ${lane}, ${b[0]} ${lane}, ${b[0]} ${b[1]}`
      : ` C ${b[0] - 38} ${lane}, ${b[0] - 24} ${b[1]}, ${b[0]} ${b[1]}`;

  return gancho + resto;
}

/**
 * O caminho de uma aresta na `mini` — o desenho de antes, intocado. Abaixo de
 * `xl` o canvas tem ~320px e quatro fileiras de cartão-cabeçalho: a faixa vazia
 * entre fileiras tem 14px e não comporta gancho nem faixa declarada, então a
 * virada continua sendo uma cúbica com barriga.
 */
function caminhoMini(a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];

  if (dx > 12) {
    const k = Math.min(Math.max(dx * 0.6, 14), 90);
    return `M ${a[0]} ${a[1]} C ${a[0] + k} ${a[1]}, ${b[0] - k} ${b[1]}, ${b[0]} ${b[1]}`;
  }

  const dip = b[1] >= a[1] ? BEND.dip : -BEND.dip;
  return `M ${a[0]} ${a[1]} C ${a[0] + BEND.out} ${a[1] + dip}, ${b[0] - BEND.back} ${
    b[1] - dip
  }, ${b[0]} ${b[1]}`;
}

/**
 * O canvas do editor: as arestas num `<svg>` por baixo e os nós em HTML por
 * cima, os dois no mesmo sistema de coordenadas.
 *
 * O componente é só desenho — quem põe a grade, o brilho, a marca d'água e a
 * moldura flutuante é o `WonePanel`, porque essas peças existem nas duas
 * variantes e não dependem do fluxo.
 */
export function FlowCanvas({ variant }: { variant: "full" | "mini" }) {
  const { howItWorks } = useContent();
  const panel = howItWorks.demo.panel;
  const { nodeTypes, nodePorts, nodeMessages } = panel;

  /* `useId` em vez de um id fixo: as duas variantes ficam montadas ao mesmo
     tempo (uma escondida por media query), e dois `<marker>` com o mesmo id no
     documento fazem o navegador resolver sempre o primeiro. */
  const arrow = useId().replace(/:/g, "");
  const box: Record<NodeId, Placed> = variant === "full" ? FULL : MINI;
  const full = variant === "full";

  /** O tipo e, quando há, o corpo de cada nó. */
  const title: Record<NodeId, string> = {
    start: nodeTypes.start,
    text1: nodeTypes.text,
    ai: nodeTypes.ai,
    text2: nodeTypes.text,
    charge: nodeTypes.charge,
    await: nodeTypes.await,
    deliver: nodeTypes.deliver,
    end: nodeTypes.end,
    text3: nodeTypes.text,
  };
  const message: Partial<Record<NodeId, string>> = {
    text1: nodeMessages[0],
    text2: nodeMessages[1],
    text3: nodeMessages[2],
  };
  const portName: Record<string, string> = nodePorts;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* O AFASTAMENTO (pedido do diretor, 15/10: "tirar um pouco o zoom, deixar
          mais longe, pq os blocos e tudo mais está com uma sensação de
          proximidade muito grande").

          O fluxo ocupava 502 dos 530px do canvas — 14px de margem de cada lado,
          que é o enquadramento de quem está com o zoom no talo. Esta camada
          recua TUDO (arestas e nós juntos, no mesmo sistema de coordenadas) para
          85% a partir do centro: o desenho passa a 427px e sobram ~51px de grade
          vazia de cada lado, que é o que o olho lê como distância.

          Por que uma escala e não números menores nas tabelas: as posições de
          `FULL` são um orçamento fechado (cabeçalho, barra, três fileiras,
          rodapé) e cada curva foi medida contra ele. Uma escala move as duas
          camadas pelo mesmo fator e não desfaz nenhuma dessas contas.

          Só na variante `full`: a `mini` do celular já É a vista de longe (só
          cabeçalhos, sem corpo), e encolhê-la de novo apagaria os rótulos. */}
      <div className={full ? "hiw-afasta absolute inset-0" : "contents"}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          {/* A setinha da chegada. `userSpaceOnUse` para ela não crescer com a
              espessura do traço. */}
          <marker
            id={arrow}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="8"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M 1 1 L 7 4 L 1 7" fill="none" stroke={EDGE_COLOR} strokeWidth="1.2" />
          </marker>
        </defs>

        {EDGES.map((edge) => {
          const from = box[edge.from].ports[edge.port];
          const to = box[edge.to].in;
          return (
            <path
              key={`${edge.from}-${edge.port}`}
              d={
                full
                  ? caminhoFull([from.x, from.y], [to[0], to[1]], edge.lane)
                  : caminhoMini([from.x, from.y], [to[0], to[1]])
              }
              fill="none"
              stroke={EDGE_COLOR}
              strokeWidth={1.1}
              markerEnd={`url(#${arrow})`}
            />
          );
        })}
      </svg>

      {ORDER.map((id, index) => {
        const node = box[id];
        const Icone = ICON[id];
        const texto = message[id];
        const cabecalho = full ? 24 : node.h;

        return (
          <span
            key={id}
            /* `hiw-no` é o gatilho da passagem de luz: a borda vai a laranja na
               ordem do fluxo quando o passo 02 entra (ver `howitworks.css`). Só
               cor — a caixa não mexe um pixel. */
            className="hiw-no absolute flex flex-col overflow-hidden rounded-[12px] border border-ink-700 bg-ink-950"
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              animationDelay: `${0.18 + index * 0.16}s`,
            }}
          >
            {/* O CABEÇALHO: um tom acima do corpo, ícone e tipo em negrito. */}
            <span
              className={`flex shrink-0 items-center bg-ink-850 ${
                full ? "gap-1.5 px-2" : "gap-1 px-1.5"
              }`}
              style={{ height: cabecalho }}
            >
              <Icone
                className={`h-3 w-3 shrink-0 ${
                  id === "start"
                    ? "text-brand"
                    : id === "ai"
                      ? "text-[#6aa6ff]"
                      : "text-cream/55"
                }`}
              />
              <span className="min-w-0 truncate text-[11px] font-semibold text-cream">
                {title[id]}
              </span>
            </span>

            {/* O CORPO. Nó de Texto leva a bolha da mensagem; a IA leva o começo
                do prompt e o chip de ajuste; os de ação levam só as portas. */}
            {full && texto ? (
              <span className="flex min-h-0 flex-1 bg-[#0d1420] p-[3px]">
                {/* Duas linhas no ramo encaixado, três nos dois da corrida — é
                    a proporção do print, onde os Textos de ramo (96px) são um
                    degrau mais baixos que os da linha principal (113px). O
                    número de linhas é o que decide a altura do cartão na
                    tabela: 76 = 24 de cabeçalho + 6 de recuo + 4 de respiro da
                    bolha + 3 × 13,2 + 2 de folga; 63 = o mesmo com duas linhas. Mexer num
                    sem mexer no outro corta a bolha. */}
                <span
                  className={`w-full rounded-[8px] bg-[#1a2533] px-2 py-[2px] text-[11px] leading-[1.2] text-cream/85 ${
                    id === "text3" ? "line-clamp-2" : "line-clamp-3"
                  }`}
                >
                  {texto}
                </span>
              </span>
            ) : null}

            {full && id === "ai" ? (
              <span className="flex min-h-0 flex-1 flex-col gap-1 px-2 pt-1">
                <span className="truncate text-[11px] leading-[1.2] text-faint">
                  {panel.aiPrompt}
                </span>
                <span className="w-fit max-w-full truncate rounded-[6px] bg-[#16305a] px-1.5 text-[11px] leading-[1.45] text-[#7cb3ff]">
                  {panel.aiTuning}
                </span>
              </span>
            ) : null}
          </span>
        );
      })}

      {/* AS PORTAS, por último: o ponto fica EM CIMA da borda do cartão, então
          ele não pode ser filho de uma caixa com `overflow-hidden`. O nome, quando
          existe, fica à esquerda do ponto e dentro do cartão — como no print. */}
      {ORDER.map((id) =>
        box[id].ports.map((port, index) => (
          <span key={`${id}-${index}`}>
            {full && port.label ? (
              <span
                className="absolute -translate-y-1/2 pr-2 text-right text-[11px] leading-none text-faint"
                style={{ left: box[id].x, top: port.y, width: port.x - box[id].x }}
              >
                {portName[port.label]}
              </span>
            ) : null}
            <span
              className="absolute block rounded-full bg-brand"
              style={{
                left: port.x - 3.5,
                top: port.y - 3.5,
                width: 7,
                height: 7,
              }}
            />
          </span>
        )),
      )}
      </div>
    </div>
  );
}
