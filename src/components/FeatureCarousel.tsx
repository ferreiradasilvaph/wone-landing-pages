"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useInView } from "motion/react";
import { useContent } from "@/i18n";
import { Chip } from "./Chip";
import { SegmentProgress } from "./SegmentProgress";
import { PauseButton } from "./PauseButton";

/** Intervalo da rotação automática. */
const AUTOPLAY_MS = 4500;
/** Arrasto mínimo, em px, para contar como passar de card. */
const SWIPE_PX = 36;
/** Peteleco: gesto curto, mas rápido, também passa de card. */
const FLICK_PX = 16;
const FLICK_MS = 320;
/** A partir de quantos px o gesto deixa de ser toque e vira arraste. */
const DRAG_START_PX = 6;
/** Quanto o dedo arrasta o palco antes de soltar. Menos que 1 é resistência. */
const DRAG_FOLLOW = 0.6;

/**
 * Degraus de profundidade por distância do centro.
 *
 * O card do meio em tamanho cheio, os vizinhos menores e translúcidos, e do
 * terceiro em diante invisível — é o "cinco cards, um maior no meio, dois na
 * lateral e dois um pouco menores, com visão opaca" que o designer pediu.
 *
 * Tudo em CSS: nenhuma consulta de largura de tela decide quantos aparecem. Em
 * telas estreitas os vizinhos saem do palco por conta do `overflow-hidden` e do
 * `clamp()` do espaçamento, então a mesma implementação serve do celular ao
 * desktop sem risco de divergência na hidratação.
 */
const DEPTH = [
  { scale: 1, opacity: 1, z: 30, push: 0, turn: 0 },
  { scale: 0.9, opacity: 0.62, z: 20, push: -120, turn: 17 },
  { scale: 0.8, opacity: 0.26, z: 10, push: -220, turn: 24 },
] as const;

/* Posições das vendas de `phone.transactions` usadas pelos mini-mockups. A
   lista é a mesma do telefone do hero e é a ÚNICA origem de número nesta
   seção; por isso o acesso é por índice e não por rótulo (o rótulo é
   traduzido). */
const TX = { anual: 0, trimestral: 1, mensal: 2, pack: 3, bump: 4 } as const;

/**
 * O mini-mockup que abre o card, na forma Operação da referência: uma moldura
 * escura com um pedaço de produto dentro, e o título embaixo.
 *
 * Só quatro dos dez recursos têm moldura, e é de propósito: a moldura mostra
 * dado, e o dicionário só tem dado para esses quatro (planos e preços, o
 * adicional do order bump, o pack avulso e o lembrete de renovação). Onde não
 * há dado, o card fica com título e texto — inventar um valor para encher a
 * moldura é exatamente o que a regra 4 proíbe. "PIX livre" é o caso mais
 * visível: a faixa de valor que a moldura mostraria não existe em pt.ts, então
 * ele não tem moldura até o dono mandar a faixa.
 *
 * `h-[45%]` e não altura fixa: a moldura acompanha o card, que muda de medida
 * entre celular e desktop.
 */
