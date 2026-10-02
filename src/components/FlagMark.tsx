"use client";

import { useId } from "react";

/**
 * Bandeiras desenhadas em SVG, por país.
 *
 * Substituem os emoji 🇧🇷🇦🇷🇲🇽🇨🇴, que o Windows não renderiza — lá eles saem
 * como as duas letras do código regional. Em SVG o desenho é o mesmo em
 * qualquer sistema, escala sem perder nitidez e aceita o brilho que varre a
 * superfície quando o país está em destaque.
 *
 * São versões simplificadas: as faixas e os símbolos centrais que identificam
 * cada bandeira, sem os detalhes heráldicos que sumiriam neste tamanho.
 */

function Brasil() {
  return (
    <>
      <rect width="60" height="42" fill="#009B3A" />
      <path d="M30 4 L56 21 L30 38 L4 21 Z" fill="#FEDF00" />
      <circle cx="30" cy="21" r="9.5" fill="#002776" />
      <path
        d="M20.5 18.5 Q30 15.5 39.5 20.5"
        stroke="#fff"
        strokeWidth="2.4"
        fill="none"
      />
    </>
  );
}

function Argentina() {
  return (
    <>
      <rect width="60" height="42" fill="#74ACDF" />
      <rect y="14" width="60" height="14" fill="#fff" />
      <circle cx="30" cy="21" r="4.6" fill="#F6B40E" />
      <circle cx="30" cy="21" r="3.1" fill="#FCD116" />
    </>
  );
}

function Mexico() {
  return (
    <>
      <rect width="20" height="42" fill="#006847" />
      <rect x="20" width="20" height="42" fill="#fff" />
      <rect x="40" width="20" height="42" fill="#CE1126" />
      <circle cx="30" cy="21" r="5.2" fill="none" stroke="#9D6C3B" strokeWidth="1.6" />
      <circle cx="30" cy="21" r="2.1" fill="#9D6C3B" />
    </>
  );
}

function Colombia() {
  return (
    <>
      <rect width="60" height="21" fill="#FCD116" />
      <rect y="21" width="60" height="10.5" fill="#003893" />
      <rect y="31.5" width="60" height="10.5" fill="#CE1126" />
    </>
  );
}

const FLAGS: Record<string, () => React.ReactElement> = {
  BRL: Brasil,
  ARS: Argentina,
  MXN: Mexico,
  COP: Colombia,
};

export function FlagMark({
  code,
  className = "h-6 w-9",
  active = false,
}: {
  /** Código da moeda: BRL, ARS, MXN ou COP. */
  code: string;
  className?: string;
  /** Em destaque, a bandeira ganha o brilho que varre a superfície. */
  active?: boolean;
}) {
  const clipId = useId();
  const Flag = FLAGS[code];
  if (!Flag) return null;

  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden rounded-[3px] ring-1 ring-cream/15 ${className}`}
    >
      <svg viewBox="0 0 60 42" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <clipPath id={clipId}>
          <rect width="60" height="42" rx="2" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <Flag />
          {/* Dobra do tecido: um degradê diagonal que dá volume à bandeira */}
          <path d="M0 0 L60 0 L60 14 L0 30 Z" fill="#fff" fillOpacity="0.1" />
          <path d="M0 42 L60 42 L60 30 L0 16 Z" fill="#000" fillOpacity="0.12" />
        </g>
      </svg>

      {/* Brilho que atravessa quando o país está ativo */}
      {active && (
        <span className="animate-flag-shine pointer-events-none absolute inset-y-0 -left-full w-full -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      )}
    </span>
  );
}
