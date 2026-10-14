"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  KeyRound,
  CopySlash,
  Network,
  Vault,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";
import { PauseButton } from "./PauseButton";
import { SegmentProgress } from "./SegmentProgress";

const ICONS: Record<string, LucideIcon> = { KeyRound, CopySlash, Network, Vault };
const EASE = [0.16, 1, 0.3, 1] as const;

/** Intervalo do avanço automático. O mesmo valor alimenta a barra de progresso. */
const AUTOPLAY_MS = 5000;

/**
 * Segurança: os quatro itens como lista de seleção à esquerda e o detalhe do
 * item escolhido à direita.
 *
 * Esta é a seção invertida da página — fundo ink-800 —, então cada superfície
 * sobe um degrau: o item é ink-750 e o escolhido, ink-700. É tom, não contorno:
 * medido, `--faint` dá 5,2:1 sobre o ink-700 e 5,4:1 sobre o ink-750, acima do
 * 4,5:1 do portão, então não foi preciso somar borda ao item ativo.
 *
 * O avanço automático ficou, porque atende o pedido de a seção "andar sozinha"
 * sem reintroduzir rolagem: o que avança é a seleção, não a posição. Pausa com
 * o ponteiro em cima, com foco de teclado dentro da seção, com a aba em segundo
 * plano e pelo "pausar" sob o card — este último é o que o ponteiro e o teclado
 * não davam a quem usa toque (WCAG 2.2.2: algo que anda sozinho precisa de um
 * controle visível). Pausar guarda quanto falta do intervalo e retomar continua
 * de onde parou. Com `prefers-reduced-motion` não liga — e esse "não liga" só é
 * conhecido depois da montagem, nunca no primeiro render (o porquê está no
 * efeito do `matchMedia`, abaixo).
 *
 * Quanto falta do intervalo é a régua de 4 segmentos sob o card, não mais um
 * fio laranja de 3px colado na borda do item ativo: contorno em item
 * selecionado é o que a regra 8 proíbe, e a seleção já se lê pelo tom (ink-700
 * sobre ink-750).
 *
 * E4 troca os quatro itens pelas linhas-tabela (termo + complemento); aqui a
 * mecânica é a de hoje.
 */
