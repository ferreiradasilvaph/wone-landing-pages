"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useContent } from "@/i18n";
import { HOURLY_REVENUE, FUNNEL_STEPS } from "@/data/content";
import { dinheiroTotal } from "@/lib/money";

/* O dolar e a moeda principal do site: o produto cobra em varios paises e a
   vitrine fala para quem vende fora. O locale fica en-US para o separador de
   milhar e o decimal sairem como o mercado espera do dolar. */
/* O dolar sai de `money.ts`, como todo dinheiro da pagina. Aqui e sem casas
   decimais porque e faturamento acumulado do dia, nao preco: os centavos de um
   total de quatro digitos nao informam nada e so roubam largura do numero. */
/* Faturamento acumulado: TOTAL, nao preco - sem centavos. Ver `money.ts`. */
const USD = (valor: number) => dinheiroTotal(valor, "USD");

/** A curva do site, escrita em CSS porque as entradas agora são `@keyframes`. */
const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/* As cinco entradas deste painel eram `motion`/`AnimatePresence` e viraram
   animação CSS. O motivo é de carregamento: o `import` de `motion/react` aqui
   era um dos treze em componentes renderizados no servidor, e juntos punham o
   pacote dele (42,2 kB transferidos / 126,6 kB crus) entre os 8 scripts que o
   navegador baixa ANTES da primeira pintura — o Lighthouse, que simula 4G,
   cobra esse download no FCP e no LCP do h1. Medido em 14/10: FCP −0,42 s,
   LCP −0,21 s, +3 pontos (E-f1).

   Quem decide se as barras e a linha do gráfico animam é o painel, uma vez só,
   e o valor desce por prop. `useReducedMotion` do motion ficaria em cinco
   lugares aqui dentro e devolve valor diferente no servidor e no primeiro
   render do cliente — e agora `reduced` DECIDE `style`, porque é ele que
   remove a animação (a regra global de `globals.css` zera duração, não atraso:
   com atraso e duração zero, as barras ficariam invisíveis durante o atraso).
   Por isso ele continua vindo de `matchMedia` dentro de efeito, como a regra 6
   exige. */
type ViewProps = { reduced: boolean };

// Geometria do gráfico de área, em unidades do viewBox. O eixo X é desenhado
// em HTML logo abaixo, então o viewBox cobre só a área de plotagem.
const W = 640;
const PLOT_H = 180;

