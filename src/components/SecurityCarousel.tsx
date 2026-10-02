"use client";

import { useEffect, useRef, useState } from "react";
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
const AUTOPLAY_MS = 4200;

/**
 * Carrossel infinito dos itens de segurança.
 *
 * A lista é renderizada duas vezes e o deslocamento volta a zero ao completar
 * a primeira cópia, sem transição — a emenda cai num ponto em que as duas
 * sequências são idênticas, então o laço é imperceptível. À direita, um painel
 * detalha o card ativo.
 */
export function SecurityCarousel() {
  const { security } = useContent();
  const reduced = useReducedMotion();
  const count = security.items.length;

  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  // O card é `min(20rem, 72vw)`: abaixo de ~444px de viewport ele encolhe. Um
  // passo fixo em rem descolaria do card nesse ponto e o deslocamento erraria
  // de alvo, acumulando a cada volta. Medir o card resolve em qualquer largura.
  const listRef = useRef<HTMLUListElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    const card = list?.firstElementChild;
    if (!list || !card) return;

    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
      setStep(card.getBoundingClientRect().width + gap);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => setPosition((p) => p + 1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused]);

  const active = position % count;
  const item = security.items[active];
  const ActiveIcon = ICONS[item.icon] ?? ShieldCheck;

  // Duas cópias da lista: a segunda cobre o vão enquanto a primeira sai.
  const loop = [...security.items, ...security.items];

  return (
    <div
      className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setHovered(null);
      }}
    >
      <div className="min-w-0">
        {/* Máscara só à direita: o card ativo fica na borda esquerda, e um
            desvanecer dos dois lados apagaria justamente ele. */}
        <div
          className="-mx-1 overflow-hidden px-1 py-6 [perspective:1200px]"
          style={{
            maskImage:
              "linear-gradient(to right, #000 0%, #000 78%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 0%, #000 78%, transparent 100%)",
          }}
        >
          <motion.ul
            ref={listRef}
            className="flex gap-4"
            animate={{ x: -(position % count) * step }}
            transition={
              // Ao voltar para o início do laço, salta sem animar.
              position % count === 0
                ? { duration: 0 }
                : { duration: reduced ? 0 : 0.8, ease: EASE }
            }
          >
            {loop.map((entry, index) => {
              const Icon = ICONS[entry.icon] ?? ShieldCheck;
              const slot = index % count;
              const isActive = slot === active;
              const isHovered = hovered === index;

              return (
                <li
                  key={`${entry.title}-${index}`}
                  className="w-[min(20rem,72vw)] shrink-0 [transform-style:preserve-3d]"
                >
                  <motion.button
                    type="button"
                    onClick={() => setPosition(slot)}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                    aria-current={isActive}
                    animate={{
                      scale: isHovered ? 1.06 : 1,
                      rotateY: isHovered ? -8 : 0,
                      rotateX: isHovered ? 4 : 0,
                      z: isHovered ? 60 : 0,
                    }}
                    transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
                    className={`surface relative h-full w-full cursor-pointer overflow-hidden rounded-2xl p-6 text-left transition-[opacity,border-color,box-shadow] duration-500 ${
                      isActive || isHovered
                        ? "border-brand/50 opacity-100 shadow-[0_24px_60px_-20px_rgba(255,119,0,0.55)]"
                        : "opacity-45 hover:opacity-80"
                    }`}
                  >
                    {/* Camadas que só existem no card em foco */}
                    {(isActive || isHovered) && (
                      <>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -top-20 -right-12 h-44 w-44 rounded-full bg-brand/25 blur-3xl"
                        />
                        <span
                          aria-hidden
                          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent"
                        />
                        <motion.span
                          aria-hidden
                          initial={{ x: "-130%" }}
                          animate={{ x: "130%" }}
                          transition={{
                            duration: reduced ? 0 : 1.5,
                            ease: EASE,
                            repeat: reduced ? 0 : Infinity,
                            repeatDelay: 2.2,
                          }}
                          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-cream/8 to-transparent"
                        />
                      </>
                    )}

                    <span className="relative block">
                      <span
                        className={`relative flex h-12 w-12 items-center justify-center rounded-xl border transition-colors duration-500 ${
                          isActive || isHovered
                            ? "border-brand/50 bg-brand/15 text-brand shadow-[0_0_28px_-4px_rgba(255,119,0,0.8)]"
                            : "border-line bg-ink-900 text-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {(isActive || isHovered) && (
                          <span
                            aria-hidden
                            className="animate-pulse-ring absolute inset-0 rounded-xl border border-brand"
                          />
                        )}
                      </span>

                      <h3 className="font-display mt-5 text-lg font-semibold text-cream">
                        {entry.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {entry.description}
                      </p>
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </motion.ul>
        </div>

        <div className="mt-4 flex gap-1.5">
          {security.items.map((entry, index) => (
            <button
              key={entry.title}
              type="button"
              onClick={() => setPosition(index)}
              aria-label={entry.title}
              className="h-1.5 cursor-pointer rounded-full transition-all duration-300"
              style={{
                width: index === active ? "2rem" : "0.75rem",
                background: index === active ? "#FF7700" : "rgba(255,255,227,0.18)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Painel do item ativo */}
      <div className="surface relative min-h-[18rem] overflow-hidden rounded-3xl p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-brand/15 blur-[80px]"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -16 }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
            className="relative"
          >
            <div className="relative mb-6 flex h-28 items-center justify-center">
              {[112, 84, 60].map((size, index) => (
                <span
                  key={size}
                  className="absolute rounded-full border border-brand"
                  style={{ height: size, width: size, opacity: 0.2 - index * 0.04 }}
                />
              ))}
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand shadow-[0_0_32px_rgba(255,119,0,0.35)]">
                <ActiveIcon className="h-7 w-7" />
              </span>
            </div>

            <h4 className="font-display text-center text-base font-semibold text-cream">
              {item.title}
            </h4>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              {item.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
