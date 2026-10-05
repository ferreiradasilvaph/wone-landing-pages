"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Play, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
/** A última categoria do dicionário é a de IA — é ela que ganha destaque. */
const AI_CATEGORY_INDEX = 6;
/** Até onde o funil cresce, para o trilho não virar um tapete horizontal. */
const MAX_NODES = 8;
/** Quanto cada nó fica aceso quando o funil roda. */
const PULSE_MS = 420;

/**
 * Coordenada de um bloco na grade: categoria e posição dentro dela.
 *
 * O funil guarda coordenadas, e não nomes já traduzidos — assim trocar o idioma
 * traduz o funil que o lead montou em vez de deixar rótulos velhos na tela.
 */
type Slot = { uid: number; category: number; item: number };

type Category = { name: string; items: { name: string; detail: string }[] };

/** Resolve os nomes do funil-exemplo para coordenadas na grade de blocos. */
function presetSlots(categories: Category[], flow: string[]) {
  return flow.flatMap((name) => {
    for (let category = 0; category < categories.length; category += 1) {
      const item = categories[category].items.findIndex((entry) => entry.name === name);
      if (item !== -1) return [{ category, item }];
    }
    return [];
  });
}

/**
 * Editor de funil em miniatura: o lead monta o fluxo com os 28 blocos e roda.
 *
 * O card promete "desenhar qualquer funil", então a demonstração honesta é
 * deixar desenhar um — clicar na grade acrescenta o bloco ao trilho, clicar no
 * trilho remove, e `Rodar` manda um pulso percorrer o que ele montou. Antes
 * havia só a grade com a descrição no hover: um glossário, que mostrava a
 * extensão do vocabulário mas não que os blocos se encadeiam.
 */
