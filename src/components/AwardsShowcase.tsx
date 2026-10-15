"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useContent } from "@/i18n";
import { useOnScreen } from "@/lib/useOnScreen";
import { arte } from "@/lib/arte";
import { PauseButton } from "./PauseButton";

/** O three fica fora do bundle inicial e nunca roda no servidor. */
const AwardPlaque3D = dynamic(() => import("./AwardPlaque3D"), {
  ssr: false,
  loading: () => <PlaqueSkeleton />,
});

/**
 * O compasso da vitrine: 5,8 s.
 *
 * Não é um número escolhido aqui — é o ciclo da cena 3D: `TROCA` em
 * `AwardPlaque3D` é `parada: 4.2` mais `passo: 1.6`, o tempo que a placa fica
 * parada no posto mais a travessia até o outro. Trocar de marco em qualquer
 * outro intervalo (eram 4,2 s) pegava a placa no meio do caminho: a arte
 * cruzava enquanto a peça andava, e a joia que saía encolhia durante a
 * travessia.
 *
 * Quem conta não é um `setTimeout` daqui: é a própria cena, pelo `onCycle` do
 * `AwardPlaque3D`, que avisa quando cada travessia termina. Um relógio local
 * (medido: 1,3 s de diferença) começava na hidratação, e o da cena no primeiro
 * quadro — depois do download do three —, então a troca ia parar no meio da
 * travessia. Este número ficou só para a barra da rail, que preenche por CSS no
 * mesmo tempo.
 *
 * Mexeu em `TROCA` lá, mexa aqui — e vice-versa.
 */
const CICLO_MS = 5800;

/** O marco em que a vitrine abre: o 100K (veja o `useState` lá embaixo). */
const ABERTURA = 1;

/**
 * Quanto dura o crossfade da ficha ao trocar de marco.
 *
 * As quatro fichas ficam as quatro no DOM, empilhadas na MESMA célula da grade
 * (`[grid-area:1/1]`), e só a do marco ativo está visível. É isso, e não a
 * duração, que garante CLS zero: a célula tem sempre a altura da ficha mais
 * alta das quatro, e trocar de marco não mexe num pixel de layout — nem com o
 * relógio andando sozinho. Trocar isto por `AnimatePresence mode="wait"`
 * devolveria o salto de altura.
 */
const FICHA_MS = 350;

function PlaqueSkeleton() {
  /* Sem pulso: a entrada da página não anima nada, e um esqueleto que pisca é
     movimento sem informação. A caixa do canvas já reserva a altura (aspect
     square), então trocar o esqueleto pela cena não mexe no layout. */
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-48 w-36 rounded-card bg-ink-800" />
    </div>
  );
}

/**
 * A vitrine dos marcos: o numeral do marco, a ficha do troféu e o palco em 3D
 * ao lado, sobre o chão quente da seção (`--floor`).
 *
 * A DISPOSIÇÃO, refeita em 15/10 com o pedido do dono ("essa sessão é a mais
 * importante… capriche na disposição dessa sessão"):
 *
 *  - o PALCO cresceu de 480 para 560 px a 1440 e passou a ser o assunto. A
 *    caixa continua `aspect-square` e cravada por breakpoint, porque é ela que
 *    reserva a altura antes de o three existir — CLS 0;
 *  - a COLUNA DE TEXTO (cols 1–5) ficou VERTICALMENTE CENTRADA contra o palco,
 *    e isso sai da grade, não de um `translate`: o palco ocupa as duas linhas,
 *    o numeral fica na linha 1 com `self-end` e a ficha na linha 2 com
 *    `self-start`. O CSS reparte a sobra de altura de um item que atravessa
 *    duas trilhas `auto` IGUALMENTE entre as duas, então o par numeral+ficha
 *    assenta exatamente no meio do palco — e a ordem do DOM continua sendo a do
 *    celular (numeral → palco → ficha → rail), que é o que o pedido manda;
 *  - a ficha virou o que o nome diz: título, linha de marco, subtítulo,
 *    descrição e, separado por régua, o item físico;
 *  - a RAIL desceu para a largura inteira da seção, com quatro abas grandes —
 *    numeral, nome do troféu e o marco em dólar — em vez da fileira de rótulos
 *    de 13px que havia.
 *
 * O que saiu, antes disto: a barra redesenhada a cada 40 ms (com
 * `role=progressbar`, que faz o leitor de tela anunciar "carregando" sobre uma
 * seleção), os dois halos de 110 e 150px, o card com sombra e degradê por cima
 * do chão, e a pílula "Wone Club" com desfoque flutuando sobre o render.
 *
 * A cena 3D (`AwardPlaque3D`) tem relógio próprio e avisa o fim de cada
 * travessia (`onCycle`); é esse aviso que troca o marco aqui. A vitrine não tem
 * relógio seu.
 */
