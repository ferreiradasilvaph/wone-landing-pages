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

/* --------------------------------------------------------------------------
   OS NOMES DOS PAINÉIS

   A rail é uma `tablist` de verdade, e uma aba precisa dizer o que ela comanda.
   O que ela comanda são DUAS caixas que não se tocam na grade — a ficha do marco
   (coluna 1) e o palco (coluna 6) —, então `aria-controls` de cada aba lista as
   duas: o atributo aceita vários ids, e é exatamente para este caso.

   As fichas são quatro, uma por marco, e cada uma é o painel da sua aba. O palco
   é UM para os quatro: quem o nomeia é `aria-labelledby` apontando para a aba
   ATIVA, que é a única resposta honesta para "de quem é este palco agora".
   -------------------------------------------------------------------------- */
const idAba = (indice: number) => `premios-marco-${indice}`;
const idFicha = (indice: number) => `premios-ficha-${indice}`;
const ID_PALCO = "premios-palco";

/**
 * O SIMULADOR: faixa, passo e abertura do controle de faturamento.
 *
 * Pedido do dono, 15/10: "deixe essa sessão mais interativa". A vitrine mostrava
 * quatro troféus que chegam na casa de quem fatura; o que ela não dizia é QUANDO
 * — e a conta que responde isso é uma divisão, não uma promessa (é o que a nota
 * do bloco diz, em uma linha).
 *
 * `min` em mil dólares por mês porque abaixo disso o 1M sai em 84 anos e a linha
 * deixa de informar; `max` em cem mil porque é onde o primeiro marco cai em um
 * mês e a régua inteira se resolve. `passo` de 500 dá 199 paradas — fino o
 * bastante para o polegar não pular meses de uma vez, grosso o bastante para o
 * teclado (uma seta, um passo) chegar ao fim da faixa.
 *
 * `abertura` em cinco mil: é a casa em que os quatro marcos ainda estão todos à
 * frente (2, 20, 100 e 200 meses), então o bloco abre dizendo o que ele é — uma
 * régua de distâncias —, e não com metade das linhas já apagada.
 */
