"use client";

import { useContent } from "@/i18n";
import { CustomerDevice } from "./CustomerDevice";
import { StageWire } from "./StageWire";
import { WonePanel } from "./WonePanel";
import type { StepShow } from "./useStepShow";

/** A elipse de contato sob cada objeto: escurece o chão, sem blur e sem halo. */
const CONTACT = "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)";
/* A matéria do chão: o degrau de tom que abre do horizonte para baixo. Começa
   em ink-800 (e não em ink-850, como na primeira tentativa) porque o palco já é
   ink-900: a diferença entre #0a0a0d e #0f0f14 não aparecia, o chão não existia
   e as elipses de contato não tinham o que escurecer. */
const FLOOR =
  "radial-gradient(70% 140% at 50% -8%, var(--ink-800) 0%, color-mix(in oklab, var(--ink-850) 70%, transparent) 50%, transparent 100%)";

/**
 * A SALA DE OPERAÇÃO: o palco onde os dois lados da venda ficam de pé.
 *
 * Pedido do dono em 15/10: "preciso que melhore pra ontem a seção como
 * funciona. visualmente está ruim. preciso de algo visualmente espetacular...
 * seja mais criativo nessa sessão". O que havia eram dois painéis de 552×187
 * lado a lado, com três linhas de texto cada um — liam como caixas de
 * wireframe. A lógica que o dono aprovou não mudou (três conexões que você faz
 * uma vez e uma venda que acontece sempre, com um relógio só e os quatro passos
 * clicáveis); o que mudou é a ENCENAÇÃO.
 *
 * O desenho, em três decisões:
 *
 *  1. UM PALCO COM HORIZONTE. O card tem altura cravada, uma linha laranja de
 *     1px a 78% da altura e um chão de ink-850 abrindo dela para baixo. Não é
 *     halo nem brilho: é a matéria do piso, e é ela que faz os dois objetos
 *     terem CHÃO em vez de flutuarem. Cada um ganha uma elipse de contato.
 *  2. PERSPECTIVA DE CSS, ZERO WEBGL. `perspective: 1600px` no palco, a tela
 *     grande girada em `rotateY(-12deg) rotateX(3deg)` e o aparelho em
 *     `rotateY(14deg) rotateX(2deg)`: os dois ficam de três quartos, VIRADOS UM
 *     PARA O OUTRO, como duas peças da mesma sala. A página continua com um
 *     canvas só, o da vitrine de Premiações.
 *
 *     O aparelho estava de FRENTE, e era o que o dono viu em 15/10 ("melhore a
 *     aparência e disposição do celular"): um retângulo chapado colado ao lado
 *     de um objeto em perspectiva lê como recorte, não como coisa no espaço.
 *     Ele também estava longe — 221px de vão morto entre a ponta do fio e a
 *     borda dele. Virando e aproximando, o vão caiu para 137 e virou o lugar
 *     por onde o fio corre.
 *
 *     AS POSIÇÕES SÃO MEDIDAS, NÃO ESTIMADAS. Com perspectiva, a caixa que o
 *     CSS escreve não é a que aparece: o aparelho em `left: 828` tem a borda
 *     esquerda visível em 833 e a direita em 1089; o painel em `left: 64` abre
 *     de 88 a 701. Todo número deste arquivo (elipses de contato e as duas
 *     pontas do fio, em `StageWire`) sai dessas medidas, tiradas com
 *     `getBoundingClientRect` DEPOIS da transformação — e é por isso que o
 *     aparelho tem 520px de altura e não os 540 que o desenho pedia: a
 *     projeção o estica para 531 e, com a elipse de contato embaixo, 540 passaria
 *     do pé do card (`overflow-hidden` cortaria a quina).
 *  3. A PERSPECTIVA SÓ A PARTIR DE `xl`. De 1280px de viewport para cima o
 *     container mede exatamente 1216px, então as posições dos objetos e o
 *     caminho do fio podem ser escritos em px — é o que faz o `offset-path` da
 *     faísca casar com o `<path>` que a desenha. Abaixo disso o container é
 *     fluido e os dois objetos EMPILHAM, de frente, com o fio na vertical:
 *     lado a lado a 412 cada metade teria 156px, e 11px de texto dentro disso é
 *     ilegível.
 *
 * ALTURA CRAVADA, CLS 0. A 1440 o palco tem 560px e os quatro estados de cada
 * objeto ficam montados, em camadas absolutas (ver `StepLayer`) — o relógio
 * pode rodar a noite inteira sem mover um pixel. Abaixo de `xl` a altura é a
 * soma dos objetos, todos com altura fixa, então também não varia com o passo.
 *
 * A ilustração inteira é `aria-hidden`: o significado está nas abas do trilho,
 * em texto real de 14-15px, e aqui não há nada focável. Quem narra a troca para
 * leitor de tela é a região viva abaixo.
 */
