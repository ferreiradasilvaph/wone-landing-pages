"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
/** A última categoria do dicionário é a de IA — é ela que ganha destaque. */
const AI_CATEGORY_INDEX = 6;

/**
 * Trecho de funil montado com os blocos, mais a grade completa dos 28.
 *
 * O objetivo é o lead ver que "28 blocos" é um vocabulário, não um número de
 * marketing: os nós mostram como se encadeiam e a grade mostra a extensão.
 */
export function BlocksDemo() {
  const { highlights } = useContent();
  const demo = highlights.demos.blocks;
  const reduced = useReducedMotion();
  const [active, setActive] = useState<string | null>(null);

  // O último nó do fluxo é o bloco de IA, que recebe tratamento próprio.
  const lastFlowIndex = demo.flow.length - 1;

  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-cream">{demo.title}</h3>
      <p className="mt-1.5 text-sm text-muted">{demo.subtitle}</p>

      {/* Trecho de fluxo: nós ligados por linhas */}
      <div className="mask-edges mt-7 -mx-1 overflow-x-auto px-1 pb-2">
        <ol className="flex w-max items-center gap-0">
          {demo.flow.map((node, index) => {
            const isAi = index === lastFlowIndex;

            return (
              <li key={node} className="flex items-center">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: reduced ? 0 : 0.4,
                    delay: reduced ? 0 : index * 0.08,
                    ease: EASE,
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap ${
                    isAi
                      ? "border-brand/50 bg-brand/12 text-brand shadow-[0_0_24px_-6px_rgba(255,119,0,0.6)]"
                      : "border-line bg-ink-900 text-cream/85"
                  }`}
                >
                  {isAi && <Sparkles className="h-3 w-3" />}
                  {node}
                </motion.span>

                {index < demo.flow.length - 1 && (
                  <span aria-hidden className="mx-1.5 h-px w-7 shrink-0 bg-line sm:w-10" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Grade dos 28, por categoria */}
      <p className="t-eyebrow mt-8 mb-4 text-faint">{demo.hint}</p>

      <div className="space-y-5">
        {demo.categories.map((category, categoryIndex) => {
          const isAi = categoryIndex === AI_CATEGORY_INDEX;

          return (
            <div key={category.name}>
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className={`t-eyebrow ${isAi ? "text-brand" : "text-faint"}`}
                >
                  {category.name}
                </span>
                {isAi && (
                  <span className="rounded-full border border-brand/40 bg-brand/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand">
                    {demo.aiTag}
                  </span>
                )}
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] text-faint">
                  {category.items.length}
                </span>
              </div>

              <ul className="flex flex-wrap gap-2">
                {category.items.map((item) => {
                  const key = `${category.name}-${item.name}`;
                  const isActive = active === key;

                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(key)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(key)}
                        onBlur={() => setActive(null)}
                        aria-describedby={isActive ? "block-detail" : undefined}
                        className={`cursor-default rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-200 ${
                          isActive
                            ? "border-brand/50 bg-brand/12 text-cream"
                            : isAi
                              ? "border-brand/25 bg-brand/6 text-brand/90"
                              : "border-line bg-ink-900/60 text-muted hover:border-line-strong hover:text-cream"
                        }`}
                      >
                        {item.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Descrição do bloco em foco. A altura é fixa para a grade não pular. */}
      <p
        id="block-detail"
        aria-live="polite"
        className="mt-6 min-h-10 rounded-xl border border-line bg-ink-950/60 px-4 py-3 text-xs leading-relaxed text-muted"
      >
        {demo.categories
          .flatMap((category) =>
            category.items.map((item) => ({ key: `${category.name}-${item.name}`, item })),
          )
          .find((entry) => entry.key === active)?.item.detail ?? demo.hint}
      </p>
    </div>
  );
}
