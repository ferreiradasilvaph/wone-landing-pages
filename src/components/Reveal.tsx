"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none: { x: 0, y: 0 },
};

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Direção de onde o conteúdo entra. */
  from?: Direction;
  /** Atraso em segundos, para escalonar itens irmãos. */
  delay?: number;
};

/**
 * Entrada suave quando o elemento aparece na viewport.
 *
 * Anima uma única vez (`once`) e, com `prefers-reduced-motion`, renderiza o
 * conteúdo já no estado final — sem deslocamento e sem transição.
 */
export function Reveal({ children, className, from = "up", delay = 0 }: RevealProps) {
  const reduced = useReducedMotion();

  // O estado inicial não pode depender de `reduced`: no servidor o hook devolve
  // `null` e no cliente `true`, e o `style` gerado sairia diferente dos dois
  // lados, quebrando a hidratação. Quem responde ao movimento reduzido é só a
  // duração — com 0s o elemento assenta no lugar sem deslocamento visível.
  const variants: Variants = {
    hidden: { opacity: 0, ...OFFSET[from] },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: reduced ? 0 : 0.7, delay: reduced ? 0 : delay, ease: EASE },
    },
  };

  return (
    <motion.div
      data-reveal
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -80px 0px" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Container que revela os filhos `<RevealItem>` em cascata.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      data-reveal
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1, margin: "0px 0px -60px 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduced ? 0 : stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      data-reveal
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: reduced ? 0 : 0.6, ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
