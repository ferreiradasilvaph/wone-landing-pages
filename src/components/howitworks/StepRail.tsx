"use client";

import { Fragment } from "react";
import { useContent } from "@/i18n";
import { STEP_COUNT } from "./useStepShow";

/**
 * O trilho dos quatro passos: as abas que mandam na demo ao lado.
 *
 * Substituiu o "log" que espaçava cada passo em 36vh e dependia da rolagem para
 * trocar de cena. Aqui os quatro títulos ficam SEMPRE visíveis — com as duas
 * etiquetas de grupo, a seção conta a história inteira PARADA no passo 01, que
 * era o furo do desenho antigo: o leitor não entendia a relação entre o que ELE
 * faz e o que ACONTECE (diagnóstico de 14/10).
 *
 * As etiquetas são a dobra 3+1: "Você faz uma vez" sobre os passos 01-03 e
 * "Depois, a cada venda" sobre o 04, com régua acima. É o que faz o desfecho
 * ler como desfecho sem precisar de um estilo diferente de aba.
 *
 * `tablist` vertical é o papel correto (uma lista de opções que controla um
 * painel), e as setas andam nela — o mesmo manipulador de `SecurityCarousel`.
 * As duas etiquetas são irmãs diretas das abas e vão `aria-hidden` mais
 * `role="presentation"`: um `<div>` de agrupamento entre o `tablist` e o `tab`
 * quebraria a relação de posse do ARIA, e `role="group"` não é filho válido de
 * `tablist`; declarar as etiquetas como apresentacionais satisfaz a regra dos
 * "required owned elements" sem mudar nada do que o leitor de tela recebe — a
 * descrição do passo 04 já diz "Sem você.", que é o que as etiquetas desenham
 * para quem vê.
 *
 * Altura CONSTANTE em cada aba, e não só na soma do trilho: em `lg` as quatro
 * descrições ficam no DOM com altura reservada (`h-10` e `line-clamp-2`, que
 * também seguram o inglês, mais longo); abaixo de `lg` a descrição sai de
 * dentro dos botões e vive UMA vez, num compartimento de altura fixa logo
 * abaixo do `tablist`. A primeira versão mostrava a descrição dentro da aba
 * ativa: a soma do trilho não mudava, mas as abas seguintes desciam 44px a cada
 * troca, e o autoplay registrava quatro saltos de layout por ciclo (CLS 0,026
 * medido a 412) sem o visitante tocar em nada. Agora toda aba mede o mesmo,
 * então nada dentro do trilho se move — CLS 0 nos dois breakpoints.
 */
export function StepRail({
  active,
  onSelect,
}: {
  active: number;
  onSelect: (index: number) => void;
}) {
  const { howItWorks } = useContent();
  const { steps, demo } = howItWorks;

  return (
    <div>
      <div role="tablist" aria-orientation="vertical" aria-label={howItWorks.kicker}>
        {steps.map((step, index) => {
          const isActive = index === active;
          /* O 04 é o desfecho: a segunda etiqueta de grupo entra antes dele. */
          const opensRuntime = index === STEP_COUNT - 1;

          return (
            <Fragment key={step.step}>
              {index === 0 ? (
                <p role="presentation" aria-hidden className="t-label mb-2">
                  {demo.groups.setup}
                </p>
              ) : null}
              {opensRuntime ? (
                <p
                  role="presentation"
                  aria-hidden
                  className="t-label mt-4 mb-2 border-t border-line pt-4"
                >
                  {demo.groups.runtime}
                </p>
              ) : null}

              <button
                type="button"
                role="tab"
                id={`hiw-tab-${index}`}
                aria-selected={isActive}
                aria-controls="hiw-panel"
                /* Foco rotativo: o trilho inteiro é UMA parada de Tab, e dentro
                   dele quem anda são as setas. */
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelect(index)}
                onKeyDown={(event) => {
                  const last = STEP_COUNT - 1;
                  let next: number | null = null;
                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    next = index === last ? 0 : index + 1;
                  }
                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    next = index === 0 ? last : index - 1;
                  }
                  if (event.key === "Home") next = 0;
                  if (event.key === "End") next = last;
                  if (next === null) return;
                  event.preventDefault();
                  onSelect(next);
                  /* O foco acompanha a seleção: com `tabIndex` rotativo,
                     deixá-lo na aba antiga tiraria o teclado do trilho na tecla
                     seguinte. */
                  document.getElementById(`hiw-tab-${next}`)?.focus();
                }}
                /* Tom, nunca contorno (regra 8): a aba escolhida sobe um degrau
                   de superfície sobre o fundo da seção. `py-3` com a linha do
                   título leva o alvo de toque aos 44px sem um `min-h` solto. */
                className={`w-full cursor-pointer rounded-field px-3 py-3 text-left transition-colors duration-300 ${
                  isActive ? "bg-ink-800" : "hover:bg-ink-850"
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="tnum text-[13px] text-faint">{step.step}</span>
                  <span
                    className={`text-[15px] leading-snug font-semibold transition-colors duration-300 ${
                      isActive ? "text-cream" : "text-muted"
                    }`}
                  >
                    {step.title}
                  </span>
                </span>
                {/* Dentro da aba só em `lg`, onde as quatro ficam no DOM e a
                    altura reservada não depende de qual está ativa. */}
                <span className="mt-1 line-clamp-2 hidden h-10 text-[13px] leading-[1.5] text-muted lg:block">
                  {step.description}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* O compartimento da descrição abaixo de `lg`: altura fixa, fora do
          `tablist` (lá dentro só cabem abas) e fora dos botões, para a troca de
          passo não empurrar as abas seguintes. Sem `aria-live` — quem narra a
          troca é a região do card da demo; aqui o texto é só o que está à vista
          de quem usa um leitor de tela em tela estreita.

          Leva o tom da aba escolhida (`bg-ink-800`) e repete o número do passo:
          solto, logo abaixo do 04, o texto parecia descrever o ÚLTIMO item da
          lista. Com o mesmo tom e o mesmo par número+texto das abas, ele se lê
          como o corpo do passo marcado — e o card da demo, logo abaixo, mostra
          esse mesmo passo. */}
      <p className="mt-2 flex gap-2 rounded-field bg-ink-800 px-3 py-2 text-[13px] leading-[1.5] lg:hidden">
        <span className="tnum shrink-0 text-faint">{steps[active].step}</span>
        <span className="line-clamp-2 h-10 text-muted">{steps[active].description}</span>
      </p>
    </div>
  );
}
