"use client";

import { ArrowRight } from "lucide-react";
import { useContent } from "@/i18n";
import { Marquee } from "./Marquee";
import { PhoneMockup } from "./PhoneMockup";

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

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7">
            {/* Primário sólido, sem sombra colorida nem varredura de brilho */}
            <a
              href="#fila-de-espera"
              className="btn-solid inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-[15px] font-semibold sm:w-auto"
            >
              {hero.ctaPrimary}
            </a>

            {/* Secundário: link de texto com seta, no lugar do botão outline */}
            <a
              href="#como-funciona"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-cream"
            >
              {hero.ctaSecondary}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
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
