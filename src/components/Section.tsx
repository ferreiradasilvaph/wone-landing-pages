import type { ReactNode } from "react";

/* Fundo por seção. A fronteira entre duas seções é a troca de tom — nunca uma
   régua, nunca uma `border-t`: foi o que tirou da página o ar de documento
   dividido em caixas. A alternância corre ink-950 → ink-850 pela página, com
   ink-800 no bloco invertido de Segurança e o chão quente da vitrine. */
const FUNDO = {
  "ink-950": "bg-ink-950",
  "ink-850": "bg-ink-850",
  "ink-800": "bg-ink-800",
  floor: "bg-floor",
} as const;

export type SectionTone = keyof typeof FUNDO;

/**
 * A moldura de toda seção da página: fundo, ritmo vertical e container.
 *
 * Os três valem para a página inteira, e é por isso que moram numa peça só:
 *
 *  - o `padding-block` vem do token `--secao-y` (ou `--secao-y-curta` com
 *    `short`), então a respiração da página é uma linha de CSS, não trinta
 *    utilitários espalhados;
 *  - o container é sempre `max-w-7xl` com o mesmo gutter, então a borda
 *    esquerda do texto bate em todas as seções, de cima a baixo;
 *  - `data-section` é o que o header observa para marcar o item de navegação
 *    ativo. A âncora de rolagem NÃO fica aqui: ela é o bloco do título, posto
 *    pelo `SectionHead` com `scroll-mt-24`.
 *
 * `bleed` existe para a vitrine de Premiações, a única seção em que o conteúdo
 * precisa passar da largura do container (o rail de placas sangra até a borda
 * da tela): com ele o container não é aplicado e o filho decide a própria
 * largura.
 */
export function Section({
  anchor,
  tone = "ink-950",
  short,
  bleed,
  className = "",
  children,
}: {
  anchor: string;
  tone?: SectionTone;
  short?: boolean;
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ritmo = short ? "[padding-block:var(--secao-y-curta)]" : "[padding-block:var(--secao-y)]";

  return (
    <section data-section={anchor} className={`${FUNDO[tone]} ${ritmo}${className ? ` ${className}` : ""}`}>
      {bleed ? children : <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>}
    </section>
  );
}
