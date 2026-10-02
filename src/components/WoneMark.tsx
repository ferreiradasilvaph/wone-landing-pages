/**
 * Ícone oficial Wone: dois anéis entrelaçados e os chevrons laterais, todos em
 * Vivid Orange (#FF7700), conforme a geometria do Manual de Marca.
 *
 * Em SVG porque aparece em tamanhos pequenos; a cor é fixa de propósito, sem
 * herdar `currentColor`.
 */
export function WoneIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Wone"
    >
      <circle cx="33" cy="31" r="23" stroke="#FF7700" strokeWidth="7" />
      <circle cx="67" cy="31" r="23" stroke="#FF7700" strokeWidth="7" />
      <path
        d="M 12 21 L 28 31 L 12 41"
        stroke="#FF7700"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 88 21 L 72 31 L 88 41"
        stroke="#FF7700"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

