"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * "Este elemento está à vista?", com `IntersectionObserver` cru.
 *
 * Substitui o `useInView` do motion/react em seis lugares (Recursos,
 * Segurança, Premiações ×2, "Como funciona", Pagamentos). O motivo é de
 * carregamento, não de comportamento: medido em 14/10, era o IMPORT desses
 * seis ganchos que punha o pacote do motion (`36czita924n0b.js`, 42,2 kB
 * transferidos / 126,6 kB crus) no grafo dos 8 scripts que a página baixa
 * antes da PRIMEIRA PINTURA — e o Lighthouse, que simula 4G, cobra esse
 * download no FCP e no LCP do h1. Tirar o motion do caminho crítico valeu
 * FCP −0,42 s e LCP −0,21 s no experimento de eliminação (E-f1).
 *
 * É uma tradução literal do que o `useInView` faz, não uma aproximação:
 * - `amount` é o `threshold` do observador (o motion chama de amount o mesmo
 *   número que o navegador chama de threshold);
 * - `margin` é o `rootMargin`;
 * - `once` desliga o observador na primeira entrada e nunca volta a `false`.
 *
 * Inclusive a limitação: elemento mais alto que a viewport nunca chega a um
 * `threshold` alto, porque a razão de interseção é dividida pela área DELE. O
 * motion tem exatamente a mesma, pelo mesmo motivo — as seções que usam
 * `amount: 0.3/0.4` já estão calibradas para isso.
 *
 * `onScreen` nunca é lido dentro do efeito, então o observador não se
 * reinscreve a cada troca de estado.
 */
export function useOnScreen<T extends Element>(
  ref: RefObject<T | null>,
  {
    amount = 0,
    margin,
    once = false,
  }: { amount?: number; margin?: string; once?: boolean } = {},
): boolean {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    /* Navegador sem `IntersectionObserver`: considera à vista, como o motion.
       O estado vai num timeout, e não direto no corpo do efeito, porque
       `setState` síncrono aqui dispara renderização em cascata (e o lint
       reprova, com razão) — é o mesmo caminho do `useNearViewport` de
       `Highlights`. */
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setOnScreen(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          setOnScreen(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setOnScreen(false);
        }
      },
      { threshold: amount, rootMargin: margin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, amount, margin, once]);

  return onScreen;
}
