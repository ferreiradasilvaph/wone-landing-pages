"use client";

import type { CSSProperties } from "react";
import { motion, type MotionValue } from "motion/react";

/**
 * A barra de progresso do site, em n segmentos de 2px.
 *
 * Substituiu três peças que diziam a mesma coisa de três jeitos: os pontos de
 * 6px do carrossel de Recursos, a barra vertical de Segurança e o `setInterval`
 * de 40ms que desenhava a barra de Premiações. Segmento é a forma certa porque
 * mostra duas informações de uma vez — quantos passos existem e quanto falta do
 * atual.
 *
 * O segmento ativo preenche de três maneiras, e a ordem importa:
 *  1. `progress` (um MotionValue): o palco dos 4 passos, em que quem manda é a
 *     rolagem, não um relógio;
 *  2. `durationMs`: o avanço automático, por animação CSS — ela roda fora da
 *     thread principal e `paused` a congela onde está, em vez de voltar a zero;
 *  3. nenhum dos dois: o segmento fica cheio (lista navegada só por clique).
 *
 * Com `tabLabels` os segmentos viram abas de verdade (`role="tab"`), com o
 * rótulo em cima; sem eles a fileira é decorativa e quem conta a história são
 * as legendas. Não existe `role="progressbar"` aqui: a barra acompanha uma
 * seleção, não um carregamento, e o leitor de tela anunciaria "carregando".
 *
 * Movimento reduzido não precisa de tratamento: a regra global de globals.css
 * zera a duração de toda animação CSS, e o segmento nasce cheio.
 */
export function SegmentProgress({
  count,
  active,
  durationMs,
  paused,
  progress,
  labelLeft,
  labelRight,
  onSelect,
  tabLabels,
  className = "",
}: {
  count: number;
  active: number;
  durationMs?: number;
  paused?: boolean;
  progress?: MotionValue<number>;
  labelLeft?: string;
  labelRight?: string;
  onSelect?: (index: number) => void;
  tabLabels?: readonly string[];
  className?: string;
}) {
  const preenchimento = (indice: number) => {
    if (indice < active) return <span className="block h-full bg-brand" />;
    if (indice > active) return null;

    if (progress) {
      return <motion.span className="block h-full origin-left bg-brand" style={{ scaleX: progress }} />;
    }

    if (durationMs) {
      return (
        /* `key` no índice ativo: trocar de segmento remonta o elemento, que é o
           que faz a animação recomeçar do zero. */
        <span
          key={active}
          className="block h-full origin-left bg-brand"
          style={
            {
              "--dur": `${durationMs}ms`,
              animation: "segment-fill var(--dur) linear forwards",
              animationPlayState: paused ? "paused" : "running",
            } as CSSProperties
          }
        />
      );
    }

    return <span className="block h-full bg-brand" />;
  };

  const segmentos = Array.from({ length: count }, (_, indice) =>
    tabLabels ? (
      <button
        key={indice}
        type="button"
        role="tab"
        aria-selected={indice === active}
        onClick={() => onSelect?.(indice)}
        /* O respiro vertical é o que leva o alvo de toque aos 44px sem mexer na
           altura do segmento. */
        className={`flex min-w-0 flex-1 flex-col gap-2 pt-3 pb-2 text-left text-[13px] font-medium transition-colors ${
          indice === active ? "text-cream" : "text-faint hover:text-cream"
        }`}
      >
        <span className="truncate">{tabLabels[indice]}</span>
        <span className="block h-0.5 overflow-hidden rounded-full bg-cream/12">{preenchimento(indice)}</span>
      </button>
    ) : (
      <span key={indice} className="h-0.5 flex-1 overflow-hidden rounded-full bg-cream/12">
        {preenchimento(indice)}
      </span>
    ),
  );

  return (
    <div className={className}>
      {labelLeft || labelRight ? (
        <div className="mb-3 flex items-center justify-between text-[13px]">
          <span className="font-medium text-cream">{labelLeft}</span>
          <span className="text-faint">{labelRight}</span>
        </div>
      ) : null}
      <div
        className={`flex ${tabLabels ? "gap-6" : "gap-2"}`}
        role={tabLabels ? "tablist" : undefined}
        /* Sem abas, a fileira é só o desenho do que as legendas já dizem. */
        aria-hidden={tabLabels ? undefined : true}
      >
        {segmentos}
      </div>
    </div>
  );
}
