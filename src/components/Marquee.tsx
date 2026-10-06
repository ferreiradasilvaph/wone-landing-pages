"use client";

import { useContent } from "@/i18n";
import { IntegrationMark, hasIntegrationMark } from "./IntegrationMark";

/* Todas as marcas saem no laranja da marca, não na cor de cada serviço. A faixa
   com nove cores diferentes brigava com o resto da página; num tom só, ela lê
   como uma fileira de logos da Wone. O campo `dot` dos dicionários continua
   servindo a lista do rodapé. */
const MARK_COLOR = "#FF7700";

/**
 * Faixa infinita com as integrações. A lista é renderizada duas vezes e o
 * keyframe desloca exatamente -50%, então a emenda cai sempre no mesmo ponto e
 * o laço fica imperceptível.
 *
 * Cada item mostra a marca da integração e o serviço que ela presta (Pagamento,
 * Entrega, Rastreio, Atribuição) — o nome escrito saiu, mas continua no HTML em
 * `sr-only`, que é o que um leitor de tela anuncia no lugar do símbolo.
 *
 * Fundo sólido um tom acima do preto, sem borda e sem ponto: o fundo é `ink-850`
 * porque, sem a borda, um fundo quase igual ao da página deixaria a pílula
 * invisível.
 */
export function Marquee() {
  const { integrations } = useContent();

  return (
    <div className="mask-edges relative overflow-hidden py-2">
      <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-3">
            {integrations.map((item) => {
              /* Com símbolo próprio, o nome fica só para leitor de tela. Sem
                 símbolo, ele é o que aparece — nada de sinal genérico no lugar
                 de um logo que não temos. */
              const marked = hasIntegrationMark(item.icon);

              return (
                <span
                  key={`${copy}-${item.name}`}
                  className="flex items-center gap-2.5 rounded-full bg-ink-850 px-4 py-2 whitespace-nowrap"
                >
                  {marked ? (
                    <>
                      <IntegrationMark
                        icon={item.icon}
                        name={item.name}
                        color={MARK_COLOR}
                        className="h-4 w-4"
                      />
                      <span className="sr-only">{item.name}</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-cream/80">
                      {item.name}
                    </span>
                  )}
                  <span className="t-eyebrow text-faint">{item.kind}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