export function BlocksDemo() {
  const { highlights } = useContent();
  const demo = highlights.demos.blocks;
  const reduced = useReducedMotion();

  // Semente determinística (sem `Math.random()`, sem `Date.now()`): servidor e
  // cliente precisam montar o mesmo funil ou a hidratação divergiria.
  const [slots, setSlots] = useState<Slot[]>(() =>
    presetSlots(demo.categories, demo.flow).map((slot, index) => ({ ...slot, uid: index })),
  );
  const nextUid = useRef(demo.flow.length);

  /** Bloco da grade em foco, cuja descrição aparece no rodapé. */
  const [active, setActive] = useState<string | null>(null);
  /** Índice do nó aceso enquanto o funil roda; -1 quando está parado. */
  const [pulse, setPulse] = useState(-1);

  const full = slots.length >= MAX_NODES;
  const running = pulse >= 0;

  /** O pulso anda sozinho até sair pela ponta do funil. */
  useEffect(() => {
    if (pulse < 0) return;

    const last = pulse >= slots.length;
    const timer = window.setTimeout(
      () => setPulse((value) => (last ? -1 : value + 1)),
      reduced ? 60 : PULSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pulse, slots.length, reduced]);

  // O uid sai do ref fora do updater: mexer nele lá dentro é efeito colateral
  // em função que o StrictMode invoca duas vezes.
  const add = useCallback((category: number, item: number) => {
    const uid = nextUid.current;
    nextUid.current += 1;
    setSlots((current) =>
      current.length >= MAX_NODES ? current : [...current, { uid, category, item }],
    );
    setPulse(-1);
  }, []);

  const remove = useCallback((uid: number) => {
    setSlots((current) => current.filter((slot) => slot.uid !== uid));
    setPulse(-1);
  }, []);

  const loadExample = useCallback(() => {
    const preset = presetSlots(demo.categories, demo.flow);
    const base = nextUid.current;
    nextUid.current += preset.length;
    setSlots(preset.map((slot, index) => ({ ...slot, uid: base + index })));
    setPulse(-1);
  }, [demo.categories, demo.flow]);

  const detail = active
    ? demo.categories
        .flatMap((category) =>
          category.items.map((item) => ({ key: `${category.name}-${item.name}`, item })),
        )
        .find((entry) => entry.key === active)?.item.detail
    : undefined;

  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-cream">{demo.title}</h3>
      <p className="mt-1.5 text-sm text-muted">{demo.subtitle}</p>

      {/* Trilho do funil montado */}
      <div className="mt-7 rounded-2xl border border-line bg-ink-950/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="flex items-center gap-2">
            <span className="t-eyebrow text-faint">{demo.builder.canvas}</span>
            <span className="font-mono text-[10px] text-faint">
              {slots.length}/{MAX_NODES}
            </span>
            {full && (
              <span className="rounded-full bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] text-faint">
                {demo.builder.full}
              </span>
            )}
          </span>

          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPulse(0)}
              disabled={slots.length === 0 || running}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/12 px-2.5 py-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/20 disabled:cursor-default disabled:opacity-40"
            >
              <Play className="h-3 w-3" />
              {demo.builder.run}
            </button>
            <button
              type="button"
              onClick={loadExample}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-ink-900 px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-line-strong hover:text-cream"
            >
              <RotateCcw className="h-3 w-3" />
              {demo.builder.example}
            </button>
            <button
              type="button"
              onClick={() => {
                setSlots([]);
                setPulse(-1);
              }}
              disabled={slots.length === 0}
              aria-label={demo.builder.clear}
              className="flex cursor-pointer items-center justify-center rounded-lg border border-line bg-ink-900 p-1.5 text-muted transition-colors hover:border-line-strong hover:text-cream disabled:cursor-default disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        </div>

        {slots.length === 0 ? (
          <p className="py-7 text-center text-xs text-faint">{demo.builder.empty}</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1 py-1">
            <ol className="flex w-max items-center gap-0">
              <AnimatePresence initial={false} mode="popLayout">
                {slots.map((slot, index) => {
                  const entry = demo.categories[slot.category]?.items[slot.item];
                  if (!entry) return null;

                  const isAi = slot.category === AI_CATEGORY_INDEX;
                  const isLit = index === pulse;
                  const isDone = pulse > index;

                  return (
                    <motion.li
                      key={slot.uid}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: isLit ? 1.06 : 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                      className="flex items-center"
                    >
                      <button
                        type="button"
                        onClick={() => remove(slot.uid)}
                        aria-label={`${demo.builder.remove}: ${entry.name}`}
                        className={`group/node flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
                          isLit
                            ? "border-brand bg-brand/20 text-cream shadow-[0_0_28px_-4px_rgba(255,119,0,0.8)]"
                            : isDone
                              ? "border-brand/45 bg-brand/8 text-cream/90"
                              : isAi
                                ? "border-brand/50 bg-brand/12 text-brand"
                                : "border-line bg-ink-900 text-cream/85 hover:border-line-strong"
                        }`}
                      >
                        <span className="font-mono text-[9px] text-faint">{index + 1}</span>
                        {isAi && <Sparkles className="h-3 w-3 shrink-0" />}
                        {entry.name}
                        <X className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/node:opacity-70" />
                      </button>

                      {index < slots.length - 1 && (
                        <span
                          aria-hidden
                          className={`mx-1.5 h-px w-7 shrink-0 transition-colors duration-200 sm:w-10 ${
                            isDone ? "bg-brand/70" : "bg-line"
                          }`}
                        />
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </div>
        )}
      </div>

      {/* Grade dos 28, por categoria: a paleta de onde os blocos saem */}
      <p className="t-eyebrow mt-8 mb-4 text-faint">{demo.hint}</p>

      <div className="space-y-5">
        {demo.categories.map((category, categoryIndex) => {
          const isAi = categoryIndex === AI_CATEGORY_INDEX;

          return (
            <div key={category.name}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className={`t-eyebrow ${isAi ? "text-brand" : "text-faint"}`}>
                  {category.name}
                </span>
                {isAi && (
                  <span className="rounded-full bg-brand/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand">
                    {demo.aiTag}
                  </span>
                )}
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] text-faint">
                  {category.items.length}
                </span>
              </div>

              <ul className="flex flex-wrap gap-2">
                {category.items.map((item, itemIndex) => {
                  const key = `${category.name}-${item.name}`;
                  const isActive = active === key;

                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => add(categoryIndex, itemIndex)}
                        disabled={full}
                        onMouseEnter={() => setActive(key)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(key)}
                        onBlur={() => setActive(null)}
                        aria-describedby={isActive ? "block-detail" : undefined}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-200 disabled:cursor-default disabled:opacity-40 ${
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

      {/* Descrição do bloco em foco. A altura mínima evita a grade pular. */}
      <p
        id="block-detail"
        aria-live="polite"
        className="mt-6 min-h-10 rounded-xl border border-line bg-ink-950/60 px-4 py-3 text-xs leading-relaxed text-muted"
      >
        {detail ?? demo.hint}
      </p>
    </div>
  );
}
