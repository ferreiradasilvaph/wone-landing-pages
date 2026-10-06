"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  CreditCard,
  Webhook,
  RefreshCw,
  MousePointerClick,
} from "lucide-react";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
const PATH_ICONS = [Webhook, RefreshCw, MousePointerClick];

/* --------------------------------------------------------------------------
   O guindaste

   O desenho anterior era um diagrama: origem à esquerda, três linhas no meio,
   destino à direita. O designer gostou da lógica e pediu outra imagem — "o
   pagamento feito como um gancho segurando três cordas, o entregue como uma
   caixinha; desligou a via, a corda se corta; cortou as três, a caixa cai num
   limbo e some; religou uma, o gancho desce, pega e volta com a caixa".

   É melhor mesmo: ninguém precisa ler um diagrama para entender que três cordas
   seguram uma caixa e que uma delas basta.

   O que faz a cena não parecer um esquema de PowerPoint é a física de mentira
   em cima da lógica verdadeira: a caixa pende para o lado das cordas que
   sobraram, as cordas que aguentam o peso esticam (menos barriga, traço mais
   grosso), o conjunto balança devagar o tempo todo, o corte solta uma faísca e
   a queda termina numa névoa no pé do quadro — o limbo.

   Tudo abaixo está em unidades do viewBox de 240x220, renderizado em 240 px —
   uma unidade é um pixel. A cena inteira sai de aritmética sobre estas
   constantes; não se mede nada do DOM, e por isso ela anima sem reflow.
   -------------------------------------------------------------------------- */

/** Teto, manilha e o ponto de onde as cordas saem. */
const RAIL_Y = 6;
const SHACKLE_Y = 28;
const HOOK_Y = 54;

/** Caixa: face da frente mais o deslocamento da face de cima. */
const BOX_X = 70;
const BOX_Y = 124;
const BOX_W = 84;
const BOX_H = 44;
const BOX_DX = 18;
const BOX_DY = -16;
/** Centro da silhueta inteira — eixo da inclinação. */
const BOX_CX = 121;
const BOX_CY = 138;

/** x de saída de cada corda no gancho e o nó onde ela morde a caixa. */
const ROPE_FROM = [116, 120, 124];
const KNOTS: readonly [number, number][] = [
  [76, 119],
  [121, 112],
  [166, 114],
];
/** Para onde a ponta cortada chicoteia. */
const SNAP = [-13, 7, 13];

/** Quanto o gancho desce para buscar a caixa. */
const HOOK_DIVE = 80;
/** Onde a caixa espera, na névoa, e a queda que a tira de cena. */
const LIMBO_Y = 52;
const FALL_Y = 104;

const FALL_MS = 640;
const DIVE_MS = 560;
const LIFT_MS = 640;

const BRAND = "#FF7700";
const CUT = "#F87171";
const RAIL = "rgba(255,255,227,0.22)";
/** Tinta escura da marca: é ela que dá a torção da corda sem clarear o laranja. */
const TWIST = "#130800";
const EDGE = "rgba(255,255,227,0.12)";
const TAPE = "rgba(255,255,227,0.16)";

/** Corda inteira, do gancho até o nó na caixa. */
function ropePath(index: number, hook: number, knot: [number, number], sag: number) {
  const x1 = ROPE_FROM[index];
  const y1 = HOOK_Y + hook;
  const [x2, y2] = knot;
  const bow = (x2 - x1) * 0.08;
  return `M${x1},${y1} Q${(x1 + x2) / 2 + bow},${(y1 + y2) / 2 + sag} ${x2},${y2}`;
}

/** O que sobra pendurado no gancho depois do corte. */
function cutPath(index: number, hook: number) {
  const x1 = ROPE_FROM[index];
  const y1 = HOOK_Y + hook;
  return `M${x1},${y1} Q${x1 + SNAP[index] / 3},${y1 + 18} ${x1 + SNAP[index]},${y1 + 31}`;
}

/** Fiapos na ponta cortada: duas farpas saindo do fim do toco. */
function frayPath(index: number, hook: number) {
  const x = ROPE_FROM[index] + SNAP[index];
  const y = HOOK_Y + hook + 31;
  return `M${x},${y} l${-3.5},4.5 M${x},${y} l4.5,3.5`;
}

