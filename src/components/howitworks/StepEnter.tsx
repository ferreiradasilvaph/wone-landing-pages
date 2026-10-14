"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * A entrada de um elemento da demo. Uma peça só porque as duas telas usam a
 * mesma regra, e porque é aqui que mora a condição que mantém a hidratação
 * intacta: sem `animated`, nenhuma animação é escrita.
 *
 * Com `animated` falso — servidor e PRIMEIRO render do cliente — o `style` sai
 * `undefined`, então o HTML nasce pintado no passo 01 e nada começa em
 * `opacity: 0`. Depois da montagem `animated` é verdadeiro; quem anima é só o
 * que monta a partir da próxima troca de passo, porque é a `key` do `Fragment`
 * em volta que remonta os blocos.
 *
 * Era um `motion.div`. Virou `@keyframes step-enter`, com a mesma distância, a
 * mesma duração e a mesma curva — o motivo é de carregamento: o `import` de
 * `motion/react` aqui (e em mais doze componentes renderizados no servidor)
 * punha o pacote dele, 42,2 kB transferidos, entre os 8 scripts que o navegador
 * baixa ANTES da primeira pintura, e o Lighthouse cobra esse download no FCP e
 * no LCP do h1. Medido em 14/10: FCP −0,42 s, LCP −0,21 s, +3 pontos (E-f1).
 *
 * `reduced` desliga a animação em vez de zerar a duração, e a diferença é
 * visível: a regra global de `globals.css` zera `animation-duration`, não
 * `animation-delay`. Com duração zero e 0,3 s de atraso, o `both` manteria o
 * bloco em `opacity: 0` durante o atraso — quem pediu menos movimento veria o
 * conteúdo PISCAR. Sem animação, ele vê o estado final na hora.
 */
export function StepEnter({
  delay = 0,
  distance = 6,
  duration = 0.28,
  animated,
  reduced,
  className,
  children,
}: {
  delay?: number;
  distance?: number;
  duration?: number;
  animated: boolean;
  reduced: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      style={
        animated && !reduced
          ? ({
              "--step-enter-y": `${distance}px`,
              animation: `step-enter ${duration}s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s both`,
            } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
