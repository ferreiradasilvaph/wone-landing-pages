"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, CheckCircle2, CreditCard, Webhook, RefreshCw, MousePointerClick } from "lucide-react";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
const PATH_ICONS = [Webhook, RefreshCw, MousePointerClick];

/**
 * Diagrama das três vias de confirmação, com interruptor de falha em cada uma.
 *
 * É a demonstração mais importante da seção: o lead desliga uma via e vê que o
 * acesso continua saindo. A redundância deixa de ser promessa e vira algo que
 * ele testou com o próprio cursor.
 *
 * Título e subtítulo vivem no cabeçalho do painel, em `Highlights`.
 */
export function ConfirmationDemo() {
  const { highlights } = useContent();
  const demo = highlights.demos.confirmation;
  const reduced = useReducedMotion();

  const [down, setDown] = useState<boolean[]>([false, false, false]);
  const alive = down.filter((isDown) => !isDown).length;
  const delivered = alive > 0;

  const toggle = (index: number) =>
    setDown((current) => current.map((value, i) => (i === index ? !value : value)));

  return (
    <div>
      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[auto_1fr_auto] lg:gap-6">
        {/* Origem.

            O fundo era `ink-800`, o mesmo tom da base do painel — o cartão
            existia no código e não na tela. Agora é o inset mais escuro, igual
            ao das demais listas das demos. */}
        <div className="flex items-center gap-3 rounded-2xl bg-ink-900/60 p-3.5 lg:w-40 lg:flex-col lg:text-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center text-brand">
            <CreditCard className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-cream">{demo.payment}</span>
        </div>

        {/* As três vias */}
        <ul className="space-y-2.5">
          {demo.paths.map((path, index) => {
            const Icon = PATH_ICONS[index] ?? Webhook;
            const isDown = down[index];

            return (
              <li
                key={path.name}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-300 ${
                  isDown ? "bg-red-500/10" : "bg-brand/8"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center transition-colors duration-300 ${
                    isDown ? "text-red-400" : "text-brand"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1 leading-tight">
                  <span
                    className={`block text-sm font-semibold transition-colors duration-300 ${
                      isDown ? "text-red-400 line-through" : "text-cream"
                    }`}
                  >
                    {path.name}
                  </span>
                  <span className="block text-xs text-faint">
                    {isDown ? demo.offline : path.detail}
                  </span>
                </span>

                {/* Interruptor de falha */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDown}
                  aria-label={`${demo.failLabel}: ${path.name}`}
                  onClick={() => toggle(index)}
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${
                    isDown ? "bg-red-500/30" : "bg-ink-750"
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
                    className={`absolute top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full ${
                      isDown ? "right-1 bg-red-400" : "left-1 bg-cream/60"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        {/* Destino */}
        <div
          className={`flex items-center gap-3 rounded-2xl p-3.5 transition-colors duration-500 lg:w-40 lg:flex-col lg:text-center ${
            delivered ? "bg-emerald-500/12" : "bg-red-500/12"
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center transition-colors duration-500 ${
              delivered ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {delivered ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </span>
          <span
            className={`text-sm font-semibold transition-colors duration-500 ${
              delivered ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {demo.delivered}
          </span>
        </div>
      </div>

      {/* Aviso do cenário que não acontece na prática */}
      <AnimatePresence>
        {!delivered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-500/12 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="leading-relaxed">
                <span className="block text-sm font-semibold text-amber-300">
                  {demo.allDownTitle}
                </span>
                <span className="mt-1 block text-xs text-cream/70">{demo.allDown}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
