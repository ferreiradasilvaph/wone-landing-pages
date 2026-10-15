"use client";

import type { CSSProperties } from "react";
import { STEP_COUNT } from "./useStepShow";

/* --------------------------------------------------------------------------
   O FIO, em dois eixos.

   O horizontal vive na tela grande (a partir de `xl`), onde o palco mede
   EXATAMENTE 1216×560: o container é `max-w-7xl` (1280) com `px-8`, então de
   1280px de viewport para cima a largura de conteúdo é fixa. É isso que permite
   escrever o caminho em px e usá-lo nos dois lugares que precisam dele — o
   `<path>` que desenha e o `offset-path` que move a faísca.

   O vertical é o das telas estreitas, onde os dois objetos empilham: caixa de
   24×56 centrada, caminho reto.

   As coordenadas nascem das posições dos objetos em `OperationStage` — mexer
   num mexe no outro.
   -------------------------------------------------------------------------- */
const GEO = {
  x: {
    w: 1216,
    h: 560,
    d: "M 676 262 C 744 262, 816 288, 884 288",
    from: [676, 262],
    to: [884, 288],
  },
  y: {
    w: 24,
    h: 56,
    d: "M 12 2 L 12 54",
    from: [12, 2],
    to: [12, 54],
  },
} as const;

/** Quanto a faísca leva de ponta a ponta, e quando ela sai (segundos). */
const SPARK_DURATION = 0.95;
/** Nos passos 01-03 ela sai depois de o painel pintar; no 04, depois do chat. */
const SPARK_DELAY_FORWARD = 0.4;
const SPARK_DELAY_BACK = 0.55;

const WIRE = "rgba(255,119,0,0.35)";

/**
 * O fio entre a tela grande e o aparelho, com a faísca que atravessa a cada
 * troca de passo.
 *
 * É a coisa que o palco existe para mostrar: nos passos 01-03 o evento vai do
 * SEU painel para o chat do cliente; no 04 ele VOLTA — o cliente paga e a venda
 * aparece no seu extrato sem você. A inversão do fio é a definição visual de
 * "sem mim", e é o que torna o passo 04 visivelmente diferente dos três de
 * configuração.
 *
 * A travessia é `offset-path` + `offset-distance` em `@keyframes`
 * (`stage-spark` / `stage-spark-back` em globals.css), e `key={step}` é o que a
 * recomeça: nó novo, animação nova. `offset-rotate` gira a faísca na direção da
 * marcha, então o rastro aponta para trás nos dois sentidos — sem `scale(-1)`,
 * que o keyframe sobrescreveria.
 *
 * Navegador sem `offset-path`: a faísca fica `visibility: hidden` pela regra
 * `@supports` do globals.css, e o fio continua desenhado. Sem o caminho ela não
 * teria posição nenhuma e pousaria no canto do palco.
 *
 * `prefers-reduced-motion`: a regra global zera a DURAÇÃO da animação, e o
 * quadro final de `stage-spark` é `opacity: 0` — quem pediu menos movimento vê
 * o fio parado, que é o estado de repouso do desenho.
 */
export function StageWire({
  axis,
  step,
  className = "",
}: {
  axis: "x" | "y";
  step: number;
  className?: string;
}) {
  const geo = GEO[axis];
  /* O passo 04 é o único em que o evento nasce no cliente. */
  const back = step === STEP_COUNT - 1;

  const spark: CSSProperties = {
    offsetPath: `path("${geo.d}")`,
    offsetRotate: back ? "auto 180deg" : "auto",
    animation: `${back ? "stage-spark-back" : "stage-spark"} ${SPARK_DURATION}s linear ${
      back ? SPARK_DELAY_BACK : SPARK_DELAY_FORWARD
    }s both`,
  };

  return (
    <div
      aria-hidden
      className={`pointer-events-none${axis === "x" ? " absolute inset-0" : " relative shrink-0"}${
        className ? ` ${className}` : ""
      }`}
      style={axis === "y" ? { width: geo.w, height: geo.h } : undefined}
    >
      <svg
        className="absolute inset-0"
        width={geo.w}
        height={geo.h}
        viewBox={`0 0 ${geo.w} ${geo.h}`}
      >
        <path d={geo.d} fill="none" stroke={WIRE} strokeWidth={1.25} />
        {/* As duas pontas: um ponto em cada objeto, para o fio nascer de algum
            lugar em vez de flutuar entre os dois. */}
        <circle cx={geo.from[0]} cy={geo.from[1]} r={2.5} fill={WIRE} />
        <circle cx={geo.to[0]} cy={geo.to[1]} r={2.5} fill={WIRE} />
      </svg>

      <span key={step} className="stage-spark absolute top-0 left-0 block" style={spark}>
        {/* O rastro sai do ponto para trás: 20px chapados em degradê até
            transparente, sem blur. */}
        <span className="absolute top-1/2 right-full h-px w-5 -translate-y-1/2 bg-gradient-to-l from-brand to-transparent" />
        <span className="block h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
    </div>
  );
}
