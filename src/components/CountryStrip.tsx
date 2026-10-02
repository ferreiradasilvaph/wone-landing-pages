"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useContent } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
const CYCLE_MS = 2400;

/**
 * Os quatro países do checkout internacional.
 *
 * Um de cada vez acende em rodízio — a bandeira cresce, a moeda aparece e a
 * borda ganha a cor da marca. É o que transforma uma lista de bandeiras em
 * demonstração de alcance, que é o ponto comercial que a seção precisa vender.
 */
export function CountryStrip() {
  const { payments } = useContent();
  const reduced = useReducedMotion();
  const countries = payments.card.countries;

  // `reduced` fica fora do que é renderizado: ele vale `null` no servidor e
  // `true` no cliente, e usá-lo num `animate` sem `initial` faria o estilo do
  // HTML divergir — o mesmo erro de hidratação que já apareceu nesta base.
  const [lit, setLit] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(
      () => setLit((value) => (value + 1) % countries.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(id);
  }, [reduced, countries.length]);

  const active = hovered ?? lit;

  return (
    <ul className="mt-6 grid grid-cols-2 gap-3">
      {countries.map((country, index) => {
        const isActive = index === active;

        return (
          <motion.li
            key={country.code}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            animate={{
              scale: isActive ? 1.03 : 1,
              y: isActive ? -2 : 0,
            }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
            className={`relative overflow-hidden rounded-xl border px-3.5 py-3 transition-colors duration-500 ${
              isActive
                ? "border-brand/45 bg-brand/8"
                : "border-line bg-ink-950/50"
            }`}
          >
            {/* Brilho que varre o cartão quando ele acende */}
            {isActive && (
              <motion.span
                aria-hidden
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ duration: reduced ? 0 : 1.1, ease: EASE }}
                className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-brand/15 to-transparent"
              />
            )}

            <div className="relative flex items-center gap-3">
              <motion.span
                aria-hidden
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
                className="text-xl leading-none"
              >
                {country.flag}
              </motion.span>

              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-xs font-semibold text-cream">
                  {country.name}
                </span>
                <span className="block truncate text-[11px] text-faint">
                  {country.method}
                </span>
              </span>

              {/* Moeda local: o argumento da seção em duas letras */}
              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors duration-500 ${
                  isActive
                    ? "border-brand/40 bg-brand/15 text-brand"
                    : "border-line text-faint"
                }`}
              >
                {country.symbol} {country.code}
              </span>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
