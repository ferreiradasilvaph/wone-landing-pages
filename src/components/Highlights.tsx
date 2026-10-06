"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Zap, Boxes, ShieldCheck, Globe, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useContent } from "@/i18n";
import { Counter } from "./Counter";
import { Reveal } from "./Reveal";

const ICONS: Record<string, LucideIcon> = { Zap, Boxes, ShieldCheck, Globe };
const EASE = [0.16, 1, 0.3, 1] as const;
const ROTATE_MS = 6000;

/* --------------------------------------------------------------------------
   Demos sob demanda

   As quatro eram importadas estaticamente aqui, então as quatro entravam no
   bundle inicial da página — inclusive o editor de fluxos, a mais pesada, que
   fica abaixo da primeira dobra. Com `next/dynamic` cada uma vira um chunk
   próprio, e o `IntersectionObserver` abaixo só monta o painel quando a seção
   chega perto da viewport: quem não rola até aqui não baixa nenhuma.

   `ssr: false` em todas: são demonstrações interativas, não têm valor em HTML
   de servidor, e é o que permite ao editor ler `matchMedia` no primeiro render
   sem risco de divergência na hidratação.

   O caminho do `import()` precisa ser literal — nem variável, nem template —
   ou o bundler não liga o chunk à chamada.
   -------------------------------------------------------------------------- */

const DemoSkeleton = () => (
  <div aria-hidden className="h-48 animate-pulse rounded-2xl bg-ink-800/60" />
);

/* --------------------------------------------------------------------------
   A moldura tem a medida de cada demo

   O painel era uma lâmina de 1280 px para as quatro — e o designer apontou o
   que isso causava no "1,2s": uma tela grande demais para quatro etapas e um
   cronômetro, com meio metro de vazio entre o texto e o carimbo de tempo.

   Então a largura passa a ser do conteúdo, não do contêiner: cada demo declara
   a sua, e a moldura anima entre elas quando se troca de aba. O editor de
   fluxos continua com a página inteira, porque ele usa; os outros três encolhem
   para a medida em que a composição fecha. O `key` aponta para o texto no
   dicionário — título e subtítulo saíram de dentro das demos e viraram o
   cabeçalho desta moldura, iguais para as quatro.
   -------------------------------------------------------------------------- */