function buildPath(values: number[]) {
  const max = Math.max(...values);
  const step = W / (values.length - 1);
  const toY = (value: number) => PLOT_H - (value / max) * (PLOT_H - 14) - 6;

  const line = values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${index * step} ${toY(value)}`)
    .join(" ");

  return {
    line,
    area: `${line} L ${W} ${PLOT_H} L 0 ${PLOT_H} Z`,
    pointAt: (index: number) => ({ x: index * step, y: toY(values[index]) }),
  };
}

/** Gráfico de faturamento por hora. Uma série só, então sem legenda. */
function RevenueView({ reduced }: ViewProps) {
  const gradientId = useId();
  const { analytics } = useContent();
  const [hovered, setHovered] = useState<number | null>(null);

  const chart = useMemo(() => buildPath(HOURLY_REVENUE), []);
  const peakIndex = useMemo(
    () => HOURLY_REVENUE.indexOf(Math.max(...HOURLY_REVENUE)),
    [],
  );
  const total = useMemo(() => HOURLY_REVENUE.reduce((sum, v) => sum + v, 0), []);

  const activeIndex = hovered ?? peakIndex;
  const activePoint = chart.pointAt(activeIndex);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          {/* Figura de spec: 32px/600 tnum creme + unidade na mesma linha. É o
              degrau da escala entre o título do painel e o corpo. */}
          <span className="tnum text-[2rem] leading-none font-semibold text-cream">
            {USD(total)}
          </span>
          <span className="text-[15px] text-muted">{analytics.panel.accumulated}</span>
        </div>

        <div className="rounded-field bg-ink-750 px-3 py-1.5 text-right">
          {/* A hora é valor de máquina: vai em `<code>`, não num utilitário de
              família. A palavra "pico" ao lado é rótulo, e rótulo é `.t-label`. */}
          <span className="block">
            <code>{String(activeIndex).padStart(2, "0")}h</code>
            {activeIndex === peakIndex && hovered === null ? (
              <span className="t-label ml-1.5">{analytics.panel.peak}</span>
            ) : null}
          </span>
          <span className="tnum text-[15px] font-semibold text-cream">
            {USD(HOURLY_REVENUE[activeIndex])}
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        {/* Altura FIXA e `preserveAspectRatio="none"`.

            Com `h-auto`, o gráfico herdava a proporção do viewBox e crescia com
            a largura: a 1440 ele chegava a 328px de altura — quase o dobro dos
            180 do desenho — e sozinho respondia por 150px do excesso da seção.
            Esticar o viewBox resolveria no desktop e esmagaria o gráfico no
            celular, então a escala horizontal passou a ser livre e as linhas
            ganharam `vector-effect: non-scaling-stroke`, que mantém o traço em
            2px (e as réguas em 1) em qualquer largura. O ponto do valor ativo
            saiu do SVG e virou HTML posicionado por porcentagem: círculo é a
            única forma que a escala livre deformaria. */}
        <div className="relative h-40 sm:h-44">
          <svg
            viewBox={`0 0 ${W} ${PLOT_H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF7700" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#FF7700" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((fraction) => (
              <line
                key={fraction}
                x1="0"
                x2={W}
                y1={PLOT_H * fraction}
                y2={PLOT_H * fraction}
                stroke="#FFFFE3"
                strokeOpacity="0.07"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1="0"
              x2={W}
              y1={PLOT_H}
              y2={PLOT_H}
              stroke="#FFFFE3"
              strokeOpacity="0.14"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            {/* O preenchimento sob a linha é leitura de dado (a área do dia), não
                decoração: é o único degradê que fica na página. */}
            <path
              d={chart.area}
              fill={`url(#${gradientId})`}
              style={reduced ? undefined : { animation: "fade-in 0.9s linear 0.3s both" }}
            />
            {/* `pathLength="1"` normaliza o comprimento do traço para 1, e o que
                cresce de 0 a 1 é o traço do `stroke-dasharray`. É exatamente o
                que o `motion` escrevia no DOM quando animava `pathLength` —
                mesma técnica, mesmos valores, sem a biblioteca. */}
            <path
              d={chart.line}
              fill="none"
              stroke="#FF7700"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              pathLength={1}
              style={reduced ? undefined : { animation: `chart-draw 1.4s ${EASE_CSS} both` }}
            />

            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={activePoint.y}
              y2={PLOT_H}
              stroke="#FF7700"
              strokeOpacity="0.35"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            {HOURLY_REVENUE.map((_, index) => (
              <rect
                key={index}
                x={(index - 0.5) * (W / (HOURLY_REVENUE.length - 1))}
                y="0"
                width={W / (HOURLY_REVENUE.length - 1)}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>

          {/* O ponto do valor ativo, em HTML sobre o gráfico: dentro do SVG com
              escala livre ele sairia oval. Mora na caixa do gráfico, não na da
              seção inteira, para a porcentagem bater com a plotagem. */}
          <span
            aria-hidden
            className="pointer-events-none absolute h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-800 bg-brand"
            style={{
              left: `${(activePoint.x / W) * 100}%`,
              top: `${(activePoint.y / PLOT_H) * 100}%`,
            }}
          />
        </div>

        {/* Eixo X em HTML: dentro do SVG a fonte encolheria com o viewBox */}
        <div className="relative mt-2 h-4">
          {[0, 6, 12, 18, 23].map((hour) => {
            const pct = (hour / 23) * 100;
            return (
              <code
                key={hour}
                className="absolute top-0"
                style={{
                  left: hour === 23 ? undefined : `${pct}%`,
                  right: hour === 23 ? 0 : undefined,
                  transform:
                    hour === 0 || hour === 23 ? undefined : "translateX(-50%)",
                }}
              >
                {String(hour).padStart(2, "0")}h
              </code>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** Funil de 100 leads. Categorias ordenadas, rampa de um só tom. */
function FunnelView({ reduced }: ViewProps) {
  const { analytics } = useContent();

  return (
    <div className="pt-2">
      <ul className="space-y-3">
        {FUNNEL_STEPS.map((step, index) => (
          <li key={step.value} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-[13px] text-muted sm:w-40">
              {analytics.panel.funnelSteps[index]}
            </span>
            <span className="relative h-7 flex-1 overflow-hidden rounded-field bg-cream/5">
              {/* `segment-fill` é o keyframe que a barra de progresso do site
                  já usava: scaleX de 0 a 1, na GPU, sem relayout. */}
              <span
                className="absolute inset-y-0 left-0 rounded-field"
                style={{
                  width: `${step.value}%`,
                  background: step.color,
                  transformOrigin: "left",
                  animation: reduced
                    ? undefined
                    : `segment-fill 0.9s ${EASE_CSS} ${0.12 * index}s both`,
                }}
              />
            </span>
            <span className="tnum w-10 shrink-0 text-right text-[15px] font-semibold text-cream">
              {step.value}
            </span>
          </li>
        ))}
      </ul>

      {/* A nota era uma caixa laranja a 8% com um "↻" no lugar de ícone: o
          laranja tem lugares fixos na página e nota de painel não é um deles,
          e caractere nunca faz o papel de ícone. Ficou texto. */}
      <p className="mt-5 text-[13px] leading-relaxed text-muted">
        <strong className="font-semibold text-cream">24</strong>{" "}
        {analytics.panel.funnelNote}
      </p>
    </div>
  );
}

/** Valor por cliente: quatro linhas de leitura direta. */
function LtvView() {
  const { analytics } = useContent();

  return (
    <dl className="divide-y divide-line pt-2">
      {analytics.panel.ltvRows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-4">
          <dt className="text-[15px] text-muted">{row.label}</dt>
          <dd className="tnum text-xl font-semibold text-cream">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Taxas do funil, em barras horizontais sobre a mesma escala de 0 a 100. */
function RatesView({ reduced }: ViewProps) {
  const { analytics } = useContent();

  return (
    <ul className="space-y-4 pt-2">
      {analytics.panel.rateRows.map((row, index) => (
        <li key={row.label}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[15px] text-muted">{row.label}</span>
            <span className="tnum text-[15px] font-semibold text-cream">{row.value}%</span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-cream/5">
            {/* Laranja chapado: o degradê que a barra tinha é do mesmo tipo que
                saiu dos botões e dos títulos (regra 8). */}
            <span
              className="block h-full rounded-full bg-brand"
              style={{
                width: `${row.value}%`,
                transformOrigin: "left",
                animation: reduced
                  ? undefined
                  : `segment-fill 0.8s ${EASE_CSS} ${index * 0.1}s both`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Extrato: tabela com rolagem horizontal própria em telas estreitas. */
function StatementView() {
  const { analytics } = useContent();

  return (
    <div className="-mx-1 overflow-x-auto pt-2">
      <table className="w-full min-w-[22rem] text-left">
        <thead>
          <tr className="border-b border-line">
            {analytics.panel.statementHeaders.map((header, index) => (
              <th
                key={header}
                className={`t-label pb-2 font-medium ${index === 3 ? "text-right" : ""}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {analytics.panel.statementRows.map((row) => (
            /* Hora e valor em `<code>`: são os "valores de extrato" da regra da
               mono. O verde que o valor tinha saiu — emerald é estado de
               produto ("Pago", "Sucesso"), não cor de dinheiro. */
            <tr key={`${row.time}-${row.flow}`}>
              <td className="py-3">
                <code>{row.time}</code>
              </td>
              <td className="py-3 text-[15px] font-medium text-cream">{row.flow}</td>
              <td className="py-3 text-[13px] text-muted">{row.gateway}</td>
              <td className="py-3 text-right">
                <code>{row.value}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* LTV e Extrato não animam nada (são tabela), e por isso ignoram a prop — o
   tipo é um só para o painel poder escolher a vista por `id`. */
const VIEWS: Record<string, React.ComponentType<ViewProps>> = {
  faturamento: RevenueView,
  funil: FunnelView,
  ltv: LtvView,
  taxas: RatesView,
  extrato: StatementView,
};

/**
 * O painel de Análises, em largura total, com as cinco vistas atrás de um
 * cabeçalho de tabela.
 *
 * As abas moraram numa lista de botões ao lado do painel, com ícone e frase
 * inteira cada; agora são a primeira linha do próprio painel, com o rótulo
 * curto (`view.short`) — é a forma de cabeçalho de tabela da referência, e põe
 * o controle dentro do objeto que ele controla. A frase longa da aba escolhida
 * entra como legenda entre as abas e o painel, onde serve de explicação sem
 * disputar espaço.
 *
 * Cada vista dizia o que é três vezes: no rótulo da aba, na legenda e num h3
 * com subtítulo dentro do painel ("Faturamento" / "Faturamento por dia e por
 * hora…" / "Faturamento por hora"). Ficaram as duas primeiras, que são
 * navegação e explicação; o par h3 + subtítulo saiu, e com ele 46px de altura
 * em toda troca de aba.
 *
 * Todos os números são amostra ilustrativa, não dado de cliente — daí a
 * etiqueta "Simulação" no cabeçalho (no lugar da pílula "Tempo real", que
 * afirmava o contrário) e o aviso dentro do painel, agora nas cinco vistas e
 * não só nas que mostravam número grande.
 *
 * A altura mínima do painel é a da vista mais alta (o extrato, medido em 310px
 * a 1440 e 412): é o que mantém o CLS em zero ao trocar entre uma tabela e um
 * gráfico.
 */
export function DashboardPreview() {
  const { analytics } = useContent();
  const [reduced, setReduced] = useState(false);

  /* Nasce `false` nos dois lados (servidor e primeiro render do cliente) e só
     muda depois da montagem: é o arranjo de `FeatureCarousel` e
     `SecurityCarousel`, e o que a regra 6 pede — nenhum valor de
     `prefers-reduced-motion` decide o primeiro render. */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* O `id` é o mesmo nos dois idiomas, então trocar de idioma não perde a aba
     escolhida. */
  const [activeId, setActiveId] = useState(analytics.views[0].id);
  /* `trocou` é o que o `initial={false}` do `AnimatePresence` dava: a primeira
     vista nasce PINTADA, e só as trocas seguintes atravessam (regra 1 em
     espírito — nada da página anima só por aparecer). Como a troca só acontece
     por ação do visitante, basta registrar que houve uma. */
  const [trocou, setTrocou] = useState(false);
  const trocarAba = (id: typeof activeId) => {
    setTrocou(true);
    setActiveId(id);
  };
  const view = analytics.views.find((v) => v.id === activeId) ?? analytics.views[0];
  const View = VIEWS[view.id] ?? RevenueView;

  return (
    <div className="rounded-card bg-ink-800 p-5 sm:p-7">
      {/* As cinco abas. No celular a fileira rola na horizontal dentro do
          respiro do card, com encaixe — nenhuma aba fica cortada pela metade. */}
      <div
        role="tablist"
        aria-label={analytics.kicker}
        className="flex snap-x gap-1 overflow-x-auto"
      >
        {analytics.views.map((entry, index) => {
          const isActive = entry.id === activeId;

          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`analytics-tab-${entry.id}`}
              aria-selected={isActive}
              aria-controls="analytics-panel"
              /* Roving tabindex + setas, o padrão de `tablist`: a fileira é UMA
                 parada de tabulação (eram cinco) e quem ouve "aba 2 de 5"
                 anda nela com as setas, como no tablist de Segurança. */
              tabIndex={isActive ? 0 : -1}
              onClick={() => trocarAba(entry.id)}
              onKeyDown={(event) => {
                const views = analytics.views;
                const last = views.length - 1;
                let next: number | null = null;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  next = index === last ? 0 : index + 1;
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  next = index === 0 ? last : index - 1;
                }
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = last;
                if (next === null) return;
                event.preventDefault();
                trocarAba(views[next].id);
                /* O foco segue a seleção: sem isto a próxima seta sairia do
                   botão que acabou de perder o `tabIndex`. */
                const alvo = document.getElementById(`analytics-tab-${views[next].id}`);
                alvo?.focus();
              }}
              /* h-11: os 44px do portão de acessibilidade sem precisar de
                 padding extra. */
              className={`h-11 shrink-0 snap-start rounded-field px-4 text-[15px] font-medium transition-colors ${
                isActive ? "bg-ink-750 text-cream" : "text-muted hover:text-cream"
              }`}
            >
              {entry.short}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 border-t border-line pt-4">
        {/* A legenda da aba ativa varia de uma a três linhas conforme o texto e
            a largura, e cada troca de aba mexia 17px no que vinha depois. A
            altura reservada é a da legenda mais longa medida: três linhas a 412
            e duas a 1440 (português, que é o pior caso nos dois). */}
        <p className="min-h-[3.4rem] max-w-[46ch] text-[13px] leading-snug text-muted sm:min-h-[2.35rem]">
          {view.label}
        </p>
        <span className="t-label shrink-0">{analytics.simulationLabel}</span>
      </div>

      <div
        role="tabpanel"
        id="analytics-panel"
        aria-labelledby={`analytics-tab-${view.id}`}
        /* A altura da vista mais alta (Faturamento), medida com o mínimo
           desligado: 357px a 412 e 332 a 1440. É o que mantém o CLS em zero na
           troca de aba — abaixo disso o painel encolhe no crossfade e empurra
           tudo o que vem depois. */
        className="min-h-[22.5rem] pt-5 sm:min-h-[21rem]"
      >
        {/* A `key` é a vista: trocar de aba monta um nó novo, e é isso que faz a
            entrada recomeçar — o mesmo efeito do `AnimatePresence mode="wait"`
            que havia aqui. O que a saída fazia (0,35 s desvanecendo a vista
            velha ANTES de a nova entrar, somando 0,7 s por clique) a nova
            entrada faz sozinha, sobre o lugar que a velha deixou. */}
        <div key={view.id} className={trocou ? "panel-swap" : undefined}>
          <p className="text-[13px] text-faint">{analytics.sampleNote}</p>

          <div className="mt-4">
            <View reduced={reduced} />
          </div>
        </div>
      </div>
    </div>
  );
}