const SIMULADOR = { min: 1000, max: 100000, passo: 500, abertura: 5000 };

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
 *
 * O QUE A SEÇÃO PASSOU A RESPONDER (pedido do dono, 15/10: "melhore os títulos
 * de cada placa e deixe essa sessão mais interativa")
 *
 *  - o PALCO se pega com o dedo: arrastar gira a peça inteira (veja `Giro` em
 *    `AwardPlaque3D`), e enquanto o dedo está nela o rodízio PARA — é o que
 *    `onDrag` avisa aqui, e o que entra no `relogioParado` como quinto freio.
 *    Um lembrete de 13px sobre o pé do palco diz que o gesto existe, e some no
 *    primeiro arrasto;
 *  - a RAIL ganhou TECLADO (setas, Home e End, com roving tabindex) e os pares
 *    `aria-controls`/`role=tabpanel` que faltavam entre as abas, as fichas e o
 *    palco;
 *  - e abaixo da ficha entrou o SIMULADOR, que responde a única pergunta que o
 *    visitante faz na frente de uma vitrine de marcos: quando chega o meu.
 *
 * Nenhuma das três tem relógio: o da seção continua sendo um só, o da cena.
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

  /* O TERCEIRO freio do rodízio, e ele é diferente dos outros dois: enquanto o
     dedo gira a peça no palco, trocar a arte debaixo dela tiraria da tela
     exatamente o objeto que a pessoa está examinando. Para no `pointerdown` e
     volta no `pointerup` — não é uma escolha, é um gesto, e gesto não encerra o
     rodízio como o toque numa aba encerra.

     `jaArrastou` é memória de componente, e de propósito: o lembrete "arraste
     para girar" existe para a primeira visita a esta seção, não para a vida do
     navegador. Nada de `localStorage` para apagar uma dica de 13px. */
  const [arrastando, setArrastando] = useState(false);
  const [jaArrastou, setJaArrastou] = useState(false);

  const aoArrastar = useCallback((ativo: boolean) => {
    setArrastando(ativo);
    if (ativo) setJaArrastou(true);
  }, []);

  /* O faturamento mensal do simulador, em dólares. Começa na abertura
     (veja `SIMULADOR`) — o mesmo valor no servidor e no primeiro render. */
  const [mensal, setMensal] = useState(SIMULADOR.abertura);

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
  const relogioParado = pausado || escolhido || tabHidden || !onScreen || arrastando;

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
      {/* A RAIL, em largura total e ACIMA do palco — o dono pediu em 15/10
          que os cards de cada placa, com a linha do tempo, ficassem em cima
          das imagens. No celular ela abre a vitrine; no desktop ocupa a
          linha 1 da grade e empurra numeral, palco e ficha uma linha abaixo. */}
      <div className="lg:col-span-12 lg:col-start-1 lg:row-start-1 lg:mb-8">
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
        className="tnum max-w-full font-bold leading-[0.85] text-cream lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-end"
        style={{ fontSize: "clamp(5rem, 14vw, 11rem)", width: "4.2ch" }}
      >
        {item.tier}
      </p>

      {/* O PALCO. A ordem do DOM é a do celular — numeral → palco → ficha →
          rail —, e no desktop a grade recoloca cada peça: o palco passa a
          ocupar as colunas 6–12 nas duas linhas, e é a altura dele que a coluna
          de texto usa de régua. */}
      {/* `row-span-3` e `self-center` desde o simulador: a coluna de texto
          passou a ter TRÊS peças (numeral, ficha e o simulador na linha 4), e com
          o palco atravessando só duas linhas o bloco do simulador sobrava
          sozinho abaixo dele, com sete colunas de nada à direita. Atravessando as
          três, a altura da seção volta a ser a da coluna mais alta e o palco se
          centra contra ela — é a mesma régua de antes, com uma linha a mais. */}
      <div className="lg:col-span-7 lg:col-start-6 lg:row-span-3 lg:row-start-2 lg:self-center">
        <div
          ref={stageRef}
          id={ID_PALCO}
          /* O palco é o painel da aba ativa — um painel para as quatro abas, e é
              `aria-labelledby` que diz de quem ele é agora (veja `idAba`). */
          role="tabpanel"
          aria-labelledby={idAba(active)}
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
              onDrag={aoArrastar}
            />
          ) : (
            <PlaqueSkeleton />
          )}

          {/* O LEMBRETE do arrasto, sobre o pé do palco.

              Só aparece com a cena montada: sobre o esqueleto ele prometeria um
              gesto que ainda não existe. Some por `opacity` no primeiro arrasto
              — e continua no DOM, apagado, porque remover o nó cortaria o fade
              pela metade (com movimento reduzido a regra global zera a duração e
              ele simplesmente desaparece).

              `aria-hidden` porque é uma instrução de PONTEIRO: quem navega por
              teclado comanda a vitrine pela rail (setas, Home e End), e mandar
              essa pessoa arrastar algo seria mandá-la fazer o que ela não pode.
              `pointer-events-none` pelo motivo gêmeo — o lembrete não pode ser o
              que impede o gesto que ele anuncia. */}
          {near && (
            <span
              aria-hidden
              className={`t-label pointer-events-none absolute inset-x-0 bottom-[6%] text-center transition-opacity ease-[var(--ease-out-expo)] ${
                jaArrastou ? "opacity-0" : "opacity-100"
              }`}
              style={{ transitionDuration: `${FICHA_MS}ms` }}
            >
              {awards.dragHint}
            </span>
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
      <div className="grid grid-cols-1 lg:col-span-5 lg:col-start-1 lg:row-start-3 lg:mt-7 lg:self-start">
        {awards.items.map((entry, indice) => (
          <div
            key={entry.tier}
            id={idFicha(indice)}
            /* Cada ficha é o painel da sua aba. As quatro ficam no DOM (é o que
               dá CLS zero, veja `FICHA_MS`), e as três de fora saem da árvore de
               acessibilidade por `aria-hidden` — painel invisível que um leitor
               de tela ainda lê é a mesma informação quatro vezes. */
            role="tabpanel"
            aria-labelledby={idAba(indice)}
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

      {/* O SIMULADOR, no pé da coluna de texto — linha 4 da grade no desktop,
          abaixo do palco no celular (a ordem do DOM é a do celular). */}
      <div className="lg:col-span-5 lg:col-start-1 lg:row-start-4 lg:self-start">
        <Simulador
          items={awards.items}
          active={active}
          onSelect={escolher}
          mensal={mensal}
          onMensal={setMensal}
          copy={awards.simulator}
          selo={ui.simulation}
        />
      </div>
    </div>
  );
}

/**
 * "QUANDO CHEGA O SEU?" — a régua de distâncias até cada marco.
 *
 * Pedido do dono, 15/10: "deixe essa sessão mais interativa". A vitrine já dizia
 * o que chega na casa de quem fatura; faltava a única pergunta que o visitante
 * faz na frente dela, que é quando.
 *
 * O QUE ELE CALCULA, E O QUE ELE NÃO INVENTA
 *
 * Uma divisão: `meses = teto(marco / faturamento por mês)`. Nada de curva de
 * crescimento, nada de projeção, nada de "no seu ritmo você chegaria em…" — a
 * nota de 13px diz a conta inteira, em uma linha, e o selo `ui.simulation` ao
 * lado do título é o mesmo que o hero usa para dizer que o que está na tela é
 * ficção declarada. Os quatro marcos são os `amount` do dicionário; o único
 * número que este componente cunha é o do controle (veja `SIMULADOR`).
 *
 * POR QUE A ALTURA É FIXA
 *
 * As quatro linhas estão SEMPRE as quatro no DOM, cada uma com altura cravada, e
 * o que muda ao arrastar o controle é só texto dentro delas. Mover um controle
 * que empurra a página para baixo é a forma mais rápida de fazer alguém soltá-lo
 * — e aqui o bloco fica no pé de uma coluna de 700px ao lado de um palco 3D: um
 * pixel de salto aqui sacode a seção inteira.
 *
 * As linhas são BOTÕES: clicar numa delas escolhe o marco na vitrine, pelo mesmo
 * `escolher` da rail (e, como ele, encerra o rodízio — quem aponta um marco está
 * pedindo para ficar nele). O ponto laranja marca duas coisas que quase sempre
 * são a mesma: o marco ATIVO no palco e o PRÓXIMO da conta.
 */
function Simulador({
  items,
  active,
  onSelect,
  mensal,
  onMensal,
  copy,
  selo,
}: {
  items: readonly { tier: string; amount: number; milestoneLine: string }[];
  active: number;
  onSelect: (indice: number) => void;
  mensal: number;
  onMensal: (valor: number) => void;
  copy: { title: string; sliderLabel: string; note: string; month: string; months: string };
  selo: string;
}) {
  /* O primeiro marco que o mês ainda não cobre: é o "próximo" da régua.
     Os anteriores já caem em um mês e ficam apagados. */
  const proximo = items.findIndex((item) => item.amount > mensal);

  /* Dólar escrito como o dicionário escreve nas linhas de marco — vírgula de
     milhar, sem centavos — e não como o navegador de quem lê prefere: a vitrine
     fala de faturamento em dólar nos dois idiomas, e um "5.000" no meio de
     "$10,000 em faturamento" seriam dois milhares diferentes na mesma coluna.
     `en-US` aqui é formato de MOEDA, não de idioma. */
  const emDolar = (valor: number) => `$${valor.toLocaleString("en-US")}`;

  const emMeses = (amount: number) => {
    const meses = Math.ceil(amount / mensal);
    return meses === 1 ? copy.month : copy.months.replace("{n}", String(meses));
  };

  /* A fração preenchida da trilha, para o fio laranja à esquerda do polegar
     (veja `.slider-faturamento` em `globals.css`). */
  const andado = (mensal - SIMULADOR.min) / (SIMULADOR.max - SIMULADOR.min);

  return (
    <div className="mt-7 border-t border-line pt-5 lg:mt-8">
      <div className="flex items-baseline justify-between gap-3">
        {/* h4 e não h3: a ficha do marco, logo acima nesta coluna, é o h3 — e
            este bloco é uma peça dentro da mesma vitrine, não um irmão dela. */}
        <h4 className="text-[15px] font-semibold text-cream">{copy.title}</h4>
        <span className="t-label shrink-0">{selo}</span>
      </div>

      {/* O rótulo e o valor na MESMA linha, de altura cravada e com o rótulo
          truncado: é a primeira linha que mudaria de altura se o texto
          quebrasse, e ela muda de conteúdo a cada passo do controle. */}
      <div className="mt-4 flex h-6 items-baseline justify-between gap-3">
        <label htmlFor="premios-simulador" className="truncate text-[13px] text-muted">
          {copy.sliderLabel}
        </label>
        <span className="tnum shrink-0 text-[15px] font-semibold text-cream">
          {emDolar(mensal)}
        </span>
      </div>

      <input
        id="premios-simulador"
        type="range"
        min={SIMULADOR.min}
        max={SIMULADOR.max}
        step={SIMULADOR.passo}
        value={mensal}
        onChange={(evento) => onMensal(Number(evento.target.value))}
        className="slider-faturamento mt-1 w-full"
        /* A fração vai por variável de CSS porque quem a desenha é o
           pseudoelemento da trilha, e pseudoelemento não aceita `style`. */
        style={{ "--andado": `${andado * 100}%` } as CSSProperties}
        /* O valor que o leitor de tela anuncia é o dólar, não o número cru. */
        aria-valuetext={emDolar(mensal)}
      />

      {/* AS QUATRO LINHAS. Altura cravada em 44px (o alvo de toque do portão) e
          uma linha de texto em cada metade: nada aqui pode mudar de altura
          enquanto o controle anda. */}
      <ul className="mt-2">
        {items.map((item, indice) => {
          const atingido = indice < proximo || proximo === -1;
          const marcado = indice === active || indice === proximo;
          return (
            <li key={item.tier}>
              <button
                type="button"
                onClick={() => onSelect(indice)}
                /* O rótulo repõe o que a linha abrevia: na tela o numeral do
                   marco basta (a linha de dólar está na rail e na ficha, a dois
                   palmos), mas um leitor de tela chega aqui sem esse contexto —
                   e o rótulo SUBSTITUI o conteúdo, então os meses, que são a
                   resposta da conta, têm de vir junto. */
                aria-label={`${item.tier} — ${item.milestoneLine}: ${emMeses(item.amount)}`}
                className={`flex h-11 w-full items-center gap-3 text-left transition-colors ${
                  atingido ? "text-faint" : marcado ? "text-cream" : "text-muted"
                } hover:text-cream`}
              >
                {/* O ponto laranja, em caixa de largura fixa: ele aparece e
                    desaparece, e sem a caixa o numeral ao lado andaria 14px para
                    os lados a cada passo do controle. */}
                <span aria-hidden className="flex w-2 shrink-0 justify-center">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      marcado ? "bg-brand" : "bg-transparent"
                    }`}
                  />
                </span>
                <span className="tnum w-12 shrink-0 text-[15px] font-semibold">
                  {item.tier}
                </span>
                <span className="tnum ml-auto shrink-0 text-[13px]">
                  {emMeses(item.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[13px] leading-snug text-faint">{copy.note}</p>
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
  /* As quatro abas, para o teclado poder levar o foco à que ele escolheu. */
  const abas = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * O TECLADO NA RAIL — o padrão de `tablist`, e ele faltava.
   *
   * A seção tem `role="tab"` e `aria-selected` desde que a rail nasceu, mas quem
   * chegava nela pelo teclado tinha de passar por quatro paradas de tabulação e
   * apertar Enter em cada uma para ver o marco: ou seja, a vitrine anunciava um
   * widget e entregava quatro botões.
   *
   * `roving tabindex`: só a aba ATIVA é parada de tabulação (as outras ficam em
   * −1), e dentro do grupo quem anda são as setas. O ciclo dá a volta nas duas
   * pontas — quatro marcos numa fileira fechada, e parar na quarta seta seria
   * pedir cinco toques para voltar ao primeiro.
   *
   * `preventDefault` porque ← e → ROLAM a fileira no celular (ela é um
   * `overflow-x: auto`): sem isto a aba chegaria selecionada e a rolagem nativa
   * teria arrastado a fileira por baixo do foco ao mesmo tempo.
   *
   * A ativação é AUTOMÁTICA (a seta já troca o marco, não só o foco): é o que a
   * ARIA recomenda quando trocar de painel é barato, e aqui o painel é uma
   * textura que já está no cache do navegador (veja o pré-carregamento lá em
   * cima) — não há nada para esperar.
   */
  const aoTeclar = (evento: React.KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const ultimo = items.length - 1;
    let destino: number;

    if (evento.key === "ArrowRight") destino = indice === ultimo ? 0 : indice + 1;
    else if (evento.key === "ArrowLeft") destino = indice === 0 ? ultimo : indice - 1;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = ultimo;
    else return;

    evento.preventDefault();
    onSelect(destino);
    abas.current[destino]?.focus();
  };

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
              ref={(no) => {
                abas.current[indice] = no;
              }}
              type="button"
              role="tab"
              id={idAba(indice)}
              /* A aba comanda a ficha do marco E o palco (veja `idAba`). */
              aria-controls={`${idFicha(indice)} ${ID_PALCO}`}
              aria-selected={ativo}
              /* Roving tabindex: uma parada de tabulação para o grupo inteiro. */
              tabIndex={ativo ? 0 : -1}
              onClick={() => onSelect(indice)}
              onKeyDown={(evento) => aoTeclar(evento, indice)}
              /* `pt-4 pb-3` leva o alvo de toque bem além dos 44px sem mexer na
                 espessura do fio. `w-[11rem]` no celular dá à aba a largura de
                 uma ficha legível e é o passo do snap; de `sm` em diante as
                 quatro dividem a linha em partes iguais.

                 `flex flex-col` com o fio em `mt-auto`: desde os nomes longos de
                 15/10 ("Placa Cerimonial do Meio Milhão", e em inglês "The
                 Million-Dollar Black Diamond Plaque") o título de uma aba ocupa
                 DUAS linhas onde o da vizinha ocupa uma. Truncar com reticências
                 esconderia metade do nome do troféu — é ele que a aba existe para
                 dizer —, então a quebra é aceita e as quatro células se alinham
                 PELA BASE: a fileira é `items-stretch`, as abas têm todas a
                 altura da mais alta e o `mt-auto` empurra o fio de progresso para
                 o pé de cada uma. Sem isso o fio do 500K descia 17px abaixo dos
                 outros três e a rail ficava com o degrau no meio. */
              className={`group flex w-[11rem] shrink-0 snap-start flex-col pt-3 pb-2 text-left transition-colors sm:w-auto sm:min-w-0 sm:flex-1 ${
                ativo ? "text-cream" : "text-faint hover:text-cream"
              }`}
            >
              <span className="tnum block text-[1.5rem] font-semibold leading-none">
                {entry.tier}
              </span>
              <span
                className={`mt-2 block text-[13px] leading-snug ${
                  ativo ? "text-cream" : "text-faint group-hover:text-muted"
                }`}
              >
                {entry.title}
              </span>
              <span className="t-label mt-1 block truncate">{entry.milestoneLine}</span>
              {/* Duas caixas, e as duas precisam existir: a de fora leva o
                  `mt-auto` que cola o fio no pé da aba e o `pt-3` que garante os
                  12px de respiro mesmo na aba mais alta da fileira (margem
                  automática e distância mínima não cabem na mesma propriedade); a
                  de dentro é o trilho de 2px que recorta o preenchimento. */}
              <span className="mt-auto block pt-3">
                <span className="block h-0.5 overflow-hidden rounded-full bg-cream/12">
                  <Preenchimento
                    key={ativo ? `${epoca}-${active}` : undefined}
                    estado={indice < active ? "cheio" : ativo ? "correndo" : "vazio"}
                    durationMs={durationMs}
                    paused={paused}
                  />
                </span>
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
