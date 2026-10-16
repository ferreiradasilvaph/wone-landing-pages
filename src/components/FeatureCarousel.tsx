"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { useContent } from "@/i18n";
import { useOnScreen } from "@/lib/useOnScreen";
import { Chip } from "./Chip";
import { SegmentProgress } from "./SegmentProgress";

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
 * A PLACA DE SIMULAÇÃO que abre o card, na forma Operação da referência: uma
 * moldura escura com um pedaço de produto dentro, e o título embaixo.
 *
 * Desde 15/10 ela está nos DEZ cards, e é pedido do dono, literal: "na sessão
 * recursos adicione a placa de simulação em todos os cards e melhore o visual
 * desses cards". Eram quatro — os únicos para os quais existia dado pronto no
 * dicionário —, e os outros seis ficavam com um vazio onde os vizinhos tinham
 * objeto: na fileira do carrossel isso lia como card quebrado.
 *
 * O que NÃO mudou é de onde vem o dado. Nenhum número ou nome foi cunhado aqui
 * (regra 4): os valores saem de `phone.transactions` (a mesma lista de vendas
 * do telefone do hero), os nomes de bloco de `highlights.demos.blocks`, o
 * "Convite enviado · Acesso liberado" de `highlights.demos.delivery` e o
 * símbolo da moeda de `payments.table.countries`. O que entrou novo em
 * `features.mockup` é só RÓTULO — as palavras que a placa precisa para dizer o
 * que está mostrando ("Comprou", "Recusou", "Teste A/B", "Sem cobrança real",
 * "Valor que o cliente escolher"), nunca um fato.
 *
 * O "PIX livre" é o caso que mostra a regra em pé: a faixa de valor continua
 * não existindo em pt.ts, então a placa dele mostra o MECANISMO — o campo
 * aberto, com o símbolo da moeda e o cursor — e nenhum número.
 *
 * `h-[45%]` e não altura fixa: a moldura acompanha o card, que muda de medida
 * entre celular e desktop. O cabeçalho da placa (rótulo "Simulação" à esquerda,
 * número do recurso à direita, régua embaixo) é o que a fez virar PLACA e não
 * caixa: é a mesma anatomia dos painéis das demos da página.
 */
