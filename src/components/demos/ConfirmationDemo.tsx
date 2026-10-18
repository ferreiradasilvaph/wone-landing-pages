"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { AlertTriangle, Webhook, RefreshCw, MousePointerClick } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "../Chip";
import type { CranePhase } from "./CraneScene";

const EASE = [0.16, 1, 0.3, 1] as const;
const PATH_ICONS = [Webhook, RefreshCw, MousePointerClick];

/* A cena 3D num chunk próprio: o three só é baixado por quem abre esta aba.
   `ssr: false` porque não existe WebGL no servidor. */
const CraneScene = dynamic(() => import("./CraneScene"), {
  ssr: false,
  loading: () => (
    <div aria-hidden className="rounded-field h-[17rem] bg-ink-900" />
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
  /* A VIA QUE CONFIRMA: a primeira que está de pé. É a que ganha o fio laranja
     (leva 1, 18/10) — e é informação, não enfeite: a demo existe para mostrar
     que uma via basta, e esta é a única peça dela que diz QUAL das três está
     cumprindo o trabalho neste momento. Desligou a primeira, o fio desce na
     segunda; derrubou as três, `-1` e não há fio nenhum. */
  const confirma = down.findIndex((isDown) => !isDown);

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
          {/* Os dois extremos da corrente são ESTADOS, e estado de produto sai
              pelo `Chip` (item (e) da etapa): o gancho em cima é o pagamento
              feito, a caixa embaixo é a entrega. Eram um `<p>` creme e um `<p>`
              esmeralda escritos à mão, com a altura e o ponto do `ok`
              reinventados aqui. O ícone do cartão saiu com eles: o ponto do
              `tone="ok"` já marca o estado, e o desenho ao lado já diz que
              aquilo é o pagamento. */}
          <p className="flex justify-center">
            <Chip tone="ok">{demo.payment}</Chip>
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
            className="mx-auto mt-1 flex w-fit"
          >
            <Chip tone="ok">{demo.delivered}</Chip>
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
                /* `via-entra` é a cascata de entrada das três linhas, 110 ms
                   entre elas: a lista se apresenta uma via por vez em vez de
                   aparecer inteira junto com o guindaste, que é a figura da
                   demo e merece o primeiro olhar. Montagem, então corre uma vez
                   só — quem abre a aba, vê. */
                className={`rounded-field relative flex items-center gap-3 px-3.5 py-2.5 transition-colors duration-300 ${
                  reduced ? "" : "via-entra "
                }${isDown ? "bg-red-500/10" : "bg-brand/8"}`}
                style={{ "--i": index } as CSSProperties}
              >
                {/* O FIO DA VIA QUE CONFIRMA: 2px laranja desenhado de cima
                    para baixo. Ele monta e desmonta com a troca, e é isso que
                    o redesenha quando o lead derruba a via de cima — animação
                    de montagem, sem classe para alternar. Recuado 10px em cima
                    e embaixo para ficar no trecho RETO da borda: `rounded-field`
                    são 12px de raio, e um fio de ponta a ponta sairia pelo
                    canto transparente. */}
                {index === confirma && (
                  <span
                    aria-hidden
                    className="via-fio absolute top-2.5 bottom-2.5 left-0 w-[2px] rounded-full bg-brand"
                  />
                )}

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
                  {/* A segunda linha troca o complemento da via por um chip de
                      estado quando ela cai. A caixa tem a altura do chip (28px)
                      desde o primeiro quadro, com texto ou com chip: sem isso a
                      linha crescia 12px ao desligar a via e a demo inteira
                      pulava sob o cursor. `min-h`, e não `h`: a 412 o
                      complemento da via sai em duas linhas, e uma altura
                      cravada o cortaria. */}
                  <span className="flex min-h-7 items-center">
                    {isDown ? (
                      <Chip tone="warn">{demo.offline}</Chip>
                    ) : (
                      <span className="text-[13px] text-faint">{path.detail}</span>
                    )}
                  </span>
                </span>

                {/* O interruptor da via: ligado é a corda inteira, desligado é
                    a ponta solta. A polaridade já esteve ao contrário — era um
                    "simular falha", e ligá-lo é que cortava a corda. O CTO
                    apontou, e o subtítulo da demo ("desligue uma via") sempre
                    esteve do lado dele: botão desligado é coisa que não
                    funciona, em qualquer tela que a pessoa já tenha usado. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isDown}
                  aria-label={path.name}
                  onFocus={() => setHot(index)}
                  onBlur={() => setHot((current) => (current === index ? null : current))}
                  onClick={() => toggle(index)}
                  // O interruptor tem 24px de altura para caber na linha; o
                  // alvo de toque chega aos 44px do portão pelo pseudo-elemento
                  // em volta, que não ocupa espaço no layout (mesma solução do
                  // PauseButton).
                  className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 before:absolute before:-inset-[10px] before:content-[''] ${
                    isDown ? "bg-ink-750" : "bg-brand/35"
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
                    className={`absolute top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full ${
                      isDown ? "left-1 bg-cream/35" : "right-1 bg-brand"
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
            <div className="rounded-field mt-4 flex items-start gap-3 bg-amber-500/12 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="leading-relaxed">
                <span className="block text-sm font-semibold text-amber-300">
                  {demo.allDownTitle}
                </span>
                <span className="mt-1 block text-[13px] text-cream/70">{demo.allDown}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
