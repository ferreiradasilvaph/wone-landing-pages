"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useContent } from "@/i18n";
import { arte } from "@/lib/arte";
import { SegmentProgress } from "./SegmentProgress";
import { PauseButton } from "./PauseButton";

/** O three fica fora do bundle inicial e nunca roda no servidor. */
const AwardPlaque3D = dynamic(() => import("./AwardPlaque3D"), {
  ssr: false,
  loading: () => <PlaqueSkeleton />,
});

const EASE = [0.16, 1, 0.3, 1] as const;
/** Quanto cada marco fica em cena. O mesmo valor preenche o segmento da rail. */
const TIER_MS = 4200;

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
 * A troca de marco continua a cada 4,2 s, agora por um relógio só, e a rail de
 * segmentos abaixo é ao mesmo tempo o indicador e o controle (as quatro abas
 * '10K · 100K · 500K · 1M'). O `PauseButton` ao lado para tudo — é o que todo
 * movimento automático da página tem.
 *
 * A cena 3D (`AwardPlaque3D`) não é tocada: ela só recebe o marco ativo e se
 * sincroniza como antes.
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
  const [active, setActive] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* `useReducedMotion` do motion devolve valor diferente no servidor e no
     primeiro render do cliente; aqui o preferido alimenta só o relógio, e vem
     do `matchMedia` depois da montagem, como nas outras seções que andam. */
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
     com a seção escondida ou com a aba em segundo plano. */
  const paused = stopped || tabHidden || !onScreen;
  const playing = !reduced && !paused;

  /* Depende de `active`, então escolher um marco na rail reinicia a contagem. */
  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(
      () => setActive((current) => (current + 1) % count),
      TIER_MS,
    );
    return () => window.clearTimeout(id);
  }, [playing, active, count]);

  const item = awards.items[active];

  return (
    <div className="grid gap-x-8 gap-y-10 lg:grid-cols-12">
      {/* O numeral do marco: o único 700 da página junto com a tese, em largura
          fixa de 4.2ch para que trocar "1M" por "100K" não empurre o texto. */}
      <p
        className="tnum font-bold leading-[0.85] text-cream lg:col-span-5 lg:col-start-1 lg:row-start-1"
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
          className="relative mx-auto aspect-square w-full max-w-[60vw] lg:max-w-none"
        >
          {near ? (
            <AwardPlaque3D
              accent={item.accent}
              image={item.image}
              photo={item.photo}
              worn={item.photoWorn}
              visible={onScreen}
            />
          ) : (
            <PlaqueSkeleton />
          )}

          {/* Horizonte de 1px na base: é o que assenta o pódio no chão da
              vitrine agora que não há card nem sombra sob a cena. */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-cream/12" />
        </div>
      </div>

      <div className="lg:col-span-5 lg:col-start-1 lg:row-start-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.tier}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <h3 className="t-h3 text-cream">{item.title}</h3>
            {/* O marco em dólar é uma linha de rótulo, não parte do título: o
                '•' que os separava não volta. */}
            <span className="t-label mt-2 block">{item.milestoneLine}</span>

            <p className="mt-4 text-[15px] font-semibold text-cream">{item.subtitle}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {item.description}
            </p>

            <div className="mt-8 border-t border-line pt-5">
              <span className="t-label block">{awards.physicalItem}</span>
              <p className="mt-1.5 text-[15px] text-cream">{item.awardItem}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rail: indicador e controle na mesma peça. As quatro abas são os marcos,
          e o segmento ativo preenche ao longo dos 4,2 s. */}
      <div className="flex items-end gap-6 lg:col-span-7 lg:col-start-6 lg:row-start-3">
        <SegmentProgress
          className="min-w-0 flex-1"
          count={count}
          active={active}
          durationMs={TIER_MS}
          paused={paused}
          onSelect={setActive}
          tabLabels={awards.items.map((entry) => entry.tier)}
        />
        <PauseButton
          pressed={stopped}
          onToggle={() => setStopped((value) => !value)}
          labels={{ pause: ui.pause, play: ui.play }}
          className="mb-2"
        />
      </div>
    </div>
  );
}
