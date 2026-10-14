"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useInView } from "motion/react";
import { useContent } from "@/i18n";
import { arte } from "@/lib/arte";
import { SegmentProgress } from "./SegmentProgress";
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
 * A vitrine dos marcos: o numeral do marco, o objeto que chega em casa e a
 * placa em 3D ao lado, sobre o chão quente da seção (`--floor`).
 *
 * O que saiu: a barra de progresso redesenhada a cada 40 ms (com `role=
 * progressbar`, que faz o leitor de tela anunciar "carregando" sobre uma
 * seleção), os dois halos de 110 e 150px, o card com sombra e degradê por cima
 * do chão, e a pílula "Wone Club" com desfoque flutuando sobre o render. O
 * objeto é a estrela; o resto da seção é fundo e legenda.
 *
 * A grade: numeral e legenda ocupam as colunas 1–5 em duas linhas coladas (o
 * numeral mede a linha 1, a legenda vem logo abaixo), e o canvas ocupa as 6–12
 * atravessando as duas — é a linha da legenda que absorve a sobra de altura do
 * objeto, e não a do numeral, que era o vão de 128px entre o número e o texto.
 * A rail fecha a vitrine em largura total.
 *
 * As quatro legendas ficam as quatro no DOM, empilhadas na mesma célula, e só
 * a do marco ativo está visível: a altura da célula passa a ser a da legenda
 * mais alta, então trocar de marco no celular (onde a linha não é esticada
 * pelo canvas) não empurra o resto da página. CLS 0 também com o relógio
 * andando sozinho.
 *
 * A cena 3D (`AwardPlaque3D`) continua intocada no que desenha — geometria,
 * material, câmera, tempos e imagens são os mesmos. O que ela ganhou foi voz:
 * avisa o fim de cada travessia (`onCycle`), e é esse aviso que troca o marco
 * aqui. A vitrine não tem relógio próprio.
 */
