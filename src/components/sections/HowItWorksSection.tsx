"use client";

import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { StepsStage } from "@/components/StepsStage";
import { TextLink } from "@/components/TextLink";

/**
 * A tese da página (variante D, o único `t-h2-tese` do site) com o palco dos
 * quatro passos ao lado.
 *
 * Absorveu a seção "Dois caminhos", que era duas colunas de cards com pílula
 * "Completo" e dois botões repetindo o CTA: virou os dois itens com régua desta
 * coluna, com os mesmos fatos e uma ação de menos peso no fim.
 */
export function HowItWorksSection() {
  const { howItWorks } = useContent();
  const tese = howItWorks.thesis;

  return (
    <Section anchor="como-funciona" tone="ink-950">
      <SectionHead
        variant="D"
        id="como-funciona"
        kicker={howItWorks.kicker}
        /* As três linhas vêm literais porque o dicionário não leva `as const`
           (é `en.ts` que precisa satisfazer o mesmo tipo), e a tese é uma tupla
           de três: a terceira é a que sai em laranja. */
        titleLines={[tese[0], tese[1], tese[2]]}
        lead={howItWorks.lead}
        /* O momento ousado da página: a caixa presa ao alto com a cena 3D e o
           "log" dos quatro passos rolando ao lado. No celular ele vem depois
           dos dois caminhos e do link, que é a ordem em que a coluna é lida. */
        aside={<StepsStage />}
      >
        {/* A mesma forma da lista "termo — complemento" da Lista de espera: a
            régua é do conjunto (`divide-y` no pai), não de cada item. */}
        <div className="max-w-[29rem]">
          <dl className="divide-y divide-line border-t border-line">
            {howItWorks.paths.map((path) => (
              <div key={path.name} className="py-4">
                <dt className="text-[15px] font-semibold text-cream">{path.name}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted">{path.text}</dd>
              </div>
            ))}
          </dl>

          {/* `min-h-11` vai no próprio `<a>`: o link de texto mede a altura da
              linha (23px medidos a 1440 e a 412), abaixo dos 44px de alvo de
              toque. A altura tem de entrar no elemento que recebe o toque, não
              num `<span>` em volta. O `mt-3` no lugar do `mt-6` devolve ao
              conjunto o respiro que o link passou a ter por dentro (12 + ~10 =
              os 24px da régua). É remendo local: a altura certa é em `TEXT_LINK`
              (`src/components/cta.ts`), que valeria também para o hero e o
              rodapé — mas o kit está fechado nesta rodada. */}
          <div className="mt-3">
            <TextLink href="#fila-de-espera" className="min-h-11">
              {howItWorks.listLink}
            </TextLink>
          </div>
        </div>
      </SectionHead>
    </Section>
  );
}