export function OperationStage({ show }: { show: StepShow }) {
  const { howItWorks } = useContent();
  const { steps, demo } = howItWorks;
  const { active, playing } = show;

  const announce = demo.announce
    .replace("{n}", String(active + 1))
    .replace("{title}", steps[active].title);

  return (
    <div
      id="hiw-stage"
      role="tabpanel"
      aria-labelledby={`hiw-tab-${active}`}
      className="relative mt-8 overflow-hidden rounded-card bg-ink-900 lg:mt-12 xl:h-[560px]"
    >
      {/* `off` enquanto a seleção anda sozinha: anunciar a cada 6 s encheria o
          leitor de interrupções que ninguém pediu. Com o ponteiro, o foco ou o
          "pausar" a troca partiu de uma ação, e o anúncio é esperado. */}
      <p className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">
        {announce}
      </p>

      {/* O CHÃO: horizonte de 1px e o degrau de tom abrindo dele para baixo. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* A linha do horizonte só existe onde existe perspectiva: empilhados e
            de frente, os dois objetos não estão num espaço com fundo, e a
            risca laranja atravessava a tela do aparelho no meio. O degrau de
            chão fica nos dois — ele é só o pé da composição. */}
        <span className="absolute inset-x-0 top-[78%] hidden h-px bg-brand/35 xl:block" />
        <span className="absolute inset-x-0 top-[78%] bottom-0" style={{ background: FLOOR }} />
      </div>

      <div
        aria-hidden
        className="relative flex flex-col items-center p-3 sm:p-6 xl:block xl:h-full xl:p-0 xl:[perspective:1600px] xl:[perspective-origin:50%_46%]"
      >
        {/* As elipses de contato, só onde existe perspectiva: embaixo de `xl` os
            objetos estão de frente e empilhados, e sombra de contato ali seria
            uma mancha cinza sem chão para assentar.

            Cada uma fica sob a BORDA DE BAIXO PROJETADA do seu objeto, que é
            inclinada: a do painel corre de (88, 447) a (698, 464) e a do
            aparelho de (840, 539) a (1089, 528). A elipse é centrada na média
            dessas alturas. */}
        <span
          className="absolute top-[446px] left-[88px] hidden h-[26px] w-[600px] xl:block"
          style={{ background: CONTACT, borderRadius: "50%" }}
        />
        <span
          className="absolute top-[522px] left-[839px] hidden h-[22px] w-[250px] xl:block"
          style={{ background: CONTACT, borderRadius: "50%" }}
        />

        <WonePanel
          step={active}
          /* As alturas do celular e do tablet são o ORÇAMENTO da seção, não um
             palpite: a 412 a seção inteira tem de caber em 1.900px, e o palco
             empilhado (painel + fio + aparelho) é o maior bloco dela. */
          /* O painel andou 32px para a direita (era `left-8`) junto com a
             aproximação do aparelho: fechar o vão entre os dois sem mexer no
             painel deixaria 150px de chão morto na direita do palco. Com os
             dois deslocados, a composição fica com 88px de margem à esquerda e
             127 à direita — centrada, com o peso do painel puxando um pouco. */
          className="h-[280px] w-full sm:h-[330px] xl:absolute xl:top-[54px] xl:left-16 xl:h-[400px] xl:w-[640px] xl:[transform:rotateY(-12deg)_rotateX(3deg)]"
        />

        {/* Um fio por eixo: o eixo do movimento muda de breakpoint, e nem
            keyframe nem `offset-path` respondem a media query. O escondido sai
            do layout por `display: none`. */}
        <StageWire axis="y" step={active} className="my-1 xl:hidden" />

        <CustomerDevice
          step={active}
          /* 250×500 em `left: 888`, de frente → 270×520 em `left: 828`, virado
             para o centro. Cresce 8% e chega 55px mais perto do painel; a
             projeção devolve 256×531 visíveis, de (833, 8) a (1089, 539) — tudo
             dentro dos 1216×560 do card. Abaixo de `xl` nada disso vale: ali
             ele empilha de frente, com as mesmas alturas de antes (o orçamento
             da seção a 412 não mudou). */
          className="h-[360px] w-[240px] sm:h-[400px] xl:absolute xl:top-3 xl:left-[828px] xl:h-[520px] xl:w-[270px] xl:[transform:rotateY(14deg)_rotateX(2deg)]"
        />

        <StageWire axis="x" step={active} className="hidden xl:block" />
      </div>
    </div>
  );
}
