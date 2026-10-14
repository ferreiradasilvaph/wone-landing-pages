"use client";

import { useContent } from "@/i18n";
import { PauseButton } from "@/components/PauseButton";
import { SegmentProgress } from "@/components/SegmentProgress";
import { CustomerChat } from "./CustomerChat";
import { EventWire } from "./EventWire";
import { OperatorPanel } from "./OperatorPanel";
import { STEP_COUNT, STEP_MS, type StepShow } from "./useStepShow";

/**
 * Os dois lados da mesma venda: o SEU painel à esquerda, o chat do CLIENTE à
 * direita, e entre eles o fio por onde o evento viaja.
 *
 * É a resposta às duas perguntas que o visitante faz em 5 segundos — "o que eu
 * faço" e "o que acontece depois, sem mim" — e substitui o palco 3D, que
 * mostrava objetos abstratos presos à rolagem e não explicava nenhuma das duas
 * (diagnóstico de 14/10: "ao meu ver está confuso").
 *
 * No celular as duas telas EMPILHAM, com o fio na vertical. A metáfora é
 * direção, não adjacência: o ponto desce do painel para o chat nos passos 01-03
 * e sobe de volta no 04. Lado a lado a 412 cada tela teria 156px, e 11px de
 * texto dentro disso é ilegível; empilhadas, cada metade ganha a largura toda.
 *
 * A ilustração inteira é `aria-hidden`: o significado está nas abas do trilho,
 * em texto real de 13-15px, e não há nada focável aqui dentro. O corpo tem
 * ALTURA FIXA por breakpoint, com os estados trocados por dentro — é o que
 * garante CLS 0 por construção, inclusive quando o relógio avança sozinho.
 */
export function TwoSidesDemo({ show }: { show: StepShow }) {
  const { howItWorks, ui } = useContent();
  const { steps, demo } = howItWorks;
  const { active, animated, reduced, playing, userPaused, toggleUserPaused } = show;

  const step = steps[active];
  const counter = demo.counter.replace("{n}", String(active + 1));
  const announce = demo.announce
    .replace("{n}", String(active + 1))
    .replace("{title}", step.title);

  return (
    <div className="rounded-card bg-ink-850 p-3 sm:p-5">
      <div className="flex h-9 items-center justify-between gap-3">
        {/* A ficção se declara uma vez, no alto do card, e vale pelas duas
            telas (regra 4). */}
        <span className="t-label">{ui.simulation}</span>
        <PauseButton
          pressed={userPaused}
          onToggle={toggleUserPaused}
          labels={{ pause: ui.pause, play: ui.play }}
        />
      </div>

      {/* Altura fixa nos dois breakpoints (é o que garante CLS 0), e medida
          pelo estado mais alto — não folgada. A do celular é maior porque ali
          as duas telas ficam uma sobre a outra.

          No desktop eram 272px: o estado mais alto usava 127 dos 234px de corpo
          e a metade direita do passo 01 — justamente o que o servidor pinta e o
          dono vê primeiro — era um retângulo quase vazio, com o ponto do fio
          lendo como enfeite num card de 1.216. Agora o corpo acompanha o
          conteúdo (187px é o estado mais alto com cabeçalho e `p-3`), o vazio
          cai para metade e o fio fica proporcionalmente maior.

          No celular o mesmo corte é menor (414 → 390): ali as duas telas
          empilham, o estado mais alto usa 121 dos 141px de corpo de cada uma, e
          os 24px que saem devolvem margem ao teto de 1.450 que o compartimento
          de descrição do trilho consumiu. */}
      <div
        id="hiw-panel"
        role="tabpanel"
        aria-labelledby={`hiw-tab-${active}`}
        className="relative mt-3 h-[390px] sm:mt-4 lg:h-[196px]"
      >
        {/* Quem narra a troca para leitor de tela. `off` enquanto a seleção anda
            sozinha — anunciar a cada 6s encheria o leitor de interrupções que
            ninguém pediu; com o ponteiro, o foco ou o "pausar" a troca partiu de
            uma ação e o anúncio é esperado. Mesmo arranjo de `SecurityCarousel`
            e do carrossel de Recursos. */}
        <p className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">
          {announce}
        </p>

        <div
          aria-hidden
          className="flex h-full flex-col lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]"
        >
          <OperatorPanel step={active} animated={animated} reduced={reduced} />
          {/* Um fio por eixo: o do movimento muda de breakpoint e nenhum valor
              de motion responde a media query. O escondido sai do layout por
              `display: none` — num grid, ele não ocupa trilha. */}
          <EventWire
            axis="y"
            step={active}
            animated={animated}
            reduced={reduced}
            className="lg:hidden"
          />
          <EventWire
            axis="x"
            step={active}
            animated={animated}
            reduced={reduced}
            className="hidden lg:flex"
          />
          <CustomerChat step={active} animated={animated} reduced={reduced} />
        </div>
      </div>

      {/* A barra é o DESENHO do relógio, não um segundo relógio: ela é animação
          CSS alimentada pelo mesmo `durationMs`/`paused`. Sem `tabLabels` e sem
          `onSelect` — o `tablist` da seção é um só, e é o trilho. */}
      <SegmentProgress
        className="mt-4"
        count={STEP_COUNT}
        active={active}
        durationMs={STEP_MS[active]}
        paused={!playing}
        labelLeft={step.title}
        labelRight={counter}
      />
    </div>
  );
}
