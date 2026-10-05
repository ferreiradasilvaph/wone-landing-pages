"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useContent } from "@/i18n";
import { HOURLY_REVENUE, FUNNEL_STEPS } from "@/data/content";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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
          <span className="text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
            {BRL.format(total)}
          </span>
          <span className="text-sm text-muted">{analytics.panel.accumulated}</span>
        </div>

        <div className="rounded-lg border border-line bg-ink-950/70 px-3 py-1.5 text-right">
          <span className="t-eyebrow block text-faint">
            {String(activeIndex).padStart(2, "0")}h
            {activeIndex === peakIndex && hovered === null
              ? ` · ${analytics.panel.peak}`
              : ""}
          </span>
          <span className="tnum text-sm font-semibold text-cream">
            {BRL.format(HOURLY_REVENUE[activeIndex])}
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
            stroke="#0f0f14"
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
              <span
                key={hour}
                className="t-eyebrow absolute top-0 text-faint"
                style={{
                  left: hour === 23 ? undefined : `${pct}%`,
                  right: hour === 23 ? 0 : undefined,
                  transform:
                    hour === 0 || hour === 23 ? undefined : "translateX(-50%)",
                }}
              >
                {String(hour).padStart(2, "0")}h
              </span>
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
            <span className="w-32 shrink-0 text-xs text-muted sm:w-40">
              {analytics.panel.funnelSteps[index]}
            </span>
            <span className="relative h-7 flex-1 overflow-hidden rounded-md bg-cream/5">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-md"
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
            <span className="tnum w-10 shrink-0 text-right text-sm font-semibold text-cream">
              {step.value}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-xs leading-relaxed text-cream/75">
        <span aria-hidden className="mt-0.5 shrink-0 text-brand">
          ↻
        </span>
        <span>
          <strong className="font-semibold text-cream">24</strong>{" "}
          {analytics.panel.funnelNote}
        </span>
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
          <dt className="text-sm text-muted">{row.label}</dt>
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
            <span className="text-sm text-muted">{row.label}</span>
            <span className="tnum text-sm font-semibold text-cream">{row.value}%</span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-cream/5">
            <motion.span
              className="block h-full rounded-full bg-gradient-to-r from-brand-soft to-brand"
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
                className={`t-eyebrow pb-2 font-medium text-faint ${
                  index === 3 ? "text-right" : ""
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {analytics.panel.statementRows.map((row) => (
            <tr key={`${row.time}-${row.flow}`}>
              <td className="tnum py-3 text-xs text-faint">{row.time}</td>
              <td className="py-3 text-xs font-medium text-cream">{row.flow}</td>
              <td className="py-3 text-xs text-muted">{row.gateway}</td>
              <td className="tnum py-3 text-right text-xs font-semibold text-emerald-400">
                {row.value}
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
 * Painel que troca de conteúdo conforme a métrica escolhida ao lado.
 *
 * Todos os números são amostra ilustrativa, não dados de cliente. A altura
 * mínima evita que a seção inteira pule ao trocar entre uma tabela e um
 * gráfico.
 */
export function DashboardPreview({ viewId }: { viewId: string }) {
  const { analytics } = useContent();
  const reduced = useReducedMotion();

  const view = analytics.views.find((v) => v.id === viewId) ?? analytics.views[0];
  const View = VIEWS[view.id] ?? RevenueView;

  return (
    <div className="surface relative overflow-hidden rounded-3xl p-5 shadow-2xl sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-brand/15 blur-[90px]"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-cream">
              {view.panelTitle}
            </h3>
            <p className="mt-0.5 text-xs text-faint">{view.panelSubtitle}</p>
          </div>
          {/* Diz que o painel atualiza sozinho, então fica. Sem borda e sem o
              ponto pulsante na frente: só o texto sobre um fundo sutil. */}
          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            {analytics.panel.live}
          </span>
        </div>

        <div className="min-h-[19rem] pt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={view.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -12 }}
              transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
            >
              <View />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
