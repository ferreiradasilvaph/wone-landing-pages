"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Database,
  GitBranch,
  KeyRound,
  MessageSquare,
  Play,
  Plug,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "../Chip";
import { CtaButton } from "../CtaButton";

const EASE = [0.16, 1, 0.3, 1] as const;

/* --------------------------------------------------------------------------
   Vocabulário dos blocos

   Nomes, categorias e descrições vêm do dicionário (`highlights.demos.blocks`),
   então trocar o idioma traduz o funil que o lead montou. Os índices abaixo
   apontam para posições fixas dessa lista — é como o componente anterior já
   fazia, e é o que permite reconhecer um bloco sem comparar texto traduzido.
   -------------------------------------------------------------------------- */

/** Categoria "Fluxo": onde moram Início, Condição, Divisão A/B e Fim. */
const FLOW_CATEGORY = 0;
/** Índice de "Fim" dentro de Fluxo — o terminal das saídas secundárias. */
const END_ITEM = 5;
/** Itens de Fluxo com duas saídas: Condição (2) e Divisão A/B (4). */
const BRANCHING_ITEMS = new Set([2, 4]);
/** "Condição" decide sim/não; "Divisão A/B" reparte em A/B. */
const CONDITION_ITEM = 2;

/**
 * Cor e ícone por categoria.
 *
 * ATENÇÃO: esta tabela é uma proposta derivada da paleta da própria landing (as
 * cores já usadas nos pontos das integrações), não a tabela da plataforma.
 * Quando o frontend real estiver em `/referencia-fluxos`, basta trocar os
 * valores aqui — nenhum outro ponto do componente depende deles.
 */
const CATEGORY_META: { icon: LucideIcon; color: string }[] = [
  { icon: GitBranch, color: "#FF7700" }, // Fluxo
  { icon: MessageSquare, color: "#22D3EE" }, // Conteúdo
  { icon: ShoppingCart, color: "#32D583" }, // Venda
  { icon: KeyRound, color: "#A78BFA" }, // Acesso
  { icon: Database, color: "#FF9D45" }, // Dados
  { icon: Plug, color: "#0A7CFF" }, // Integração
  { icon: Sparkles, color: "#E879F9" }, // Inteligência artificial
];

/* Controle de apoio do editor (exemplo, limpar): mesma altura da pílula
   `object` do CtaButton, em tom neutro — dois laranjas na mesma barra e o botão
   que importa deixa de importar. O `before` é só o alvo de toque de 44px. */
const CONTROLE =
  "relative inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-ink-750 text-[13px] font-semibold text-muted transition-colors before:absolute before:-inset-[4px] before:content-[''] hover:bg-ink-700 hover:text-cream disabled:cursor-default disabled:opacity-40";
/* Em px separado: `w-9 px-0` sobre um `px-4` dependeria da ordem em que o
   Tailwind imprime as duas regras, e o ícone saía esmagado. */
const CONTROLE_TEXTO = `${CONTROLE} px-4`;
const CONTROLE_ICONE = `${CONTROLE} w-9`;

/* O mesmo alvo de 44px para as peças de 36: o botão "Rodar" (pílula `object` do
   kit, que vem com 36 e não expande o alvo), as sete abas de categoria e os
   blocos da paleta. 4px em cima e embaixo, sem mexer no desenho nem no layout.
   Repetido nas três demos com botão porque `cta.ts` é kit e não se toca nesta
   rodada — ver o comentário em DeliveryDemo.tsx. */
const ALVO_44 =
  "relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']";

/** Até onde o funil cresce, para o canvas não virar um tapete. */
const MAX_NODES = 8;
/** Quanto cada nó fica aceso quando o funil roda. */
const PULSE_MS = 520;

/* Geometria do canvas, em px. Nó de largura fixa é o que torna a posição de
   cada porta aritmética — sem medir o DOM, sem ResizeObserver. */
/* 176 e não 150: com o texto do nó no piso de 13px, a descrição cabia em três
   palavras e todo bloco terminava em reticência. */
const NODE_W = 176;
const NODE_H = 52;
const COL_W = NODE_W + 34;
const ROW_H = NODE_H + 24;
const PAD = 14;

