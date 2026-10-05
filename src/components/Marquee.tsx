"use client";

import { useContent } from "@/i18n";

/**
 * Faixa infinita com as integrações. A lista é renderizada duas vezes e o
 * keyframe desloca exatamente -50%, então a emenda cai sempre no mesmo ponto e
 * o laço fica imperceptível.
 *
 * Cada item é só nome e tipo sobre um fundo sólido um tom acima do preto: sem
 * borda e sem o ponto na cor da integração. O fundo é `ink-850`, não o
 * `ink-900/60` de antes — sem a borda, um fundo quase igual ao fundo da página
 * deixaria a pílula invisível.
 */
export function Marquee() {
  const { integrations } = useContent();

  return (
    <div className="mask-edges relative overflow-hidden py-2">
      <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-3">
            {integrations.map((item) => (
              <span
                key={`${copy}-${item.name}`}
                className="flex items-center gap-2 rounded-full bg-ink-850 px-4 py-2 whitespace-nowrap"
              >
                <span className="text-sm font-medium text-cream/80">{item.name}</span>
                <span className="t-eyebrow text-faint">{item.kind}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
