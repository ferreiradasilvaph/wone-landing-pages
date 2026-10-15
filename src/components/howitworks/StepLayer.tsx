"use client";

import type { ReactNode } from "react";

/**
 * Uma das quatro camadas de um objeto do palco (a tela grande, o aparelho, a
 * fileira de fatos). As quatro ficam SEMPRE montadas, empilhadas no mesmo
 * lugar, e a troca de passo é só opacidade + 8px.
 *
 * Por que montadas, e não uma por vez com `key`:
 *
 *  1. ALTURA CRAVADA, CLS 0. Com `absolute inset-0` nenhuma camada participa do
 *     layout do pai — quem decide a altura é o pai, por breakpoint. O relógio
 *     pode avançar sozinho a noite inteira sem mover um pixel da página.
 *  2. SSR PINTA O PASSO 01 INTEIRO. A camada ativa nasce em `opacity-100`: não
 *     existe `animated`, não existe primeiro quadro invisível e nada espera a
 *     hidratação (era o que o `StepEnter`, com `@keyframes` e `both`, precisava
 *     de um estado de cliente para garantir).
 *  3. A travessia é TRANSIÇÃO, não animação. `transition` só dispara quando o
 *     valor muda, então o primeiro render nunca anima — e com
 *     `prefers-reduced-motion` a regra global de `globals.css` zera a duração e
 *     a troca passa a ser instantânea, mostrando o estado final do passo.
 *
 * 350 ms é o tempo da travessia de painel que a página já usa (`.panel-swap`,
 * em Análises), na mesma curva do site.
 */
export function StepLayer({
  active,
  className = "",
  children,
}: {
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 transition-[opacity,transform] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        active ? "opacity-100" : "translate-y-2 opacity-0"
      }${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