const PORT_IDLE = "rgba(255,255,227,0.35)";
const EDGE_IDLE = "rgba(255,255,227,0.14)";
const BRAND = "#FF7700";
/** Tinta escura usada sobre o laranja, igual à dos botões da marca. */
const ON_BRAND = "#130800";

/** Coordenada de um bloco: categoria e posição dentro dela. */
type Slot = { uid: number; category: number; item: number };

type Category = { name: string; items: { name: string; detail: string }[] };

type FlowNode = {
  key: string;
  /** `null` nos nós derivados, que não saíram da paleta e não se removem. */
  uid: number | null;
  category: number;
  item: number;
  col: number;
  row: number;
  /** Passo em que o nó acende na execução; `-1` nunca acende. */
  step: number;
};

type FlowEdge = {
  key: string;
  d: string;
  label?: string;
  /** Posição do rótulo da saída, já calculada junto com a curva. */
  lx: number;
  ly: number;
  /** Acende quando a execução passa deste passo; `-1` nunca acende. */
  step: number;
};

/** Resolve os nomes do funil-exemplo para coordenadas na paleta. */
function presetSlots(categories: Category[], flow: string[]) {
  return flow.flatMap((name) => {
    for (let category = 0; category < categories.length; category += 1) {
      const item = categories[category].items.findIndex((entry) => entry.name === name);
      if (item !== -1) return [{ category, item }];
    }
    return [];
  });
}

const isBranching = (slot: { category: number; item: number }) =>
  slot.category === FLOW_CATEGORY && BRANCHING_ITEMS.has(slot.item);

/**
 * Monta o grafo a partir da cadeia de blocos.
 *
 * A cadeia principal ocupa a primeira linha, um bloco por coluna. Um bloco que
 * ramifica (Condição, Divisão A/B) ganha uma segunda saída que desce para a
 * linha de baixo e termina num "Fim" — bloco que existe na paleta, então a
 * ramificação mostra duas saídas de verdade sem inventar conteúdo. A execução
 * segue sempre a saída principal.
 */
function buildGraph(
  slots: Slot[],
  labels: { yes: string; no: string; a: string; b: string },
) {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const portY = (row: number) => PAD + row * ROW_H + NODE_H / 2;
  const rightX = (col: number) => PAD + col * COL_W + NODE_W;
  const leftX = (col: number) => PAD + col * COL_W;

  /** Cúbica horizontal, como as arestas de um editor de nós de verdade. */
  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const bend = Math.max(28, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
  };

  slots.forEach((slot, index) => {
    nodes.push({
      key: `n${slot.uid}`,
      uid: slot.uid,
      category: slot.category,
      item: slot.item,
      col: index,
      row: 0,
      step: index,
    });
  });

  slots.forEach((slot, index) => {
    const branching = isBranching(slot);
    const next = slots[index + 1];
    const x1 = rightX(index);
    const y1 = portY(0);

    if (next) {
      edges.push({
        key: `e${slot.uid}-${next.uid}`,
        d: curve(x1, y1, leftX(index + 1), y1),
        label: branching
          ? slot.item === CONDITION_ITEM
            ? labels.yes
            : labels.a
          : undefined,
        lx: x1 + 8,
        /* -22 e não -15: o rótulo subiu para 13px (o piso do portão de
           acessibilidade) e, no lugar antigo, encostava na aresta. */
        ly: y1 - 22,
        step: index,
      });
    }

    if (branching) {
      const y2 = portY(1);
      nodes.push({
        key: `b${slot.uid}`,
        uid: null,
        category: FLOW_CATEGORY,
        item: END_ITEM,
        col: index + 1,
        row: 1,
        step: -1,
      });
      edges.push({
        key: `eb${slot.uid}`,
        d: curve(x1, y1, leftX(index + 1), y2),
        label: slot.item === CONDITION_ITEM ? labels.no : labels.b,
        lx: x1 + 8,
        ly: y1 + 4,
        step: -1,
      });
    }
  });

  const cols = nodes.reduce((max, node) => Math.max(max, node.col), 0) + 1;
  const rows = nodes.reduce((max, node) => Math.max(max, node.row), 0) + 1;

  return {
    nodes,
    edges,
    width: PAD * 2 + (cols - 1) * COL_W + NODE_W,
    height: PAD * 2 + (rows - 1) * ROW_H + NODE_H,
  };
}