export function AwardsShowcase() {
  const { awards, ui } = useContent();

  // `next/dynamic` só adia o download até o componente RENDERIZAR — e ele
  // renderizaria de imediato, mesmo com a seção fora da tela, trazendo os
  // ~960KB do three para o carregamento inicial. Montar o canvas apenas quando
  // a seção se aproxima é o que de fato tira esse peso da primeira visita.
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useOnScreen(stageRef, { once: true, margin: "600px" });
  /* Este não é `once`: fora da tela, a placa para de girar. */
  const onScreen = useOnScreen(stageRef, { amount: 0.2 });

  /* Com a seção à vista, as artes das outras placas já vão para o cache do
     navegador. Assim a troca de prêmio não espera rede nenhuma — é o que, junto
     com a travessia cruzada lá no `AwardPlaque3D`, tira o molde vazio do meio
     do caminho. */
  useEffect(() => {
    if (!near) return;

    awards.items.forEach((item) => {
      /* A arte impressa da placa e a foto da joia: as duas entram em cena na
         troca de marco, então as duas precisam já estar no cache quando ela
         acontecer. Quem é pré-carregado é o `print` — a arte que é impressa na
         FACE do bloco de acrílico —, não o `image`: desde que a placa virou
         geometria de verdade, a ilustração inteira do troféu só serve de
         fallback 2D e não é pedida por esta cena. */
      [item.print, item.photo].forEach((src) => {
        if (!src) return;
        const probe = new window.Image();
        /* O mesmo endereço carimbado que a cena 3D vai pedir: sem o carimbo,
           isto aqueceria uma entrada de cache que ninguém usa. */
        probe.src = arte(src);
      });
    });
  }, [near, awards.items]);

  const count = awards.items.length;
  /* Abre no 100K, o marco da joia vestida: é o único em que a cena mostra as
     duas peças revezando os postos, e é o que a vitrine tem de mais seu. Daí
     a volta segue 100K → 500K → 1M → 10K. */
  const [active, setActive] = useState(ABERTURA);

  /* São DOIS motivos para o rodízio parar, e eles não pedem a mesma coisa da
     cena — por isso não cabem no mesmo estado:

     `pausado` é o `PauseButton`. Ele para tudo o que anda aqui: o rodízio de
     marcos E a cena, que continuava balançando a placa e trocando as peças de
     posto a cada 5,8 s com o botão pressionado. Era o maior movimento da
     seção seguindo em frente embaixo de um controle que prometia o contrário.

     `escolhido` é o primeiro toque numa aba. Encerra o rodízio — a partir dali
     quem escolhe o marco é o visitante, e uma vitrine que continuasse andando
     tiraria da tela o que ele acabou de pedir —, mas não congela o objeto:
     ninguém pediu para parar a cena, só para ficar neste marco. */
  const [pausado, setPausado] = useState(false);
  const [escolhido, setEscolhido] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* `useReducedMotion` do motion devolve valor diferente no servidor e no
     primeiro render do cliente; aqui o preferido alimenta só o relógio, e vem
     do `matchMedia` depois da montagem, como nas outras seções que andam.

     Com movimento reduzido a cena fica em `frameloop="demand"` e quase não
     manda aviso nenhum; "quase" não basta — uma troca de textura invalida um
     quadro, e esse quadro traria o ciclo inteiro acumulado de uma vez. */
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

  /* Fora da tela o relógio também para: o portão pede nenhum relógio rodando
     com a seção escondida ou com a aba em segundo plano. Com a cena no comando,
     os dois primeiros casos já vêm de graça — sem quadro não há aviso —, e este
     `relogioParado` é o que segura a escolha do visitante e a barra da rail. */
  const relogioParado = pausado || escolhido || tabHidden || !onScreen;

  /* Lido dentro do aviso da cena, que não é recriado a cada render. */
  const travadoRef = useRef(true);
  useEffect(() => {
    travadoRef.current = relogioParado || reduced;
  }, [relogioParado, reduced]);

  /**
   * Quantas vezes a cena começou a contar: uma no primeiro quadro e outra a
   * cada vez que o laço de render recomeça (o relógio do three zera quando o
   * `frameloop` volta de `demand` para `always`, ao reentrar na tela). A barra
   * da rail remonta junto, e é só por isso que ela acompanha a cena.
   */
  const [epoca, setEpoca] = useState(0);

  const aoCiclo = useCallback(
    (volta: number) => {
      /* Volta 0 é o primeiro quadro desta contagem: não troca de marco, só
         acerta a barra. */
      if (volta === 0) {
        setEpoca((atual) => atual + 1);
        return;
      }
      if (travadoRef.current) return;
      setActive((current) => (current + 1) % count);
    },
    [count],
  );

  /* O primeiro toque numa aba encerra o relógio. O `PauseButton` ao lado volta
     a soltar: "retomar" devolve o rodízio inteiro, não só o movimento da cena. */
  const escolher = (indice: number) => {
    setActive(indice);
    setEscolhido(true);
  };

  const alternarPausa = () => {
    if (pausado) {
      setPausado(false);
      /* Sair da pausa devolve o rodízio: soltar o objeto e deixar os marcos
         presos onde o visitante os deixou seria metade do que "retomar" diz. */
      setEscolhido(false);
    } else {
      setPausado(true);
    }
  };

  const item = awards.items[active];
  /* Sem relógio — escolha do visitante, pausa ou movimento reduzido —, o
     segmento do marco fica cheio em vez de congelar vazio: ele passa a marcar a
     seleção, não uma contagem. */
  const correndo = !(pausado || escolhido || reduced);

  /* `grid-cols-1` no celular NÃO é redundante, e a falta dele custou uma
     captura: sem colunas declaradas, o grid cria uma trilha implícita `auto`, e
     trilha `auto` é dimensionada pelo MAX-CONTENT dos itens — ela ESTOURA o
     container em vez de respeitá-lo. A rail tem quatro abas de 11rem mais o
     botão, 884px de max-content, e era isso que a coluna media a 412: o palco
     saía 237px à direita e metade dele ficava fora da tela. `grid-cols-1` é
     `minmax(0, 1fr)` em Tailwind, e o zero do mínimo é exatamente o que impede
     o estouro. O mesmo vale para a grade empilhada das fichas, lá embaixo. */
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:gap-y-8 lg:grid-cols-12 lg:gap-y-0">
      {/* O NUMERAL DO MARCO: o único 700 da página junto com a tese, em largura
          fixa de 4.2ch para que trocar "1M" por "100K" não empurre o texto. O
          teto de largura é a coluna: a 1440 os 4.2ch do corpo de 176px dão
          512px e a coluna tem 488, e o número vazava para dentro do vão.

          Creme nos quatro, e não o `accent` de cada marco: os accents são as
          cores do material de cada troféu (bronze, acrílico, ouro) e já fazem
          esse trabalho dentro da cena, nas luzes e no metal. Em 176px, no maior
          elemento da seção, eles trariam três cores que a página não tem para
          um site de duas, e só o 1M cairia no laranja — que aqui significa
          "ativo" em todo o resto (inclusive no segmento da rail logo abaixo).

          `self-end` na linha 1: é metade da centralização vertical da coluna de
          texto. Veja o cabeçalho do componente. */}
      <p
        className="tnum max-w-full font-bold leading-[0.85] text-cream lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-end"
        style={{ fontSize: "clamp(5rem, 14vw, 11rem)", width: "4.2ch" }}
      >
        {item.tier}
      </p>

      {/* O PALCO. A ordem do DOM é a do celular — numeral → palco → ficha →
          rail —, e no desktop a grade recoloca cada peça: o palco passa a
          ocupar as colunas 6–12 nas duas linhas, e é a altura dele que a coluna
          de texto usa de régua. */}
      <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
        <div
          ref={stageRef}
          /* A caixa do palco é SEMPRE quadrada e cravada por breakpoint — nunca
             por `vw` —, porque é ela que reserva a altura antes de o three
             baixar: 380 no celular, 560 a partir de `lg`.

             As sete colunas inteiras dariam 696px a 1440. 600 foi o alvo e
             mediu-se a seção inteira em 1.244px — acima do teto de 1.200 que ela
             tem; 560 fecha em 1.204 e continua 17% maior que os 480 de ontem. O
             que não dá para pagar não é o palco, é o resto: o ritmo vertical da
             página vem de `--secao-y` (128px em cima e embaixo a 1440) e o H2
             desta seção ocupa três linhas — 463 dos 1.204 são cabeçalho e
             respiro, antes de a vitrine começar. */
          className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[560px]"
        >
          {near ? (
            <AwardPlaque3D
              accent={item.accent}
              print={item.print}
              photo={item.photo}
              worn={item.photoWorn}
              /* `visible` é o que decide o `frameloop` lá dentro: `false` põe a
                 cena em "demand", ela congela no quadro em que está e para de
                 avisar. É assim que o "pausar" alcança o objeto sem tocar na
                 cena — nada de geometria, material, câmera, tempo ou imagem
                 muda, é o laço de render que para. Trocar de marco pausado
                 ainda redesenha: a mudança de prop invalida um quadro. */
              visible={onScreen && !pausado}
              onCycle={aoCiclo}
            />
          ) : (
            <PlaqueSkeleton />
          )}

          {/* Horizonte de 1px na QUINA DA FRENTE DO PÓDIO — não no rodapé da
              caixa, onde ele lia como borda do quadrado.

              Os 4,8% saem da projeção, não do olho: o pódio é um cilindro em
              y = −1.58 com 0.221 de altura e base 1.122 (`AwardPlaque3D`), então
              a quina da frente da base está em (−1.69, z = 1.122); com a câmera
              em (0, −0.42, 6.4) olhando para a origem e fov 38°, esse ponto cai
              a 4,8% do fundo do quadrado — 27px dos 560 a 1440. A fração vale em
              qualquer largura: a câmera é fixa e a caixa é quadrada, então a
              cena projeta sempre na mesma fração. */}
          <span aria-hidden className="absolute inset-x-0 bottom-[4.8%] h-px bg-cream/12" />
        </div>
      </div>

      {/* A FICHA: as quatro na mesma célula, em crossfade de 350 ms.

          `self-start` na linha 2 — a outra metade da centralização vertical da
          coluna de texto (veja o cabeçalho). */}
      <div className="grid grid-cols-1 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:mt-7 lg:self-start">
        {awards.items.map((entry, indice) => (
          <div
            key={entry.tier}
            aria-hidden={indice !== active}
            className={`[grid-area:1/1] transition-[opacity,transform] ease-[var(--ease-out-expo)] ${
              indice === active
                ? "opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
            style={{ transitionDuration: `${FICHA_MS}ms` }}
          >
            <h3 className="t-h3 text-cream">{entry.title}</h3>
            {/* O marco em dólar é uma linha de rótulo, não parte do título: o
                '•' que os separava não volta. */}
            <span className="t-label mt-2 block">{entry.milestoneLine}</span>

            <p className="mt-4 text-[15px] font-semibold text-cream">{entry.subtitle}</p>
            {/* 26rem de medida: a coluna tem 488px a 1440, e um parágrafo de
                15px correndo os 488 inteiros passa dos 75 caracteres por linha.
                O teto cai dentro da coluna, não a aperta. */}
            <p className="mt-2 max-w-[26rem] text-[15px] leading-relaxed text-muted">
              {entry.description}
            </p>

            <div className="mt-7 border-t border-line pt-5">
              <span className="t-label block">{awards.physicalItem}</span>
              <p className="mt-2 text-[16px] font-medium text-cream">{entry.awardItem}</p>
            </div>
          </div>
        ))}
      </div>

      {/* A RAIL, em largura total e abaixo do palco. */}
      <div className="lg:col-span-12 lg:col-start-1 lg:row-start-3 lg:mt-8">
        <MarcoRail
          items={awards.items}
          active={active}
          onSelect={escolher}
          /* A barra remonta a cada vez que a cena começa a contar: a animação de
             CSS do segmento nasce com o HTML, muito antes do canvas, e sem este
             reinício a primeira barra terminava com a cena ainda no meio da
             primeira parada. Daí em diante cada troca já remonta o segmento. */
          epoca={epoca}
          durationMs={correndo ? CICLO_MS : undefined}
          /* Antes do primeiro quadro da cena a barra fica parada no zero: não há
             relógio nenhum andando ainda. */
          paused={relogioParado || epoca === 0}
          pause={
            <PauseButton
              pressed={pausado}
              onToggle={alternarPausa}
              labels={{ pause: ui.pause, play: ui.play }}
            />
          }
        />
      </div>
    </div>
  );
}

/**
 * A rail dos quatro marcos: indicador e controle na mesma peça.
 *
 * Por que não é o `SegmentProgress` da página: aquele componente serve a outras
 * três seções e a aba dele é um rótulo de 13px com um fio embaixo. Aqui a aba
 * passou a ser a FICHA CURTA do marco — numeral, nome do troféu e o marco —,
 * porque é com ela que o visitante escolhe o que vai aparecer no palco, e um
 * "500K" solto não diz qual troféu é. Mudar o componente compartilhado para
 * atender a este caso daria a Recursos, Segurança e Pagamentos três linhas de
 * texto que nenhuma delas tem.
 *
 * O preenchimento do segmento ativo continua sendo o `@keyframes segment-fill`
 * de `globals.css`, o mesmo de lá: animação de CSS, que roda fora da thread
 * principal, e `animation-play-state: paused` congela onde está em vez de voltar
 * a zero. Movimento reduzido não precisa de tratamento — a regra global zera a
 * duração de toda animação e o segmento nasce cheio.
 *
 * No celular a fileira ROLA, com `scroll-snap` em cada aba: quatro fichas de
 * três linhas não cabem em 412px, e espremê-las levaria o numeral do marco
 * abaixo do tamanho em que ele se lê. O `PauseButton` sai da rolagem e fica
 * ancorado à direita, onde o polegar o encontra sempre no mesmo lugar.
 */
function MarcoRail({
  items,
  active,
  onSelect,
  epoca,
  durationMs,
  paused,
  pause,
}: {
  items: readonly { tier: string; title: string; milestoneLine: string }[];
  active: number;
  onSelect: (indice: number) => void;
  epoca: number;
  durationMs?: number;
  paused?: boolean;
  pause: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch gap-4 sm:gap-6">
      {/* `-mx-4 px-4` no celular: a rolagem sangra até o gutter da seção, então
          a quarta aba não fica cortada por uma borda invisível no meio da tela.
          A partir de `sm` não há rolagem e as margens negativas somem. */}
      <div
        role="tablist"
        className="-mx-4 flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:snap-none sm:gap-6 sm:overflow-visible sm:px-0"
      >
        {items.map((entry, indice) => {
          const ativo = indice === active;
          return (
            <button
              key={entry.tier}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => onSelect(indice)}
              /* `pt-4 pb-3` leva o alvo de toque bem além dos 44px sem mexer na
                 espessura do fio. `w-[11rem]` no celular dá à aba a largura de
                 uma ficha legível e é o passo do snap; de `sm` em diante as
                 quatro dividem a linha em partes iguais. */
              className={`group w-[11rem] shrink-0 snap-start pt-3 pb-2 text-left transition-colors sm:w-auto sm:min-w-0 sm:flex-1 ${
                ativo ? "text-cream" : "text-faint hover:text-cream"
              }`}
            >
              <span className="tnum block text-[1.5rem] font-semibold leading-none">
                {entry.tier}
              </span>
              <span
                className={`mt-2 block truncate text-[13px] ${
                  ativo ? "text-cream" : "text-faint group-hover:text-muted"
                }`}
              >
                {entry.title}
              </span>
              <span className="t-label mt-1 block truncate">{entry.milestoneLine}</span>
              <span className="mt-3 block h-0.5 overflow-hidden rounded-full bg-cream/12">
                <Preenchimento
                  key={ativo ? `${epoca}-${active}` : undefined}
                  estado={indice < active ? "cheio" : ativo ? "correndo" : "vazio"}
                  durationMs={durationMs}
                  paused={paused}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* Alinhado pela base do fio das abas: a rail é uma linha só, e o botão é
          parte dela. */}
      <div className="flex shrink-0 items-end pb-2">{pause}</div>
    </div>
  );
}

/** O preenchimento de um segmento da rail. */
function Preenchimento({
  estado,
  durationMs,
  paused,
}: {
  estado: "cheio" | "correndo" | "vazio";
  durationMs?: number;
  paused?: boolean;
}) {
  if (estado === "vazio") return null;
  /* Marco já visto, ou seleção sem relógio: o segmento fica cheio. */
  if (estado === "cheio" || !durationMs) return <span className="block h-full bg-brand" />;

  return (
    <span
      className="block h-full origin-left bg-brand"
      style={
        {
          "--dur": `${durationMs}ms`,
          animation: "segment-fill var(--dur) linear forwards",
          animationPlayState: paused ? "paused" : "running",
        } as CSSProperties
      }
    />
  );
}
