import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { CTA, CTA_BAR, CTA_OBJECT } from "./cta";

const TAMANHO = {
  cta: CTA,
  bar: CTA_BAR,
  object: CTA_OBJECT,
} as const;

/**
 * O botão do site. Renderiza `<a>` quando recebe `href` e `<button>` quando
 * recebe ação — a forma é a mesma, e é o único jeito de pôr um botão laranja na
 * página (regra 3: um botão só).
 *
 * A seta é o ícone `ArrowRight`, nunca um "→" dentro do rótulo: como caractere
 * ela não acompanha o peso do texto, não some para o leitor de tela e muda de
 * desenho conforme a fonte do sistema. Ela vem por padrão nos tamanhos de
 * página e de barra, e NÃO vem no `object` — botão dentro de mockup é peça de
 * produto ("Rodar", "Pagar com PIX"), não chamada para ação.
 *
 * `loading` não troca o conteúdo por um spinner: quem chama troca o rótulo
 * ("Enviando…"), que é informação de verdade; aqui ele só marca `aria-busy` e
 * desabilita o botão para não haver dois envios.
 */
export function CtaButton({
  href,
  onClick,
  type = "button",
  size = "cta",
  arrow,
  loading,
  disabled,
  className = "",
  children,
}: {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  size?: "cta" | "bar" | "object";
  arrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const comSeta = arrow ?? size !== "object";
  const classe = `${TAMANHO[size]} inline-flex${className ? ` ${className}` : ""}`;
  const conteudo = (
    <>
      {children}
      {comSeta ? (
        <ArrowRight className={size === "object" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} aria-hidden />
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classe}>
        {conteudo}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={classe}
    >
      {conteudo}
    </button>
  );
}