/* --------------------------------------------------------------------------
   Editor
   -------------------------------------------------------------------------- */

/**
 * Demonstração do editor de fluxos: canvas com nós, portas, arestas curvas,
 * painel de propriedades e execução passo a passo.
 *
 * Tudo em HTML, CSS e um `<svg>` para as arestas — nenhuma biblioteca de grafo.
 * Uma como React Flow custaria mais de 50 kB comprimidos e um segundo runtime de
 * layout, o que não cabe na meta de 95+ no PageSpeed mobile.
 *
 * Dados 100% mockados: nome, categoria e descrição saem do dicionário da
 * landing. Nada de API, nada do backend da plataforma.
 *
 * O componente é carregado com `ssr: false` (ver `Highlights`), e é isso que
 * autoriza ler `matchMedia` no primeiro render: não existe HTML de servidor para
 * divergir na hidratação. No mobile o canvas dá lugar a uma pilha vertical, sem
 * SVG e sem a ramificação em duas linhas — o bloco que ramifica mostra
 * "2 saídas" em texto.
 */
export function FlowEditorDemo() {
  const { highlights } = useContent();
  const demo = highlights.demos.blocks;
  const builder = demo.builder;
  const reduced = useReducedMotion();

  // Semente determinística: o funil de exemplo já montado.
  const [slots, setSlots] = useState<Slot[]>(() =>
    presetSlots(demo.categories, demo.flow).map((slot, index) => ({
      ...slot,
      uid: index,
    })),
  );
  const nextUid = useRef(demo.flow.length);

  /** Nó selecionado, cujo cartão aparece ao lado do canvas. */
  const [selected, setSelected] = useState<number | null>(null);
  /**
   * Bloco espiado na paleta quando o funil já está no limite.
   *
   * Clicar na paleta normalmente acrescenta o bloco e o deixa selecionado — é
   * o "escolhe e ele aparece, um por vez" que o designer descreveu. Com oito
   * nós no canvas não há o que acrescentar, e sem isto o clique não teria
   * resposta nenhuma: o cartão troca mesmo assim, só não entra no funil.
   */
  const [peek, setPeek] = useState<{ category: number; item: number } | null>(null);
  /** Passo aceso enquanto o funil roda; `-1` quando está parado. */
  const [pulse, setPulse] = useState(-1);
  /** Categoria aberta na paleta. Começa em Fluxo, onde está o "Início". */
  const [openCategory, setOpenCategory] = useState(FLOW_CATEGORY);
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 768px)").matches);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => setWide(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const full = slots.length >= MAX_NODES;
  const running = pulse >= 0;

  /** O pulso anda sozinho até sair pela ponta do funil. */
  useEffect(() => {
    if (pulse < 0) return;

    const last = pulse >= slots.length;
    const timer = window.setTimeout(
      () => setPulse((value) => (last ? -1 : value + 1)),
      reduced ? 60 : PULSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pulse, slots.length, reduced]);

  // O uid sai do ref fora do updater: mexer nele lá dentro seria efeito
  // colateral em função que o StrictMode invoca duas vezes.
  const add = useCallback(
    (category: number, item: number, atLimit: boolean) => {
      if (atLimit) {
        setPeek({ category, item });
        return;
      }

      const uid = nextUid.current;
      nextUid.current += 1;
      setSlots((current) =>
        current.length >= MAX_NODES ? current : [...current, { uid, category, item }],
      );
      setPulse(-1);
      setPeek(null);
      setSelected(uid);
    },
    [],
  );

  /** Clicar num nó do canvas também é escolher o bloco que o cartão mostra. */
  const pick = useCallback((uid: number) => {
    setPeek(null);
    setSelected(uid);
  }, []);

  const remove = useCallback((uid: number) => {
    setSlots((current) => current.filter((slot) => slot.uid !== uid));
    setSelected((current) => (current === uid ? null : current));
    setPulse(-1);
  }, []);

  const loadExample = useCallback(() => {
    const preset = presetSlots(demo.categories, demo.flow);
    const base = nextUid.current;
    nextUid.current += preset.length;
    setSlots(preset.map((slot, index) => ({ ...slot, uid: base + index })));
    setSelected(null);
    setPulse(-1);
  }, [demo.categories, demo.flow]);

  const graph = useMemo(
    () =>
      buildGraph(slots, {
        yes: builder.branchYes,
        no: builder.branchNo,
        a: builder.branchA,
        b: builder.branchB,
      }),
    [slots, builder.branchYes, builder.branchNo, builder.branchA, builder.branchB],
  );

  const entryOf = useCallback(
    (slot: { category: number; item: number } | undefined) =>
      slot ? demo.categories[slot.category]?.items[slot.item] : undefined,
    [demo.categories],
  );

  const selectedSlot = slots.find((slot) => slot.uid === selected);
  const selectedIndex = selectedSlot ? slots.indexOf(selectedSlot) : -1;

  /* O bloco do cartão: o espiado na paleta, quando o funil está cheio, senão o
     nó selecionado no canvas — que é o último clicado, venha da paleta ou do
     próprio canvas. */
  const spot = peek ?? selectedSlot ?? null;
  const spotEntry = entryOf(spot ?? undefined);
  const spotMeta = spot ? (CATEGORY_META[spot.category] ?? CATEGORY_META[0]) : null;
  const spotNext =
    !peek && selectedSlot ? entryOf(slots[selectedIndex + 1]) : undefined;
  const spotInputs = peek ? 1 : selectedIndex === 0 ? 0 : 1;

  return (
    <div>
      {/* Barra do editor. Título e subtítulo vivem no cabeçalho do painel,
          em `Highlights`, iguais para as quatro demos. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="t-label">{builder.canvas}</span>
          {/* Quantos blocos de quantos: número humano, então Geist com `tnum`
              (a mono do site vive só dentro de `<code>`). */}
          <span className="tnum text-[13px] text-faint">
            {slots.length}/{MAX_NODES}
          </span>
          {full && <Chip>{builder.full}</Chip>}
          {running && (
            <span role="status" className="text-[13px] font-medium text-brand">
              {builder.running}
            </span>
          )}
        </span>

        {/* "Rodar" é o botão de produto da demo: a pílula `object`, a mesma de
            "Simular de novo" e "Pagar com PIX". Os dois ao lado são controles
            de apoio e não podem ser um segundo laranja (regra 3) — ficam na
            pílula neutra, com o alvo de 44px pelo pseudo-elemento em volta. */}
        <span className="flex items-center gap-1.5">
          <CtaButton
            size="object"
            onClick={() => setPulse(0)}
            disabled={slots.length === 0 || running}
            className={ALVO_44}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            {builder.run}
          </CtaButton>
          <button
            type="button"
            onClick={loadExample}
            className={CONTROLE_TEXTO}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {builder.example}
          </button>
          <button
            type="button"
            onClick={() => {
              setSlots([]);
              setSelected(null);
              setPulse(-1);
            }}
            disabled={slots.length === 0}
            aria-label={builder.clear}
            className={CONTROLE_ICONE}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      </div>

      <div className="mt-3">
        {/* Canvas: a malha de pontos é o que faz ler como área de edição */}
        {/* O canvas é mockup dentro de card: fundo ink-950 com moldura de 1px e
            r-12, a única exceção de card dentro de card da página.

            O `radial-gradient` abaixo é a única `background-image` com a palavra
            "gradient" em toda a seção, e ele NÃO é degradê: as duas paradas
            caem no mesmo 1px, então o ponto tem borda dura e não existe rampa
            de cor nenhuma. É o único jeito que o CSS tem de desenhar um padrão
            de pontos sem imagem; o que a regra proíbe é a lavagem de cor sobre
            malha, que foi o que saiu com a `.grid-mesh`. */}
        <div
          className="rounded-field relative overflow-x-auto border border-line bg-ink-950 p-1"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,227,0.07) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          {slots.length === 0 ? (
            <p className="mx-auto w-fit py-14 text-[13px] text-faint">{builder.empty}</p>
          ) : wide ? (
            <div
              className="relative"
              style={{ width: graph.width, height: graph.height, minWidth: "100%" }}
            >
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0"
                width={graph.width}
                height={graph.height}
              >
                {graph.edges.map((edge) => {
                  const done = edge.step >= 0 && pulse > edge.step;
                  const current = edge.step >= 0 && pulse === edge.step + 1;

                  return (
                    <g key={edge.key}>
                      <path
                        d={edge.d}
                        fill="none"
                        strokeWidth={1.5}
                        stroke={done || current ? BRAND : EDGE_IDLE}
                      />
                      {/* Sinal percorrendo a aresta recém-atravessada */}
                      {current && !reduced && (
                        <motion.path
                          d={edge.d}
                          fill="none"
                          stroke="#FFFFE3"
                          strokeWidth={2}
                          strokeLinecap="round"
                          initial={{ pathLength: 0, opacity: 0.85 }}
                          animate={{ pathLength: 1, opacity: 0 }}
                          transition={{ duration: PULSE_MS / 1000, ease: "linear" }}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              <AnimatePresence initial={false}>
                {graph.nodes.map((node) => {
                  const entry = entryOf(node);
                  if (!entry) return null;

                  const meta = CATEGORY_META[node.category] ?? CATEGORY_META[0];
                  const derived = node.uid === null;

                  return (
                    <motion.div
                      key={node.key}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{
                        opacity: derived ? 0.55 : 1,
                        scale: node.step === pulse && node.step >= 0 ? 1.04 : 1,
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: reduced ? 0 : 0.28, ease: EASE }}
                      className="absolute"
                      style={{
                        left: PAD + node.col * COL_W,
                        top: PAD + node.row * ROW_H,
                        width: NODE_W,
                        height: NODE_H,
                      }}
                    >
                      <NodeCard
                        name={entry.name}
                        detail={entry.detail}
                        color={meta.color}
                        Icon={meta.icon}
                        lit={node.step >= 0 && node.step === pulse}
                        done={node.step >= 0 && pulse > node.step}
                        selected={!derived && node.uid === selected}
                        onSelect={derived ? undefined : () => pick(node.uid as number)}
                        onRemove={derived ? undefined : () => remove(node.uid as number)}
                        removeLabel={`${builder.remove}: ${entry.name}`}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Rótulos das duas saídas, sobre as arestas */}
              {graph.edges.map((edge) =>
                edge.label ? (
                  <span
                    key={`l${edge.key}`}
                    aria-hidden
                    className="pointer-events-none absolute rounded-full bg-ink-950 px-1.5 text-[13px] text-faint"
                    style={{ left: edge.lx, top: edge.ly }}
                  >
                    {edge.label}
                  </span>
                ) : null,
              )}
            </div>
          ) : (
            /* Mobile: pilha vertical, sem SVG e sem ramificação em duas linhas */
            <ol className="p-2">
              <AnimatePresence initial={false}>
                {slots.map((slot, index) => {
                  const entry = entryOf(slot);
                  if (!entry) return null;

                  const meta = CATEGORY_META[slot.category] ?? CATEGORY_META[0];
                  const done = pulse > index;

                  return (
                    <motion.li
                      key={slot.uid}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: reduced ? 0 : 0.28, ease: EASE }}
                    >
                      <div className="h-16">
                        <NodeCard
                          name={entry.name}
                          detail={entry.detail}
                          color={meta.color}
                          Icon={meta.icon}
                          lit={index === pulse}
                          done={done}
                          selected={slot.uid === selected}
                          branchHint={isBranching(slot) ? builder.twoOutputs : undefined}
                          onSelect={() => pick(slot.uid)}
                          onRemove={() => remove(slot.uid)}
                          removeLabel={`${builder.remove}: ${entry.name}`}
                        />
                      </div>

                      {/* O fio entre dois blocos. Ele SE DESENHA quando o
                          pulso passa (leva 1, 18/10): no desktop o canvas já
                          tem o sinal percorrendo a aresta curva, e aqui ele era
                          o único lugar da execução em que a passagem não tinha
                          direção — um retângulo de 1×16 que trocava de cor num
                          quadro. Duas camadas, porque uma só não daria: o
                          trilho de creme fica, e o laranja cresce POR CIMA com
                          `scaleY` a partir do alto. */}
                      {index < slots.length - 1 && (
                        <span aria-hidden className="relative ml-5 block h-4 w-px bg-line-strong">
                          {done && (
                            <span className="fluxo-desenha absolute inset-0 block bg-brand/70" />
                          )}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
        </div>

        {/* O bloco escolhido.

            Era uma tabela de seis linhas — Bloco, Categoria, ID, Entradas,
            Saídas, Próximo — mais o parágrafo. O designer apontou o efeito:
            "ela tem muitos dados", "às vezes confunde". Agora é um cartão do
            bloco: ícone e nome, a categoria na cor dela, o que ele faz, e
            entradas/saídas/próximo num rodapé de uma linha. O ID saiu — numerar
            o nó não diz nada a quem olha a landing.

            Depois ele voltou: a demo continuava larga demais. Era este painel —
            uma coluna de 13,5rem colada no canvas, que empurrava o funil para a
            direita e obrigava a seção a ocupar a página inteira. Virou a faixa
            de uma linha abaixo, o canvas ficou com a largura toda e a moldura
            caiu de 80rem para 64rem sem perder nada.

            E a faixa é o lugar onde o clique na paleta aparece: um bloco por
            vez, trocando pelo escolhido, que foi o que o designer pediu. */}
        <div className="rounded-field mt-3 overflow-hidden bg-ink-750 px-3.5 py-2.5">
          <AnimatePresence mode="wait">
            {spot && spotEntry && spotMeta ? (
              <motion.div
                key={`${spot.category}-${spot.item}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
              >
                <span className="t-label shrink-0">{builder.properties}</span>

                <spotMeta.icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: spotMeta.color }}
                />
                <span className="shrink-0 text-sm font-semibold text-cream">
                  {spotEntry.name}
                </span>
                <span
                  className="t-label shrink-0"
                  style={{ color: spotMeta.color }}
                >
                  {demo.categories[spot.category]?.name}
                </span>

                <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                  {spotEntry.detail}
                </span>

                <span className="flex shrink-0 gap-x-3 text-[13px] text-faint">
                  <span>
                    {builder.fields.inputs}{" "}
                    <span className="tnum text-muted">{spotInputs}</span>
                  </span>
                  <span>
                    {builder.fields.outputs}{" "}
                    <span className="tnum text-muted">{isBranching(spot) ? 2 : 1}</span>
                  </span>
                  <span className="max-w-[9rem] truncate">
                    {builder.fields.next}{" "}
                    <span className="text-muted">
                      {spotNext?.name ?? builder.fields.none}
                    </span>
                  </span>
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="vazio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="t-label shrink-0">{builder.properties}</span>
                <span className="text-[13px] text-faint">{builder.noSelection}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Paleta filtrada por categoria.

          As sete categorias apareciam todas abertas, empilhadas: 28 botões em
          sete blocos com cabeçalho, uns 420 px só de paleta, e a demo inteira
          passava de 760 px de altura. Era a maior parte do "ficou gigante".

          Agora a categoria é um filtro: a fileira de cima escolhe, e só os
          blocos dela aparecem. Os 28 continuam todos alcançáveis — em dois
          cliques em vez de um — e a paleta caiu para uma linha. */}
      {/* `gap-y-2` (8px), e não 6: o alvo de cada aba cresce 4px para cima e
          para baixo, e com 6px de respiro os alvos de duas fileiras vizinhas se
          sobreporiam — clique roubado. */}
      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="t-label mr-1">{builder.palette}</span>
        {demo.categories.map((category, categoryIndex) => {
          const meta = CATEGORY_META[categoryIndex] ?? CATEGORY_META[0];
          const Icon = meta.icon;
          const isOpen = categoryIndex === openCategory;

          return (
            <button
              key={category.name}
              type="button"
              aria-pressed={isOpen}
              onClick={() => setOpenCategory(categoryIndex)}
              className={`rounded-field flex h-9 cursor-pointer items-center gap-1.5 px-3 text-[13px] font-semibold transition-colors duration-200 ${ALVO_44} ${
                isOpen ? "bg-ink-700 text-cream" : "text-faint hover:bg-ink-750"
              }`}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: isOpen ? meta.color : undefined }}
              />
              {category.name}
              <span className="tnum opacity-60">{category.items.length}</span>
            </button>
          );
        })}
      </div>

      <ul className="mt-2.5 flex min-h-9 flex-wrap gap-x-1.5 gap-y-2">
        {(demo.categories[openCategory]?.items ?? []).map((item, itemIndex) => (
          <li key={item.name}>
            <button
              type="button"
              onClick={() => add(openCategory, itemIndex, full)}
              className={`rounded-field flex h-9 cursor-pointer items-center bg-ink-750 px-3 text-[13px] text-muted transition-colors duration-200 hover:bg-ink-700 hover:text-cream ${ALVO_44}`}
            >
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Nó do canvas.
 *
 * Selecionado se marca por fundo um tom acima e pela barra da categoria mais
 * grossa à esquerda — sem contorno, como o resto da página. Aceso durante a
 * execução, o fundo vira laranja da marca.
 *
 * O cartão é um `div` com `role="button"` porque carrega dentro de si o botão de
 * remover, e `<button>` não pode aninhar `<button>`.
 */
function NodeCard({
  name,
  detail,
  color,
  Icon,
  lit,
  done,
  selected,
  branchHint,
  onSelect,
  onRemove,
  removeLabel,
}: {
  name: string;
  detail: string;
  color: string;
  Icon: LucideIcon;
  lit: boolean;
  done: boolean;
  selected: boolean;
  branchHint?: string;
  onSelect?: () => void;
  onRemove?: () => void;
  removeLabel: string;
}) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={`rounded-field group/node relative flex h-full w-full items-center gap-2.5 overflow-hidden pr-1.5 pl-4 transition-colors duration-200 ${
        lit
          ? "bg-brand"
          : selected
            ? "bg-ink-700 text-cream"
            : "bg-ink-800 text-cream/85"
      } ${onSelect ? "cursor-pointer" : ""}`}
      style={lit ? { color: ON_BRAND } : undefined}
    >
      {/* Barra da categoria: 2px, 3px quando selecionado ou aceso */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{ width: selected || lit ? 3 : 2, background: lit ? ON_BRAND : color }}
      />

      {/* Portas: entrada à esquerda, saída à direita */}
      <span
        aria-hidden
        className="absolute top-1/2 -left-[3px] h-1.5 w-1.5 -translate-y-1/2 rounded-full"
        style={{ background: lit ? ON_BRAND : PORT_IDLE }}
      />
      <span
        aria-hidden
        className="absolute top-1/2 -right-[3px] h-1.5 w-1.5 -translate-y-1/2 rounded-full"
        style={{ background: lit || done ? BRAND : PORT_IDLE }}
      />

      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: lit ? ON_BRAND : color }}
      />

      <span className="min-w-0 flex-1 py-2 leading-tight">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className={`block truncate text-[13px] ${lit ? "" : "text-faint"}`}>
          {branchHint ?? detail}
        </span>
      </span>

      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          /* O desenho continua de 28px — ele mora DENTRO do nó de 150×52 —, mas
             o ALVO vai aos 44 do portão pelo pseudo-elemento: 8px acima e
             abaixo, 16px à esquerda e 6px à direita (onde o `overflow-hidden`
             do nó corta, então pedir mais seria pedir ao vento). Resultado
             medido: 50×44. Sim, a faixa à direita do nó apaga em vez de
             selecionar — é o que o "x" visível ali anuncia, e sobram ~100px de
             nó para o clique de selecionar.
             `pointer-coarse:opacity-60`: sem hover, o "x" nunca aparecia no
             celular, e um alvo invisível de 44px era pior do que um de 28. */
          className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity group-hover/node:opacity-60 hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-60 before:absolute before:-inset-y-2 before:-left-4 before:-right-1.5 before:content-['']"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
