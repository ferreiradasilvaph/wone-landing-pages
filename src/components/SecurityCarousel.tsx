"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useContent } from "@/i18n";
import { useOnScreen } from "@/lib/useOnScreen";
import { PauseButton } from "./PauseButton";
import { SegmentProgress } from "./SegmentProgress";

/** Intervalo do avanço automático. O mesmo valor alimenta a barra de progresso. */
const AUTOPLAY_MS = 5000;

/**
 * Segurança: os quatro itens como LINHAS DE TABELA à esquerda e o detalhe do
 * item escolhido no card à direita.
 *
 * Eram quatro cards com ícone, um debaixo do outro, e ocupavam 440px para dizer
 * oito linhas de texto. A forma de tabela da referência — termo de um lado,
 * complemento do outro, régua fina entre as linhas — diz o mesmo em 56px por
 * linha, e deixa os quatro termos legíveis de uma olhada, que é o que uma lista
 * de garantias precisa. O ícone Lucide saiu de cada linha (quatro ícones
 * decorativos competindo com quatro termos curtos) e não voltou no card: o
 * título já nomeia o assunto.
 *
 * Esta é a seção invertida da página — fundo ink-800 —, então cada superfície
 * sobe um degrau: o card é ink-750 e a linha escolhida, ink-700. É tom, não
 * contorno: medido no navegador (WCAG 2.1, cor composta com o alfa sobre o
 * fundo), `--muted` dá 8,29:1 e `--faint` 5,21:1 sobre o ink-700 — acima do
 * 4,5:1 do portão, então não foi preciso somar `border-line-strong` à linha
 * ativa, que era o plano B da espec.
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
 * selecionado é o que a regra 8 proíbe, e a seleção já se lê pelo tom.
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

  /* Fora da tela o relógio para: o portão de performance conta UM relógio por
     viewport, e sem isto o de Segurança já corria enquanto o visitante ainda
     estava no hero, somando-se ao do carrossel de Recursos. */
  const blocoRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(blocoRef, { amount: 0.3 });

  const paused = userPaused || hovering || focused || tabHidden || !onScreen;
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

  return (
    <div
      ref={blocoRef}
      className="grid items-start gap-8 lg:grid-cols-12 lg:gap-x-8"
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
      {/* As quatro linhas, sempre visíveis. Lista de opções que controla o card
          ao lado: `tablist` é o papel correto, e as setas do teclado andam nela.

          O `-mx-3` é o que mantém o termo alinhado com o kicker e o H2 acima
          (a moldura da página é a mesma em todas as seções) enquanto o tom da
          linha ativa ainda respira 12px para cada lado do texto. */}
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={security.title}
        className="-mx-3 lg:col-span-6"
      >
        {items.map((entry, index) => {
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
              /* Celular: termo em cima, complemento embaixo (≈72px). Desktop: os
                 dois na mesma linha, com o termo numa coluna fixa de 9rem —
                 é o alinhamento que faz quatro linhas lerem como tabela. */
              className={`block w-full cursor-pointer border-b border-line px-3 py-4 text-left transition-colors duration-300 lg:grid lg:grid-cols-[9rem_1fr] lg:items-baseline lg:gap-4 ${
                isActive ? "rounded-field bg-ink-700" : ""
              }`}
            >
              <span className="block text-[15px] leading-snug font-semibold text-cream">
                {entry.term}
              </span>
              <span className="mt-1 block text-[15px] leading-snug text-muted lg:mt-0">
                {entry.summary}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 lg:col-span-6 lg:col-start-7">
        {/* Card do item escolhido.

            Os QUATRO detalhes ficam no mesmo quadro da grade (todos em
            `col-start-1 row-start-1`), e só a opacidade distingue o escolhido.
            Assim a altura do card é sempre a do detalhe mais alto NA LARGURA
            ATUAL, em qualquer idioma, e o relógio de 5 s troca de item sem
            mover um pixel do que vem depois — o portão é "CLS 0" e aqui ele era
            furado sem interação nenhuma: medido a 412, o detalhe do 2FA em
            inglês pede 184px e o do Cofre 159, e a seção pulava 25px sozinha
            (3 entradas de `layout-shift`, CLS 0,0027 em 12 s parado).

            Um `min-h` por breakpoint — o caminho do DashboardPreview — não
            resolveria este caso sem cinco degraus: medindo os 8 textos (4
            itens x 2 idiomas) por largura de conteúdo, a altura necessária é
            210px a 280 de largura (celular de 360), 184 a 332 (412), 159 a 416
            e 135 só a partir de 500 — e a coluna de 6 colunas volta aos 159
            entre 1024 e ~1220. A grade empilhada acerta os seis casos sem
            número mágico.

            O crossfade de 350ms é CSS, não motion: o bloco global de
            `prefers-reduced-motion` já zera `transition-duration`, então quem
            pediu menos movimento recebe a troca seca sem este componente
            precisar decidir nada no render (regra 6). */}
        <div
          role="tabpanel"
          id="security-panel"
          aria-labelledby={`security-tab-${active}`}
          className="grid rounded-card bg-ink-750 p-6"
        >
          {items.map((entry, index) => (
            <div
              key={entry.title}
              aria-hidden={index !== active}
              className={`col-start-1 row-start-1 transition-[opacity,transform] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                index === active ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"
              }`}
            >
              <h3 className="t-h3 text-cream">{entry.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{entry.detail}</p>
            </div>
          ))}
        </div>

        {/* O anúncio para leitor de tela, que antes vinha do `aria-live` no
            card: com os quatro detalhes sempre no DOM, nenhuma mutação
            acontece na troca e a região viva nunca dispararia. Em "off"
            enquanto a seleção anda sozinha — anunciar cada troca automática
            encheria o leitor de interrupções que ninguém pediu; pausado, a
            troca partiu de um clique ou do teclado e o anúncio é esperado. É o
            mesmo arranjo do carrossel de Recursos. */}
        <p className="sr-only" aria-live={paused ? "polite" : "off"} aria-atomic="true">
          {item.title}. {item.detail}
        </p>

        {/* Onde a seleção está e quanto falta para ela andar, mais o controle de
            parar. A régua fica FORA do card porque ela fala das quatro linhas da
            esquerda, não do detalhe de uma só. */}
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
