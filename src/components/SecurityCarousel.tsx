"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  KeyRound,
  CopySlash,
  Network,
  Vault,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";

const ICONS: Record<string, LucideIcon> = { KeyRound, CopySlash, Network, Vault };
const EASE = [0.16, 1, 0.3, 1] as const;

/** Intervalo do avanço automático. O mesmo valor alimenta a barra de progresso. */
const AUTOPLAY_MS = 5000;

/**
 * Segurança: os quatro itens como lista de cards clicáveis à esquerda e o
 * detalhe do item escolhido à direita.
 *
 * A faixa com scroll-snap saiu. O designer pediu os quatro cards visíveis ao
 * mesmo tempo, sem rolagem, e o clique trocando o card do lado — e ele está
 * certo: com quatro itens, rolar para ver o que já caberia na tela é trabalho
 * sem recompensa.
 *
 * O avanço automático ficou, porque atende o outro pedido da equipe (a seção
 * "andar sozinha") sem reintroduzir rolagem: o que avança é a seleção, não a
 * posição. Pausa com o ponteiro em cima, com foco de teclado dentro da seção e
 * com a aba em segundo plano; pausar guarda quanto falta do intervalo e retomar
 * continua de onde parou, igual à barra de progresso do card ativo. Com
 * `prefers-reduced-motion` não liga.
 */
export function SecurityCarousel() {
  const { security } = useContent();
  const reduced = useReducedMotion();
  const items = security.items;
  const count = items.length;

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const paused = hovering || focused || tabHidden;
  const playing = !reduced && !paused;

  /* Quanto falta do intervalo atual. */
  const remaining = useRef(AUTOPLAY_MS);
  const startedAt = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const select = useCallback((index: number) => {
    remaining.current = AUTOPLAY_MS;
    activeRef.current = index;
    setActive(index);
  }, []);

  /* O efeito depende de `active`, então clicar num card reinicia o intervalo. */
  useEffect(() => {
    if (!playing) {
      if (startedAt.current) {
        remaining.current = Math.max(
          0,
          remaining.current - (Date.now() - startedAt.current),
        );
        startedAt.current = 0;
      }
      return;
    }

    startedAt.current = Date.now();
    const id = window.setTimeout(() => {
      startedAt.current = 0;
      select((activeRef.current + 1) % count);
    }, remaining.current);

    return () => window.clearTimeout(id);
  }, [playing, active, count, select]);

  /** Aba em segundo plano pausa — e não gasta o intervalo escondido. */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const item = items[active];
  const ActiveIcon = ICONS[item.icon] ?? ShieldCheck;

  return (
    <div
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      /* Só despausa quando o foco sai da seção: andar de um card ao seguinte com
         Tab dispara blur e depois focus, e o intervalo reiniciaria no caminho. */
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      {/* Os quatro, sempre visíveis. Lista de opções que controla o painel ao
          lado: `tablist` é o papel correto, e as setas do teclado andam nela. */}
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={security.title}
        className="flex flex-col gap-2.5"
      >
        {items.map((entry, index) => {
          const Icon = ICONS[entry.icon] ?? ShieldCheck;
          const isActive = index === active;

          return (
            <button
              key={entry.title}
              type="button"
              role="tab"
              id={`security-tab-${index}`}
              aria-selected={isActive}
              aria-controls="security-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                const last = count - 1;
                let next: number | null = null;
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                  next = index === last ? 0 : index + 1;
                }
                if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                  next = index === 0 ? last : index - 1;
                }
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = last;
                if (next === null) return;
                event.preventDefault();
                select(next);
              }}
              className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-2xl p-4 text-left transition-colors duration-300 sm:p-5 ${
                isActive ? "surface-lit" : "surface hover:bg-ink-800"
              }`}
            >
              {/* Barra da seleção à esquerda. No card ativo ela é o progresso do
                  avanço automático: cresce de cima para baixo ao longo do
                  intervalo e congela quando a seção pausa. */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px] overflow-hidden"
              >
                {isActive && (
                  <span
                    className="block h-full w-full origin-top bg-brand"
                    style={
                      reduced || !playing
                        ? undefined
                        : {
                            animation: `security-progress ${AUTOPLAY_MS}ms linear forwards`,
                            animationPlayState: paused ? "paused" : "running",
                          }
                    }
                  />
                )}
              </span>

              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center transition-colors duration-300 ${
                  isActive ? "text-brand" : "text-faint group-hover:text-brand"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span
                  className={`font-display block text-[15px] leading-snug font-semibold transition-colors duration-300 ${
                    isActive ? "text-cream" : "text-cream/80"
                  }`}
                >
                  {entry.title}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted">
                  {entry.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Painel do item escolhido.

          `aria-live` fica em "off" enquanto a seleção anda sozinha: anunciar
          cada troca automática encheria o leitor de tela de interrupções que o
          usuário não pediu. Pausado, a troca partiu de um clique ou do teclado,
          e aí o anúncio é esperado. */}
      <div
        role="tabpanel"
        id="security-panel"
        aria-labelledby={`security-tab-${active}`}
        aria-live={paused ? "polite" : "off"}
        aria-atomic="true"
        className="surface relative overflow-hidden rounded-3xl p-7 sm:p-9 lg:sticky lg:top-28"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
          >
            <div className="relative mb-6 flex h-24 items-center justify-center">
              {[104, 78, 56].map((size, index) => (
                <span
                  key={size}
                  aria-hidden
                  className="absolute rounded-full border border-brand"
                  style={{ height: size, width: size, opacity: 0.2 - index * 0.04 }}
                />
              ))}
              <span className="relative flex h-14 w-14 items-center justify-center text-brand">
                <ActiveIcon className="h-7 w-7" />
              </span>
            </div>

            <h3 className="font-display text-center text-lg font-semibold text-cream">
              {item.title}
            </h3>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              {item.detail}
            </p>

            {/* Posição na lista, para quem chegou pelo teclado saber onde está */}
            <p className="t-eyebrow mt-6 text-center text-faint">
              {active + 1}/{count}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
