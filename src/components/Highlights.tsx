"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useContent, useLanguage } from "@/i18n";
import { Section } from "./Section";
import { SectionHead } from "./SectionHead";

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

   `minH` é a altura NUA de cada demo — a caixa dela, sem o respiro do painel —,
   medida no navegador com a demo montada. Ela fica no invólucro INTERNO do
   corpo do painel, e não na caixa que leva o `p-4 sm:p-6`: com
   `box-sizing: border-box` o `min-height` dali incluiria o padding, e a caixa
   ficava 48px (desktop) ou ~32px (celular) mais curta com o esqueleto do que
   com a demo — o salto do chunk chegando valia 0,00578 de CLS a 412, medido na
   entrega, que é a única que monta sem clique. Agora o esqueleto ocupa o espaço
   exato da demo e nada se move, nem na troca de aba.

   Medidas de 14/10 (celular 412 / desktop 1440), com `min-height: 0` aplicado à
   caixa para ler a altura NATURAL da demo montada, nos dois idiomas — e os dois
   deram o mesmo número: entrega 296/204, blocos 818/350, confirmação 585/332,
   checkout 716/389 (sete países desde 15/10, em duas fileiras de bandeiras). Em px, e não em rem, porque é px o que a régua mede e o que
   o texto das demos usa (`text-[13px]`): em rem seria dividir tudo por 16 a
   cada medição, sem ganho nenhum.
   O editor de fluxos troca de desenho em 768px (o `matchMedia` dele), e não em
   640 como as outras três: por isso o `md:` no lugar do `sm:`.
   -------------------------------------------------------------------------- */

/* Esqueleto: um bloco liso, sem pulso. Ele ocupa a altura da demo que está
   chegando, então a troca não move nada — e um retângulo piscando ao lado do
   texto seria mais um relógio na página, que é o que esta etapa tirou. */
const DemoSkeleton = () => (
  <div aria-hidden className="rounded-field flex-1 bg-ink-900" />
);

/* `heavy` é a demo que abre um contexto WebGL (o guindaste e o globo). Ela é a
   única que desmonta ao sair de vista: a regra dura do projeto diz que o número
   de contextos WebGL vivos não aumenta, e manter as quatro montadas levava o
   teto de 1 para 2 (medido: 0 canvas sem clique, 1 abrindo a aba 3, 2 abrindo
   também a 4, e os dois ficavam vivos para sempre). Esconder o canvas o põe em
   `frameloop="demand"` e em 0 chamadas GL — mas o contexto continua alocado, e
   é o contexto que a regra conta. As outras duas ficam montadas: é o que
   preserva o funil que o lead montou no editor e poupa a remontagem da demo
   mais pesada da página. */
