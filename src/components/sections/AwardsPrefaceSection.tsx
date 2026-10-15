"use client";

import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TextLink } from "@/components/TextLink";

/**
 * O PREFÁCIO DA VITRINE, logo abaixo do hero.
 *
 * Pedido do dono de 15/10, literal: "crie uma sessão adicional abaixo dos
 * botões lista de espera e ver como funciona (...) uma espécie de prefácio de
 * alguma sessão da página. escolha você a sessão que ficará mais atrativa".
 *
 * A seção escolhida é PREMIAÇÕES, e a escolha tem motivo: é a mais aspiracional
 * da página — troféus de acrílico cristal e joias que chegam na casa de quem
 * vende — e a única que o visitante não consegue imaginar sozinho a partir do
 * nome. As outras candidatas (Pagamentos, Como funciona) o hero já prometeu nas
 * primeiras linhas.
 *
 * Três decisões que a mantêm PREFÁCIO, e não uma segunda vitrine:
 *
 *  - o fundo é o mesmo `--floor` da vitrine, o único tom fora da escala ink da
 *    página: o prefácio PERTENCE a ela, e ao rolar até Premiações o leitor
 *    reconhece o chão;
 *  - não tem âncora no nav (`premios-previa` existe só para o header saber que
 *    seção está à vista): um prefácio que vira item de menu deixa de ser
 *    prefácio e passa a competir com o destino;
 *  - nada aqui é novo além do texto. Os quatro marcos — numeral, linha de
 *    faturamento, item físico e ilustração — saem de `awards.items`, a mesma
 *    lista que a vitrine desenha mais abaixo. Um marco, um lugar.
 *
 * Sem card, sem sombra, sem blur e sem animação de entrada: a coreografia de
 * abertura é só do hero, e o objeto que impressiona é o troféu, não a moldura
 * em volta dele.
 */
export function AwardsPrefaceSection() {
  const { awards, awardsPreface } = useContent();

  return (
    <Section anchor="premios-previa" tone="floor" short>
      <SectionHead
        variant="A"
        id="premios-previa"
        kicker={awardsPreface.kicker}
        title={awardsPreface.title}
        lead={awardsPreface.lead}
      />

      {/* A RÉGUA dos quatro marcos: uma fileira de quatro em `lg`, 2×2 abaixo.
          O que separa as células é régua, não caixa — `border-t` no alto da
          grade e `divide-x` entre elas. O `divide-x` só entra a partir de `lg`
          de propósito: em 2×2 ele daria borda à esquerda da terceira célula, que
          é a primeira da segunda linha. */}
      <ul className="mt-10 grid grid-cols-2 border-t border-line lg:mt-12 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {awards.items.map((item) => (
          <li key={item.tier}>
            {/* O alvo é a célula INTEIRA (bem acima dos 44px do portão), e leva
                para a vitrine. `group` existe por uma razão só: no hover o
                numeral vira laranja, e nada mais se move. */}
            <a
              href="#premios"
              className="group flex h-full flex-col items-center px-3 pt-6 pb-7 text-center lg:px-6"
            >
              {/* A ilustração do troféu, em caixa CRAVADA (e não `w-auto`): os
                  quatro arquivos têm 479×662, menos o de 100K, que tem 479×664.
                  Com a largura automática a proporção do atributo e a do arquivo
                  divergiriam em 0,4px na chegada da imagem — com a caixa fixa e
                  `object-contain` não há como mover nada, e a arte continua
                  centrada e inteira. `<img>` cru e não `next/image`, pelo mesmo
                  motivo medido em `WoneMark`. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                width={479}
                height={664}
                loading="lazy"
                decoding="async"
                className="h-[128px] w-[93px] shrink-0 object-contain lg:h-[168px] lg:w-[122px]"
              />

              {/* O numeral do marco: 2rem em 600, tabular (os quatro ficam com
                  a mesma largura de dígito numa fileira só). */}
              <span className="tnum mt-4 text-[2rem] leading-none font-semibold text-cream transition-colors group-hover:text-brand">
                {item.tier}
              </span>

              <span className="t-label mt-3">{item.milestoneLine}</span>

              {/* O item físico em duas linhas no máximo: é o que o prefácio
                  promete, e a descrição inteira do troféu é assunto da vitrine. */}
              <span className="mt-2 line-clamp-2 text-[14px] leading-snug text-muted">
                {item.awardItem}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* A ação de menos peso da página fecha o prefácio: leva à vitrine, que é
          onde o marco se abre inteiro. */}
      <p className="mt-8">
        <TextLink href="#premios">{awardsPreface.link}</TextLink>
      </p>
    </Section>
  );
}
