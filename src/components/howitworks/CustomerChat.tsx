"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "@/components/Chip";
import { CtaButton } from "@/components/CtaButton";
import { WoneIcon } from "@/components/WoneMark";
import { StepEnter } from "./StepEnter";

/** Quando o chat entra, e o degrau entre os seus elementos (segundos). */
const CHAT_DELAY_SETUP = 0.42;
const CHAT_DELAY_OUTCOME = 0;
const CHAT_STAGGER = 0.09;

/**
 * A tela da direita: o chat do CLIENTE. Quatro estados, um por passo.
 *
 * Reaproveita a LINGUAGEM do telefone do hero (`PhoneMockup`) — nome do bot,
 * "online" em verde, bolha de oferta, cartão de aprovado com o `Check` — e não
 * o componente: duas molduras de aparelho na mesma página disputariam a mesma
 * leitura, e aqui a forma é uma tela de painel.
 *
 * O corpo é alinhado ao RODAPÉ, como conversa de verdade. É o que faz o passo
 * 01, com um chip só, parecer um chat novo em vez de um painel vazio.
 *
 * Nos passos 01-03 o chat entra DEPOIS do painel (você fez algo, e o cliente
 * passou a ver). No 04 ele entra PRIMEIRO: o cliente paga, e só então o fio
 * volta para o seu extrato. A inversão é o ponto da seção.
 */
export function CustomerChat({
  step,
  animated,
  reduced,
}: {
  step: number;
  animated: boolean;
  reduced: boolean;
}) {
  const { howItWorks, highlights, payments, phone } = useContent();
  const { demo } = howItWorks;
  const { checkout, delivery } = highlights.demos;
  const country = payments.table.countries[0];
  const sale = phone.transactions[0];
  const outcome = step === 3;
  const base = outcome ? CHAT_DELAY_OUTCOME : CHAT_DELAY_SETUP;

  /* A bolha de oferta é a mesma nos passos 02 e 03. A diferença é o botão: ele
     aparece no 03 porque o gateway acabou de ser conectado — a causalidade do
     produto dita sem uma palavra, e sem precisar de um segundo estilo de botão
     (cinza) que o kit não tem. Desabilitado de propósito (precedente:
     `CheckoutDemo`): nada dentro de uma ilustração `aria-hidden` pode ser
     focável, e `.btn-solid` não tem estilo de desabilitado, então o laranja
     fica. */
  const offer = (
    <span className="block w-full max-w-[20rem] rounded-field bg-ink-850 px-3 py-2.5">
      <span className="block text-[11px] font-semibold text-cream">{checkout.product}</span>
      <span className="block text-[11px] text-faint">{checkout.productNote}</span>
      {/* O valor vem de `phone.transactions[0].amount`, não do checkout de
          Pagamentos: é o MESMO texto do cartão aprovado no passo 04 e da linha
          do extrato no painel ao lado. A primeira versão montava
          `countries[0].symbol` + `prices[0].display` ("R$ 197,00") e, seis
          segundos depois, o mesmo "Plano Anual VIP" aparecia como "$197.00" —
          duas moedas para a mesma venda, dentro de um card que existe para
          provar que é uma só. Uma moeda na demo; a tabela de moedas por país
          continua sendo a seção Pagamentos. */}
      <span className="tnum mt-1 block text-[13px] font-medium text-cream">{sale.amount}</span>
      {step === 2 ? (
        <StepEnter
          animated={animated}
          reduced={reduced}
          delay={base + CHAT_STAGGER}
          className="mt-2"
        >
          <CtaButton size="object" disabled className="w-full">
            {checkout.payWith} {country.methods[0]}
          </CtaButton>
        </StepEnter>
      ) : null}
    </span>
  );

  /** Os blocos de cada passo, de cima para baixo. Cada um entra 90ms depois. */
  const blocks =
    step === 0
      ? [
          <Chip key="connected" tone="ok">
            {demo.connected}
          </Chip>,
        ]
      : step === 1 || step === 2
        ? [<Fragment key="offer">{offer}</Fragment>]
        : [
            /* A melhor frase das três propostas, e ela cai exatamente na dobra
               3+1: daqui para baixo nada mais é trabalho de quem vende. Sem
               bolha de saída do cliente — no Telegram ele TOCA num botão, não
               escreve. */
            <p key="hand" className="border-t border-line pt-1.5 text-center text-[11px] text-faint">
              {demo.hand}
            </p>,
            <span
              key="approved"
              className="flex w-full max-w-[20rem] items-center gap-2.5 rounded-field bg-emerald-500/12 px-3 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-3 w-3 stroke-[3] text-emerald-400" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="tnum block text-[13px] font-semibold text-emerald-400">
                  +{sale.amount}
                </span>
                {/* Estado e nome do plano em duas linhas, como no telefone do
                    hero: na mesma linha, o `truncate` comia justamente o que o
                    cartão existe para anunciar. */}
                <span className="block truncate text-[11px] text-cream/60">{phone.approved}</span>
                <span className="block truncate text-[11px] text-cream/60">{sale.label}</span>
              </span>
            </span>,
            /* A mesma largura da bolha acima: sem o teto, o chip ia parar na
               borda direita do painel de 552px e a linha perdia a coluna. */
            <span key="invite" className="flex w-full max-w-[20rem] items-center gap-2 text-[11px]">
              <span className="shrink-0 text-cream">{demo.inviteSent}</span>
              <code>{delivery.steps[3].at}</code>
              <Chip tone="ok" className="ml-auto shrink-0">
                {delivery.done}
              </Chip>
            </span>,
          ];

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-field border border-line bg-ink-950">
      {/* A linguagem do `PhoneMockup`: ícone no círculo laranja de 15%, nome do
          bot, ponto verde e "online". Sem a moldura de aparelho. */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="min-w-0 truncate text-[11px] font-medium text-faint">
          {demo.sides.chat}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/15">
            <WoneIcon className="h-2.5 w-auto" />
          </span>
          <span className="text-[11px] font-semibold text-cream">{phone.botName}</span>
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-emerald-400">{phone.online}</span>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-3">
        {/* A chave no `Fragment` remonta os blocos a cada troca de passo: é o
            que dispara a entrada em escada. "Simulação" não se repete aqui — ele
            está uma vez no cabeçalho do card, e vale pelas duas telas. */}
        <Fragment key={step}>
          {blocks.map((block, index) => (
            <StepEnter
              key={index}
              animated={animated}
              reduced={reduced}
              delay={base + index * CHAT_STAGGER}
            >
              {block}
            </StepEnter>
          ))}
        </Fragment>
      </div>
    </div>
  );
}
