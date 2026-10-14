"use client";

import { useState } from "react";
import { useContent } from "@/i18n";
import { CtaButton } from "@/components/CtaButton";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TEXT_LINK } from "@/components/cta";
import { TELEGRAM_URL, WaitlistForm } from "@/components/WaitlistForm";

/**
 * O fecho: o que acontece depois do cadastro, em três linhas "termo —
 * complemento", e o formulário ao lado.
 *
 * O formulário fica DIRETO no fundo da seção. O card dentro de card que havia
 * aqui (`.surface` com sombra, fundo próprio, fio laranja no topo, malha e blur
 * de 130px) empilhava quatro superfícies para mostrar cinco campos.
 *
 * O SUCESSO ocupa a coluna da esquerda, no lugar do cabeçalho: "Você está na
 * fila." passa a ser o H2 da seção, e não um parágrafo dentro da caixa do
 * formulário. Era o pior lugar possível para a confirmação — o aviso de que
 * deu certo aparecia exatamente onde o formulário sumia, na metade direita, e
 * o título da seção continuava convidando a entrar na lista.
 *
 * O formulário continua montado ao lado, vazio: a seção não muda de altura
 * quando a confirmação chega, e quem quiser cadastrar outra pessoa já tem os
 * campos à mão. "Cadastrar outro contato" é o atalho — dispensa a confirmação
 * e devolve o cursor ao primeiro campo.
 *
 * Os blocos de prova só existem com dados: enquanto `proof` estiver vazio no
 * dicionário, nada renderiza. Número e nome inventados são o que a regra 4
 * proíbe, e um esqueleto "em breve" seria a mesma mentira em outra forma.
 */
export function WaitlistSection() {
  const { cta, form, proof } = useContent();

  /* Cópia local do endereço do Telegram porque o TypeScript não mantém o
     estreitamento de um símbolo IMPORTADO dentro de uma função: o `telegram &&`
     da linha de cima não chega ao `onClick` do botão, e lá o tipo voltava a ser
     `string | null`. */
  const telegram = TELEGRAM_URL;

  /* `null` = ainda não cadastrou. `telegramOpened` é o que o formulário viu
     acontecer com o `window.open`, e é o que escolhe a frase. */
  const [sucesso, setSucesso] = useState<{ telegramOpened: boolean } | null>(null);
  /* Só depois de "Cadastrar outro contato" o cursor volta ao primeiro campo:
     na primeira montagem isso roubaria a rolagem da página. */
  const [voltouAoFormulario, setVoltouAoFormulario] = useState(false);

  const formulario = (
    <WaitlistForm autoFocus={voltouAoFormulario} onSuccess={setSucesso} />
  );

  if (sucesso) {
    return (
      <Section anchor="fila-de-espera" tone="ink-850">
        {/* A mesma grade do `SectionHead` variante B com `asideStart={7}`: a
            coluna do texto nas 1–5 e o formulário nas 7–12, para a confirmação
            nascer exatamente onde o cabeçalho estava. */}
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-12">
          <div id="fila-de-espera" className="scroll-mt-24 lg:col-span-5" role="status">
            <p className="t-kicker mb-6">{cta.kicker}</p>
            <h2 className="t-h2 text-cream">{cta.success.title}</h2>

            {/* Sem `NEXT_PUBLIC_TELEGRAM_URL` no build não existe para onde
                mandar ninguém: nem botão, nem frase prometendo uma aba — só a
                confirmação e a nota. Era aqui que o fallback `https://t.me/`
                entregava a home do Telegram como se fosse o canal. A variável
                precisa estar definida na hora do `next build` (não basta no
                container); o README explica por quê e como. */}
            {telegram && (
              <p className="t-lead mt-6">
                {sucesso.telegramOpened ? form.successBody : form.successBodyManual}
              </p>
            )}

            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              {form.successNote}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6">
              {/* Destino de fora, e por isso em outra aba: o `CtaButton` com
                  `href` sai um `<a>` sem `target`, e o visitante que acabou de
                  se cadastrar perdia a landing para o Telegram — logo depois de
                  o formulário já ter tentado abrir a aba sozinho. O kit não tem
                  `external` no botão (só o `TextLink` tem) e esta rodada não
                  mexe no kit; com `onClick` ele sai `<button>` e a aba abre no
                  clique, que é quando o navegador ainda concede a abertura.
                  No dia em que o `CtaButton` ganhar `external`, isto volta a
                  ser `href={TELEGRAM_URL} external` numa linha. */}
              {telegram && (
                <CtaButton
                  onClick={() => window.open(telegram, "_blank", "noopener,noreferrer")}
                >
                  {form.openTelegram}
                </CtaButton>
              )}

              {/* "Cadastrar outro contato" é ação, não destino: dispensa a
                  confirmação e põe o cursor no campo de nome, sem navegar para
                  lugar nenhum. Daí ser um `<button>` vestido com a classe do
                  link de texto, e não um `<a href="#">` — o leitor de tela
                  anunciaria um link que não leva a nada. */}
              <button
                type="button"
                onClick={() => {
                  setSucesso(null);
                  setVoltouAoFormulario(true);
                }}
                className={TEXT_LINK}
              >
                {form.again}
              </button>
            </div>
          </div>

          <div className="mt-4 lg:col-span-6 lg:col-start-7 lg:mt-0">{formulario}</div>
        </div>
      </Section>
    );
  }

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
        aside={formulario}
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
