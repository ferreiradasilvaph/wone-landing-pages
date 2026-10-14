"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { EASE } from "./useStepShow";

/**
 * A entrada de um elemento da demo. Uma peça só porque as duas telas usam a
 * mesma regra, e porque é aqui que mora a condição que mantém a hidratação
 * intacta: `initial={animated ? {...} : false}`.
 *
 * Com `animated` falso — servidor e PRIMEIRO render do cliente — o motion
 * aplica direto o estado final, então o HTML sai pintado no passo 01 e nada
 * nasce em `opacity: 0`. Depois da montagem `animated` é verdadeiro, mas os
 * elementos já montados não reavaliam `initial`: quem anima é só o que monta a
 * partir da próxima troca de passo (a chave do `Fragment` em volta).
 *
 * `reduced` zera a duração E o atraso: quem pediu menos movimento vê o estado
 * final do passo escolhido na hora, sem escada.
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
    <motion.div
      initial={animated ? { opacity: 0, y: distance } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : duration, delay: reduced ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
