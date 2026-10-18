"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useOnScreen } from "./useOnScreen";

/**
 * O RELÓGIO DE ENTRADA DE UMA SEÇÃO: um `requestAnimationFrame`, uma vez só.
 *
 * Devolve duas coisas, e as duas vêm do mesmo lugar de propósito:
 *
 *  - `t`, o tempo corrido do percurso em ms (0 → `total`). É o que os números
 *    da seção leem para contar a partir do zero;
 *  - `animar`, se esta visita vai ter movimento. É o que o componente usa para
 *    pendurar (ou não) as classes de CSS da leva — a trilha, os pinos, a
 *    entrada das linhas de faturamento.
 *
 * UM RELÓGIO POR SEÇÃO, e é regra dura do projeto: quatro números contando é
 * UMA chamada deste gancho, com cada número lendo o mesmo `t` com o atraso
 * dele. Quatro ganchos seriam quatro `rAF` concorrentes no mesmo bloco.
 *
 * TRÊS COISAS QUE ELE NÃO FAZ, e cada uma é uma cicatriz de regra do projeto:
 *
 * 1. NÃO decide nada no primeiro render. `t` nasce em `total` — o ESTADO FINAL
 *    —, então o HTML do servidor traz o número de verdade ("10K", "28"), e não
 *    um zero que o JS depois corrige. Quem não tem JS, quem tem a aba em
 *    segundo plano e o robô de busca leem a página pronta.
 *
 * 2. NÃO pergunta o `matchMedia` no corpo do componente, só dentro do efeito:
 *    o primeiro render do cliente tem de ser igual ao do servidor, ou a
 *    hidratação divergi. Com `prefers-reduced-motion: reduce` o gancho
 *    simplesmente nunca arma, e o que se vê é a seção pronta e parada.
 *
 * 3. NÃO anima o que o leitor JÁ ESTÁ VENDO. Armar é voltar o número para zero
 *    e recolher o que vai entrar, e isso tem de acontecer FORA DA VISTA — senão
 *    o leitor vê "10K" virar "0K" para então contar de novo. Daí a condição do
 *    arme: a peça precisa estar abaixo da dobra no momento da montagem. Quem
 *    chega pela âncora, já com a seção na tela, vê o estado final direto — que
 *    é o mesmo princípio da coreografia do hero (ela acontece na carga ou no
 *    clique na logo, nunca sob os olhos de quem está lendo).
 *
 * Entre armar e correr existe um `IntersectionObserver` (`useOnScreen`, o
 * mesmo de seis outras seções): o percurso começa quando a seção chega à vista,
 * e nunca repete.
 */
export function useContagem<T extends Element>(
  ref: RefObject<T | null>,
  total: number,
  { amount = 0.2 }: { amount?: number } = {},
): { t: number; animar: boolean } {
  const [t, setT] = useState(total);
  const [armado, setArmado] = useState(false);
  const aVista = useOnScreen(ref, { amount, once: true });
  /* O arme acontece uma vez por montagem. O ref evita que uma remontagem do
     StrictMode em desenvolvimento re-arme uma seção que já correu. */
  const armou = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || armou.current) return;
    armou.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* Já à vista (ou acima dela): sem arme e sem movimento. Ver a nota 3. */
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    setArmado(true);
    setT(0);
  }, [ref]);

  useEffect(() => {
    if (!armado || !aVista) return;

    let frame = 0;
    const partida = performance.now();
    const passo = (agora: number) => {
      const u = Math.min(1, (agora - partida) / total);
      setT(u * total);
      /* Não reagenda no último quadro: o relógio desta leva tem fim, e um
         `rAF` vivo depois do fim é o tipo de coisa que a página já pagou uma
         vez (os quatro contadores e a rotação de 6 s que a E1 removeu). */
      if (u < 1) frame = requestAnimationFrame(passo);
    };

    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [armado, aVista, total]);

  return { t, animar: armado };
}
