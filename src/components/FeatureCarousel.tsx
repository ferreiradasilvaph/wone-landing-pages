"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useInView } from "motion/react";
import { useContent } from "@/i18n";
import { SegmentProgress } from "./SegmentProgress";
import { PauseButton } from "./PauseButton";

/** Intervalo da rotação automática. */
const AUTOPLAY_MS = 4500;
/** Arrasto mínimo, em px, para contar como passar de card. */
const SWIPE_PX = 36;
/** Peteleco: gesto curto, mas rápido, também passa de card. */
const FLICK_PX = 16;
const FLICK_MS = 320;
/** A partir de quantos px o gesto deixa de ser toque e vira arraste. */
const DRAG_START_PX = 6;
/** Quanto o dedo arrasta o palco antes de soltar. Menos que 1 é resistência. */
const DRAG_FOLLOW = 0.6;

/**
 * Degraus de profundidade por distância do centro.
 *
 * O card do meio em tamanho cheio, os vizinhos menores e translúcidos, e do
 * terceiro em diante invisível — é o "cinco cards, um maior no meio, dois na
 * lateral e dois um pouco menores, com visão opaca" que o designer pediu.
 *
 * Tudo em CSS: nenhuma consulta de largura de tela decide quantos aparecem. Em
 * telas estreitas os vizinhos saem do palco por conta do `overflow-hidden` e do
 * `clamp()` do espaçamento, então a mesma implementação serve do celular ao
 * desktop sem risco de divergência na hidratação.
 */
const DEPTH = [
  { scale: 1, opacity: 1, z: 30, push: 0, turn: 0 },
  { scale: 0.9, opacity: 0.62, z: 20, push: -120, turn: 17 },
  { scale: 0.8, opacity: 0.26, z: 10, push: -220, turn: 24 },
] as const;

/**
 * Recursos em carrossel de cards verticais, no lugar da grade de dez.
 *
 * A grade ocupava quatro linhas de altura — uns 50 rem só de cards, que o
 * designer resumiu como "o excesso de cards ocupa muito espaço", e que no tablet
 * virava uma coluna dupla interminável. Aqui a seção inteira caber numa altura
 * de card: proporção 4:5, a de um post de Instagram (1080×1350).
 *
 * O card é só tipografia: o ícone com halo, o holofote radial atrás do centro,
 * o fio laranja no topo e o índice "01" em mono saíram todos — eram quatro
 * marcas dizendo "este é o ativo", e o tom do card (ink-750 no meio, ink-800 nos
 * vizinhos) já diz. O mini-mockup com dado do dicionário entra no topo do card
 * em E4, no lugar que o ícone ocupava.
 *
 * O laço é infinito: a distância até o centro é calculada pelo caminho mais
 * curto no círculo, então do último card se chega ao primeiro sem volta brusca.
 *
 * Avança sozinho a cada 4,5 s SÓ com a seção à vista, e para quando o ponteiro
 * entra, quando o foco de teclado cai dentro, quando a aba vai para segundo
 * plano ou quando alguém usa o "pausar". Clicar num card lateral o traz para o
 * centro; as setas do teclado e o arraste com o dedo também andam.
 */
