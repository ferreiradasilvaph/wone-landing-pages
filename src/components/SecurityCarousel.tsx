"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  KeyRound,
  CopySlash,
  Network,
  Vault,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";

const ICONS: Record<string, LucideIcon> = { KeyRound, CopySlash, Network, Vault };
const EASE = [0.16, 1, 0.3, 1] as const;

/** Intervalo do autoplay. O mesmo valor alimenta a barra de progresso. */
const AUTOPLAY_MS = 4500;
/** Janela em que a rolagem programática não é lida de volta. */
const SYNC_LOCK_MS = 700;

/**
 * Carrossel dos itens de segurança: faixa com scroll-snap à esquerda e painel
 * de detalhe do item ativo.
 *
 * A posição vem do scroll nativo, não de um `translateX` calculado. A versão
 * anterior media a largura do card e deslocava a lista por múltiplos dessa
 * medida; qualquer erro de meio pixel acumulava a cada passo e deixava uma
 * fatia do card anterior aparecendo na borda esquerda, já esmaecida pela
 * opacidade — o "corte" que parecia bug. Com `scroll-snap-align: start` o
 * alinhamento é do navegador e não tem como derivar. De graça vem o swipe no
 * celular e a rolagem por teclado.
 *
 * O autoplay empurra o scroll e pausa em três situações independentes: ponteiro
 * sobre o carrossel, foco de teclado dentro dele e aba em segundo plano. Com
 * `prefers-reduced-motion` ele não liga.
 */
