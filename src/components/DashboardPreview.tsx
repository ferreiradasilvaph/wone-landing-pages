"use client";

import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HOURLY_REVENUE, FUNNEL_STEPS } from "@/data/content";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

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

/**
 * Prévia do painel: faturamento por hora e o funil start → PIX gerado → pago.
 *
 * É uma amostra ilustrativa, não dados de um cliente real. Uma série só, então
 * não há legenda: o título nomeia a métrica. As linhas de grade são traços
 * sólidos de 1px, um tom acima da superfície, e só o pico recebe rótulo direto
 * — o resto fica no tooltip.
 */
export function DashboardPreview() {
  const gradientId = useId();
  const reduced = useReducedMotion();
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
    <div className="surface relative overflow-hidden rounded-3xl p-5 shadow-2xl sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-brand/15 blur-[90px]"
      />

      <div className="relative">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-cream">
              Faturamento por hora
            </h3>
            <p className="mt-0.5 text-xs text-faint">
              Amostra ilustrativa de um dia de operação
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Tempo real
          </span>
        </div>

        {/* Número principal: fonte de texto comum, dígitos proporcionais.
            A leitura da hora em foco fica aqui, em posição fixa — um balão
            flutuante sobre o gráfico cobriria justamente o pico. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
              {BRL.format(total)}
            </span>
            <span className="text-sm text-muted">acumulado hoje</span>
          </div>

          <div className="rounded-lg border border-line bg-ink-950/70 px-3 py-1.5 text-right">
            <span className="t-eyebrow block text-faint">
              {String(activeIndex).padStart(2, "0")}h
              {activeIndex === peakIndex && hovered === null ? " · pico" : ""}
            </span>
            <span className="tnum text-sm font-semibold text-cream">
              {BRL.format(HOURLY_REVENUE[activeIndex])}
            </span>
          </div>
        </div>

        {/* Gráfico de área + faixa do eixo X logo abaixo, no mesmo contêiner */}
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${W} ${PLOT_H}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Faturamento por hora ao longo de 24 horas. Pico às ${peakIndex}h, ${BRL.format(HOURLY_REVENUE[peakIndex])}.`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF7700" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#FF7700" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grade recessiva: traços sólidos, um tom acima da superfície */}
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
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.35 }}
            />

            <motion.path
              d={chart.line}
              fill="none"
              stroke="#FF7700"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduced ? 0 : 1.4, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Marcador do ponto em foco, com anel na cor da superfície */}
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

            {/* Alvos de hover generosos: uma faixa inteira por hora */}
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

          {/* Eixo X em HTML, e não dentro do SVG: o viewBox encolhe junto com o
              cartão e levaria a fonte a uns 5px no celular. */}
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
                    transform: hour === 0 || hour === 23 ? undefined : "translateX(-50%)",
                  }}
                >
                  {String(hour).padStart(2, "0")}h
                </span>
              );
            })}
          </div>
        </div>

        {/* Funil: categorias ordenadas, rampa de um só tom */}
        <div className="mt-7 border-t border-line pt-5">
          <h4 className="font-display text-sm font-semibold text-cream">
            Funil de 100 leads
          </h4>
          <ul className="mt-4 space-y-2.5">
            {FUNNEL_STEPS.map((step, index) => (
              <li key={step.label} className="group/row flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-muted sm:w-40">
                  {step.label}
                </span>
                <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-cream/5">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-md"
                    style={{
                      width: `${step.value}%`,
                      background: step.color,
                      transformOrigin: "left",
                    }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      duration: reduced ? 0 : 0.9,
                      delay: reduced ? 0 : 0.15 * index,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </span>
                <span className="tnum w-10 shrink-0 text-right text-sm font-semibold text-cream">
                  {step.value}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-xs leading-relaxed text-cream/75">
            <span aria-hidden className="mt-0.5 shrink-0 text-brand">
              ↻
            </span>
            {/* Um único filho de texto: solto, cada trecho viraria um item do
                flex e ganharia o gap entre as palavras. */}
            <span>
              Os <strong className="font-semibold text-cream">24</strong> que geraram o
              PIX e não pagaram entram na recuperação automática.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