const DEMOS = [
  {
    key: "delivery",
    heavy: false,
    minH: "min-h-[296px] sm:min-h-[204px]",
    Component: dynamic(
      () => import("./demos/DeliveryDemo").then((mod) => mod.DeliveryDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "blocks",
    heavy: false,
    minH: "min-h-[818px] md:min-h-[350px]",
    Component: dynamic(
      () => import("./demos/FlowEditorDemo").then((mod) => mod.FlowEditorDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "confirmation",
    heavy: true,
    minH: "min-h-[585px] sm:min-h-[332px]",
    Component: dynamic(
      () => import("./demos/ConfirmationDemo").then((mod) => mod.ConfirmationDemo),
      { ssr: false, loading: DemoSkeleton },
    ),
  },
  {
    key: "checkout",
    heavy: true,
    minH: "min-h-[716px] sm:min-h-[389px]",
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
  /* As tres frases do titulo, cada uma na sua linha. A mesma forma que a tese
     de Como funciona usa: o dicionario guarda a lista, o componente monta a
     tripla que o SectionHead pede. */
  const titulo = highlights.titleLines;
  const { locale } = useLanguage();
  const items = highlights.items;

  const [active, setActive] = useState(0);
  /**
   * As abas já abertas, na ordem em que foram abertas. Demo montada FICA
   * montada: trocar de aba só troca qual delas está visível.
   *
   * Antes a troca desmontava a anterior, e com ela ia embora tudo o que o lead
   * tinha feito — o funil montado no editor —, além de pagar de novo o custo de
   * montar (o editor de fluxos é a demo mais pesada da página). Escondida, a
   * demo fica em `display:none`: não desenha e não é anunciada por leitor de
   * tela.
   *
   * As duas demos 3D são a exceção (`heavy` em DEMOS): elas desmontam ao sair
   * de vista, porque um contexto WebGL escondido continua alocado e a regra
   * dura conta contextos, não quadros. Perdem o estado (a via desligada, o país
   * escolhido) na volta; o chunk já está em cache, então remontar é barato.
   */
  const [opened, setOpened] = useState<readonly number[]>([0]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const nearPanel = useNearViewport(panelRef);

  const select = useCallback((index: number) => {
    setActive(index);
    setOpened((lista) => (lista.includes(index) ? lista : [...lista, index]));
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
      aria-label={titulo.join(" ")}
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
     — a moldura mudava de tamanho a cada clique e levava a página junto.

     ELE ENCHE A COLUNA (`h-full`), e isso mudou em 16/10.

     Até então ficava alinhado só ao ALTO, na linha do kicker, e sobrava preto
     embaixo: 202px na aba padrão, 58 em blocos, 85 em confirmação, 90 em
     checkout. O comentário anterior defendia o vão com três argumentos, e dois
     deles continuam de pé — o topo TEM de ficar na linha do kicker (é a régua
     da variante B), e `self-center` o desprenderia dela. O terceiro não: dizia
     que o vão não tem "nenhuma borda que a denuncie", e tem — o painel é
     ink-800 sobre ink-850, então o pé dele é uma aresta visível a meia altura
     de uma coluna de texto que segue até o fim.

     `h-full` atende os três de uma vez: o topo continua na linha do kicker, o
     pé encosta no pé da coluna de texto, e nada é centrado. De quebra tira o
     pulo de altura que havia ao trocar de aba — o painel passa a ter a mesma
     altura nas quatro, porque quem a define agora é a coluna de texto. */
  const painel = (
    <div
      ref={panelRef}
      role="tabpanel"
      id="highlight-panel"
      aria-labelledby={`highlight-tab-${active}`}
      tabIndex={0}
      className="flex h-full flex-col overflow-hidden rounded-card bg-ink-800"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h3 className="t-h3 text-balance text-cream">{copy.title}</h3>
          <p className="mt-1 text-[13px] text-pretty text-muted">{copy.subtitle}</p>
        </div>
        {/* A ficção se declara dentro do próprio objeto (regra 4). */}
        <span className="t-label shrink-0">{highlights.simulationLabel}</span>
      </div>

      {/* O respiro fica NESTA caixa e a altura mínima na de dentro: o
          `min-height` de uma caixa `border-box` engole o próprio padding, e com
          os dois juntos o esqueleto media 48px menos que a demo (32 no
          celular). A travessia em `opacity` que havia aqui saiu junto com a
          remontagem: trocar de aba é trocar de `display`, e animar isso só
          atrasaria o que o lead pediu para ver. */}
      {/* `justify-center`: com o painel enchendo a coluna (`h-full` acima), a
          demo mais curta das quatro deixaria de sobrar preto na SEÇÃO para
          sobrar dentro do PRÓPRIO cartão, que é pior - vazio emoldurado se vê
          mais que vazio solto. Centrada, a demo fica com a mesma folga em cima
          e embaixo e o cartão lê como moldura, nao como caixa pela metade. */}
      <div className="flex flex-1 flex-col justify-center p-4 sm:p-6">
        <div className={`flex flex-1 flex-col justify-center ${demo.minH}`}>
          {nearPanel ? (
            DEMOS.map((item, index) => {
              if (!opened.includes(index)) return null;
              /* Demo 3D escondida desmonta: ver `heavy` em DEMOS. */
              if (item.heavy && index !== active) return null;
              const Demo = item.Component;

              return (
                <div
                  key={item.key}
                  className={index === active ? "flex flex-1 flex-col justify-center" : "hidden"}
                >
                  <Demo />
                </div>
              );
            })
          ) : (
            <DemoSkeleton />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Section anchor="destaques" tone="ink-850">
      <SectionHead
        id="destaques"
        kicker={highlights.kicker}
        titleLines={[titulo[0], titulo[1], titulo[2]]}
        lead={highlights.lead}
        variant="B"
        aside={painel}
      >
        {grade}
      </SectionHead>
    </Section>
  );
}
