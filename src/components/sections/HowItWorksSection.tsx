"use client";

import { useRef } from "react";
import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TextLink } from "@/components/TextLink";
import { StepRail } from "@/components/howitworks/StepRail";
import { TwoSidesDemo } from "@/components/howitworks/TwoSidesDemo";
import { useStepShow } from "@/components/howitworks/useStepShow";

/**
 * "Como funciona", refeita em 14/10 depois de o dono olhar a versão com palco
 * 3D e dizer: "refaça sendo mais criativo a seção como funciona. ao meu ver
 * está confuso. refaça a lógica e me entregue algo incrível".
 *
 * O que estava errado, em três pontos:
 *  1. TRÊS enumerações competiam no mesmo bloco — a tese de 3 linhas, os 2
 *     caminhos e os 4 passos. Agora há UMA: as quatro abas do trilho. A tese
 *     passou a dizer os dois lados da venda, e os dois caminhos viraram as duas
 *     abas (inertes) do painel no passo 02.
 *  2. Os objetos 3D eram abstratos e não explicavam nada. Saíram, com o WebGL:
 *     a página fica com um canvas só, o da placa de Premiações.
 *  3. Os passos ficavam espaçados em 36vh e dependiam da rolagem, então o
 *     leitor nunca via a relação entre o que ELE faz e o que ACONTECE. Agora os
 *     quatro títulos estão sempre à vista, sob duas etiquetas que dizem a dobra
 *     ("Você faz uma vez" · "Depois, a cada venda"), e a seção se lê PARADA no
 *     passo 01. Nada aqui é acoplado à rolagem.
 *
 * A lógica que a seção conta: três conexões que você faz uma vez (bot, funil,
 * gateway) e uma coisa que acontece para sempre (o cliente paga e entra no
 * canal, sem você). O desfecho se distingue por desenho, não por rótulo: no
 * passo 04 a demo entra invertida e o fio volta do chat para o painel.
 *
 * O bloco inteiro é o dono das pausas (ponteiro e foco), porque o relógio é da
 * seção — um só, com "pausar" visível.
 */
export function HowItWorksSection() {
  const { howItWorks } = useContent();
  const tese = howItWorks.thesis;
  /* O nó que recebe ponteiro e foco, e cuja visibilidade liga e desliga o
     relógio. Ele nasce aqui, e não dentro do hook, para o objeto devolvido por
     `useStepShow` não carregar um ref (ver o comentário lá). */
  const blockRef = useRef<HTMLDivElement>(null);
  const show = useStepShow(blockRef);

  return (
    <Section anchor="como-funciona" tone="ink-950">
      <div ref={blockRef} {...show.pauseHandlers}>
        <SectionHead
          variant="D"
          id="como-funciona"
          kicker={howItWorks.kicker}
          /* As três linhas vêm literais porque o dicionário não leva `as const`
             (é `en.ts` que precisa satisfazer o mesmo tipo), e a tese é uma
             tupla de três: a terceira é a que sai em laranja. */
          titleLines={[tese[0], tese[1], tese[2]]}
          lead={howItWorks.lead}
          /* O trilho de abas nas colunas 7-12, na linha do kicker. A demo não
             cabe aqui: duas telas e o fio precisam dos 1216 do container para
             cada painel passar de 550px. */
          aside={<StepRail active={show.active} onSelect={show.select} />}
        >
          {/* `min-h-11` vai no próprio `<a>`: o link de texto mede a altura da
              linha (23px medidos a 1440 e a 412), abaixo dos 44px de alvo de
              toque. A altura tem de entrar no elemento que recebe o toque, não
              num `<span>` em volta. É remendo local: a altura certa é em
              `TEXT_LINK` (`src/components/cta.ts`), que valeria também para o
              hero e o rodapé — mas o kit está fechado nesta rodada. */}
          <TextLink href="#fila-de-espera" className="min-h-11">
            {howItWorks.listLink}
          </TextLink>
        </SectionHead>

        {/* A demo em largura cheia embaixo das duas colunas. */}
        <div className="mt-8 lg:mt-12">
          <TwoSidesDemo show={show} />
        </div>
      </div>
    </Section>
  );
}
