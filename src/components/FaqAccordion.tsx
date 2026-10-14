"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useContent } from "@/i18n";

/**
 * Acordeão de perguntas, na forma de linha de tabela: régua entre as linhas e
 * nada em volta (a borda externa saiu — o bloco já é delimitado pela própria
 * coluna). Abre uma por vez e anima a altura, para a lista não "saltar" quando
 * o visitante troca de pergunta; a primeira nasce aberta.
 *
 * A pergunta aberta engrossa de 500 para 600 e fica creme: o laranja que ela
 * ganhava disputava com os links de ação da página, e cor em título é privilégio
 * do h1 e da tese. O "+" gira 45° e é o único sinal de estado.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { faq } = useContent();

  return (
    <div className="divide-y divide-line">
      {faq.items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={item.question} className="group">
            <h3>
              {/* py-5 com a linha de 17px passa dos 44px de alvo de toque. */}
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center justify-between gap-5 py-5 text-left"
              >
                <span
                  className={`text-[17px] leading-snug text-cream ${
                    isOpen ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center transition-[transform,color] duration-300 ${
                    isOpen ? "rotate-45 text-brand" : "text-faint group-hover:text-cream"
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
                  {/* Sem largura máxima própria: a medida da resposta é a da
                      coluna do acordeão, e o `pr-12` a alinha ao "+". */}
                  <p className="pr-12 pb-6 text-[15px] leading-relaxed text-muted">
                    {item.answer}
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
