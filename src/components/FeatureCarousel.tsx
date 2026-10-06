"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Boxes,
  Calendar,
  Megaphone,
  RefreshCw,
  ShoppingBag,
  Sliders,
  TestTube,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";

const ICONS: Record<string, LucideIcon> = {
  ShoppingBag,
  TrendingUp,
  Boxes,
  Calendar,
  RefreshCw,
  Sliders,
  TestTube,
  Megaphone,
  Zap,
  Bot,
};

/** Intervalo da rotação automática. */
const AUTOPLAY_MS = 4500;
/** Arrasto mínimo, em px, para contar como passar de card. */
const SWIPE_PX = 44;

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
  { scale: 1, opacity: 1, z: 30 },
  { scale: 0.88, opacity: 0.55, z: 20 },
  { scale: 0.76, opacity: 0.22, z: 10 },
] as const;

/**
 * Recursos em carrossel de cards verticais, no lugar da grade de dez.
 *
 * A grade ocupava quatro linhas de altura — uns 50 rem só de cards, que o
 * designer resumiu como "o excesso de cards ocupa muito espaço", e que no tablet
 * virava uma coluna dupla interminável. Aqui a seção inteira caber numa altura
 * de card: proporção 4:5, a de um post de Instagram (1080×1350).
 *
 * O laço é infinito: a distância até o centro é calculada pelo caminho mais
 * curto no círculo, então do último card se chega ao primeiro sem volta brusca.
 *
 * Avança sozinho e para quando o ponteiro entra, quando o foco de teclado cai
 * dentro ou quando a aba vai para segundo plano. Clicar num card lateral o traz
 * para o centro; as setas do teclado e o arraste com o dedo também andam.
 */
export function FeatureCarousel() {
  const { features } = useContent();
  const items = features.items;
  const count = items.length;

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  const paused = hovering || focused || tabHidden;
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

  /** Arraste: só o eixo horizontal, e só se passar do limiar. */
  const dragFrom = useRef<number | null>(null);

  const onPointerDown = (event: React.PointerEvent) => {
    dragFrom.current = event.clientX;
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null) return;
    const dx = event.clientX - from;
    if (Math.abs(dx) < SWIPE_PX) return;
    go(dx < 0 ? 1 : -1);
  };

  /** Distância até o centro pelo caminho mais curto do círculo. */
  const offsetOf = (index: number) => {
    let delta = index - active;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    return delta;
  };

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
        className="feature-stage relative touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragFrom.current = null)}
      >
        {items.map((item, index) => {
          const offset = offsetOf(index);
          const distance = Math.abs(offset);
          const depth = DEPTH[Math.min(distance, DEPTH.length - 1)];
          const far = distance >= DEPTH.length;
          const isCenter = distance === 0;
          const Icon = ICONS[item.icon] ?? Zap;

          return (
            <div
              key={item.title}
              role="group"
              aria-roledescription="slide"
              aria-label={item.title}
              aria-hidden={far}
              className="feature-slot absolute top-0 left-1/2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(calc(-50% + ${offset} * var(--card-gap))) scale(${
                  far ? DEPTH[DEPTH.length - 1].scale : depth.scale
                })`,
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
                className={`flex h-full w-full flex-col justify-between rounded-3xl p-6 text-left sm:p-7 ${
                  isCenter ? "surface-lit cursor-default" : "surface cursor-pointer"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center transition-colors duration-500 ${
                    isCenter ? "text-brand" : "text-faint"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>

                <span>
                  <span className="font-display block text-lg leading-tight font-semibold text-cream sm:text-xl">
                    {item.title}
                  </span>
                  <span className="mt-2.5 block text-sm leading-relaxed text-muted">
                    {item.description}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Controles: setas e a posição no laço */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={features.prev}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink-800 text-muted transition-colors hover:bg-ink-750 hover:text-cream"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className="flex items-center gap-1.5" aria-hidden>
          {items.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === active ? "w-5 bg-brand" : "w-1.5 bg-cream/20"
              }`}
            />
          ))}
        </span>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label={features.next}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-ink-800 text-muted transition-colors hover:bg-ink-750 hover:text-cream"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Para leitor de tela, a posição em texto */}
      <p className="sr-only" aria-live={paused ? "polite" : "off"}>
        {active + 1}/{count} — {items[active].title}
      </p>
    </div>
  );
}
