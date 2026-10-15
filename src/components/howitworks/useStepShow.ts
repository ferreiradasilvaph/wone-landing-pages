"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from "react";
import { useOnScreen } from "@/lib/useOnScreen";

/** Os quatro passos: três de configuração e o desfecho. */
export const STEP_COUNT = 4;

/**
 * Quanto cada passo fica na tela. O 04 é mais longo porque tem três elementos
 * para ler (a régua, o cartão aprovado e a linha do convite) contra um ou dois
 * dos passos de configuração.
 */
export const STEP_MS = [6000, 6000, 6000, 7500] as const;

/* O easing do site (`cubic-bezier(0.16, 1, 0.3, 1)`) não mora mais aqui: quem
   anima é o CSS. Em 15/10, com a sala de operação, até as entradas em
   `@keyframes` saíram — as camadas de passo ficam montadas e trocam por
   `transition` (`StepLayer`), e a única animação da seção é a faísca do fio
   (`stage-spark`, em globals.css). Nada aqui importa `motion/react`: era esse
   import, em treze componentes, que punha o pacote do motion (42,2 kB
   transferidos) no grafo dos 8 scripts baixados antes da primeira pintura —
   medido em 14/10, tirá-lo valeu FCP −0,42 s e LCP −0,21 s (E-f1). */

export type StepShow = ReturnType<typeof useStepShow>;

/**
 * O ÚNICO relógio da seção "Como funciona".
 *
 * A seção era acoplada à rolagem (um `useScroll` sobre uma lista de 36vh por
 * passo, com um palco 3D preso ao alto). O dono olhou e disse, em 14/10:
 * "refaça sendo mais criativo... ao meu ver está confuso". Nada aqui depende
 * mais da rolagem: o que anda é a SELEÇÃO, e ela anda por um temporizador
 * encadeado — a mesma mecânica do `SecurityCarousel`, inclusive o
 * `remaining`/`startedAt` que faz pausar guardar quanto falta e retomar
 * continuar de onde parou, em vez de voltar a zero.
 *
 * Cinco coisas pausam: o ponteiro no bloco, o foco de teclado dentro dele, a
 * aba em segundo plano, a seção fora da tela e o "pausar" visível (WCAG 2.2.2 —
 * quem usa toque não tem ponteiro nem Tab). Com `prefers-reduced-motion` o
 * relógio nunca liga: a demo fica no passo escolhido, mostrando o estado final.
 *
 * `animated` é o que mantém a hidratação intacta. Ele nasce `false` no servidor
 * E no primeiro render do cliente, então o HTML sai igual nos dois lados e já
 * pintado no estado final do passo 01 — nenhum elemento nasce em `opacity: 0`.
 * Só depois da montagem ele vira `true`, e aí as trocas de passo têm entrada.
 * `reduced` segue o mesmo caminho (`matchMedia` dentro de efeito, nunca
 * `useReducedMotion` no render): em `SecurityCarousel` está medido o erro de
 * hidratação que a leitura no render causava.
 */
export function useStepShow(blockRef: RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [animated, setAnimated] = useState(false);

  /* Fora da tela o relógio para: o portão conta UM relógio por viewport, e sem
     isto o desta seção corria enquanto o visitante ainda estava no hero.
     `blockRef` vem de fora (a seção o cria e o pendura no nó que recebe
     ponteiro e foco) porque devolver um ref neste objeto faria o lint do
     compilador ler TODA leitura de `show.algo` como leitura de ref no render. */
  const onScreen = useOnScreen(blockRef, { amount: 0.3 });

  const paused = userPaused || hovering || focused || tabHidden || !onScreen;
  const playing = !reduced && !paused;

  /** Quanto falta do passo atual. */
  const remaining = useRef<number>(STEP_MS[0]);
  const startedAt = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /* Depois da montagem as trocas de passo podem animar. Nunca antes: o primeiro
     render é o do servidor, e o do cliente tem de sair igual a ele.
     O estado vai num timeout, e não direto no corpo do efeito, porque `setState`
     síncrono aqui dispara renderização em cascata (e o lint reprova, com razão)
     — é o mesmo caminho do `PhoneMockup`. */
  useEffect(() => {
    const id = window.setTimeout(() => setAnimated(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /**
   * Escolher um passo reinicia o intervalo e NÃO liga o "pausar" do usuário: o
   * ponteiro ou o foco que levaram ao clique já pausaram, e ligar `userPaused`
   * aqui deixaria a seção parada depois que o ponteiro saísse.
   */
  const select = useCallback((index: number) => {
    remaining.current = STEP_MS[index];
    activeRef.current = index;
    setActive(index);
  }, []);

  /* Depende de `active`, então trocar de passo recomeça a contagem. */
  useEffect(() => {
    if (!playing) {
      if (startedAt.current) {
        remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
        startedAt.current = 0;
      }
      return;
    }

    startedAt.current = Date.now();
    const id = window.setTimeout(() => {
      startedAt.current = 0;
      const next = (activeRef.current + 1) % STEP_COUNT;
      select(next);
    }, remaining.current);

    return () => window.clearTimeout(id);
  }, [playing, active, select]);

  return {
    active,
    select,
    animated,
    reduced,
    paused,
    playing,
    userPaused,
    toggleUserPaused: useCallback(() => setUserPaused((value) => !value), []),
    /* Os quatro manipuladores que o bloco pendura: ponteiro e foco. O `onBlur`
       só despausa quando o foco sai do bloco inteiro — andar de uma aba para a
       seguinte dispara blur e focus, e o intervalo reiniciaria no caminho. */
    pauseHandlers: {
      onMouseEnter: () => setHovering(true),
      onMouseLeave: () => setHovering(false),
      onFocus: () => setFocused(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      },
    },
  };
}
