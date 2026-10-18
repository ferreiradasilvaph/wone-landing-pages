"use client";

import { useEffect, useRef } from "react";
import { useContent } from "@/i18n";
import { SegmentProgress } from "@/components/SegmentProgress";
import { STEP_COUNT, STEP_MS, type StepShow } from "./useStepShow";

/**
 * O TRILHO: os quatro passos em linha, em formato grande, mandando no palco
 * abaixo.
 *
 * Era uma lista vertical de abas com o número em 13px ao lado do título. Em
 * 15/10 o dono olhou a seção e disse "visualmente está ruim... preciso de algo
 * visualmente espetacular", e o trilho era metade do problema: lido de longe,
 * não havia hierarquia nenhuma — quatro linhas de texto do mesmo tamanho.
 * Agora o numeral é a peça gráfica (2,5rem/600 tabular, creme no passo
 * escolhido e `faint` nos outros) e os quatro ficam lado a lado, que é a forma
 * de uma barra de controle.
 *
 * A DOBRA 3+1 é desenhada pelas duas réguas do alto: uma atravessa as três
 * primeiras colunas sob "Você faz uma vez", a outra cobre só a quarta, sob
 * "Depois, a cada venda". É o que faz o desfecho ler como desfecho sem inventar
 * um segundo estilo de aba.
 *
 * A DESCRIÇÃO NÃO CABE DENTRO DA ABA. Medido a 1440: o trilho vive nas colunas
 * 7-12 do cabeçalho (592px) e cada aba fica com 133px — 14px de texto ali dá 15
 * caracteres por linha, e as descrições têm 54 a 80. Então ela mora num
 * compartimento de altura fixa abaixo das quatro, na largura toda do trilho, e
 * troca com o passo. Dentro da aba ficam o numeral e o título, que é o que se
 * lê de longe. (A primeira versão da seção punha a descrição dentro da aba
 * ativa e registrava 4 saltos de layout por ciclo, CLS 0,026 a 412.)
 *
 * No celular as quatro abas viram uma faixa horizontal com `snap`, e o
 * compartimento da descrição continua embaixo, parado.
 *
 * `tablist` horizontal com foco rotativo: o trilho é UMA parada de Tab e as
 * setas andam nele. As duas etiquetas são irmãs diretas das abas e vão
 * `aria-hidden` + `role="presentation"` — um `<div>` de agrupamento entre o
 * `tablist` e o `tab` quebraria a relação de posse do ARIA, e `role="group"`
 * não é filho válido de `tablist`.
 */
