"use client";

import { useRef } from "react";
import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TextLink } from "@/components/TextLink";
import { OperationStage } from "@/components/howitworks/OperationStage";
import { StepFacts } from "@/components/howitworks/StepFacts";
import { StepRail } from "@/components/howitworks/StepRail";
import { useStepShow } from "@/components/howitworks/useStepShow";

/**
 * "Como funciona" — a SALA DE OPERAÇÃO, refeita em 15/10 depois do veredito do
 * dono: "preciso que melhore pra ontem a seção como funciona. visualmente está
 * ruim. preciso de algo visualmente espetacular para quem está acessando a
 * página. seja mais criativo nessa sessão", e "adicione mais informações nas
 * sessões com poucas informações".
 *
 * A LÓGICA FICA — é a que ele aprovou em 14/10: três coisas que você faz uma vez
 * (bot, funil, gateway) e uma que acontece sempre (a venda), com um relógio só e
 * os quatro passos clicáveis. O que mudou são a encenação e a quantidade de
 * informação, em quatro peças:
 *
 *  1. `StepRail` — os quatro passos EM LINHA, com o numeral de 2,5rem fazendo o
 *     trabalho gráfico, as duas réguas da dobra 3+1, a barra do relógio e o
 *     "pausar". Era uma lista vertical de quatro linhas iguais.
 *  2. `OperationStage` — o palco: horizonte laranja, chão, a tela grande do
 *     painel inclinada em perspectiva de CSS e o aparelho do cliente em pé, com
 *     o fio laranja e a faísca entre eles. Zero WebGL, zero `motion/react`.
 *  3. `WonePanel` / `CustomerDevice` — quatro telas de verdade e quatro estados
 *     de chat, com os VALORES vindo de outras seções do dicionário (o funil de
 *     Plataforma, os países de Pagamentos, o extrato e a série por hora de
 *     Análises). Eram dois retângulos com três linhas de texto.
 *  4. `StepFacts` — três fatos por passo em texto de verdade, abaixo do palco:
 *     o mockup mostra, e estas nove linhas AFIRMAM.
 *
 * O bloco inteiro é o dono das pausas (ponteiro e foco), porque o relógio é da
 * seção — um só, com "pausar" visível, e nada aqui acoplado à rolagem.
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
          /* O trilho nas colunas 7-12, na linha do kicker: é o controle do
             palco, e fica à vista junto da tese. O palco não cabe aqui — a tela
             grande sozinha pede 640px, e o fio precisa dos 1216 do container. */
          aside={<StepRail show={show} />}
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

        <OperationStage show={show} />
        <StepFacts show={show} />
      </div>
    </Section>
  );
}
