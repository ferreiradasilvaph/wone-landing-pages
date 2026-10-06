"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CreditCard,
  Webhook,
  RefreshCw,
  MousePointerClick,
} from "lucide-react";
import { useContent } from "@/i18n";
import type { CranePhase } from "./CraneScene";

const EASE = [0.16, 1, 0.3, 1] as const;
const PATH_ICONS = [Webhook, RefreshCw, MousePointerClick];

/* A cena 3D num chunk próprio: o three só é baixado por quem abre esta aba.
   `ssr: false` porque não existe WebGL no servidor. */
const CraneScene = dynamic(() => import("./CraneScene"), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="h-[17rem] animate-pulse rounded-2xl bg-ink-900/40" />
  ),
});

/** Quanto dura cada trecho da sequência da caixa. */
const FALL_MS = 760;
const DIVE_MS = 620;
const LIFT_MS = 700;

/**
 * As três vias de confirmação como um guindaste: o pagamento é o gancho, cada
 * via é uma corda e a entrega é a caixa.
 *
 * O desenho anterior era um diagrama — origem à esquerda, três linhas no meio,
 * destino à direita. O designer gostou da lógica e pediu outra imagem: "o
 * pagamento feito como um gancho segurando três cordas, o entregue como uma
 * caixinha; desligou a via, a corda se corta; cortou as três, a caixa cai num
 * limbo e some; religou uma, o gancho desce, pega e volta com a caixa".
 *
 * Ele tem razão: ninguém precisa ler um diagrama para entender que três cordas
 * seguram uma caixa e que uma delas basta. Este arquivo cuida da lógica — três
 * interruptores, uma entrega — e `CraneScene` desenha a cena em three.js.
 *
 * É a demonstração mais importante da seção: o lead corta uma corda e vê que a
 * caixa continua no ar. A redundância deixa de ser promessa e vira algo que ele
 * testou com o próprio cursor.
 *
 * Título e subtítulo vivem no cabeçalho do painel, em `Highlights`.
 */
export function ConfirmationDemo() {
  const { highlights } = useContent();
  const demo = highlights.demos.confirmation;
  const reduced = useReducedMotion();

  const [down, setDown] = useState<boolean[]>([false, false, false]);
  /* O mesmo valor num ref: dois cliques rápidos, antes de o React repintar,
     leriam o mesmo `down` do render anterior e o segundo apagaria o primeiro. O
     ref é atualizado no próprio evento, então cada clique parte do estado que o
     anterior deixou. */
  const downRef = useRef(down);
  /** Via sob o ponteiro: acende a corda correspondente. */
  const [hot, setHot] = useState<number | null>(null);
  const [phase, setPhase] = useState<CranePhase>("hanging");

  const alive = down.filter((isDown) => !isDown).length;
  const delivered = alive > 0;

  /* A sequência da caixa é consequência do clique, não de um efeito observando
     o estado: a troca de fase sai daqui, do próprio evento. Os temporizadores
     ficam num ref para que mexer numa via no meio do caminho cancele o que
     estava agendado e recomece daqui. */
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  /* Desmontou no meio da queda: nada de temporizador chamando setState depois. */
  useEffect(() => clearTimers, []);

  const later = (run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, reduced ? 0 : ms));
  };

  const toggle = (index: number) => {
    const next = downRef.current.map((value, i) => (i === index ? !value : value));
    downRef.current = next;
    setDown(next);

    const nextAlive = next.filter((isDown) => !isDown).length;

    if (nextAlive === 0) {
      clearTimers();
      setPhase("falling");
      later(() => setPhase("gone"), FALL_MS);
      return;
    }

    /* Voltou a existir uma via: o gancho desce, pega a caixa e sobe com ela. */
    if (phase === "falling" || phase === "gone") {
      clearTimers();
      setPhase("diving");
      later(() => {
        setPhase("lifting");
        later(() => setPhase("hanging"), LIFT_MS);
      }, DIVE_MS);
    }
  };

  const hanging = phase === "hanging" || phase === "lifting";

  return (
    <div>
      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-7">
        {/* O guindaste */}
        <div className="mx-auto w-[15rem] max-w-full">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold text-cream">
            <CreditCard className="h-4 w-4 shrink-0 text-brand" />
            {demo.payment}
          </p>

          <div className="h-[17rem] w-full">
            <CraneScene down={down} hot={hot} phase={phase} reduced={!!reduced} />
          </div>

          {/* O rótulo da entrega fica em HTML, não dentro do canvas: texto de
              navegador é sempre mais nítido que texto virado em textura.

              Ele subia dois pontos para dentro do canvas e caía em cima da
              sombra projetada. Agora tem linha própria, abaixo do quadro. */}
          <motion.p
            initial={false}
            animate={{ opacity: hanging ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
            className="mt-1 text-center text-xs font-semibold text-emerald-400"
          >
            {demo.delivered}
          </motion.p>
        </div>

        {/* As três vias */}
        <ul className="space-y-2">
          {demo.paths.map((path, index) => {
            const Icon = PATH_ICONS[index] ?? Webhook;
            const isDown = down[index];

            return (
              <li
                key={path.name}
                onMouseEnter={() => setHot(index)}
                onMouseLeave={() =>
                  setHot((current) => (current === index ? null : current))
                }
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

                {/* Interruptor de falha: é a tesoura daquela corda */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDown}
                  aria-label={`${demo.failLabel}: ${path.name}`}
                  onFocus={() => setHot(index)}
                  onBlur={() => setHot((current) => (current === index ? null : current))}
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
      </div>

      {/* A cena conta o estado para quem vê; esta linha, para quem ouve */}
      <p role="status" className="sr-only">
        {delivered ? demo.delivered : demo.allDownTitle}
      </p>

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
