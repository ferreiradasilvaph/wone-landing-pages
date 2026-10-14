"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useContent, useLanguage } from "@/i18n";
import { Section } from "./Section";
import { SectionHead } from "./SectionHead";

const EASE = [0.16, 1, 0.3, 1] as const;

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

   `minH` é a altura REAL de cada demo, medida no navegador com o painel já
   montado (celular 390: painel de 348; desktop 1440: painel de 696). Ela fica
   na caixa do corpo do painel para o esqueleto ocupar exatamente o espaço que a
   demo vai ocupar: é o que mantém o CLS em zero quando o chunk chega, e o que
   impede o salto ao trocar de aba. Mexer numa demo é mexer nestes números.

   Medidas (celular/desktop, o maior entre português e inglês): entrega 508/319,
   blocos 886/396, confirmação 605/363, checkout 700/368 — o inglês quebra linha
   noutro lugar e é ele quem manda na entrega.
   O editor de fluxos troca de desenho em 768px (o `matchMedia` dele), e não em
   640 como as outras três: por isso o `md:` no lugar do `sm:`.
   -------------------------------------------------------------------------- */

/* Esqueleto: um bloco liso, sem pulso. Ele ocupa a altura da demo que está
   chegando, então a troca não move nada — e um retângulo piscando ao lado do
   texto seria mais um relógio na página, que é o que esta etapa tirou. */
const DemoSkeleton = () => (
  <div aria-hidden className="rounded-field flex-1 bg-ink-900" />
);

const DEMOS = [
  {
    key: "delivery",
    minH: "min-h-[32rem] sm:min-h-[20rem]",
    Component: dynamic(
      () => import("./demos/DeliveryDemo").then((mod) => mod.DeliveryDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "blocks",
    minH: "min-h-[56rem] md:min-h-[25rem]",
    Component: dynamic(
      () => import("./demos/FlowEditorDemo").then((mod) => mod.FlowEditorDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "confirmation",
    minH: "min-h-[38rem] sm:min-h-[23rem]",
    Component: dynamic(
      () => import("./demos/ConfirmationDemo").then((mod) => mod.ConfirmationDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "checkout",
    minH: "min-h-[44rem] sm:min-h-[23.5rem]",
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
 * A seção que demonstra o produto: a grade de spec à esquerda é a tablist, e o
 * painel ao lado roda a parte correspondente.
 *
 * Os quatro cards com ícone, contador e descrição saíram. Eram quatro cartazes
 * iguais anunciando o que o painel logo abaixo já mostrava — e o número, que é
 * a prova, chegava contando a partir de zero — relógio que a página não tem mais.
 * No lugar entra a grade 2×2 de números: figura grande, rótulo curto, fio
 * laranja embaixo da célula ativa. Clicar num número é escolher a demo.
 *
 * A rotação automática de 6 s também saiu: trocar o painel debaixo do cursor de
 * quem está lendo é o oposto de demonstrar. A troca é só por clique ou teclado
 * (ativação manual: as setas movem o foco e Enter/Espaço seleciona — o padrão
 * correto quando a aba troca um painel pesado).
 */
export function Highlights() {
  const { highlights } = useContent();
  const { locale } = useLanguage();
  const reduced = useReducedMotion();
  const items = highlights.items;

  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const nearPanel = useNearViewport(panelRef);

  const select = useCallback((index: number) => setActive(index), []);

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

  /* As quatro figuras são inteiras hoje, mas o separador decimal continua
     acompanhando o idioma (vírgula em português, ponto em inglês) para o dia em
     que uma delas não for. A figura é estática — o número já é a prova, não
     precisa contar. */
  const figura = (value: number, decimals: number, suffix: string) =>
    `${value.toLocaleString(locale === "pt" ? "pt-BR" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;

  /* A grade de spec, na coluna do texto: quatro números com rótulo, duas
     colunas, réguas entre as células. O `border-b` em todas e o `border-l` nas
     pares desenham a cruz interna mais o fecho de baixo — `divide-*` daria uma
     régua solta na borda direita da primeira linha. */
  const grade = (
    <div
      role="tablist"
      aria-label={highlights.title}
      className="grid max-w-[29rem] grid-cols-2 border-t border-line"
    >
      {items.map((item, index) => {
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
            className={`relative cursor-pointer border-b border-line py-5 pr-6 text-left transition-colors duration-200 ${
              index % 2 === 1 ? "border-l border-line pl-6" : ""
            }`}
          >
            <span
              className={`tnum block text-[2rem] leading-none font-semibold ${
                isActive ? "text-cream" : "text-faint"
              }`}
            >
              {figura(item.value, item.decimals, item.suffix)}
            </span>
            <span
              className={`mt-2 block text-[13px] ${isActive ? "text-muted" : "text-faint"}`}
            >
              {item.title}
            </span>

            {/* Marcador da aba ativa: fio de 2px por baixo da célula, sobre a
                régua da grade. Não é contorno — item selecionado com borda em
                volta é o que a regra 8 proíbe. */}
            {isActive && (
              <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
        );
      })}
    </div>
  );

  /* O painel: um degrau acima do fundo da seção (ink-800 sobre ink-850), na
     largura da coluna. A largura por demo e a transição de `max-width` saíram
     — a moldura mudava de tamanho a cada clique e levava a página junto. */
  const painel = (
    <div
      ref={panelRef}
      role="tabpanel"
      id="highlight-panel"
      aria-labelledby={`highlight-tab-${active}`}
      tabIndex={0}
      className="overflow-hidden rounded-card bg-ink-800"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h3 className="t-h3 text-balance text-cream">{copy.title}</h3>
          <p className="mt-1 text-[13px] text-pretty text-muted">{copy.subtitle}</p>
        </div>
        {/* A ficção se declara dentro do próprio objeto (regra 4). */}
        <span className="t-label shrink-0">{highlights.simulationLabel}</span>
      </div>

      <div className={`flex flex-col p-4 sm:p-6 ${demo.minH}`}>
        {nearPanel ? (
          /* `initial={false}`: a primeira demo nasce pintada, e só a TROCA de
             aba — que é gesto de quem está lendo — tem travessia. */
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={active}
              className="flex flex-1 flex-col"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
            >
              <Demo />
            </motion.div>
          </AnimatePresence>
        ) : (
          <DemoSkeleton />
        )}
      </div>
    </div>
  );

  return (
    <Section anchor="destaques" tone="ink-850">
      <SectionHead
        id="destaques"
        kicker={highlights.kicker}
        title={highlights.title}
        lead={highlights.lead}
        variant="B"
        aside={painel}
      >
        {grade}
      </SectionHead>
    </Section>
  );
}
