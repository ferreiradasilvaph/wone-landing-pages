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
  /** Onde a seta da aresta que chega encosta, na borda esquerda. */
  in: [number, number];
  ports: Port[];
};

/* --------------------------------------------------------------------------
   AS POSIÇÕES. Os números saíram do orçamento vertical da área do editor:
   cabeçalho flutuante (3..38), barra de ferramentas (41..63), botão "Nós"
   (66..82), três fileiras de nós (88, 186, 284) e o rodapé em 363..397.
   -------------------------------------------------------------------------- */
const FULL = {
  start: { x: 6, y: 88, w: 84, h: 24, in: [6, 100], ports: [{ x: 90, y: 104 }] },
  text1: { x: 112, y: 88, w: 186, h: 78, in: [112, 114], ports: [{ x: 298, y: 158 }] },
  ai: { x: 312, y: 88, w: 170, h: 76, in: [312, 114], ports: [{ x: 482, y: 152, label: "limit" }] },
  text2: { x: 6, y: 182, w: 196, h: 78, in: [6, 208], ports: [{ x: 202, y: 252 }] },
  charge: {
    x: 218,
    y: 182,
    w: 120,
    h: 44,
    in: [218, 204],
    ports: [{ x: 338, y: 216, label: "created" }],
  },
  await: {
    x: 360,
    y: 182,
    w: 148,
    h: 60,
    in: [360, 208],
    ports: [
      { x: 508, y: 218, label: "paid" },
      { x: 508, y: 234, label: "expired" },
    ],
  },
  deliver: {
    x: 6,
    y: 280,
    w: 150,
    h: 44,
    in: [6, 302],
    ports: [{ x: 156, y: 314, label: "delivered" }],
  },
  end: { x: 192, y: 280, w: 78, h: 24, in: [192, 292], ports: [] },
  text3: { x: 290, y: 280, w: 200, h: 78, in: [290, 306], ports: [] },
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
 * A barriga das curvas, por variante. Ela não é estética: é a conta que impede a
 * aresta de atravessar um cartão na virada de fileira. Na variante `mini` a
 * faixa vazia entre fileiras tem 14px, e os 70 da `full` jogariam a curva por
 * cima do nó de baixo e para fora da borda esquerda do canvas.
 */
const BEND = {
  full: { out: 70, back: 90, dip: 70 },
  mini: { out: 48, back: 48, dip: 34 },
} as const;

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

/** As oito ligações: de qual porta de qual nó para qual nó. */
const EDGES: { from: NodeId; port: number; to: NodeId }[] = [
  { from: "start", port: 0, to: "text1" },
  { from: "text1", port: 0, to: "ai" },
  { from: "ai", port: 0, to: "text2" },
  { from: "text2", port: 0, to: "charge" },
  { from: "charge", port: 0, to: "await" },
  { from: "await", port: 0, to: "deliver" },
  { from: "await", port: 1, to: "text3" },
  { from: "deliver", port: 0, to: "end" },
];

/** Quantos nós e quantas ligações o cabeçalho e o rodapé do editor anunciam. */
export const FLOW_NODES = ORDER.length;
export const FLOW_EDGES = EDGES.length;

const EDGE_COLOR = "rgba(255,255,227,0.26)";

/**
 * O caminho de uma aresta.
 *
 * Quando o destino está à direita (o caso comum), é uma cúbica com as duas
 * tangentes horizontais — a curva que todo editor de nós desenha. Quando ele
 * está à ESQUERDA (a virada de fileira), as tangentes ganham 70px de descida na
 * saída e 70 de subida na chegada: é o que faz a curva sair do cartão por baixo
 * em vez de atravessá-lo, e ela passa inteira pela faixa vazia entre as duas
 * fileiras.
 */
function edgePath(
  a: [number, number],
  b: [number, number],
  bend: (typeof BEND)[keyof typeof BEND],
) {
  const dx = b[0] - a[0];

  if (dx > 12) {
    const k = Math.min(Math.max(dx * 0.6, 14), 90);
    return `M ${a[0]} ${a[1]} C ${a[0] + k} ${a[1]}, ${b[0] - k} ${b[1]}, ${b[0]} ${b[1]}`;
  }

  const dip = b[1] >= a[1] ? bend.dip : -bend.dip;
  return `M ${a[0]} ${a[1]} C ${a[0] + bend.out} ${a[1] + dip}, ${b[0] - bend.back} ${
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
              d={edgePath([from.x, from.y], [to[0], to[1]], BEND[variant])}
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
              <span className="flex min-h-0 flex-1 bg-[#0d1420] p-1">
                <span className="line-clamp-3 w-full rounded-[8px] bg-[#1a2533] px-2 py-[3px] text-[11px] leading-[1.2] text-cream/85">
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
  );
}