function FeatureMockup({ id, isCenter }: { id: string; isCenter: boolean }) {
  const { features, phone, ui } = useContent();
  const tx = phone.transactions;

  /* Sem `truncate` em lugar nenhum: o que não cabe quebra em duas linhas. Um
     "Plano Trimestr…" dentro da moldura seria pior que a moldura mais alta. */
  const linha = "flex items-baseline justify-between gap-3";
  const rotulo = "min-w-0 text-[13px] leading-snug text-cream";
  const valor = "tnum shrink-0 text-[13px] font-semibold text-cream";

  let conteudo: React.ReactNode = null;

  if (id === "plans") {
    /* Três dos cinco planos, o anual marcado: é a escolha que o cliente faz no
       checkout, e o degrau de preço entre eles é a informação. */
    conteudo = (
      <ul className="flex flex-col gap-1">
        {[TX.mensal, TX.trimestral, TX.anual].map((index, posicao) => (
          <li
            key={tx[index].label}
            className={`${linha} rounded-[8px] px-2 py-1 ${
              posicao === 2 ? "bg-cream/8" : ""
            }`}
          >
            <span className={rotulo}>{tx[index].label}</span>
            <span className={valor}>{tx[index].amount}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (id === "bump") {
    conteudo = (
      <div className={`${linha} px-2`}>
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-brand text-ink-950"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span className={rotulo}>{features.mockup.bump}</span>
        </span>
        <span className="tnum shrink-0 text-[13px] font-semibold text-brand">
          +{tx[TX.bump].amount}
        </span>
      </div>
    );
  }

  if (id === "packs") {
    conteudo = (
      <div className="flex flex-col gap-2 px-2">
        <div className={linha}>
          <span className={rotulo}>{tx[TX.pack].label}</span>
          <span className={valor}>{tx[TX.pack].amount}</span>
        </div>
        <Chip className="self-start">{features.mockup.preview}</Chip>
      </div>
    );
  }

  if (id === "subscription") {
    conteudo = (
      <div className="flex flex-col gap-2 px-2">
        <span className={rotulo}>{tx[TX.anual].label}</span>
        {/* Sem prazo: "renova em 12 dias" era número sem fonte. */}
        <Chip tone="ok" className="self-start">
          {features.mockup.reminder}
        </Chip>
      </div>
    );
  }

  if (!conteudo) return null;

  return (
    /* A única exceção de card dentro de card do site: a moldura de objeto é
       ink-950 com `border-line` e raio de campo, sobre o card de qualquer tom
       (espec-final, item 10). */
    <div className="flex h-[45%] shrink-0 flex-col gap-2 rounded-field border border-line bg-ink-950 p-3">
      {/* No vizinho fica a moldura VAZIA, e é o que a tarefa pede ("vizinhos só
          com a moldura"): abaixo de `lg` o card do meio cobre a borda do
          vizinho, e o que sobrava à vista era "Pack avulso" cortado pela borda
          da tela de 412 ou pelo card central. Mesmo ponto de corte do texto do
          card, abaixo, para os dois sumirem juntos. */}
      <div className={`flex min-h-0 flex-1 flex-col gap-2 ${isCenter ? "" : "hidden lg:flex"}`}>
        <p className="t-label">{ui.simulation}</p>
        <div className="flex min-h-0 flex-1 flex-col justify-center">{conteudo}</div>
      </div>
    </div>
  );
}

/**
 * Recursos em carrossel de cards verticais, no lugar da grade de dez.
 *
 * A grade ocupava quatro linhas de altura — uns 50 rem só de cards, que o
 * designer resumiu como "o excesso de cards ocupa muito espaço", e que no tablet
 * virava uma coluna dupla interminável. Aqui a seção inteira cabe numa altura
 * de card.
 *
 * O card tem a forma Operação: mini-mockup no topo (45% da altura, com dado do
 * dicionário) + h3 + texto de 15px. O ícone com halo, o holofote radial, o fio
 * laranja no topo e o índice "01" em mono saíram — eram quatro marcas dizendo
 * "este é o ativo", e o tom do card (ink-750 no meio, ink-800 nos vizinhos) já
 * diz. O "01" voltou onde ele é navegação de verdade: o índice ao lado do
 * título, na coluna da esquerda.
 *
 * O laço é infinito: a distância até o centro é calculada pelo caminho mais
 * curto no círculo, então do último card se chega ao primeiro sem volta brusca.
 *
 * Avança sozinho a cada 4,5 s SÓ com a seção a 40% à vista, e para quando o
 * ponteiro entra, quando o foco de teclado cai dentro, quando a aba vai para
 * segundo plano ou quando alguém usa o "pausar". Clicar num card lateral o traz
 * para o centro; as setas do teclado e o arraste com o dedo também andam.
 *
 * Quem guarda qual card está no centro é a seção (`FeaturesSection`), não este
 * componente: o índice 01–10 ao lado do título precisa ler e escrever esse
 * mesmo estado. Daí o par `active`/`onSelect` — o carrossel continua dono de
 * tudo o que é dele (arraste, teclado, relógio, pausa), e dono de nada que o
 * índice também precise.
 */
export function FeatureCarousel({
  active,
  onSelect,
}: {
  active: number;
  onSelect: (index: number) => void;
}) {
  const { features, ui } = useContent();
  const items = features.items;
  const count = items.length;

  /* O índice vem de fora (a seção é dona do estado), e este é o único lugar da
     página onde um valor fora de 0..count-1 derrubaria o render: `DEPTH[NaN]`
     não tem `push`. Apareceu no log do navegador num hot reload, com o pai
     ainda mandando o filho novo sem a prop. Uma linha de defesa; o laço segue
     circular. */
  const current = Number.isInteger(active) ? ((active % count) + count) % count : 0;

  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [stopped, setStopped] = useState(false);

  const [touching, setTouching] = useState(false);

  /* Relógio só à vista: fora da tela o carrossel andaria para ninguém, e o
     portão de performance conta um relógio por viewport. */
  const stageRef = useRef<HTMLDivElement>(null);
  const onScreen = useInView(stageRef, { amount: 0.4 });

  /* O dedo não tem "hover": no celular o rodízio seguia andando por baixo do
     gesto, e o toque parecia ignorado. Enquanto a mão está no palco, o palco é
     da mão. */
  const paused = hovering || focused || tabHidden || touching || stopped || !onScreen;
  const playing = !reduced && !paused;

  /* `useReducedMotion` do motion não serve aqui: este componente é renderizado
     no servidor, e o hook devolve `false` no primeiro render de qualquer forma.
     O listener resolve igual e sem trazer a biblioteca para esta seção. */
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

  const go = useCallback(
    (delta: number) => {
      onSelect((current + delta + count) % count);
    },
    [current, count, onSelect],
  );

  /* Depende do índice ativo, então qualquer interação reinicia o intervalo. */
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => go(1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, current, go]);

  /* Arraste: só o eixo horizontal.

     O palco acompanha o dedo enquanto ele anda, com resistência, e ao soltar
     anda um card no sentido do gesto — arrastou para a esquerda, entra o
     próximo; para a direita, volta o anterior. Vale pelo limiar de distância ou
     por peteleco (gesto curto e rápido), que é como se passa card no celular.

     Durante o arraste a transição sai do caminho, senão cada quadro disputaria
     com a animação de 600 ms. */
  const dragFrom = useRef<number | null>(null);
  const dragAt = useRef(0);
  const captured = useRef(false);
  const [drag, setDrag] = useState(0);

  const onPointerDown = (event: React.PointerEvent) => {
    dragFrom.current = event.clientX;
    dragAt.current = event.timeStamp;
    captured.current = false;
    setTouching(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;

    /* A captura só entra depois que o gesto vira arraste. Capturar no toque
       entregaria o `click` ao palco, e clicar num card lateral para trazê-lo ao
       centro deixaria de funcionar; capturar depois é o que mantém o dedo
       rastreado mesmo saindo do palco no meio do caminho. */
    if (!captured.current && Math.abs(dx) > DRAG_START_PX) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Ponteiro já solto, ou id que o navegador não reconhece: segue sem
           captura, que é o comportamento de antes. */
      }
      captured.current = true;
    }

    setDrag(dx * DRAG_FOLLOW);
  };

  const endDrag = (event: React.PointerEvent) => {
    const from = dragFrom.current;
    const since = event.timeStamp - dragAt.current;
    dragFrom.current = null;
    captured.current = false;
    setDrag(0);
    setTouching(false);
    if (from === null) return;

    const dx = event.clientX - from;
    const passou = Math.abs(dx) >= SWIPE_PX;
    const peteleco = Math.abs(dx) >= FLICK_PX && since <= FLICK_MS;
    if (!passou && !peteleco) return;

    go(dx < 0 ? 1 : -1);
  };

  /** Distância até o centro pelo caminho mais curto do círculo. */
  const offsetOf = (index: number) => {
    let delta = index - current;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    return delta;
  };

  const seta =
    "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-ink-800 text-muted transition-colors hover:text-cream";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={features.title}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      {/* Palco. `touch-pan-y` deixa a página rolar na vertical enquanto o
          arraste horizontal fica para o carrossel. */}
      <div
        ref={stageRef}
        className="feature-stage relative touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {items.map((item, index) => {
          const offset = offsetOf(index);
          const distance = Math.abs(offset);
          const depth = DEPTH[Math.min(distance, DEPTH.length - 1)];
          const far = distance >= DEPTH.length;
          const isCenter = distance === 0;

          return (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={item.title}
              aria-hidden={far}
              className={`feature-slot absolute top-0 left-1/2 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                drag ? "" : "transition-[transform,opacity] duration-[600ms]"
              }`}
              style={{
                /* Ordem importa: desloca, afasta no eixo Z, gira no próprio eixo
                   e só então escala. Invertendo, o giro arrastaria o card para
                   fora do lugar. */
                transform: [
                  `translateX(calc(-50% + ${offset} * var(--card-gap) + ${drag}px))`,
                  `translateZ(${depth.push}px)`,
                  `rotateY(${offset < 0 ? depth.turn : -depth.turn}deg)`,
                  `scale(${far ? DEPTH[DEPTH.length - 1].scale : depth.scale})`,
                ].join(" "),
                opacity: far ? 0 : depth.opacity,
                zIndex: far ? 0 : depth.z,
                pointerEvents: far ? "none" : undefined,
              }}
            >
              <button
                type="button"
                tabIndex={isCenter ? 0 : -1}
                aria-current={isCenter}
                onClick={() => !isCenter && onSelect(index)}
                className={`flex h-full w-full flex-col rounded-card p-5 text-left transition-colors duration-[350ms] ${
                  isCenter ? "cursor-default bg-ink-750" : "cursor-pointer bg-ink-800"
                }`}
              >
                <FeatureMockup id={item.id} isCenter={isCenter} />

                {/* O vizinho mostra só a moldura até `lg`, e o corte subiu de
                    `sm` por geometria medida: com card de 16rem, abaixo de
                    1024 não existe espaçamento que ponha o vizinho inteiro no
                    palco E fora do card do meio ao mesmo tempo (um dos dois
                    corta o texto). A partir de `lg` o espaçamento subiu para
                    16.5rem e medem-se 7px livres entre o card do meio e o
                    vizinho, então o texto do vizinho entra inteiro. A decisão é
                    por CSS, não por medida de tela em JavaScript.

                    `my-auto` no lugar de `mt-auto`: os seis cards sem moldura
                    deixavam 179px de vazio ACIMA do h3 (medido a 1440), que
                    lia como mockup faltando; centrado, o vazio é respiro
                    simétrico, e nos cards com moldura o texto segue logo
                    abaixo dela. */}
                <span
                  className={`my-auto block pt-4 ${isCenter ? "" : "hidden lg:block"}`}
                >
                  <span className="t-h3 block text-cream">{item.title}</span>
                  <span className="mt-2 block text-[15px] leading-[1.45] text-muted">
                    {item.description}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Progresso e controles numa linha só a partir de `sm`: eram duas, e a
          seção precisa dos 64px que elas gastavam. Os dez pontos de 6px viraram
          dez segmentos — além de dizer onde estamos, o ativo mostra quanto
          falta do intervalo. */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
        <SegmentProgress
          className="min-w-0 flex-1"
          count={count}
          active={current}
          durationMs={AUTOPLAY_MS}
          paused={paused}
          labelLeft={items[current].title}
          labelRight={`${current + 1} ${ui.of} ${count}`}
        />

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => go(-1)} aria-label={features.prev} className={seta}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label={features.next} className={seta}>
            <ArrowRight className="h-4 w-4" />
          </button>
          <PauseButton
            className="ml-2"
            pressed={stopped}
            onToggle={() => setStopped((value) => !value)}
            labels={{ pause: ui.pause, play: ui.play }}
          />
        </div>
      </div>

      {/* Para leitor de tela, a posição em texto */}
      <p className="sr-only" aria-live={paused ? "polite" : "off"}>
        {current + 1}/{count} — {items[current].title}
      </p>
    </div>
  );
}
