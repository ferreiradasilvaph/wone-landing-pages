"use client";

import { Fragment, useState } from "react";

import { useContent } from "@/i18n";
import { CtaButton } from "./CtaButton";
import { IntegrationBand } from "./IntegrationBand";
import { PauseButton } from "./PauseButton";
import { PhoneMockup } from "./PhoneMockup";
import { TextLink } from "./TextLink";

/**
 * Abertura da página: texto nas colunas 1–7, aparelho nas 8–12 e a faixa de
 * integrações fechando a dobra em largura de tela (`mt-auto`, como o rodapé do
 * hero da referência). A seção é `flex flex-col` de 100svh só por causa dessa
 * faixa: é o que a cola na base da primeira tela sem altura cravada.
 *
 * NÃO ANIME NADA DESTA SEÇÃO NA ENTRADA.
 *
 * O `<h1>` daqui é o elemento de LCP da página no mobile. Quando ele nascia em
 * `opacity: 0` (era um `motion.h1` com `initial`), o navegador não tinha o que
 * pintar até o React hidratar e a animação rodar: o Lighthouse media 3,5 s de
 * LCP, dos quais 3.068 ms eram só Render Delay — 87% da métrica — contra 1,3 s
 * de FCP. O texto agora está pintado no primeiro paint, e o LCP cai para junto
 * do FCP. Qualquer `opacity`, `blur` ou `translate` inicial aqui devolve o
 * problema; nenhuma outra seção da página anima na entrada tampouco (o Reveal
 * saiu inteiro), então não há para onde empurrar o movimento: ele não existe.
 *
 * `paused` mora aqui, e não dentro do `PhoneMockup`, porque o botão que o
 * comanda fica FORA do aparelho — sob ele, à direita.
 */
export function Hero() {
  const { hero, integrations } = useContent();
  const [paused, setPaused] = useState(false);

  return (
    <section id="topo" data-section="topo" className="flex min-h-[100svh] flex-col bg-ink-950">
      {/* Conteúdo ancorado no alto, como a régua do hero pede (kicker em y≈112 a
          1440×900). A 1440×900 sobram ~236px de preto entre os benefícios e a
          faixa, e é de propósito: dividir essa folga entre o alto e o pé
          (`lg:my-auto` aqui) foi medido e abre 122px de vão entre o header e o
          kicker — dois buracos no lugar de um, e o texto deixa de encostar no
          topo da tela. O que preenche esse pé na referência é a coluna da
          direita; aqui o aparelho tem 439px e termina na metade da dobra. */}
      <div className="mx-auto grid w-full max-w-7xl gap-x-8 gap-y-12 px-4 pt-24 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pt-28">
        <div className="lg:col-span-7">
          {/* O mesmo `.t-kicker` de toda seção, com o traço de 24×1. Abaixo de
              `sm` a cobertura dos quatro países não cabe numa linha de 13px, e
              a versão curta entra no lugar — é a única diferença entre as duas. */}
          <p className="t-kicker">
            <span className="hidden sm:inline-flex">{hero.kicker}</span>
            <span className="sm:hidden">{hero.kickerShort}</span>
          </p>

          {/* Sem `text-balance`: o balanceador igualava o comprimento das três
              linhas e empurrava "no" para junto de "automático", quebrando o
              h1 em "Venda pelo / Telegram / no automático". A quebra gulosa
              dentro dos 34rem cai onde a espec desenha — "Venda pelo /
              Telegram no / automático" —, com a palavra laranja sozinha na
              última linha. */}
          <h1 className="t-display mt-6 max-w-[34rem] text-cream">
            {hero.titleStart} <span className="text-brand">{hero.titleAccent}</span>
          </h1>

          {/* O lead vem fatiado do dicionário: os trechos em objeto são os dois
              momentos que ganham peso (o método de pagamento e a entrada no
              canal). Nada mais muda de peso na primeira dobra. */}
          <p className="t-lead mt-6 max-w-[31rem] text-pretty">
            {hero.lead.map((trecho, index) =>
              typeof trecho === "string" ? (
                <Fragment key={index}>{trecho}</Fragment>
              ) : (
                <strong key={index} className="font-medium text-cream">
                  {trecho.strong}
                </strong>
              ),
            )}
          </p>

          {/* Botão + link na MESMA linha nos dois tamanhos de tela: dois botões
              lado a lado não diriam qual é a ação principal, e o link empilhado
              no celular empurrava o aparelho para fora da primeira tela. */}
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <CtaButton href="#fila-de-espera">{hero.ctaPrimary}</CtaButton>
            <TextLink href="#como-funciona">{hero.ctaSecondary}</TextLink>
          </div>

          {/* Escondidos abaixo de `sm`: são ~80px que decidem se o cartão do PIX
              aparece na primeira tela do celular. */}
          <div className="mt-8 hidden grid-cols-3 gap-x-8 sm:grid">
            {hero.benefits.map((benefit) => (
              <p key={benefit.value} className="text-[13px] leading-5">
                <span className="font-semibold text-cream">{benefit.value}</span>{" "}
                <span className="text-muted">{benefit.label}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 lg:justify-self-end">
          <PhoneMockup paused={paused} />
          <div className="mt-3 flex justify-end">
            <PauseButton
              pressed={paused}
              onToggle={() => setPaused((valor) => !valor)}
              labels={hero.pause}
            />
          </div>
        </div>
      </div>

      {/* Irmã do container, não filha: a faixa atravessa a tela inteira. */}
      <div className="mt-16 lg:mt-auto lg:pt-16">
        <IntegrationBand title={integrations.title} items={integrations.items} />
      </div>
    </section>
  );
}
