"use client";

import { BatteryMedium, Check, Mic, SignalHigh, Smile, Wifi } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "@/components/Chip";
import { CtaButton } from "@/components/CtaButton";
import { WoneIcon } from "@/components/WoneMark";
import { StepLayer } from "./StepLayer";

/**
 * O APARELHO do cliente, em pé no palco, com o chat em quatro estados.
 *
 * Era uma segunda "tela de painel" ao lado da sua — duas caixas iguais, que foi
 * metade do "visualmente está ruim" de 15/10. Agora é um OBJETO diferente do
 * painel: moldura de aparelho, ilha dinâmica, barra de status, compositor no
 * pé. A linguagem é a do `PhoneMockup` do hero (mesma moldura com degradê,
 * mesmo rim de 1px, mesmo cabeçalho de bot, mesmo cartão verde de aprovado),
 * mas o componente é outro porque o conteúdo é outro: aqui o chat conta os
 * quatro passos, não os quatro países.
 *
 * A ficção se declara no cabeçalho do chat, como no hero.
 *
 * Nos passos 01-03 o aparelho reage ao que VOCÊ fez no painel; no 04 ele AGE
 * primeiro — o cliente paga, e é o painel que recebe a notícia. A inversão é o
 * ponto da seção, e quem a desenha é o atraso do fio e a ordem das camadas.
 *
 * Tudo aqui dentro é `aria-hidden` pelo palco: o piso de tamanho é 11px.
 */