export function FeatureCarousel() {
  const { features, ui } = useContent();
  const items = features.items;
  const count = items.length;

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [stopped, setStopped] = useState(false);

  const [touching, setTouching] = useState(false);

  /* Relógio só à vista: fora da tela o carrossel andaria para ninguém, e o
     portão de performance conta um relógio por viewport. */
  const stageRef = useRef<HTMLDivElement>(null);
  const onScreen = useInView(stageRef, { amount: 0.4 });

  /* O dedo não tem "hover": no celular o rodízio seguia andando por baixo do
     gesto, e o toque parecia ignorado. Enquanto a mão está no palco, o palco é
     da mão. */
  const paused = hovering || focused || tabHidden || touching || stopped || !onScreen;
  const playing = !reduced && !paused;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /* `useReducedMotion` do motion não serve aqui: este componente é renderizado
     no servidor, e o hook devolve `false` no primeiro render de qualquer forma.
     O listener resolve igual e sem trazer a biblioteca para esta seção. */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const go = useCallback(
    (delta: number) => {
      setActive((current) => (current + delta + count) % count);
    },
    [count],
  );

  /* Depende de `active`, então qualquer interação reinicia o intervalo. */
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => go(1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, active, go]);

  /* Arraste: só o eixo horizontal.

     O palco acompanha o dedo enquanto ele anda, com resistência, e ao soltar
     anda um card no sentido do gesto — arrastou para a esquerda, entra o
     próximo; para a direita, volta o anterior. Vale pelo limiar de distância ou
     por peteleco (gesto curto e rápido), que é como se passa card no celular.

     Durante o arraste a transição sai do caminho, senão cada quadro disputaria
     com a animação de 600 ms. */
  const dragFrom = useRef<number | null>(null);
  const dragAt = useRef(0);
  const captured = useRef(false);
  const [drag, setDrag] = useState(0);

  const onPointerDown = (event: React.PointerEvent) => {
    dragFrom.current = event.clientX;
    dragAt.current = event.timeStamp;
    captured.current = false;
    setTouching(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;

    /* A captura só entra depois que o gesto vira arraste. Capturar no toque
       entregaria o `click` ao palco, e clicar num card lateral para trazê-lo ao
       centro deixaria de funcionar; capturar depois é o que mantém o dedo
       rastreado mesmo saindo do palco no meio do caminho. */
    if (!captured.current && Math.abs(dx) > DRAG_START_PX) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Ponteiro já solto, ou id que o navegador não reconhece: segue sem
           captura, que é o comportamento de antes. */
      }
      captured.current = true;
    }

    setDrag(dx * DRAG_FOLLOW);
  };

  const endDrag = (event: React.PointerEvent) => {
    const from = dragFrom.current;
    const since = event.timeStamp - dragAt.current;
    dragFrom.current = null;
    captured.current = false;
    setDrag(0);
    setTouching(false);
    if (from === null) return;

    const dx = event.clientX - from;
    const passou = Math.abs(dx) >= SWIPE_PX;
    const peteleco = Math.abs(dx) >= FLICK_PX && since <= FLICK_MS;
    if (!passou && !peteleco) return;

    go(dx < 0 ? 1 : -1);
  };

  /** Distância até o centro pelo caminho mais curto do círculo. */
  const offsetOf = (index: number) => {
    let delta = index - active;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    return delta;
  };

  const seta =
    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-ink-800 text-muted transition-colors hover:text-cream";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={features.title}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      {/* Palco. `touch-pan-y` deixa a página rolar na vertical enquanto o
          arraste horizontal fica para o carrossel. */}
      <div
        ref={stageRef}
        className="feature-stage relative touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {items.map((item, index) => {
          const offset = offsetOf(index);
          const distance = Math.abs(offset);
          const depth = DEPTH[Math.min(distance, DEPTH.length - 1)];
          const far = distance >= DEPTH.length;
          const isCenter = distance === 0;

          return (
            <div
              key={item.title}
              role="group"
              aria-roledescription="slide"
              aria-label={item.title}
              aria-hidden={far}
              className={`feature-slot absolute top-0 left-1/2 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                drag ? "" : "transition-[transform,opacity] duration-[600ms]"
              }`}
              style={{
                /* Ordem importa: desloca, afasta no eixo Z, gira no próprio eixo
                   e só então escala. Invertendo, o giro arrastaria o card para
                   fora do lugar. */
                transform: [
                  `translateX(calc(-50% + ${offset} * var(--card-gap) + ${drag}px))`,
                  `translateZ(${depth.push}px)`,
                  `rotateY(${offset < 0 ? depth.turn : -depth.turn}deg)`,
                  `scale(${far ? DEPTH[DEPTH.length - 1].scale : depth.scale})`,
                ].join(" "),
                opacity: far ? 0 : depth.opacity,
                zIndex: far ? 0 : depth.z,
                pointerEvents: far ? "none" : undefined,
              }}
            >
              <button
                type="button"
                tabIndex={isCenter ? 0 : -1}
                aria-current={isCenter}
                onClick={() => !isCenter && setActive(index)}
                className={`flex h-full w-full flex-col justify-end rounded-card p-6 text-left transition-colors duration-[350ms] sm:p-7 ${
                  isCenter ? "cursor-default bg-ink-750" : "cursor-pointer bg-ink-800"
                }`}
              >
                <span className="t-h3 block text-cream">{item.title}</span>
                <span className="mt-2.5 block text-[15px] leading-[1.45] text-muted">
                  {item.description}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Progresso e controles. Os dez pontos de 6px viraram dez segmentos: além
          de dizer onde estamos, o ativo mostra quanto falta do intervalo. */}
      <SegmentProgress
        className="mt-8"
        count={count}
        active={active}
        durationMs={AUTOPLAY_MS}
        paused={paused}
        labelLeft={items[active].title}
        labelRight={`${active + 1} ${ui.of} ${count}`}
      />

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={features.prev}
            className={seta}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={features.next}
            className={seta}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <PauseButton
          pressed={stopped}
          onToggle={() => setStopped((value) => !value)}
          labels={{ pause: ui.pause, play: ui.play }}
        />
      </div>

      {/* Para leitor de tela, a posição em texto */}
      <p className="sr-only" aria-live={paused ? "polite" : "off"}>
        {active + 1}/{count} — {items[active].title}
      </p>
    </div>
  );
}
