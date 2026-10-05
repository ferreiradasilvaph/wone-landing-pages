"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useContent } from "@/i18n";
import { FlagMark } from "./FlagMark";

const EASE = [0.16, 1, 0.3, 1] as const;
const CYCLE_MS = 2600;

/** Cor dominante de cada bandeira, para tingir a aura do país em destaque. */
const AURA: Record<string, string> = {
  BRL: "#009B3A",
  ARS: "#74ACDF",
  MXN: "#CE1126",
  COP: "#FCD116",
};

/**
 * Os quatro países do checkout internacional.
 *
 * Um de cada vez acende em rodízio: a bandeira cresce e ganha um brilho que a
 * atravessa, a aura assume a cor dominante do país e a moeda aparece em
 * destaque. É o que transforma uma lista de bandeiras na demonstração de
 * alcance que a seção precisa vender.
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
    <ul className="mt-6 grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2">
      {countries.map((country, index) => {
        const isActive = index === active;
        const aura = AURA[country.code] ?? "#FF7700";

        return (
          <motion.li
            key={country.code}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            animate={{ scale: isActive ? 1.04 : 1, y: isActive ? -3 : 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
            className={`relative overflow-hidden rounded-xl px-3.5 py-3 transition-colors duration-500 ${
              isActive ? "bg-ink-800" : "bg-ink-900/60"
            }`}
          >
            {/* Aura na cor da bandeira do país em destaque */}
            <motion.span
              aria-hidden
              animate={{ opacity: isActive ? 0.3 : 0 }}
              transition={{ duration: reduced ? 0 : 0.6 }}
              className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full blur-2xl"
              style={{ background: aura }}
            />

            <div className="relative flex items-center gap-3">
              <motion.span
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
                className="flex"
              >
                <FlagMark code={country.code} active={isActive} className="h-6 w-9" />
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
                className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors duration-500 ${
                  isActive ? "bg-brand/15 text-brand" : "text-faint"
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