export function SecurityCarousel() {
  const { security, ui } = useContent();
  const items = security.items;
  const count = items.length;

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  /* O pedido explícito de quem lê: nasce `false` nos dois lados, como os
     outros, para o primeiro render do cliente ser igual ao do servidor. */
  const [userPaused, setUserPaused] = useState(false);

  const paused = userPaused || hovering || focused || tabHidden;
  const playing = !reduced && !paused;

  /* Quanto falta do intervalo atual. */
  const remaining = useRef(AUTOPLAY_MS);
  const startedAt = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /* `useReducedMotion` do motion não serve aqui, e esta seção é a prova: ele
     devolve valor falso no servidor e já devolve `true` no PRIMEIRO render do
     cliente. Como o `style` da barra de progresso e o `initial` do painel
     dependem deste valor, os atributos saíam de um jeito no HTML do servidor e
     de outro na hidratação. Medido
     com `prefers-reduced-motion: reduce`, nos dois idiomas: "A tree hydrated
     but some attributes of the server rendered HTML didn't match the client
     properties", com o diff do React apontando `+ style={undefined}` (cliente)
     contra `- style={{animation-duration:"5000ms", ...}}` (servidor). Sem
     `reduce`, zero erros — e era por isso que o defeito passava.

     O listener responde a mesma pergunta, começa em `false` nos dois lados e só
     muda depois da montagem. É o mesmo arranjo de `FeatureCarousel`, a seção
     irmã, onde `reduced` só alimenta o relógio e nunca decidiu atributo. */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const select = useCallback((index: number) => {
    remaining.current = AUTOPLAY_MS;
    activeRef.current = index;
    setActive(index);
  }, []);

  /* O efeito depende de `active`, então clicar num item reinicia o intervalo. */
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
      select((activeRef.current + 1) % count);
    }, remaining.current);

    return () => window.clearTimeout(id);
  }, [playing, active, count, select]);

  /** Aba em segundo plano pausa — e não gasta o intervalo escondido. */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const item = items[active];
  const ActiveIcon = ICONS[item.icon] ?? ShieldCheck;

  return (
    <div
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      /* Só despausa quando o foco sai da seção: andar de um item ao seguinte com
         Tab dispara blur e depois focus, e o intervalo reiniciaria no caminho. */
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      {/* Os quatro, sempre visíveis. Lista de opções que controla o painel ao
          lado: `tablist` é o papel correto, e as setas do teclado andam nela. */}
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={security.title}
        className="flex flex-col gap-2.5"
      >
        {items.map((entry, index) => {
          const Icon = ICONS[entry.icon] ?? ShieldCheck;
          const isActive = index === active;

          return (
            <button
              key={entry.term}
              type="button"
              role="tab"
              id={`security-tab-${index}`}
              aria-selected={isActive}
              aria-controls="security-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                const last = count - 1;
                let next: number | null = null;
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                  next = index === last ? 0 : index + 1;
                }
                if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                  next = index === 0 ? last : index - 1;
                }
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = last;
                if (next === null) return;
                event.preventDefault();
                select(next);
              }}
              className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-card p-4 text-left transition-colors duration-300 sm:p-5 ${
                isActive ? "bg-ink-700" : "bg-ink-750"
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center transition-colors duration-300 ${
                  isActive ? "text-brand" : "text-faint group-hover:text-brand"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>

              {/* Termo e complemento, a forma de linha de tabela da referência:
                  o rótulo curto carrega o item, a frase em minúscula o explica
                  sem repetir o título que já está no card ao lado. */}
              <span className="min-w-0">
                <span
                  className={`block text-[15px] leading-snug font-semibold transition-colors duration-300 ${
                    isActive ? "text-cream" : "text-cream/80"
                  }`}
                >
                  {entry.term}
                </span>
                <span className="mt-1 block text-[15px] leading-relaxed text-muted">
                  {entry.summary}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        {/* Painel do item escolhido.

            `aria-live` fica em "off" enquanto a seleção anda sozinha: anunciar
            cada troca automática encheria o leitor de tela de interrupções que
            o usuário não pediu. Pausado, a troca partiu de um clique ou do
            teclado, e aí o anúncio é esperado. */}
        <div
          role="tabpanel"
          id="security-panel"
          aria-labelledby={`security-tab-${active}`}
          aria-live={paused ? "polite" : "off"}
          aria-atomic="true"
          className="rounded-card bg-ink-750 p-6"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {/* O ícone sem os três anéis concêntricos que o cercavam, e tudo
                  à esquerda: nada centrado na página. */}
              <span className="flex h-8 w-8 items-center justify-center text-brand">
                <ActiveIcon className="h-6 w-6" />
              </span>

              <h3 className="t-h3 mt-5 text-cream">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{item.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Onde a seleção está e quanto falta para ela andar, mais o controle de
            parar. A régua fica FORA do card porque ela fala dos quatro itens da
            esquerda, não do detalhe de um só. */}
        <div className="mt-6 flex items-end gap-5">
          <SegmentProgress
            className="min-w-0 flex-1"
            count={count}
            active={active}
            durationMs={AUTOPLAY_MS}
            paused={!playing}
            labelLeft={item.term}
            labelRight={`${active + 1} ${ui.of} ${count}`}
          />
          <PauseButton
            pressed={userPaused}
            onToggle={() => setUserPaused((valor) => !valor)}
            labels={{ pause: ui.pause, play: ui.play }}
            /* Esta seção é o bloco invertido: a pílula padrão (ink-800) teria o
               tom do próprio fundo, então ela sobe um degrau como as outras
               superfícies daqui. */
            className="shrink-0 bg-ink-700!"
          />
        </div>
      </div>
    </div>
  );
}
