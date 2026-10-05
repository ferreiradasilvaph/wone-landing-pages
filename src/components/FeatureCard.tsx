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

  /* O verso so entra no DOM no primeiro giro. Sao 10 cards nesta grade: as duas
     faces sempre montadas davam 20 blocos de conteudo e 20 icones no HTML
     inicial, e o verso nao e visto por quem nao interage. O Lighthouse media
     1142 ms de styleLayout no mobile, o maior custo de main thread da pagina.
     Uma vez montado, fica — senao a volta do giro mostraria um card vazio. */
  const [backMounted, setBackMounted] = useState(false);

  const flip = (next: boolean) => {
    setFlipped(next);
    if (next) setBackMounted(true);
  };

  return (
    <div
      className="group/flip h-full [perspective:1400px]"
      onMouseEnter={() => flip(true)}
      onMouseLeave={() => flip(false)}
      onFocus={() => flip(true)}
      onBlur={() => flip(false)}
      onClick={() => flip(!flipped)}
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
          <span className="mb-5 flex h-11 w-11 shrink-0 items-center justify-center text-brand">
            <Icon className="h-6 w-6" />
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
        {backMounted && (
        <div className="absolute inset-0 flex flex-col rounded-2xl bg-gradient-to-br from-brand/20 via-ink-800 to-ink-850 p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-xl leading-tight font-semibold text-cream">
              {title}
            </h3>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center text-brand">
              <Icon className="h-6 w-6" />
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/80">
            {description}
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
