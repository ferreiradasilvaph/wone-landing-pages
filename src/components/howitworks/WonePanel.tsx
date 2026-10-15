"use client";

import { Bot, Check, CreditCard, Receipt, Workflow, type LucideIcon } from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "@/components/Chip";
import { FlagMark } from "@/components/FlagMark";
import { WoneIcon } from "@/components/WoneMark";
import { HOURLY_REVENUE } from "@/data/content";
import { FlowCanvas, FlowStack } from "./FlowCanvas";
import { StepLayer } from "./StepLayer";

/** Rótulo de máquina dentro do mockup: 11px é o piso aqui dentro. */
const LABEL = "text-[11px] font-medium tracking-[0.08em] text-faint uppercase";
/** Título da tela aberta. */
const SCREEN = "text-[12px] font-semibold text-cream xl:text-[13px]";
/** Linha de conteúdo do painel: 11px no celular, 12 na tela grande. */
const BODY = "text-[11px] xl:text-[12px]";

/** O ícone de cada tela do painel, na ordem dos quatro passos. */
const SCREEN_ICONS: LucideIcon[] = [Bot, Workflow, CreditCard, Receipt];

/**
 * A TELA GRANDE da sala de operação: o seu painel, com quatro telas de verdade
 * — uma por passo.
 *
 * Substituiu o `OperatorPanel`, que era um retângulo de 552×187 com duas ou
 * três linhas de texto dentro. O diagnóstico do dono, em 15/10: "visualmente
 * está ruim... adicione mais informações nas seções com poucas informações".
 * Então o objeto virou uma JANELA de painel — barra com três pontos, aba,
 * trilho de navegação com as quatro telas — e cada passo abre a tela que ele
 * configura, cheia:
 *
 *  01 Bots — o campo do token mascarado, o card do bot no ar e o checklist;
 *  02 Funil — as duas abas de produto, a paleta com as sete categorias e o
 *     funil de exemplo no canvas, com ramo condicional;
 *  03 Pagamentos — os dois slots de gateway e a tabela dos quatro países;
 *  04 Vendas — o extrato com a venda nova no topo e o faturamento por hora.
 *
 * O TRILHO DE NAVEGAÇÃO acende a tela do passo. Ele não é enfeite: é o que faz
 * o visitante entender que as três primeiras coisas são TELAS DIFERENTES do
 * mesmo painel, e que a quarta é a que ele vai olhar depois, quando a venda
 * acontecer sozinha.
 *
 * Nenhum valor é cunhado aqui (regra 4). O funil vem de
 * `highlights.demos.blocks`, os países e os métodos de `payments.table`, os
 * gateways e o extrato de `analytics.panel`, a série por hora de
 * `src/data/content.ts` — a mesma que o painel de Análises desenha — e os
 * rótulos de `howItWorks.demo.panel`. A ficção se declara na barra de janela.
 *
 * Tudo aqui dentro é `aria-hidden` pelo palco, então o piso de tamanho é 11px.
 */
