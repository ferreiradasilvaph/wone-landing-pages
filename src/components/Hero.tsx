"use client";

import { useContent } from "@/i18n";
import { Marquee } from "./Marquee";
import { PhoneMockup } from "./PhoneMockup";

/**
 * Classe das duas chamadas do hero.
 *
 * Existe um único estilo de botão no site, e as duas usam exatamente este — a
 * seta e o tratamento de link de texto que o secundário tinha saíram. Ficando
 * numa constante, não há como uma ser ajustada sem a outra.
 */
const CTA =
  "btn-solid inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-[15px] font-semibold sm:w-auto";

/**
 * Abertura da página: texto à esquerda, aparelho do `PhoneMockup` à direita.
 *
 * A simetria central saiu de propósito, junto com o badge pill, o gradiente no
 * título, o botão outline e as duas camadas de aurora — somados, davam o ar de
 * página genérica. Ficou uma malha discreta no fundo, um título em cor sólida
 * com uma única palavra em laranja, um botão com peso e um link de texto.
 *
 * NÃO ANIME NADA DESTA SEÇÃO NA ENTRADA.
 *
 * O `<h1>` daqui é o elemento de LCP da página no mobile. Quando ele nascia em
 * `opacity: 0` (era um `motion.h1` com `initial`), o navegador não tinha o que
 * pintar até o React hidratar e a animação rodar: o Lighthouse media 3,5 s de
 * LCP, dos quais 3.068 ms eram só Render Delay — 87% da métrica — contra 1,3 s
 * de FCP. O texto agora está pintado no primeiro paint, e o LCP cai para junto
 * do FCP. Qualquer `opacity`, `blur` ou `translate` inicial aqui devolve o
 * problema; o movimento de entrada do resto da página fica nas seções abaixo da
 * dobra, onde não custa métrica.
 */
export function Hero() {
  const { hero } = useContent();

  return (
    <section id="topo" className="relative overflow-hidden pt-28 pb-16 sm:pt-32">
      {/* Único fundo da seção: a malha técnica apagada, sumindo para baixo.
          Sem glow radial, sem aurora, sem gradiente de base. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-mesh absolute inset-0 opacity-25 [mask-image:linear-gradient(to_bottom,#000,transparent_72%)]" />
      </div>

      {/* Assimétrico a partir de lg; empilhado e alinhado à esquerda no mobile */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
        <div>
          {/* Contexto em texto simples: sem borda, sem fundo, sem ponto */}
          <p className="text-sm text-faint">{hero.context}</p>

          <h1 className="t-display mt-4 max-w-xl text-balance text-cream">
            {hero.titleStart} <span className="text-brand">{hero.titleAccent}</span>
          </h1>

          <p className="t-lead mt-5 max-w-lg text-pretty">{hero.lead}</p>

          {/* As duas chamadas usam a MESMA constante de classe, declarada uma
              vez no topo do arquivo. Não é só economia: é o que garante que não
              voltem a divergir num ajuste futuro de uma delas. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a href="#fila-de-espera" className={CTA}>
              {hero.ctaPrimary}
            </a>

            <a href="#como-funciona" className={CTA}>
              {hero.ctaSecondary}
            </a>
          </div>

          {/* Fatos em texto corrido: as pills com borda e ícone saíram daqui */}
          <ul className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-faint">
            {hero.facts.map((fact, index) => (
              <li key={fact} className="flex items-center gap-3">
                {index > 0 && (
                  <span aria-hidden className="text-cream/20">
                    ·
                  </span>
                )}
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMockup />
      </div>

      {/* Integrações */}
      <div className="mt-20 sm:mt-24">
        <p className="t-eyebrow mx-auto mb-4 max-w-6xl px-5 text-faint sm:px-6">
          {hero.integrationsLabel}
        </p>
        <Marquee />
      </div>
    </section>
  );
}