export function StepRail({ show }: { show: StepShow }) {
  const { howItWorks } = useContent();
  const { steps, demo } = howItWorks;
  const { active, select, playing, reduced } = show;

  const counter = demo.counter.replace("{n}", String(active + 1));

  /* NA TELA ESTREITA a faixa das abas rola, e cabem duas e meia: sem isto o
     relógio avançava para um passo que estava FORA da vista, e o leitor via a
     descrição trocar sem saber qual numeral acendeu. O passo escolhido é
     trazido para dentro da faixa — e só dela: `scrollIntoView` moveria a página
     inteira, que é o que ninguém pediu. Com movimento reduzido, sem deslize. */
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const tab = document.getElementById(`hiw-tab-${active}`);
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;

    const alvo = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, alvo), behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  return (
    /* `contain: inline-size` não é enfeite: sem ele a faixa rolável de 700px
       EMPURRAVA a página. O trilho é item de uma grade de uma coluna (o `aside`
       do `SectionHead`), e item de grade tem `min-width: auto` — a coluna
       crescia até o conteúdo mínimo do filho, e a 412 o documento ficava com
       732px de largura, com rolagem horizontal na página inteira. Com a
       contenção, a largura deste bloco deixa de depender do que ele contém: a
       faixa rola dentro dele, como se pretendia. */
    <div className="[contain:inline-size]">
      {/* A faixa sangra para as bordas no celular (`-mx-4`) para a quarta aba
          não parecer cortada por acidente: a rolagem começa colada no gutter.
          A partir de `lg` não há rolagem nenhuma — as quatro cabem. */}
      <div
        ref={stripRef}
        className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:overflow-visible lg:px-0"
      >
        <div
          role="tablist"
          aria-orientation="horizontal"
          aria-label={howItWorks.kicker}
          className="grid min-w-[700px] snap-x snap-mandatory grid-cols-4 gap-x-3 lg:min-w-0 lg:gap-x-4"
        >
          <p
            role="presentation"
            aria-hidden
            className="t-label col-span-3 border-t border-line pt-3"
          >
            {demo.groups.setup}
          </p>
          <p role="presentation" aria-hidden className="t-label border-t border-brand/40 pt-3">
            {demo.groups.runtime}
          </p>

          {steps.map((step, index) => {
            const isActive = index === active;
            /* Só o numeral ATIVO rola, e só com movimento permitido: os outros
               três ficam parados em `faint`, que é o que faz o ativo ser o
               ativo (leva2.css, "O TRILHO DOS PASSOS"). */
            const rola = isActive && !reduced;

            return (
              <button
                key={step.step}
                type="button"
                role="tab"
                id={`hiw-tab-${index}`}
                aria-selected={isActive}
                aria-controls="hiw-stage"
                /* Foco rotativo: só a aba escolhida está na ordem de Tab. */
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  const last = STEP_COUNT - 1;
                  let next: number | null = null;
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    next = index === last ? 0 : index + 1;
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    next = index === 0 ? last : index - 1;
                  }
                  if (event.key === "Home") next = 0;
                  if (event.key === "End") next = last;
                  if (next === null) return;
                  event.preventDefault();
                  select(next);
                  /* O foco acompanha a seleção: com `tabIndex` rotativo,
                     deixá-lo na aba antiga tiraria o teclado do trilho na tecla
                     seguinte. */
                  document.getElementById(`hiw-tab-${next}`)?.focus();
                }}
                /* Tom, nunca contorno: a aba escolhida sobe um degrau de
                   superfície sobre o fundo da seção. O respiro já leva o alvo
                   de toque muito além dos 44px. */
                className={`mt-2 flex cursor-pointer snap-start flex-col items-start rounded-field px-3 pt-2 pb-3 text-left transition-colors duration-300 ${
                  isActive ? "bg-ink-800" : "hover:bg-ink-850"
                }`}
              >
                {/* O ROLO DE 8px (leva 2): o numeral que entra vem de baixo —
                    o gesto mínimo que diz "virou a página", porque até aqui a
                    troca de passo era só uma troca de COR no lugar.

                    A `key` é o que RECOMEÇA a animação a cada troca: o numeral
                    não tem o `data-hiw-on` do palco (ele vive no trilho, fora
                    das camadas), e `animation` com o mesmo nome não reinicia
                    sozinha — nó novo, animação nova. Com movimento reduzido a
                    chave é constante nos quatro: sem classe, e sem remontar à
                    toa. Os 2,5rem e o `h-10` abaixo não mudam, então nada
                    disto toca o layout (CLS 0). */}
                <span
                  key={rola ? `rola-${active}` : "parado"}
                  className={`tnum text-[2.5rem] leading-[1.1] font-semibold transition-colors duration-300 ${
                    isActive ? "text-cream" : "text-faint"
                  }${rola ? " hiw-rolo" : ""}`}
                >
                  {step.step}
                </span>
                {/* `h-10` reservado nos quatro: o título ocupa uma ou duas
                    linhas conforme o idioma, e sem a altura fixa a troca de
                    passo mexeria na barra abaixo. */}
                <span
                  className={`mt-0.5 h-10 text-[15px] leading-tight font-semibold transition-colors duration-300 ${
                    isActive ? "text-cream" : "text-muted"
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* O compartimento da descrição: altura cravada em duas linhas de 14px,
          fora do `tablist` (lá dentro só cabem abas) e fora dos botões, para a
          troca de passo não empurrar a barra. Sem `aria-live` — quem narra a
          troca é a região do palco. */}
      {/* `line-clamp-2` é rede de segurança, não recorte esperado: medidas as
          quatro descrições nos dois idiomas, a mais longa (81 caracteres, em
          inglês) cabe nas duas linhas a 412 e a 1440. Se uma revisão de copy
          passar do teto, ela corta em vez de empurrar a barra do relógio. */}
      {/* A descrição entra ATRÁS do numeral (leva 2): 60ms depois e com metade
          do curso (4px) — ela acompanha, não compete. Mesma `key` por passo,
          pelo mesmo motivo do numeral (sem nó novo a animação não recomeça), e
          constante com movimento reduzido. O compartimento tem 42px cravados
          desde o primeiro quadro, então remontar o parágrafo não move nada. */}
      <p
        key={reduced ? "desc" : `desc-${active}`}
        className={`mt-3 line-clamp-2 h-[42px] text-[14px] leading-[1.5] text-muted${
          reduced ? "" : " hiw-desc"
        }`}
      >
        {steps[active].description}
      </p>

      {/* A barra é o DESENHO do relógio, não um segundo relógio: é animação CSS
          alimentada pelo mesmo `durationMs`/`paused`. O "pausar" fecha o
          trilho porque é daqui que a seção se controla (WCAG 2.2.2). */}
      <div className="mt-4 flex items-center gap-4">
        <SegmentProgress
          className="min-w-0 flex-1"
          count={STEP_COUNT}
          active={active}
          durationMs={STEP_MS[active]}
          paused={!playing}
        />
        <span className="tnum shrink-0 text-[13px] text-faint">{counter}</span>
      </div>
    </div>
  );
}
