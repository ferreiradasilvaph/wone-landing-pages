"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface MotionFadeProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function MotionFade({ children, delay = 0, className = "" }: MotionFadeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}