/** O pedaço de corda que fica preso na caixa; desenhado dentro do grupo dela. */
function stubPath(index: number) {
  const [x, y] = KNOTS[index];
  return `M${x},${y} Q${x - SNAP[index] / 4},${y - 11} ${x - SNAP[index] / 2},${y - 22}`;
}

/* Faces da caixa: frente, topo e lateral. Três tons do mesmo escuro — é o que
   dá volume sem precisar de sombra nem de contorno forte. */
const BOX_FRONT = `M${BOX_X},${BOX_Y} h${BOX_W} v${BOX_H} h${-BOX_W} Z`;
const BOX_TOP = `M${BOX_X},${BOX_Y} l${BOX_DX},${BOX_DY} h${BOX_W} l${-BOX_DX},${-BOX_DY} Z`;
const BOX_SIDE = `M${BOX_X + BOX_W},${BOX_Y} l${BOX_DX},${BOX_DY} v${BOX_H} l${-BOX_DX},${-BOX_DY} Z`;
/** Fita: desce a frente e vira na face de cima. */
const BOX_TAPE = `M${BOX_X + 38},${BOX_Y} v${BOX_H} M${BOX_X + 38},${BOX_Y} l${BOX_DX},${BOX_DY}`;

/** Fase da caixa. Ligar e desligar vias empurra a máquina de um estado ao outro. */
type Phase = "hanging" | "falling" | "gone" | "diving" | "lifting";

