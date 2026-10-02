"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { FAQS } from "@/data/content";

/**
 * Acordeão de perguntas. Abre uma por vez e anima a altura, para a lista não
 * "saltar" quando o visitante troca de pergunta.
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={faq.question} className="group">
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center justify-between gap-5 py-5 text-left transition-colors"
              >
                <span
                  className={`font-display text-base font-medium transition-colors sm:text-lg ${
                    isOpen ? "text-brand" : "text-cream group-hover:text-cream"
                  }`}
                >
                  {faq.question}
                </span>
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                    isOpen
                      ? "rotate-45 border-brand bg-brand text-ink-950"
                      : "border-line text-muted group-hover:border-brand/50 group-hover:text-brand"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pr-12 pb-6 text-sm leading-relaxed text-muted">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
