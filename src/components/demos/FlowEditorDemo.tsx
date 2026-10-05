"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

/** Até onde o funil cresce, para o canvas não virar um tapete. */
const MAX_NODES = 8;
/** Quanto cada nó fica aceso quando o funil roda. */
const PULSE_MS = 520;

/* Geometria do canvas, em px. Nó de largura fixa é o que torna a posição de
   cada porta aritmética — sem medir o DOM, sem ResizeObserver. */
const NODE_W = 168;
const NODE_H = 64;
const COL_W = NODE_W + 52;
const ROW_H = NODE_H + 28;
const PAD = 16;

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
        ly: y1 - 15,
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

  /** Nó selecionado, cujas propriedades aparecem no painel. */
  const [selected, setSelected] = useState<number | null>(null);
  /** Passo aceso enquanto o funil roda; `-1` quando está parado. */
  const [pulse, setPulse] = useState(-1);
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
  const add = useCallback((category: number, item: number) => {
    const uid = nextUid.current;
    nextUid.current += 1;
    setSlots((current) =>
      current.length >= MAX_NODES ? current : [...current, { uid, category, item }],
    );
    setPulse(-1);
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
  const selectedEntry = entryOf(selectedSlot);
  const selectedIndex = selectedSlot ? slots.indexOf(selectedSlot) : -1;

  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-cream">{demo.title}</h3>
      <p className="mt-1.5 text-sm text-muted">{demo.subtitle}</p>

      {/* Barra do editor */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="flex items-center gap-2">
          <span className="t-eyebrow text-faint">{builder.canvas}</span>
          <span className="tnum font-mono text-[10px] text-faint">
            {slots.length}/{MAX_NODES}
          </span>
          {full && (
            <span className="rounded-full bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] text-faint">
              {builder.full}
            </span>
          )}
          {running && (
            <span role="status" className="font-mono text-[10px] text-brand">
              {builder.running}
            </span>
          )}
        </span>

        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPulse(0)}
            disabled={slots.length === 0 || running}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand/15 px-2.5 py-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/25 disabled:cursor-default disabled:opacity-40"
          >
            <Play className="h-3 w-3" />
            {builder.run}
          </button>
          <button
            type="button"
            onClick={loadExample}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink-800 px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:bg-ink-750 hover:text-cream"
          >
            <RotateCcw className="h-3 w-3" />
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
            className="flex cursor-pointer items-center justify-center rounded-lg bg-ink-800 p-1.5 text-muted transition-colors hover:bg-ink-750 hover:text-cream disabled:cursor-default disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_13.5rem]">
        {/* Canvas: a malha de pontos é o que faz ler como área de edição */}
        <div
          className="relative overflow-x-auto rounded-2xl bg-ink-900/60 p-1"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,227,0.07) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          {slots.length === 0 ? (
            <p className="py-14 text-center text-xs text-faint">{builder.empty}</p>
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
                        onSelect={derived ? undefined : () => setSelected(node.uid)}
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
                    className="pointer-events-none absolute rounded bg-ink-950/85 px-1 font-mono text-[9px] text-faint"
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
                          onSelect={() => setSelected(slot.uid)}
                          onRemove={() => remove(slot.uid)}
                          removeLabel={`${builder.remove}: ${entry.name}`}
                        />
                      </div>

                      {index < slots.length - 1 && (
                        <span
                          aria-hidden
                          className={`ml-5 block h-4 w-px transition-colors duration-200 ${
                            done ? "bg-brand/70" : "bg-line-strong"
                          }`}
                        />
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
        </div>

        {/* Painel de propriedades: só leitura, espelhando o da plataforma */}
        <aside className="rounded-2xl bg-ink-900/60 p-4">
          <span className="t-eyebrow text-faint">{builder.properties}</span>

          {selectedSlot && selectedEntry ? (
            <dl className="mt-3 space-y-2.5 text-[11px]">
              <Field label={builder.fields.block}>
                <span className="font-semibold text-cream">{selectedEntry.name}</span>
              </Field>
              <Field label={builder.fields.category}>
                <span
                  className="font-semibold"
                  style={{ color: CATEGORY_META[selectedSlot.category]?.color }}
                >
                  {demo.categories[selectedSlot.category]?.name}
                </span>
              </Field>
              <Field label={builder.fields.id}>
                <span className="tnum font-mono text-faint">
                  #{String(selectedSlot.uid + 1).padStart(3, "0")}
                </span>
              </Field>
              <Field label={builder.fields.inputs}>
                <span className="tnum font-mono text-muted">
                  {selectedIndex === 0 ? 0 : 1}
                </span>
              </Field>
              <Field label={builder.fields.outputs}>
                <span className="tnum font-mono text-muted">
                  {isBranching(selectedSlot) ? 2 : 1}
                </span>
              </Field>
              <Field label={builder.fields.next}>
                <span className="text-muted">
                  {entryOf(slots[selectedIndex + 1])?.name ?? builder.fields.none}
                </span>
              </Field>

              <p className="border-t border-line pt-2.5 leading-relaxed text-muted">
                {selectedEntry.detail}
              </p>
            </dl>
          ) : (
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              {builder.noSelection}
            </p>
          )}
        </aside>
      </div>

      {/* Paleta: os 28 blocos, por categoria */}
      <p className="t-eyebrow mt-7 mb-3 text-faint">{builder.palette}</p>

      <div className="space-y-4">
        {demo.categories.map((category, categoryIndex) => {
          const meta = CATEGORY_META[categoryIndex] ?? CATEGORY_META[0];
          const Icon = meta.icon;

          return (
            <div key={category.name}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                <span className="t-eyebrow" style={{ color: meta.color }}>
                  {category.name}
                </span>
                <span className="h-px flex-1 bg-line" />
                <span className="tnum font-mono text-[10px] text-faint">
                  {category.items.length}
                </span>
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {category.items.map((item, itemIndex) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      onClick={() => add(categoryIndex, itemIndex)}
                      disabled={full}
                      className="cursor-pointer rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs text-muted transition-colors duration-200 hover:bg-ink-750 hover:text-cream disabled:cursor-default disabled:opacity-40"
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Linha do painel de propriedades. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-faint">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
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
      className={`group/node relative flex h-full w-full items-center gap-2.5 overflow-hidden rounded-xl pr-1.5 pl-4 transition-colors duration-200 ${
        lit
          ? "bg-brand"
          : selected
            ? "bg-ink-750 text-cream"
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
        <span className="block truncate text-xs font-semibold">{name}</span>
        <span className={`block truncate text-[10px] ${lit ? "" : "text-faint"}`}>
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
          className="shrink-0 cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover/node:opacity-60 hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