export function SecurityCarousel() {
  const { security } = useContent();
  const reduced = useReducedMotion();
  const items = security.items;
  const count = items.length;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const paused = hovering || focused || tabHidden;
  const playing = !reduced && !paused;

  /* Quanto falta do intervalo atual. Pausar guarda o resto, retomar continua de
     onde parou — o mesmo que a barra de progresso faz com animation-play-state,
     então as duas coisas congelam e voltam juntas. */
  const remaining = useRef(AUTOPLAY_MS);
  const startedAt = useRef(0);

  /* Enquanto a rolagem programática está em curso, a posição não é lida de
     volta: a rolagem suave passa pelas posições intermediárias e o indicador
     piscaria entre os cards do caminho. */
  const syncLockUntil = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /** Alinha o card à borda esquerda da faixa, pelo retângulo — sem depender de
      quem é o `offsetParent` nem de medir a largura do card. */
  const goTo = useCallback(
    (index: number) => {
      const scroller = scrollerRef.current;
      const card = scroller?.querySelectorAll<HTMLElement>("[data-slide]")[index];
      if (!scroller || !card) return;

      const pad = Number.parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      const left =
        card.getBoundingClientRect().left -
        scroller.getBoundingClientRect().left +
        scroller.scrollLeft -
        pad;

      syncLockUntil.current = Date.now() + SYNC_LOCK_MS;
      remaining.current = AUTOPLAY_MS;
      activeRef.current = index;
      setActive(index);
      scroller.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced],
  );

  /* Autoplay. O efeito depende de `active`, então clicar num card ou num
     indicador reinicia o intervalo sem nenhum código extra. */
  useEffect(() => {
    if (!playing) {
      if (startedAt.current) {
        remaining.current = Math.max(
          0,
          remaining.current - (Date.now() - startedAt.current),
        );
        startedAt.current = 0;
      }
      return;
    }

    startedAt.current = Date.now();
    const id = window.setTimeout(() => {
      startedAt.current = 0;
      goTo((activeRef.current + 1) % count);
    }, remaining.current);

    return () => window.clearTimeout(id);
  }, [playing, active, count, goTo]);

  /** Aba em segundo plano pausa — e não gasta o intervalo escondido. */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* Swipe e rolagem por teclado: a posição do scroll manda no item ativo. Um
     quadro por evento, para arrastar o dedo não disparar um render por pixel. */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (Date.now() < syncLockUntil.current) return;

        const cards = scroller.querySelectorAll<HTMLElement>("[data-slide]");
        const pad = Number.parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
        const base = scroller.getBoundingClientRect().left + pad;

        let nearest = 0;
        let shortest = Infinity;
        cards.forEach((card, index) => {
          const distance = Math.abs(card.getBoundingClientRect().left - base);
          if (distance < shortest) {
            shortest = distance;
            nearest = index;
          }
        });

        /* Nas duas pontas o card mais próximo da borda esquerda não é o item
           corrente: no fim da faixa o scroll satura antes de o último card
           chegar à esquerda, e o vizinho ganharia por distância. Quem está no
           fim do scroll está vendo o último card. */
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        if (scroller.scrollLeft >= maxScroll - 2) nearest = cards.length - 1;
        else if (scroller.scrollLeft <= 2) nearest = 0;

        if (nearest !== activeRef.current) {
          activeRef.current = nearest;
          remaining.current = AUTOPLAY_MS;
          setActive(nearest);
        }
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const item = items[active];
  const ActiveIcon = ICONS[item.icon] ?? ShieldCheck;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={security.title}
      className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      /* Só despausa quando o foco sai do carrossel de verdade. Sem a checagem,
         andar de um card ao seguinte com Tab dispara blur e depois focus, e o
         intervalo reiniciava no meio do caminho. */
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <div className="min-w-0">
        {/* Desvanecer só à direita, para sugerir que há mais card adiante. À
            esquerda nunca: lá fica o card ativo, e apagá-lo era metade do
            efeito de "bug" que a seção tinha. */}
        <div
          ref={scrollerRef}
          className="snap-x snap-mandatory overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage: "linear-gradient(to right, #000 0%, #000 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 0%, #000 82%, transparent 100%)",
            scrollPaddingLeft: "0.25rem",
          }}
        >
          <ul className="flex items-stretch gap-4">
            {items.map((entry, index) => {
              const Icon = ICONS[entry.icon] ?? ShieldCheck;
              const isActive = index === active;

              return (
                <li
                  key={entry.title}
                  data-slide
                  className="w-[min(20rem,78vw)] shrink-0 snap-start"
                >
                  {/* O papel de slide fica neste wrapper, não no <li>. Um
                      role="group" direto no item reprovava três auditorias de
                      ARIA — list, listitem e aria-allowed-role — porque um <ul>
                      só admite <li>, e um <li> com role deixa de contar como
                      item de lista. */}
                  <div
                    role="group"
                    aria-roledescription="slide"
                    aria-label={entry.title}
                    className="h-full"
                  >
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={isActive}
                    /* Ativo se destaca pela superfície clara. Saíram o glow
                       laranja, a varredura de brilho, a rotação 3D e a
                       opacidade que escondia os cards inativos — eles agora
                       aparecem inteiros. */
                    className={`${
                      isActive ? "surface-lit" : "surface"
                    } flex h-full w-full cursor-pointer flex-col rounded-2xl p-6 text-left transition-transform duration-300 hover:-translate-y-0.5`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center transition-colors duration-300 ${
                        isActive ? "text-brand" : "text-faint"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>

                    <span className="font-display mt-5 block text-lg font-semibold text-cream">
                      {entry.title}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted">
                      {entry.description}
                    </span>
                  </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Indicadores. O ativo é uma trilha que o progresso do autoplay
            preenche; parado ou com movimento reduzido, fica cheia. */}
        <div className="mt-4 flex gap-1.5">
          {items.map((entry, index) => {
            const isActive = index === active;

            return (
              <button
                key={entry.title}
                type="button"
                onClick={() => goTo(index)}
                aria-label={entry.title}
                aria-current={isActive}
                className={`h-1.5 cursor-pointer overflow-hidden rounded-full transition-[width,background-color] duration-300 ${
                  isActive ? "w-8 bg-cream/20" : "w-3 bg-cream/15 hover:bg-cream/25"
                }`}
              >
                {isActive && (
                  /* A barra existe só no indicador ativo, então trocar de card
                     desmonta e remonta o elemento — a animação recomeça do zero
                     sem precisar de `key`. Pausar congela no meio com
                     `animation-play-state`, em vez de voltar a zero. */
                  <span
                    aria-hidden
                    className="block h-full w-full origin-left rounded-full bg-brand"
                    style={
                      reduced
                        ? // Sem autoplay a barra não tem o que contar: fica cheia.
                          { transform: "scaleX(1)" }
                        : {
                            animation: `carousel-progress ${AUTOPLAY_MS}ms linear forwards`,
                            animationPlayState: paused ? "paused" : "running",
                          }
                    }
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel do item ativo.

          `aria-live` fica em "off" enquanto o carrossel gira sozinho: anunciar
          cada troca automática encheria o leitor de tela de interrupções que o
          usuário não pediu. Quando está pausado, a troca partiu de um clique ou
          do teclado, e aí o anúncio é esperado. */}
      <div
        className="surface relative min-h-[18rem] overflow-hidden rounded-3xl p-7"
        aria-live={paused ? "polite" : "off"}
        aria-atomic="true"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
            className="relative"
          >
            <div className="relative mb-6 flex h-28 items-center justify-center">
              {[112, 84, 60].map((size, index) => (
                <span
                  key={size}
                  aria-hidden
                  className="absolute rounded-full border border-brand"
                  style={{ height: size, width: size, opacity: 0.2 - index * 0.04 }}
                />
              ))}
              <span className="relative flex h-16 w-16 items-center justify-center text-brand">
                <ActiveIcon className="h-8 w-8" />
              </span>
            </div>

            {/* h3 e nao h4: o titulo da secao e um h2, e pular nivel reprova
                a auditoria de hierarquia de cabecalhos. */}
            <h3 className="font-display text-center text-base font-semibold text-cream">
              {item.title}
            </h3>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted">
              {item.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
