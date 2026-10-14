"use client";

import { Fragment } from "react";
import { useContent } from "@/i18n";
import { StepEnter } from "./StepEnter";

/** Quando o painel entra, em segundos. Nos passos de configuração ele vem
    primeiro (é o seu lado da venda); no 04 ele é o ÚLTIMO — a linha do extrato
    sobe depois de o fio voltar do chat, que é a ordem real do fato. */
const PANEL_DELAY_SETUP = 0;
const PANEL_DELAY_OUTCOME = 0.82;

/**
 * A tela da esquerda: o SEU painel. Quatro estados, um por passo.
 *
 * É a linguagem de painel que a página já fala em Análises — campo, segmentado,
 * fileira de nós, linha de extrato — e não um objeto 3D abstrato. Cada valor
 * que aparece aqui vem do dicionário de outra seção, nunca cunhado neste
 * arquivo: o funil é `highlights.demos.blocks.flow`, os gateways e a linha de
 * extrato são de `analytics.panel`, os termos de garantia são de
 * `payments.guarantees`, e as duas abas são os nomes de `howItWorks.paths`.
 *
 * Toda a ilustração é `aria-hidden` (quem carrega o significado são as abas do
 * trilho, em texto de 13-15px), então o piso de tamanho aqui dentro é 11px.
 */
export function OperatorPanel({
  step,
  animated,
  reduced,
}: {
  step: number;
  animated: boolean;
  reduced: boolean;
}) {
  const { howItWorks, highlights, payments, analytics } = useContent();
  const { demo, paths } = howItWorks;
  const flow = highlights.demos.blocks.flow;
  const methods = payments.table.countries[0].methods;
  const row = analytics.panel.statementRows[0];
  /* Os nomes das processadoras vêm do extrato de Análises — as duas que a
     página já nomeia. Nada é inventado aqui. */
  const mainGateway = analytics.panel.statementRows[0].gateway;
  const backupGateway = analytics.panel.statementRows[2].gateway;

  const label = "text-[11px] font-medium tracking-[0.08em] text-faint uppercase";

  /* O passo 04 é o desfecho e entra por último: é o que o torna visivelmente
     diferente dos três de configuração. */
  const outcome = step === 3;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-field border border-line bg-ink-950">
      <div className="flex h-9 shrink-0 items-center border-b border-line px-3">
        <span className="truncate text-[11px] font-medium text-faint">{demo.sides.panel}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-start p-3">
        <StepEnter
          key={step}
          animated={animated}
          reduced={reduced}
          delay={outcome ? PANEL_DELAY_OUTCOME : PANEL_DELAY_SETUP}
          distance={outcome ? 8 : 6}
          duration={outcome ? 0.3 : 0.28}
          className="flex flex-col gap-2"
        >
          {step === 0 ? (
            <>
              <p className={label}>{demo.tokenLabel}</p>
              {/* O token é um valor de máquina: `<code>` é o único lugar da
                  página em que a mono aparece (regra 2). O resto do token sai
                  mascarado, como em qualquer campo de credencial. */}
              <p className="flex h-9 items-center justify-between gap-2 rounded-field bg-ink-850 px-3">
                <code>@BotFather</code>
                <span className="text-[11px] text-cream/60">••••••••••••</span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                {demo.botOnline}
              </p>
            </>
          ) : null}

          {step === 1 ? (
            <>
              {/* Segmentado INERTE, de propósito: um controle dentro do
                  controle, com relógio próprio, é exatamente o que o dono
                  chamou de confuso em 14/10. Ele diz o que o passo 02 precisa
                  dizer sem uma palavra — os dois caminhos na mesma conta —, e
                  quem escolhe o passo continua sendo o trilho de abas. */}
              <span className="flex gap-1 rounded-field bg-ink-850 p-1 text-[11px] font-medium">
                {paths.map((path, index) => (
                  <span
                    key={path.name}
                    /* 8px é o raio do campo (12) menos o respiro de 4: é a conta
                       do raio aninhado, não uma quarta forma no sistema. */
                    className={`flex-1 truncate rounded-[8px] px-2 py-1 text-center ${
                      index === 1 ? "bg-ink-800 text-cream" : "text-faint"
                    }`}
                  >
                    {path.name}
                  </span>
                ))}
              </span>
              <span className="flex flex-wrap items-center gap-y-1">
                {flow.map((node, index) => (
                  <Fragment key={node}>
                    {index > 0 ? (
                      <span className="h-px w-2 shrink-0 bg-line-strong" />
                    ) : null}
                    <span className="rounded-field bg-ink-850 px-2 py-1 text-[11px] text-cream">
                      {node}
                    </span>
                  </Fragment>
                ))}
              </span>
              <p className="text-[11px] text-faint">{demo.funnelNote}</p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              {/* Duas linhas de tabela: a principal com estado verde, a reserva
                  em `faint` — "em espera" é a informação, e o tom já a diz. */}
              <p className="flex items-center gap-2 text-[11px]">
                <span className="min-w-0 truncate text-cream">{payments.guarantees[0].term}</span>
                <span className="shrink-0 text-cream/60">{mainGateway}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-emerald-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {demo.gatewayMain}
                </span>
              </p>
              <p className="flex items-center gap-2 text-[11px] text-faint">
                <span className="min-w-0 truncate">{payments.guarantees[1].term}</span>
                <span className="shrink-0">{backupGateway}</span>
                <span className="ml-auto shrink-0">{demo.gatewayBackup}</span>
              </p>
              <span className="mt-1 flex flex-wrap gap-2">
                {methods.map((method, index) => (
                  <span
                    key={method}
                    /* O PIX é o método principal e leva o único laranja do
                        bloco; o cartão fica neutro. Mesma regra do `Chip` e a
                        MESMA altura: `h-7` é a do kit, copiada em vez de
                        aproximada por padding — com `py-1` estes chips mediam
                        25px e conviviam com os do kit ("Bot conectado",
                        "Acesso liberado") de 28 no mesmo card, duas alturas
                        para a mesma forma. O texto fica em 11px (é o piso
                        dentro do mockup), e os 3px saíram da folga que o corpo
                        mais justo liberou. */
                    className={`inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-medium ${
                      index === 0 ? "bg-brand/12 text-brand" : "bg-cream/6 text-muted"
                    }`}
                  >
                    {method}
                  </span>
                ))}
              </span>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className={label}>{demo.statement}</p>
              {/* Sem a hora: `statementRows[0].time` é 21:47 e o carimbo da
                  entrega, no chat ao lado, é 03:14:01 — os dois juntos se
                  contradizem. Fica a hora da entrega, que é a que conta a
                  velocidade, e o extrato mostra fluxo · gateway · valor. */}
              <p className="flex items-center gap-2 rounded-field bg-ink-850 px-3 py-2 text-[11px]">
                <span className="min-w-0 truncate text-cream">{row.flow}</span>
                <span className="shrink-0 text-faint">{row.gateway}</span>
                <span className="tnum ml-auto shrink-0 font-medium text-cream">{row.value}</span>
              </p>
            </>
          ) : null}
        </StepEnter>
      </div>
    </div>
  );
}
