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
  <div aria-hidden className="h-72 animate-pulse rounded-2xl bg-ink-800/60" />
);

const DEMOS = [
  dynamic(() => import("./demos/DeliveryDemo").then((mod) => mod.DeliveryDemo), {
    ssr: false,
    loading: DemoSkeleton,
  }),
  dynamic(() => import("./demos/FlowEditorDemo").then((mod) => mod.FlowEditorDemo), {
    ssr: false,
    loading: DemoSkeleton,
  }),
  dynamic(() => import("./demos/ConfirmationDemo").then((mod) => mod.ConfirmationDemo), {
    ssr: false,
    loading: DemoSkeleton,
  }),
  dynamic(() => import("./demos/CheckoutDemo").then((mod) => mod.CheckoutDemo), {
    ssr: false,
    loading: DemoSkeleton,
  }),
];

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

  const Demo = DEMOS[active] ?? DEMOS[0];

  return (
    <section
      className="relative overflow-hidden px-5 py-20 sm:px-6"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Luz de fundo: tira o peso do preto chapado sob os cards */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 h-[26rem] w-[56rem] -translate-x-1/2 rounded-full bg-brand/8 blur-[150px]" />
        <div className="grid-mesh absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_35%,#000,transparent_75%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="hairline mb-12" />

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
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-brand/25 blur-2xl transition-opacity duration-500 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
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

                  {/* Seta que liga a aba ativa ao painel logo abaixo. Só a
                      partir de sm, onde as abas ficam em grade sobre ele. */}
                  {isActive && (
                    <motion.span
                      layoutId="highlight-arrow"
                      aria-hidden
                      className="absolute -bottom-px left-1/2 hidden h-3 w-3 -translate-x-1/2 translate-y-1/2 rotate-45 bg-ink-800 sm:block"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Painel da aba ativa. A altura mínima evita que a seção salte. */}
        <Reveal delay={0.1}>
          <div
            ref={panelRef}
            role="tabpanel"
            id="highlight-panel"
            aria-labelledby={`highlight-tab-${active}`}
            tabIndex={0}
            className="surface-lit relative mt-6 min-h-[28rem] overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
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
                  <Demo />
                </motion.div>
              </AnimatePresence>
            ) : (
              <DemoSkeleton />
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
