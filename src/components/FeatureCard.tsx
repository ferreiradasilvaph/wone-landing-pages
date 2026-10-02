"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Card que gira no eixo Y revelando o verso: o título cresce, o ícone vai para
 * a direita e o texto continua legível.
 *
 * O giro é CSS (`preserve-3d` + `backface-visibility`), não `motion`, porque
 * aqui basta uma transição de `transform` — mais leve numa grade de 10 cards.
 * Em telas de toque não existe hover, então o toque alterna o estado.
 *
 * Todos os cards usam o mesmo layout (ícone em cima, título, descrição) e a
 * mesma altura mínima, para a grade fechar alinhada em qualquer idioma.
 */
export function FeatureCard({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: LucideIcon;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="group/flip h-full [perspective:1400px]"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      onClick={() => setFlipped((value) => !value)}
      tabIndex={0}
      role="button"
      aria-pressed={flipped}
      aria-label={`${title}. ${description}`}
    >
      <div
        className="relative h-full min-h-[11.5rem] transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Frente */}
        <div className="surface absolute inset-0 flex flex-col rounded-2xl p-6 [backface-visibility:hidden]">
          <span className="mb-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-cream">
              {title}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {description}
            </p>
          </div>
        </div>

        {/* Verso: título maior, ícone à direita */}
        <div className="absolute inset-0 flex flex-col rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/15 via-ink-850 to-ink-900 p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-xl leading-tight font-semibold text-cream">
              {title}
            </h3>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/40 bg-brand/20 text-brand">
              <Icon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/80">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