const DEMOS = [
  {
    key: "delivery",
    frame: "max-w-xl",
    Component: dynamic(
      () => import("./demos/DeliveryDemo").then((mod) => mod.DeliveryDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "blocks",
    frame: "max-w-7xl",
    Component: dynamic(
      () => import("./demos/FlowEditorDemo").then((mod) => mod.FlowEditorDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "confirmation",
    frame: "max-w-2xl",
    Component: dynamic(
      () => import("./demos/ConfirmationDemo").then((mod) => mod.ConfirmationDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "checkout",
    frame: "max-w-3xl",
    Component: dynamic(
      () => import("./demos/CheckoutDemo").then((mod) => mod.CheckoutDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
] as const;

/**
 * `true` depois que o elemento encosta na viewport, e nunca volta para `false`:
 * montar a demo é caro, desmontar ao sair da tela perderia o funil que o lead
 * montou. `rootMargin` generoso para o chunk chegar antes de a seção aparecer.
 */
function useNearViewport<T extends Element>(ref: React.RefObject<T | null>) {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;

    // Navegador sem IntersectionObserver: monta de qualquer forma. O estado vai
    // num timeout, e não direto no corpo do efeito, porque `setState` síncrono
    // aqui dispara renderização em cascata (e o lint reprova, com razão).
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, near]);

  return near;
}

/**
 * Os quatro números do produto, cada um demonstrando o que significa.
 *
 * Os cards são as abas (`tablist` com ativação manual: as setas movem o foco e
 * Enter/Espaço seleciona — o padrão correto quando trocar de aba troca um painel
 * pesado) e o painel abaixo executa a demonstração correspondente.
 *
 * A rotação automática para de vez no primeiro clique: quem está explorando não
 * pode ter o conteúdo trocado debaixo do cursor.
 */
export function Highlights() {
  const { highlights } = useContent();
  const reduced = useReducedMotion();
  const items = highlights.items;

  const [active, setActive] = useState(0);
  const [tookOver, setTookOver] = useState(false);
  const [hovering, setHovering] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const nearPanel = useNearViewport(panelRef);

  useEffect(() => {
    if (reduced || tookOver || hovering) return;

    const id = window.setInterval(
      () => setActive((value) => (value + 1) % items.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced, tookOver, hovering, items.length]);

  const select = useCallback((index: number) => {
    setActive(index);
    setTookOver(true);
  }, []);

  /** Setas movem o foco; Enter e Espaço confirmam a aba focada. */
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = items.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;

    if (next !== null) {
      event.preventDefault();
      tabRefs.current[next]?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(index);
    }
  };

  const demo = DEMOS[active] ?? DEMOS[0];
  const Demo = demo.Component;
  const copy = highlights.demos[demo.key];

  return (
    <section
      className="relative overflow-hidden px-5 py-20 sm:px-6"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Luz de fundo: tira o peso do preto chapado sob os cards */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 hidden h-[26rem] w-[56rem] -translate-x-1/2 rounded-full bg-brand/8 blur-[150px] sm:block" />
        <div className="grid-mesh absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_35%,#000,transparent_75%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="hairline mb-12" />

        {/* A secao nao renderizava titulo nenhum: o <h1> do hero era
            seguido direto pelo <h3> das demos, pulando um nivel. Este h2 so
            para leitor de tela recoloca o degrau sem mexer no desenho. */}
        <h2 className="sr-only">{highlights.title}</h2>

        <Reveal>
          <p className="t-eyebrow mb-5 text-center text-faint">
            {highlights.demos.tabHint}
          </p>

          {/* Abas. No celular viram faixa rolável com encaixe. */}
          <div
            role="tablist"
            aria-label={highlights.title}
            className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
          >
            {items.map((item, index) => {
              const Icon = ICONS[item.icon] ?? Zap;
              const isActive = index === active;

              return (
                <button
                  key={item.title}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  role="tab"
                  id={`highlight-tab-${index}`}
                  aria-selected={isActive}
                  aria-controls="highlight-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  // Ativo: opacidade cheia e o fio laranja no topo (abaixo). O
                  // contorno border-brand/50 e a sombra laranja saíram — era
                  // contorno sobre contorno, já que o card já tem superfície.
                  className={`surface-lit group relative w-[17rem] shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 sm:w-auto ${
                    isActive ? "opacity-100" : "opacity-55 hover:opacity-85"
                  }`}
                >
                  {/* O halo laranja desfocado no canto saiu: roubava a atenção
                      de quem lia o número. O que marca a aba ativa é o fio de
                      1px no topo, abaixo, mais a opacidade do card. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent transition-opacity duration-500 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <span className="relative block">
                    {/* Ícone solto, sem o quadrado com borda em volta */}
                    <span
                      className={`flex h-11 w-11 items-center justify-center transition-colors duration-500 ${
                        isActive ? "text-brand" : "text-faint"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>

                    <span className="mt-5 block text-4xl font-semibold tracking-tight text-cream">
                      <Counter
                        to={item.value}
                        decimals={item.decimals}
                        suffix={item.suffix}
                      />
                    </span>

                    <span className="font-display mt-1 block text-base font-semibold text-brand">
                      {item.title}
                    </span>
                    <span className="mt-2.5 block text-sm leading-relaxed text-muted">
                      {item.description}
                    </span>
                  </span>

                  {/* A seta que apontava da aba para o painel saiu com a
                      moldura de largura variável: ela nasce no centro da aba, e
                      o painel estreito já não passa por baixo das quatro. O que
                      marca a aba ativa é o fio laranja no topo mais a opacidade
                      — e o painel, que troca à vista. */}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Painel da aba ativa.

            A altura mínima de 19rem saiu junto com a largura fixa: as quatro
            demos agora fecham entre 17rem e 21rem, e um piso só devolveria o
            vazio que o designer pediu para tirar. O que estabiliza a seção é a
            moldura animar entre as medidas em vez de saltar. */}
        <Reveal delay={0.1}>
          <div
            ref={panelRef}
            role="tabpanel"
            id="highlight-panel"
            aria-labelledby={`highlight-tab-${active}`}
            tabIndex={0}
            className={`surface-lit relative mx-auto mt-6 w-full overflow-hidden rounded-3xl transition-[max-width] duration-700 ease-[var(--ease-out-expo)] ${demo.frame}`}
          >
            {/* Só monta a demo quando o painel chega perto da viewport */}
            {nearPanel ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                >
                  {/* Cabeçalho da moldura: o título e o subtítulo que cada demo
                      repetia por conta própria, agora num lugar só e no mesmo
                      lugar da tela nas quatro. O ícone à direita é o mesmo da
                      aba clicada — é o fio que liga o card ao painel desde que
                      a seta saiu. */}
                  <div className="flex items-start justify-between gap-5 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold text-balance text-cream sm:text-lg">
                        {copy.title}
                      </h3>
                      <p className="mt-1 text-[13px] text-pretty text-muted sm:text-sm">
                        {copy.subtitle}
                      </p>
                    </div>
                    <PanelIcon name={items[active]?.icon} />
                  </div>

                  <div className="p-5 sm:p-6">
                    <Demo />
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="p-5 sm:p-6">
                <DemoSkeleton />
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Eco do ícone da aba ativa no cabeçalho do painel. */
function PanelIcon({ name }: { name?: string }) {
  const Icon = ICONS[name ?? ""] ?? Zap;
  return <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand/70" />;
}