/**
 * As três vias de confirmação como um guindaste: o pagamento é o gancho, cada
 * via é uma corda e a entrega é a caixa.
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
  /** Via sob o ponteiro: acende a corda correspondente. */
  const [hot, setHot] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("hanging");

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
    const next = down.map((value, i) => (i === index ? !value : value));
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

  const hookOffset = phase === "diving" ? HOOK_DIVE : 0;
  const boxOffset =
    phase === "falling" ? FALL_Y : phase === "gone" || phase === "diving" ? LIMBO_Y : 0;
  const boxVisible = phase === "hanging" || phase === "lifting" || phase === "diving";

  /* Carga desequilibrada: a caixa pende para o lado de quem ainda a segura. O
     centro das cordas vivas manda na inclinação e no deslocamento lateral. */
  const live = [0, 1, 2].filter((index) => !down[index]);
  const load = live.length
    ? live.reduce((sum, index) => sum + KNOTS[index][0], 0) / live.length
    : BOX_CX;
  const tilt = phase === "falling" ? 12 : (BOX_CX - load) * 0.14;
  const slide = phase === "falling" ? 8 : (load - BOX_CX) * 0.1;

  /* Quanto menos corda, mais esticada: menos barriga e traço mais grosso. */
  const sag = alive >= 3 ? 9 : alive === 2 ? 6 : 3.5;
  const taut = alive === 1 ? 3.2 : 2.6;

  /** Nó na posição em que ele está depois da inclinação — onde a corda amarra. */
  const knotAt = (index: number): [number, number] => {
    const [x, y] = KNOTS[index];
    const rad = (tilt * Math.PI) / 180;
    const dx = x - BOX_CX;
    const dy = y - BOX_CY;
    return [
      BOX_CX + dx * Math.cos(rad) - dy * Math.sin(rad) + slide,
      BOX_CY + dx * Math.sin(rad) + dy * Math.cos(rad) + boxOffset,
    ];
  };

  const seconds = (ms: number) => (reduced ? 0 : ms / 1000);
  const hookMove = {
    duration: seconds(phase === "diving" ? DIVE_MS : LIFT_MS),
    ease: EASE,
  };
  const boxMove =
    phase === "falling"
      ? { duration: seconds(FALL_MS), ease: "easeIn" as const }
      : { duration: seconds(LIFT_MS), ease: EASE };
  /** A corda é elástica: o corte chicoteia, o resto acompanha o gancho. */
  const ropeMove = reduced
    ? { duration: 0 }
    : { type: "spring" as const, visualDuration: 0.5, bounce: 0.38 };

  return (
    <div>
      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-7">
        {/* O guindaste */}
        <div className="mx-auto w-[15rem] max-w-full">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold text-cream">
            <CreditCard className="h-4 w-4 shrink-0 text-brand" />
            {demo.payment}
          </p>

          <svg aria-hidden viewBox="0 0 240 220" className="w-full">
            <defs>
              <linearGradient id="wone-box-front" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#23232e" />
                <stop offset="1" stopColor="#15151c" />
              </linearGradient>
              <linearGradient id="wone-box-top" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#32323f" />
                <stop offset="1" stopColor="#24242e" />
              </linearGradient>
              <linearGradient id="wone-box-side" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#18181f" />
                <stop offset="1" stopColor="#101015" />
              </linearGradient>
              {/* Luz atrás da caixa: o laranja da marca, bem diluído */}
              <radialGradient id="wone-glow">
                <stop offset="0" stopColor={BRAND} stopOpacity="0.3" />
                <stop offset="1" stopColor={BRAND} stopOpacity="0" />
              </radialGradient>
              {/* O limbo: névoa que engole a caixa no pé do quadro */}
              <linearGradient id="wone-limbo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0a0a0d" stopOpacity="0" />
                <stop offset="0.55" stopColor="#0a0a0d" stopOpacity="0.85" />
                <stop offset="1" stopColor="#0a0a0d" stopOpacity="0.98" />
              </linearGradient>
            </defs>

            {/* Balanço lento do conjunto todo, pendurado no trilho */}
            <motion.g
              style={{ transformBox: "view-box", transformOrigin: "120px 6px" }}
              animate={reduced ? undefined : { rotate: [-1.1, 1.1, -1.1] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Trilho do teto: é o que faz o gancho estar preso em alguma coisa */}
              <line
                x1="64"
                y1={RAIL_Y}
                x2="176"
                y2={RAIL_Y}
                stroke={RAIL}
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Cabo, que estica quando o gancho desce */}
              <motion.line
                x1="120"
                y1={RAIL_Y}
                x2="120"
                y2={SHACKLE_Y}
                initial={false}
                animate={{ y2: SHACKLE_Y + hookOffset }}
                transition={hookMove}
                stroke={RAIL}
                strokeWidth="2"
              />

              {/* Gancho: pino e manilha, de onde as três cordas saem */}
              <motion.g initial={false} animate={{ y: hookOffset }} transition={hookMove}>
                <line
                  x1="109"
                  y1={SHACKLE_Y}
                  x2="131"
                  y2={SHACKLE_Y}
                  stroke={BRAND}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d={`M111,${SHACKLE_Y} V${HOOK_Y - 13} A9,9 0 0 0 129,${HOOK_Y - 13} V${SHACKLE_Y}`}
                  fill="none"
                  stroke={BRAND}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </motion.g>

              {/* Luz atrás da caixa, só enquanto ela está entregue */}
              <motion.circle
                cx={BOX_CX}
                cy={BOX_CY}
                r="62"
                fill="url(#wone-glow)"
                initial={false}
                animate={{ opacity: delivered && boxVisible ? 1 : 0, cy: BOX_CY + boxOffset }}
                transition={{ opacity: { duration: seconds(420) }, cy: boxMove }}
              />

              {/* As três cordas.

                  Cada uma é dois traços no mesmo caminho: o laranja cheio e, por
                  cima, um tracejado na tinta escura da marca — é o que faz ler
                  como corda torcida em vez de risco. Cortada, a corda vira o
                  toco que fica no gancho: o mesmo caminho, mais curto, então a
                  transição entre os dois é o próprio chicote. */}
              {demo.paths.map((path, index) => {
                const isDown = down[index];
                const lit = hot === index && !isDown;
                const d = isDown
                  ? cutPath(index, hookOffset)
                  : ropePath(index, hookOffset, knotAt(index), sag);

                return (
                  <g key={path.name}>
                    <motion.path
                      initial={false}
                      animate={{
                        d,
                        stroke: isDown ? CUT : BRAND,
                        opacity: isDown ? 0.75 : lit ? 1 : 0.92,
                        strokeWidth: lit ? taut + 0.8 : taut,
                      }}
                      transition={{ d: ropeMove, default: { duration: seconds(260) } }}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <motion.path
                      initial={false}
                      animate={{
                        d,
                        opacity: isDown ? 0.4 : 0.55,
                        strokeWidth: lit ? taut + 0.8 : taut,
                      }}
                      transition={{ d: ropeMove, default: { duration: seconds(260) } }}
                      fill="none"
                      stroke={TWIST}
                      strokeDasharray="1.6 5.5"
                      strokeLinecap="round"
                    />

                    {/* Fiapos da ponta cortada */}
                    <motion.path
                      initial={false}
                      animate={{
                        d: frayPath(index, hookOffset),
                        opacity: isDown ? 0.8 : 0,
                      }}
                      transition={{ d: ropeMove, default: { duration: seconds(200) } }}
                      fill="none"
                      stroke={CUT}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    {/* Faísca do corte, uma vez só, onde a corda arrebentou */}
                    <AnimatePresence>
                      {isDown && (
                        <motion.circle
                          cx={ROPE_FROM[index] + SNAP[index] / 2}
                          cy={HOOK_Y + hookOffset + 22}
                          fill="none"
                          stroke={CUT}
                          strokeWidth="1.6"
                          initial={{ r: 1, opacity: 0.9 }}
                          animate={{ r: 12, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: seconds(460), ease: "easeOut" }}
                        />
                      )}
                    </AnimatePresence>
                  </g>
                );
              })}

              {/* A caixa, com os nós e as pontas de corda que sobraram nela */}
              <motion.g
                style={{
                  transformBox: "view-box",
                  transformOrigin: `${BOX_CX}px ${BOX_CY}px`,
                }}
                initial={false}
                animate={{
                  x: slide,
                  y: boxOffset,
                  rotate: tilt,
                  opacity: boxVisible ? 1 : 0,
                }}
                transition={{
                  x: boxMove,
                  y: boxMove,
                  rotate: phase === "falling" ? boxMove : { duration: seconds(520), ease: EASE },
                  opacity: {
                    duration: seconds(phase === "diving" ? 280 : 420),
                    delay: phase === "diving" ? seconds(DIVE_MS - 280) : 0,
                  },
                }}
              >
                {/* Pontas penduradas na caixa, só nas vias cortadas */}
                {down.map((isDown, index) =>
                  isDown ? (
                    <motion.path
                      key={index}
                      d={stubPath(index)}
                      fill="none"
                      stroke={CUT}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.75 }}
                      transition={{ duration: seconds(300), ease: EASE }}
                    />
                  ) : null,
                )}

                <path d={BOX_SIDE} fill="url(#wone-box-side)" stroke={EDGE} strokeWidth="1" />
                <path d={BOX_TOP} fill="url(#wone-box-top)" stroke={EDGE} strokeWidth="1" />
                <path d={BOX_FRONT} fill="url(#wone-box-front)" stroke={EDGE} strokeWidth="1" />
                <path d={BOX_TAPE} fill="none" stroke={TAPE} strokeWidth="2.5" />

                {/* Etiqueta de remessa na frente da caixa */}
                <rect
                  x={BOX_X + 46}
                  y={BOX_Y + 12}
                  width="26"
                  height="19"
                  rx="2.5"
                  fill="rgba(255,255,227,0.08)"
                />
                <path
                  d={`M${BOX_X + 50},${BOX_Y + 18} h18 M${BOX_X + 50},${BOX_Y + 22} h18 M${BOX_X + 50},${BOX_Y + 26} h11`}
                  stroke="rgba(255,255,227,0.3)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />

                {/* Nós: o ponto em que cada corda morde a caixa */}
                {KNOTS.map(([x, y], index) => (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="2.8"
                    fill={down[index] ? CUT : BRAND}
                    opacity={down[index] ? 0.75 : 0.95}
                  />
                ))}

                <motion.text
                  x={BOX_CX}
                  y={BOX_Y + BOX_H + 20}
                  textAnchor="middle"
                  className="fill-emerald-400 text-[11px] font-semibold"
                  initial={false}
                  animate={{
                    opacity: phase === "hanging" || phase === "lifting" ? 1 : 0,
                  }}
                  transition={{ duration: seconds(240) }}
                >
                  {demo.delivered}
                </motion.text>
              </motion.g>

              {/* Pulso do engate: o gancho fisgou a caixa e vai subir */}
              <AnimatePresence>
                {phase === "lifting" && (
                  <motion.circle
                    cx={BOX_CX}
                    cy={BOX_Y + LIMBO_Y}
                    fill="none"
                    stroke={BRAND}
                    strokeWidth="2"
                    initial={{ r: 4, opacity: 0.8 }}
                    animate={{ r: 34, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: seconds(620), ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </motion.g>

            {/* O limbo fica fora do balanço: é o fundo, não faz parte da carga */}
            <rect x="0" y="168" width="240" height="52" fill="url(#wone-limbo)" />
          </svg>
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

      {/* O desenho conta o estado para quem vê; esta linha, para quem ouve */}
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