export function WonePanel({ step, className = "" }: { step: number; className?: string }) {
  const { howItWorks, highlights, payments, analytics, ui, phone } = useContent();
  const { demo, paths } = howItWorks;
  const panel = demo.panel;
  const blocks = highlights.demos.blocks;

  /* Os nomes das processadoras vêm do extrato de Análises — as duas que a
     página já nomeia. */
  const mainGateway = analytics.panel.statementRows[0].gateway;
  const backupGateway = analytics.panel.statementRows[2].gateway;
  /* O PIX confirmado é o rótulo do primeiro evento da entrega, não uma frase
     nova: é o mesmo fato, dito uma vez no dicionário. */
  const pixConfirmed = highlights.demos.delivery.steps[0].label;

  const peak = HOURLY_REVENUE.indexOf(Math.max(...HOURLY_REVENUE));
  const peakValue = HOURLY_REVENUE[peak];

  return (
    <div
      /* Moldura fina de ink-700 e o MESMO rim de 1px em creme a 8% que separa o
         vidro da moldura no aparelho: é o que faz as duas peças lerem como
         objetos da mesma sala, uma de três quartos e outra de frente.
         O espaço antes do `${` não é estilo: colada na interpolação, a classe
         do rim não era extraída pelo varredor do Tailwind e o rim nunca existiu
         (achado de 15/10, o mesmo bug do `p-[5px]` do aparelho). */
      className={`flex flex-col overflow-hidden rounded-[14px] border border-ink-700 bg-ink-950 shadow-[inset_0_0_0_1px_rgba(255,255,227,0.06)] ${
        className ? ` ${className}` : ""
      }`}
    >
      {/* A BARRA DE JANELA. Três pontos, a aba e a etiqueta de ficção no canto:
          é o que transforma um retângulo com texto num objeto de software. */}
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-ink-900 px-3">
        <span className="flex shrink-0 gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-700" />
          <span className="h-2 w-2 rounded-full bg-ink-700" />
          <span className="h-2 w-2 rounded-full bg-ink-700" />
        </span>
        <span className="min-w-0 truncate text-[11px] text-muted">{panel.window}</span>
        <span className={`${LABEL} ml-auto shrink-0`}>{ui.simulation}</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* O trilho de telas. Fora da tela estreita: a 412 ele comeria metade da
            largura do painel, e lá o título da tela já diz onde se está. */}
        <nav className="hidden w-[132px] shrink-0 flex-col gap-1 border-r border-line p-2 xl:flex">
          {panel.screens.map((name, index) => {
            const Icone = SCREEN_ICONS[index];
            return (
              <span
                key={name}
                className={`flex h-8 items-center gap-2 rounded-[8px] px-2 text-[12px] transition-colors duration-300 ${
                  index === step ? "bg-ink-800 font-medium text-cream" : "text-faint"
                }`}
              >
                <Icone className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{name}</span>
              </span>
            );
          })}
        </nav>

        <div className="relative min-w-0 flex-1">
          {/* PASSO 01 — a tela de Bots */}
          <StepLayer active={step === 0} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <p className={SCREEN}>{panel.screens[0]}</p>

            <div>
              <p className={LABEL}>{demo.tokenLabel}</p>
              {/* O token é valor de máquina: `<code>` é o único lugar em que a
                  mono aparece (regra 2), e o resto sai mascarado como em
                  qualquer campo de credencial. */}
              <p className="mt-1.5 flex h-9 items-center gap-2 rounded-field bg-ink-900 px-3 xl:h-10">
                <code>@BotFather</code>
                <span className="text-[11px] tracking-[0.18em] text-cream/55">••••••••</span>
                <Check className="ml-auto h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-400" />
              </p>
            </div>

            <div className="flex items-center gap-2.5 rounded-field bg-ink-900 px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15">
                <WoneIcon className="h-3 w-auto" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className={`block truncate font-semibold text-cream ${BODY}`}>
                  {phone.botName}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  {demo.botOnline}
                </span>
              </span>
              <Chip tone="ok" className="ml-auto shrink-0">
                {panel.webhook}
              </Chip>
            </div>

            {/* O checklist é ESTADO DE TELA, não promessa: são as três coisas
                que o painel marca sozinho depois do token. */}
            <ul className="flex flex-col gap-1.5 xl:gap-2">
              {panel.botChecks.map((check) => (
                <li key={check} className={`flex items-center gap-2 text-cream/80 ${BODY}`}>
                  <Check className="h-3 w-3 shrink-0 stroke-[3] text-emerald-400" />
                  {check}
                </li>
              ))}
            </ul>
          </StepLayer>

          {/* PASSO 02 — o editor de blocos */}
          <StepLayer active={step === 1} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <div className="flex items-center gap-2">
              {/* Segmentado INERTE: os dois produtos na mesma conta, ditos sem
                  uma palavra. Quem escolhe o passo é o trilho da seção — um
                  controle dentro do controle foi o que o dono chamou de confuso
                  em 14/10. */}
              <span className="flex shrink-0 gap-1 rounded-field bg-ink-900 p-1 text-[11px] font-medium">
                {paths.map((path, index) => (
                  <span
                    key={path.name}
                    /* 8px é o raio do campo (12) menos o respiro de 4: a conta
                       do raio aninhado, não uma quarta forma no sistema. */
                    className={`truncate rounded-[8px] px-2 py-1 ${
                      index === 1 ? "bg-ink-800 text-cream" : "text-faint"
                    }`}
                  >
                    {path.name}
                  </span>
                ))}
              </span>
              <span className="ml-auto hidden truncate text-[11px] text-faint sm:block">
                {demo.funnelNote}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 gap-3">
              {/* A paleta com as sete categorias e a contagem de cada uma: é a
                  informação que o passo 02 tinha de dar e não dava. */}
              <div className="hidden w-[122px] shrink-0 flex-col xl:flex">
                <p className={LABEL}>{blocks.builder.palette}</p>
                <span className="mt-1.5 flex flex-col">
                  {blocks.categories.map((category) => (
                    <span
                      key={category.name}
                      className="flex h-6 items-center gap-2 rounded-[8px] px-2 text-[11px] text-muted"
                    >
                      <span className="min-w-0 truncate">{category.name}</span>
                      <span className="tnum ml-auto shrink-0 text-faint">
                        {category.items.length}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="mt-auto text-[11px] font-medium text-brand">
                  {panel.blocksCount}
                </span>
              </div>

              <FlowCanvas />
              <FlowStack />
            </div>

            <p className="text-[11px] font-medium text-brand xl:hidden">{panel.blocksCount}</p>
          </StepLayer>

          {/* PASSO 03 — a tela de Pagamentos */}
          <StepLayer active={step === 2} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <div className="flex items-baseline gap-2">
              <p className={SCREEN}>{panel.screens[2]}</p>
              {/* A garantia nomeia os DOIS SLOTS abaixo, não a tabela: é a
                  conta da processadora que é sua, e o reserva é dela. */}
              <p className={`${LABEL} ml-auto truncate`}>{payments.guarantees[0].term}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Dois slots: o principal no ar e o reserva em espera. Os nomes
                  das processadoras são as duas que o extrato de Análises já
                  nomeia; o termo do reserva é a garantia de Pagamentos. */}
              <span className="flex flex-col justify-center gap-0.5 rounded-field bg-ink-900 px-3 py-1.5 xl:py-2">
                <span className={LABEL}>{demo.gatewayMain}</span>
                <span className={`flex items-center gap-1.5 font-medium text-cream ${BODY}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {mainGateway}
                </span>
              </span>
              <span className="flex flex-col justify-center gap-0.5 rounded-field bg-ink-900 px-3 py-1.5 xl:py-2">
                <span className={`${LABEL} truncate`}>{payments.guarantees[1].term}</span>
                <span className={`flex items-center gap-1.5 text-faint ${BODY}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cream/25" />
                  {backupGateway}
                  <span className="ml-auto hidden text-[11px] xl:block">{demo.gatewayBackup}</span>
                </span>
              </span>
            </div>

            <div className="min-h-0 flex-1">
              {/* O cabeçalho da tabela é o de Pagamentos, com as mesmas três
                  colunas: país, o que ele paga e a moeda. Só na tela grande: a
                  lista estreita não tem coluna de métodos para rotular. */}
              <span className="hidden items-center gap-2 border-b border-line px-1 pb-1.5 xl:flex">
                <span className={`${LABEL} truncate`}>{payments.table.headers.country}</span>
                <span className={`${LABEL} ml-auto truncate`}>
                  {payments.table.headers.methods}
                </span>
                {/* 48px é a medida de "MOEDA" em 11px com o tracking do rótulo
                    — com 36 a palavra saía reticenciada no cabeçalho. */}
                <span className={`${LABEL} w-12 shrink-0 truncate text-right`}>
                  {payments.table.headers.currency}
                </span>
              </span>

              {/* A TABELA, na tela grande. Dois métodos por país e o resto como
                  "+n": em 15/10 a diretoria dobrou a lista (sete países, e o
                  Brasil com seis meios de pagamento), e a linha inteira não
                  cabe nos 330px úteis da tela do painel — a tabela completa é a
                  seção Pagamentos, aqui é a vista de dentro do produto. O corte
                  é por CONTA, não por escolha editorial: `methods.length - 2`. */}
              <span className="hidden flex-col xl:flex">
                {payments.table.countries.map((country, index) => {
                  const visiveis = country.methods.slice(0, 2);
                  const resto = country.methods.length - visiveis.length;

                  return (
                    <span
                      key={country.code}
                      className={`flex h-8 items-center gap-2 px-1 ${
                        index > 0 ? "border-t border-line" : ""
                      }`}
                    >
                      <FlagMark code={country.code} className="h-[13px] w-[19px]" />
                      <span className={`min-w-0 shrink truncate text-cream ${BODY}`}>
                        {country.name}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1">
                        {visiveis.map((method) => (
                          <span
                            key={method}
                            /* O PIX é o método principal e leva o único laranja
                               da tabela; o resto fica neutro (mesma regra do
                               `Chip`). Pílula de 20px, não o chip de 28 do kit:
                               sete linhas de chips do kit empurrariam a tabela
                               para fora da tela. */
                            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${
                              method === country.methods[0] && index === 0
                                ? "bg-brand/12 text-brand"
                                : "bg-cream/6 text-muted"
                            }`}
                          >
                            {method}
                          </span>
                        ))}
                        {resto > 0 ? (
                          <span className="tnum text-[11px] text-faint">+{resto}</span>
                        ) : null}
                      </span>
                      <span className="w-12 shrink-0 text-right">
                        <code>{country.code}</code>
                      </span>
                    </span>
                  );
                })}
              </span>

              {/* A MESMA lista na tela estreita, em duas colunas e sem métodos:
                  o que o passo 03 precisa dizer ali é a extensão (país e moeda),
                  e sete linhas com chips não cabem nos 280px do painel. */}
              <span className="grid grid-cols-2 gap-x-3 xl:hidden">
                {payments.table.countries.map((country) => (
                  <span key={country.code} className="flex h-6 items-center gap-1.5">
                    <FlagMark code={country.code} className="h-[11px] w-4" />
                    <span className="min-w-0 truncate text-[11px] text-cream">{country.name}</span>
                    <span className="ml-auto shrink-0">
                      <code>{country.code}</code>
                    </span>
                  </span>
                ))}
              </span>
            </div>
          </StepLayer>

          {/* PASSO 04 — a tela de Vendas */}
          <StepLayer active={step === 3} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <div className="flex items-center gap-2">
              <p className={SCREEN}>{panel.screens[3]}</p>
              <Chip tone="brand" className="ml-auto shrink-0">
                {pixConfirmed}
              </Chip>
            </div>

            <div>
              <p className={LABEL}>{demo.statement}</p>
              <span className="mt-1.5 flex flex-col">
                {analytics.panel.statementRows.map((row, index) => (
                  <span
                    key={row.time}
                    /* A venda nova é a primeira linha, e é a única com tom: o
                       extrato marca o que acabou de entrar. O carimbo dela é
                       "agora" e não a hora (21:47), porque o aparelho ao lado
                       mostra a MESMA venda chegando neste instante — duas horas
                       diferentes para um pagamento só se contradizem. */
                    className={`flex h-6 items-center gap-2 rounded-[8px] px-2 xl:h-7 ${
                      index === 0 ? "bg-brand/10" : ""
                    }`}
                  >
                    <span className="w-10 shrink-0 text-[11px]">
                      {index === 0 ? (
                        <span className="font-medium text-brand">{panel.now}</span>
                      ) : (
                        <code>{row.time}</code>
                      )}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-cream ${BODY}`}>{row.flow}</span>
                    <span className="hidden shrink-0 text-[11px] text-faint sm:block">
                      {row.gateway}
                    </span>
                    <span className={`tnum shrink-0 font-medium text-cream ${BODY}`}>
                      {row.value}
                    </span>
                  </span>
                ))}
              </span>
            </div>

            {/* O faturamento por hora: a MESMA série que o painel de Análises
                desenha (`src/data/content.ts`), em 24 barras. Nenhum número
                novo entra aqui — e o pico é marcado em laranja porque é o que a
                tela existe para mostrar. */}
            <div className="mt-auto">
              <p className="flex items-baseline gap-2">
                <span className={LABEL}>{panel.hourly}</span>
                <span className="ml-auto text-[11px] font-medium text-brand">
                  {analytics.panel.peak}
                </span>
              </p>
              <span className="mt-1.5 flex h-8 items-end gap-[2px] xl:h-12">
                {HOURLY_REVENUE.map((value, hour) => (
                  <span
                    key={hour}
                    className={`min-w-0 flex-1 rounded-[1px] ${
                      hour === peak ? "bg-brand" : "bg-brand/30"
                    }`}
                    style={{ height: `${Math.max(6, (value / peakValue) * 100)}%` }}
                  />
                ))}
              </span>
            </div>
          </StepLayer>
        </div>
      </div>
    </div>
  );
}
