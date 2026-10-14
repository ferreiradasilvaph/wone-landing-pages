"use client";

import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { WaitlistForm } from "@/components/WaitlistForm";

/**
 * O fecho: o que acontece depois do cadastro, em três linhas "termo —
 * complemento", e o formulário ao lado.
 *
 * O formulário fica DIRETO no fundo da seção. O card dentro de card que havia
 * aqui (`.surface` com sombra, fundo próprio, fio laranja no topo, malha e blur
 * de 130px) empilhava quatro superfícies para mostrar cinco campos.
 *
 * Os blocos de prova só existem com dados: enquanto `proof` estiver vazio no
 * dicionário, nada renderiza. Número e nome inventados são o que a regra 4
 * proíbe, e um esqueleto "em breve" seria a mesma mentira em outra forma.
 */
export function WaitlistSection() {
  const { cta, proof } = useContent();

  return (
    <Section anchor="fila-de-espera" tone="ink-850">
      <SectionHead
        variant="B"
        id="fila-de-espera"
        /* O formulário vai às colunas 7–12, não 6–12: na coluna 6 ele ficava a
           30px da lista "termo — complemento" ao lado, e a espec dá uma coluna
           inteira de vão entre os dois. */
        asideStart={7}
        kicker={cta.kicker}
        title={cta.title}
        lead={cta.lead}
        aside={<WaitlistForm />}
      >
        {proof.numbers.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
            {proof.numbers.map((item) => (
              <div key={item.label}>
                <p className="tnum text-[2rem] leading-none font-semibold text-cream">
                  {item.value}
                </p>
                <p className="mt-2 text-[13px] text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {proof.names.length > 0 && (
          <ul className="mb-8 flex flex-col gap-2">
            {proof.names.map((item) => (
              <li key={item.handle} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-semibold text-cream">{item.name}</span>
                <code>{item.handle}</code>
              </li>
            ))}
          </ul>
        )}

        <dl className="divide-y divide-line border-t border-line">
          {cta.bullets.map((bullet) => (
            <div key={bullet.term} className="grid grid-cols-[7rem_1fr] py-3">
              <dt className="text-[15px] font-semibold text-cream">{bullet.term}</dt>
              <dd className="text-[15px] text-muted">{bullet.detail}</dd>
            </div>
          ))}
        </dl>
      </SectionHead>
    </Section>
  );
}
