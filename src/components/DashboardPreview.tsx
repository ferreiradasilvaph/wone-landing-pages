"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useContent } from "@/i18n";
import { HOURLY_REVENUE, FUNNEL_STEPS } from "@/data/content";

/* O dolar e a moeda principal do site: o produto cobra em varios paises e a
   vitrine fala para quem vende fora. O locale fica en-US para o separador de
   milhar e o decimal sairem como o mercado espera do dolar. */
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const EASE = [0.16, 1, 0.3, 1] as const;

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
function RevenueView() {
  const gradientId = useId();
  const reduced = useReducedMotion();
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
            {USD.format(total)}
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
            {USD.format(HOURLY_REVENUE[activeIndex])}
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${PLOT_H}`} className="h-auto w-full" aria-hidden>
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
          />

          <motion.path
            d={chart.area}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.3 }}
          />
          <motion.path
            d={chart.line}
            fill="none"
            stroke="#FF7700"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 1.4, ease: EASE }}
          />

          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={activePoint.y}
            y2={PLOT_H}
            stroke="#FF7700"
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <circle
            cx={activePoint.x}
            cy={activePoint.y}
            r="5.5"
            fill="#FF7700"
            stroke="#15151c"
            strokeWidth="2"
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
function FunnelView() {
  const reduced = useReducedMotion();
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
              <motion.span
                className="absolute inset-y-0 left-0 rounded-field"
                style={{
                  width: `${step.value}%`,
                  background: step.color,
                  transformOrigin: "left",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: reduced ? 0 : 0.9,
                  delay: reduced ? 0 : 0.12 * index,
                  ease: EASE,
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
function RatesView() {
  const reduced = useReducedMotion();
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
            <motion.span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${row.value}%`, transformOrigin: "left" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: reduced ? 0 : 0.8,
                delay: reduced ? 0 : index * 0.1,
                ease: EASE,
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

const VIEWS: Record<string, () => React.ReactElement> = {
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
 * Todos os números são amostra ilustrativa, não dado de cliente — daí a
 * etiqueta "Simulação" no cabeçalho (no lugar da pílula "Tempo real", que
 * afirmava o contrário) e o subtítulo da vista sempre visível. A altura mínima
 * do painel mantém o CLS em zero ao trocar entre uma tabela e um gráfico.
 */
export function DashboardPreview() {
  const { analytics } = useContent();
  const reduced = useReducedMotion();

  /* O `id` é o mesmo nos dois idiomas, então trocar de idioma não perde a aba
     escolhida. */
  const [activeId, setActiveId] = useState(analytics.views[0].id);
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
        {analytics.views.map((entry) => {
          const isActive = entry.id === activeId;

          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(entry.id)}
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
        <p className="max-w-[46ch] text-[13px] leading-snug text-muted">{view.label}</p>
        <span className="t-label shrink-0">{analytics.simulationLabel}</span>
      </div>

      <div className="min-h-[21rem] pt-6">
        {/* `initial={false}`: a primeira vista nasce pintada. Só as trocas
            seguintes atravessam o crossfade (regra 1 em espírito: nada da
            página anima só por aparecer). */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
          >
            <h3 className="t-h3 text-cream">{view.panelTitle}</h3>
            <p className="mt-1 text-[13px] text-faint">{view.panelSubtitle}</p>

            <div className="mt-5">
              <View />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
