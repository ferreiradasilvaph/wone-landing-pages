"use client";

import type { CSSProperties } from "react";
import { STEP_COUNT } from "./useStepShow";

/* Quanto o ponto viaja. O trilho horizontal é a coluna de 72px da grade e o
   grupo (rastro de 24 + ponto de 8) mede 32 → 40px de curso. O vertical tem
   32px e o grupo deitado mede 22 → 10px. Os dois são medidas de layout, não
   números mágicos: mudar a coluna ou o rastro muda estes. O vertical é curto
   porque cada pixel dele sai da altura das duas telas empilhadas, e o teto da
   seção no celular é 1.450. */
const TRAVEL = { x: 40, y: 10 } as const;

/** Quando o ponto sai e quanto tempo leva, em segundos. */
const WIRE_DURATION = 0.52;
const WIRE_DELAY_FORWARD = 0.12;
const WIRE_DELAY_BACK = 0.42;

/**
 * O fio entre as duas telas: um trilho fino com um ponto que viaja de um lado
 * ao outro e um rastro chapado atrás dele.
 *
 * É o que o palco 3D tentava dizer com um avião de papel e não dizia: nos
 * passos 01-03 o evento vai do SEU painel para o chat do cliente; no 04 ele
 * volta — o cliente paga e a venda aparece no seu extrato sem você. A inversão
 * do fio é a definição visual de "sem mim", e é o que torna o passo 04
 * visivelmente diferente dos três de configuração.
 *
 * Em REPOUSO o ponto fica na ponta de CHEGADA, então a direção se lê com a
 * seção parada — o teste do "congelado no passo 01". É também o que mantém o
 * primeiro render sem transform de entrada: a posição final vem do alinhamento
 * do flex (`justify-end`/`justify-start`), e a animação só traz o deslocamento
 * de volta a zero.
 *
 * O espelhamento do grupo no passo 04 é feito pela ORDEM dos dois elementos no
 * DOM, não por `scale-[-1]`: o keyframe escreve o `transform` do deslocamento,
 * e uma classe de escala no mesmo nó seria sobrescrita.
 *
 * Duas instâncias vivem na demo, uma por eixo (`lg:hidden` e `hidden lg:flex`),
 * porque o eixo do movimento muda de breakpoint e nem valor de motion nem
 * keyframe respondem a media query. A escondida sai do layout por
 * `display: none` — num grid, item com `display: none` não ocupa trilha.
 *
 * Era um `motion.span` e virou `@keyframes wire-travel-x/y`, com a mesma
 * distância, o mesmo atraso, a mesma duração e a mesma curva. O motivo é de
 * carregamento: o `import` de `motion/react` aqui (e em mais doze componentes
 * renderizados no servidor) punha o pacote dele, 42,2 kB transferidos, entre os
 * 8 scripts que o navegador baixa ANTES da primeira pintura — medido em 14/10,
 * tirá-lo valeu FCP −0,42 s e LCP −0,21 s (E-f1). A `key={step}` continua
 * sendo o que recomeça o percurso: nó novo, animação nova.
 *
 * `reduced` desliga a animação em vez de zerar a duração: a regra global de
 * `globals.css` zera `animation-duration`, não `animation-delay`, e com os 0,42
 * s de atraso do passo 04 o ponto ficaria fora de lugar durante o atraso.
 */
export function EventWire({
  axis,
  step,
  animated,
  reduced,
  className = "",
}: {
  axis: "x" | "y";
  step: number;
  animated: boolean;
  reduced: boolean;
  className?: string;
}) {
  /* O passo 04 é o único em que o evento nasce no cliente. */
  const back = step === STEP_COUNT - 1;
  const travel = TRAVEL[axis];
  const from = back ? travel : -travel;

  const delay = back ? WIRE_DELAY_BACK : WIRE_DELAY_FORWARD;
  const travessia: CSSProperties | undefined =
    animated && !reduced
      ? ({
          "--wire-from": `${from}px`,
          animation: `wire-travel-${axis} ${WIRE_DURATION}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`,
        } as CSSProperties)
      : undefined;

  const trail =
    axis === "x" ? (
      <span className="block h-0.5 w-6 bg-brand/35" />
    ) : (
      <span className="block h-3.5 w-0.5 bg-brand/35" />
    );
  const dot = <span className="block h-2 w-2 shrink-0 rounded-full bg-brand" />;

  if (axis === "x") {
    return (
      <div className={`flex items-center justify-center${className ? ` ${className}` : ""}`}>
        {/* Faixa de 8px: o trilho de 2px no meio dela, e o ponto de 8px
            centrado no trilho sem estourar a faixa. */}
        <div className="relative h-2 w-full">
          <span className="absolute inset-x-0 top-[3px] h-0.5 bg-cream/12" />
          <span
            key={step}
            style={travessia}
            className={`absolute top-[3px] flex h-0.5 items-center ${
              back ? "left-0" : "right-0"
            }`}
          >
            {back ? (
              <>
                {dot}
                {trail}
              </>
            ) : (
              <>
                {trail}
                {dot}
              </>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex shrink-0 justify-center${className ? ` ${className}` : ""}`}>
      <div className="relative h-8 w-2">
        <span className="absolute inset-y-0 left-[3px] w-0.5 bg-cream/12" />
        <span
          key={step}
          style={travessia}
          className={`absolute left-[3px] flex w-0.5 flex-col items-center ${
            back ? "top-0" : "bottom-0"
          }`}
        >
          {back ? (
            <>
              {dot}
              {trail}
            </>
          ) : (
            <>
              {trail}
              {dot}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