export function CustomerDevice({ step, className = "" }: { step: number; className?: string }) {
  const { howItWorks, highlights, payments, phone, ui } = useContent();
  const { demo } = howItWorks;
  const { checkout, delivery } = highlights.demos;
  const chat = demo.chat;
  /* Uma moeda só na demo (`phone.transactions[0]`): a bolha de oferta, o cartão
     de aprovado e a linha do extrato no painel mostram o MESMO texto. A moeda
     de cada país é assunto da seção Pagamentos. */
  const sale = phone.transactions[0];
  const method = payments.table.countries[0].methods[0];
  /* O comando que abre a conversa é o do rastreio — o mesmo `/start` que a
     seção Pagamentos mostra no caminho do dado. */
  const startCommand = payments.tracking.flow[1].code;

  /* O chat ACUMULA: o que chegou num passo continua na tela no seguinte, como
     numa conversa de verdade. É o que tira do aparelho a cara de tela vazia com
     uma bolha no pé — o passo 02 mostrava uma bolha só em 368px de chat — e o
     que faz a leitura de que é a MESMA conversa andando, não quatro telas
     diferentes. */
  const welcome = (
    <span className="mr-auto max-w-[92%] rounded-field bg-ink-850 px-3 py-2 text-[11px] leading-4 text-cream">
      {chat.welcome}
    </span>
  );

  /** A bolha da oferta, igual nos passos 02 a 04 — muda só o que vem depois. */
  const offer = (
    <span className="block rounded-field bg-ink-850 px-3 py-2.5">
      <span className="block text-[11px] font-semibold text-cream">{checkout.product}</span>
      <span className="mt-0.5 block text-[11px] leading-4 text-faint">{checkout.productNote}</span>
      <span className="tnum mt-1.5 block text-[15px] leading-5 font-semibold text-cream">
        {sale.amount}
      </span>
    </span>
  );

  return (
    <div
      className={`rounded-device relative border border-line-strong bg-gradient-to-b from-ink-750 via-ink-850 to-ink-900 p-[5px]${
        className ? ` ${className}` : ""
      }`}
    >
      {/* Botões laterais: 2px, do degrau de tom da moldura. É o detalhe que faz
          o objeto ler como aparelho e não como cartão arredondado. */}
      <span className="absolute top-[86px] -left-[2px] h-6 w-[2px] rounded-full bg-ink-700" />
      <span className="absolute top-[118px] -left-[2px] h-6 w-[2px] rounded-full bg-ink-700" />
      <span className="absolute top-[104px] -right-[2px] h-10 w-[2px] rounded-full bg-ink-700" />

      <div className="phone-screen relative flex h-full flex-col overflow-hidden rounded-[2.15rem] bg-ink-950 shadow-[inset_0_0_0_1px_rgba(255,255,227,0.10)]">
        {/* Barra de status — 26. A hora é a da venda: a linha nova do extrato,
            no painel ao lado, é a MESMA transação, e as linhas abaixo dela são
            mais antigas (21:31, 20:58). */}
        <div className="flex h-[26px] shrink-0 items-center justify-between px-4">
          <span className="text-[11px] font-medium text-cream">
            <code>21:47</code>
          </span>
          <span className="flex items-center gap-1 text-cream/70">
            <SignalHigh className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <BatteryMedium className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Ilha dinâmica, com o furo da câmera recuado à direita */}
        <span className="absolute top-[7px] left-1/2 flex h-[18px] w-[68px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[8px]">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-800" />
        </span>

        {/* Cabeçalho do chat — 44 */}
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15">
            <WoneIcon className="h-3 w-auto" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[11px] font-semibold text-cream">
              {phone.botName}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
              {phone.online}
            </span>
          </span>
          <span className="ml-auto shrink-0 text-[11px] font-medium tracking-[0.08em] text-faint uppercase">
            {ui.simulation}
          </span>
        </div>

        {/* O CHAT. As quatro camadas ficam montadas e ancoradas no RODAPÉ, como
            conversa de verdade: é o que faz o passo 01, com duas bolhas, parecer
            um chat novo em vez de uma tela vazia. */}
        <div className="relative min-h-0 flex-1">
          {/* PASSO 01 — o bot acorda */}
          <StepLayer active={step === 0} className="flex flex-col justify-end gap-2 p-3">
            <p className="text-center text-[11px] text-faint">{demo.connected}</p>
            {/* O cliente TOCA no botão de começar; ele não escreve. O que sai
                dele é o comando. */}
            <span className="ml-auto max-w-[80%] rounded-field bg-ink-800 px-2.5 py-1.5">
              <code>{startCommand}</code>
            </span>
            {welcome}
          </StepLayer>

          {/* PASSO 02 — a oferta chega */}
          <StepLayer active={step === 1} className="flex flex-col justify-end gap-2 p-3">
            {welcome}
            {offer}
          </StepLayer>

          {/* PASSO 03 — o checkout, com o botão que o gateway acabou de ligar */}
          <StepLayer active={step === 2} className="flex flex-col justify-end gap-2 p-3">
            {welcome}
            {offer}
            <span className="flex items-center gap-2">
              <Chip tone="brand">{method}</Chip>
            </span>
            {/* `disabled` de propósito: nada dentro de uma ilustração
                `aria-hidden` pode ser focável (precedente: `CheckoutDemo`). O
                botão só existe a partir do passo 03 porque é o gateway que o
                liga — a causalidade do produto dita sem uma palavra. */}
            <CtaButton size="object" disabled className="w-full">
              {checkout.payWith} {method}
            </CtaButton>
          </StepLayer>

          {/* PASSO 04 — pago, entregue, e daqui em diante é o cliente */}
          <StepLayer active={step === 3} className="flex flex-col justify-end gap-2 p-3">
            {/* A oferta continua na conversa, mas só onde há altura para ela:
                a 412 o aparelho tem 360px e as três peças do desfecho (a régua,
                o cartão verde e o convite) são o que ele PRECISA mostrar. */}
            <span className="hidden xl:block">{offer}</span>
            <p className="border-t border-line pt-2 text-center text-[11px] text-faint">
              {demo.hand}
            </p>
            <span className="flex items-center gap-2.5 rounded-field bg-emerald-500/12 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-3 w-3 stroke-[3] text-emerald-400" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="tnum block text-[13px] font-semibold text-emerald-400">
                  +{sale.amount}
                </span>
                <span className="block truncate text-[11px] text-cream/60">{phone.approved}</span>
              </span>
            </span>
            <span className="flex flex-col gap-1 rounded-field bg-ink-850 px-3 py-2">
              <span className="truncate text-[11px] leading-4">
                <span className="font-medium text-cream">{demo.inviteSent}</span>
                <span className="text-faint"> · {phone.inviteNote}</span>
              </span>
              <Chip tone="ok" className="w-max">
                {delivery.done}
              </Chip>
            </span>
          </StepLayer>
        </div>

        {/* Compositor — 52. INERTE de propósito (`<span>`, não `<input>`): isto
            é ilustração, e um campo de verdade seria focável e convidaria a
            digitar numa tela que não responde. */}
        <div className="flex h-[52px] shrink-0 items-start gap-2 border-t border-line px-3 pt-2.5">
          <span className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-ink-850 px-3">
            <span className="truncate text-[11px] text-faint">{phone.composer}</span>
            <Smile className="ml-auto h-3.5 w-3.5 shrink-0 text-cream/35" />
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15">
            <Mic className="h-3.5 w-3.5 text-brand" />
          </span>
        </div>

        {/* Barra de gesto */}
        <span className="absolute bottom-1.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-cream/25" />
      </div>
    </div>
  );
}