function FeatureMockup({
  id,
  index,
  isCenter,
}: {
  id: string;
  index: number;
  isCenter: boolean;
}) {
  const { features, highlights, payments, phone, ui } = useContent();
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

  /* ---------------------------------------------------------------------
     As SEIS placas que entraram em 15/10, com o dono pedindo a placa de
     simulação nos dez cards. Cada uma mostra o mecanismo do recurso com dado
     que já existia em outro bloco do dicionário — e, onde não existe número
     (o PIX livre), mostra o campo vazio em vez de inventar um.
     --------------------------------------------------------------------- */

  if (id === "upsell") {
    /* Os dois caminhos depois do checkout, lado a lado: quem comprou vê a
       oferta maior (o plano anual), quem recusou vê a menor (o mensal). Os dois
       preços são os de `phone.transactions`, e a seta diz para que lado a
       oferta vai — é o `Upsell`/`Downsell` do editor em duas linhas. */
    conteudo = (
      <ul className="flex flex-col gap-1.5">
        {[
          { rot: features.mockup.bought, i: TX.anual, up: true },
          { rot: features.mockup.declined, i: TX.mensal, up: false },
        ].map((caminho) => (
          <li key={caminho.rot} className={`${linha} rounded-[8px] bg-cream/6 px-2 py-1`}>
            <span className="flex min-w-0 items-center gap-1.5">
              {caminho.up ? (
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />
              ) : (
                <ArrowDownRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-faint" />
              )}
              <span className={rotulo}>{caminho.rot}</span>
            </span>
            <span className={valor}>{tx[caminho.i].amount}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (id === "openPix") {
    /* A faixa de valor do PIX livre NÃO existe em pt.ts, e continua não
       existindo: a placa mostra o campo aberto — o símbolo da moeda do Brasil
       (de `payments.table.countries`, onde o PIX é o método) e o cursor —, e
       quem escreve o número é o cliente. Zero número cunhado. */
    conteudo = (
      <div className="flex flex-col gap-2 px-2">
        <div className="flex items-center gap-2 rounded-[8px] bg-cream/6 px-2.5 py-2">
          <span className="text-[15px] font-semibold text-cream">
            {payments.table.countries[0].symbol}
          </span>
          <span aria-hidden className="h-4 w-px bg-brand" />
        </div>
        <span className="text-[13px] leading-snug text-muted">
          {features.mockup.freeAmount}
        </span>
      </div>
    );
  }

  if (id === "testMode") {
    /* O plano mensal com o valor RISCADO e o aviso: no modo de teste o funil
       inteiro roda e a cobrança não acontece. */
    conteudo = (
      <div className="flex flex-col gap-2 px-2">
        <div className={linha}>
          <span className={rotulo}>{tx[TX.mensal].label}</span>
          <span className="tnum shrink-0 text-[13px] font-semibold text-faint line-through">
            {tx[TX.mensal].amount}
          </span>
        </div>
        <Chip tone="warn" className="self-start">
          {features.mockup.noCharge}
        </Chip>
      </div>
    );
  }

  if (id === "remarketing") {
    /* O teste A/B em duas réguas: o tráfego reparte entre dois caminhos, e os
       nomes das saídas são os do editor (`branchA`/`branchB`). Sem porcentagem
       escrita — a divisão se vê, e um "50%" aqui seria número sem fonte. */
    conteudo = (
      <div className="flex flex-col gap-2.5 px-2">
        <span className={rotulo}>{features.mockup.abTest}</span>
        <ul className="flex flex-col gap-2">
          {[
            { nome: highlights.demos.blocks.builder.branchA, forte: true },
            { nome: highlights.demos.blocks.builder.branchB, forte: false },
          ].map((saida) => (
            <li key={saida.nome} className="flex items-center gap-2.5">
              <span className="t-label w-3 shrink-0">{saida.nome}</span>
              <span aria-hidden className="h-1.5 flex-1 rounded-full bg-line-track">
                <span
                  className={`block h-full w-1/2 rounded-full ${
                    saida.forte ? "bg-brand" : "bg-cream/25"
                  }`}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (id === "delivery") {
    /* As duas pontas da entrega, com as palavras da demo de entrega: o convite
       sai e o acesso está liberado. */
    conteudo = (
      <div className="flex flex-col gap-2 px-2">
        <span className={rotulo}>
          {highlights.demos.delivery.steps[3].label}
        </span>
        <Chip tone="ok" className="self-start">
          {highlights.demos.delivery.done}
        </Chip>
      </div>
    );
  }

  if (id === "ai") {
    /* Os quatro blocos de IA, com os nomes que o editor usa. A categoria de IA
       é a ÚLTIMA de `blocks.categories` por construção (ela fecha a lista dos
       28 nos dois idiomas); se um dia deixar de ser, a placa fica vazia em vez
       de mostrar bloco errado — e vazio se vê na revisão, bloco errado não. */
    const ia = highlights.demos.blocks.categories.at(-1);
    conteudo = ia ? (
      <ul className="grid grid-cols-2 gap-1.5">
        {ia.items.slice(0, 4).map((bloco) => (
          <li
            key={bloco.name}
            className="rounded-[8px] bg-cream/6 px-2 py-1.5 text-[13px] leading-tight text-cream"
          >
            {bloco.name}
          </li>
        ))}
      </ul>
    ) : null;
  }

  if (!conteudo) return null;

  return (
    /* A única exceção de card dentro de card do site: a moldura de objeto é
       ink-950 com `border-line` e raio de campo, sobre o card de qualquer tom
       (espec-final, item 10).
       O fio de creme a 5% no alto (`inset 0 1px 0`) é o que dá ao vidro da
       placa a borda iluminada de cima — 1px de linha, não um blur nem um
       degradê sobre o card (regra 8 continua em pé). */
    <div className="flex h-[45%] shrink-0 flex-col overflow-hidden rounded-field border border-line bg-ink-950 shadow-[inset_0_1px_0_rgba(255,255,227,0.05)]">
      {/* No vizinho fica a moldura VAZIA, e é o que a tarefa pede ("vizinhos só
          com a moldura"): abaixo de `lg` o card do meio cobre a borda do
          vizinho, e o que sobrava à vista era "Pack avulso" cortado pela borda
          da tela de 412 ou pelo card central. Mesmo ponto de corte do texto do
          card, abaixo, para os dois sumirem juntos. */}
      {/* O CABEÇALHO DA PLACA: "Simulação" à esquerda, o número do recurso à
          direita, régua embaixo. É a mesma anatomia dos painéis de demo da
          página, e é o que faz as dez placas lerem como o mesmo objeto — o
          número também diz, de dentro do card, em que ponto dos dez se está. */}
      <div
        className={`items-center justify-between gap-2 border-b border-line px-3 py-1.5 ${
          isCenter ? "flex" : "hidden lg:flex"
        }`}
      >
        <span className="t-label">{ui.simulation}</span>
        <span className="tnum text-[13px] text-faint">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div
        className={`min-h-0 flex-1 flex-col justify-center p-3 ${
          isCenter ? "flex" : "hidden lg:flex"
        }`}
      >
        {conteudo}
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

  const [touching, setTouching] = useState(false);

  /* Relógio só à vista: fora da tela o carrossel andaria para ninguém, e o
     portão de performance conta um relógio por viewport. */
  const stageRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(stageRef, { amount: 0.4 });

  /* O dedo não tem "hover": no celular o rodízio seguia andando por baixo do
     gesto, e o toque parecia ignorado. Enquanto a mão está no palco, o palco é
     da mão. */
  const paused = hovering || focused || tabHidden || touching || !onScreen;
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
                /* A BORDA entrou em 15/10, com "melhore o visual desses cards":
                   sobre o ink-850 da seção, o degrau de tom sozinho dava ao
                   card do meio uma silhueta de 4px de contraste, e no giro dos
                   vizinhos a quina do card desaparecia no fundo. 1px de
                   `border-line` desenha o objeto; no card do meio ela é a
                   `border-line-strong`, que é a mesma linha do cabeçalho de
                   tabela — nada de laranja e nada de brilho, o tom continua
                   sendo quem diz qual card está ativo. */
                className={`flex h-full w-full flex-col rounded-card border p-5 text-left transition-colors duration-[350ms] ${
                  isCenter
                    ? "cursor-default border-line-strong bg-ink-750"
                    : "cursor-pointer border-line bg-ink-800"
                }`}
              >
                <FeatureMockup id={item.id} index={index} isCenter={isCenter} />

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
                    abaixo dela.

                    `max-lg:sr-only` no lugar de `hidden lg:block`, e é aqui que
                    a acessibilidade fecha em 100: a única auditoria que falhava
                    era `button-name`, em 4 nós, exatamente estes (medido em
                    14/10). Conteúdo em `display: none` não nomeia nada, então a
                    412px os botões fora do centro ficavam sem nome acessível —
                    e o `aria-label` do `<div>` em volta não serve, ele é o
                    rótulo do `role="group"`, não do botão.

                    `sr-only` tira o texto da tela do mesmo jeito (posição
                    absoluta, 1px, recortado) e o mantém na árvore de
                    acessibilidade, que é o que dá nome ao botão. Em `lg` não
                    entra variante nenhuma, então `my-auto block pt-4` fica
                    intacto — era o risco de usar `lg:not-sr-only`, que zera
                    `padding` e `margin` e desmontaria o respiro do card.

                    Pôr `aria-label={item.title}` no botão também fecharia o
                    `button-name`, e foi medido: cria `label-content-name-
                    mismatch` (peso 0, mas defeito real). O nome passava a ser
                    só "Order bump" enquanto o card diz "Order bump · Já está
                    pagando? ..." — quem usa comando de voz fala o que vê e não
                    acerta o alvo. */}
                <span
                  className={`my-auto block pt-4 ${isCenter ? "" : "max-lg:sr-only"}`}
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
        </div>
      </div>

      {/* Para leitor de tela, a posição em texto */}
      <p className="sr-only" aria-live={paused ? "polite" : "off"}>
        {current + 1}/{count} — {items[current].title}
      </p>
    </div>
  );
}