export function AwardsShowcase() {
  const { awards, ui } = useContent();

  // `next/dynamic` só adia o download até o componente RENDERIZAR — e ele
  // renderizaria de imediato, mesmo com a seção fora da tela, trazendo os
  // ~960KB do three para o carregamento inicial. Montar o canvas apenas quando
  // a seção se aproxima é o que de fato tira esse peso da primeira visita.
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useInView(stageRef, { once: true, margin: "600px" });
  /* Este não é `once`: fora da tela, a placa para de girar. */
  const onScreen = useInView(stageRef, { amount: 0.2 });

  /* Com a seção à vista, as artes das outras placas já vão para o cache do
     navegador. Assim a troca de prêmio não espera rede nenhuma — é o que, junto
     com a travessia cruzada lá no `AwardPlaque3D`, tira o molde vazio do meio
     do caminho. */
  useEffect(() => {
    if (!near) return;

    awards.items.forEach((item) => {
      /* A arte da placa e a foto da joia: as duas entram em cena na troca de
         marco, então as duas precisam já estar no cache quando ela acontecer. */
      [item.image, item.photo].forEach((src) => {
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

  return (
    <div className="grid gap-x-8 gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto]">
      {/* O numeral do marco: o único 700 da página junto com a tese, em largura
          fixa de 4.2ch para que trocar "1M" por "100K" não empurre o texto. O
          teto de largura é a coluna: a 1440 os 4.2ch do corpo de 176px dão
          512px e a coluna tem 488, e o número vazava para dentro do vão.

          Creme nos quatro, e não o `accent` de cada marco: os accents são as
          cores do material de cada troféu (bronze, acrílico, ouro) e já fazem
          esse trabalho dentro da cena, nas luzes e no metal. Em 176px, no maior
          elemento da seção, eles trariam três cores que a página não tem para
          um site de duas, e só o 1M cairia no laranja — que aqui significa
          "ativo" em todo o resto (inclusive no segmento da rail logo abaixo). */}
      <p
        className="tnum max-w-full font-bold leading-[0.85] text-cream lg:col-span-5 lg:col-start-1 lg:row-start-1"
        style={{ fontSize: "clamp(5rem, 14vw, 11rem)", width: "4.2ch" }}
      >
        {item.tier}
      </p>

      {/* A ordem do DOM é a do celular — numeral → placa → legenda → rail —, e
          no desktop a grade recoloca cada peça: o objeto passa a ocupar a
          coluna da direita, ao lado do numeral e da legenda. */}
      <div className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
        <div
          ref={stageRef}
          /* O quadrado do objeto tem teto: nas sete colunas inteiras ele dava
             696px de altura a 1440 e sozinho respondia por metade da seção (que
             fechava em 1.312). A 480 o objeto ainda é o maior elemento da
             vitrine e a coluna da esquerda — numeral mais legenda — passa a ter
             a mesma altura dele. */
          className="relative mx-auto aspect-square w-full max-w-[60vw] lg:max-w-[30rem]"
        >
          {near ? (
            <AwardPlaque3D
              accent={item.accent}
              image={item.image}
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

          {/* Horizonte de 1px na base DO PÓDIO — não no rodapé da caixa, onde
              ele lia como borda do quadrado.

              Os 5% não são palpite: o pódio é um cilindro em y = -1.72 com
              0.3 de altura e raio 1.3 (`AwardPlaque3D`), então a borda de baixo
              mais próxima da câmera está em (-1.87, z = 1.3); com a câmera em
              z = 7.3 e fov 38°, a meia-altura do quadro àquela profundidade é
              tan(19°)·6 = 2.066, o que põe o ponto a 4,7% do fundo do
              quadrado — 23px dos 480 a 1440. A fração vale em qualquer
              largura: a câmera é fixa e a caixa é quadrada, então a cena
              projeta sempre na mesma fração. */}
          <span aria-hidden className="absolute inset-x-0 bottom-[5%] h-px bg-cream/12" />
        </div>
      </div>

      {/* As quatro legendas na mesma célula, em crossfade de 350 ms. Trocar por
          `AnimatePresence mode="wait"` devolveria o salto de altura no celular:
          lá a linha não é esticada pelo canvas, e as descrições têm tamanhos
          diferentes. Por transição de CSS também não há relógio novo e o
          movimento reduzido já é atendido pela regra global. */}
      <div className="grid lg:col-span-5 lg:col-start-1 lg:row-start-2">
        {awards.items.map((entry, indice) => (
          <div
            key={entry.tier}
            aria-hidden={indice !== active}
            className={`[grid-area:1/1] transition-[opacity,transform] duration-[350ms] ease-[var(--ease-out-expo)] ${
              indice === active
                ? "opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            <h3 className="t-h3 text-cream">{entry.title}</h3>
            {/* O marco em dólar é uma linha de rótulo, não parte do título: o
                '•' que os separava não volta. */}
            <span className="t-label mt-2 block">{entry.milestoneLine}</span>

            <p className="mt-4 text-[15px] font-semibold text-cream">{entry.subtitle}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {entry.description}
            </p>

            <div className="mt-8 border-t border-line pt-5">
              <span className="t-label block">{awards.physicalItem}</span>
              <p className="mt-1.5 text-[15px] text-cream">{entry.awardItem}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rail: indicador e controle na mesma peça, em largura total. As quatro
          abas são os marcos, e o segmento ativo preenche ao longo do ciclo. */}
      <div className="flex items-end gap-6 lg:col-span-12 lg:col-start-1 lg:row-start-3">
        <SegmentProgress
          /* Remonta a cada vez que a cena começa a contar: a animação de CSS do
             segmento nasce com o HTML, muito antes do canvas, e sem este
             reinício a primeira barra terminava com a cena ainda no meio da
             primeira parada. Daí em diante cada troca já remonta o segmento. */
          key={epoca}
          className="min-w-0 flex-1"
          count={count}
          active={active}
          /* Sem relógio — escolha do visitante ou movimento reduzido —, o
             segmento do marco fica cheio em vez de congelar vazio: ele passa a
             marcar a seleção, não uma contagem. A pausa por rolagem ou aba
             oculta continua sendo `relogioParado`, que congela o preenchimento
             onde está. */
          durationMs={pausado || escolhido || reduced ? undefined : CICLO_MS}
          /* Antes do primeiro quadro da cena a barra fica parada no zero: não
             há relógio nenhum andando ainda. */
          paused={relogioParado || epoca === 0}
          onSelect={escolher}
          tabLabels={awards.items.map((entry) => entry.tier)}
        />
        <PauseButton
          pressed={pausado}
          onToggle={alternarPausa}
          labels={{ pause: ui.pause, play: ui.play }}
          className="mb-2"
        />
      </div>
    </div>
  );
}
