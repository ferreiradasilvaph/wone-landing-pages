import type { ReactNode } from "react";
import { TEXT_LINK } from "./cta";

/**
 * A ação de menos peso da página: link de texto laranja, sublinhado fino, SEM
 * seta (decisão do dono em 14/10). É o par do `CtaButton` — "Ver como
 * funciona" ao lado de "Lista de espera" — e nunca um segundo botão: dois
 * botões lado a lado não dizem qual é a ação principal.
 */
export function TextLink({
  href,
  external,
  className = "",
  onClick,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  /* Sem ícone de link externo: o ↗ (ArrowUpRight) nos destinos de fora é
     decisão pendente do dono, e entra aqui quando ele responder. */
  return (
    <a
      href={href}
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noreferrer" } : null)}
      className={`${TEXT_LINK}${className ? ` ${className}` : ""}`}
    >
      {children}
    </a>
  );
}
