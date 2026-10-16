"use client";

import { Fragment } from "react";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronDown,
  ChevronsLeft,
  CircleHelp,
  CloudUpload,
  CreditCard,
  FileCode2,
  FlaskConical,
  Frame,
  Globe,
  History,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  MessageSquare,
  PanelLeft,
  Redo2,
  Send,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";
import { Chip } from "@/components/Chip";
import { FlagMark } from "@/components/FlagMark";
import { WoneIcon } from "@/components/WoneMark";
import { HOURLY_REVENUE } from "@/data/content";
import { dinheiroTotal } from "@/lib/money";
import { FLOW_EDGES, FLOW_NODES, FlowCanvas } from "./FlowCanvas";
import { StepLayer } from "./StepLayer";

/** Rótulo de máquina dentro do mockup: 11px é o piso aqui dentro. */
const LABEL = "text-[11px] font-medium tracking-[0.08em] text-faint uppercase";
/** Título da tela aberta. */
const SCREEN = "text-[12px] font-semibold text-cream xl:text-[13px]";
/** Linha de conteúdo do painel: 11px no celular, 12 na tela grande. */
const BODY = "text-[11px] xl:text-[12px]";
/** A superfície de cartão do app: 12px de raio, borda de 1px, fundo um tom acima. */
const CARD = "rounded-field border border-ink-700 bg-ink-900";

/** O valor do cartão de faturamento da lateral. Mesma série de Análises. */
/* Mesma serie de Analises, mesma regra: o dolar sai de `money.ts`. */
/* Mesma serie de Analises, mesma regra: TOTAL, sem centavos. */
const USD = (valor: number) => dinheiroTotal(valor, "USD");
const REVENUE = HOURLY_REVENUE.reduce((soma, valor) => soma + valor, 0);

/** Os ícones da lateral, na ordem dos dois grupos do print. */
const NAV_ICONS: LucideIcon[][] = [
  [LayoutDashboard, Users, CreditCard, BarChart3, Globe],
  [Bot, Workflow, MessageSquare, Send, Link2, FileCode2],
];

/**
 * Qual item da lateral acende em cada passo: `[grupo, item]`.
 *   01 → Bots · 02 → Fluxos · 03 → Financeiro · 04 → Dashboard.
 */
const ACTIVE_NAV: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 2],
  [0, 0],
];

/** Os ícones da barra de ferramentas do editor, na ordem do print. */
const TOOL_ICONS: LucideIcon[] = [
  Undo2,
  Redo2,
  LayoutGrid,
  Frame,
  Sparkles,
  FlaskConical,
  BarChart3,
  Trash2,
];
/** "Refazer" e "Apagar" aparecem apagados no print — não há o que refazer nem o
    que apagar com nada selecionado. */
const TOOLS_OFF = [1, 7];

/**
 * A TELA GRANDE da sala de operação: o SEU painel, com quatro telas de verdade
 * — uma por passo.
 *
 * O que havia aqui até 15/10 era um objeto de software GENÉRICO: barra de janela
 * com três pontinhos, uma lateral inventada (Bots/Funil/Pagamentos/Vendas) e, no
 * passo 02, um funil com paleta "Fluxo/Conteúdo/Venda", nós em pílula e setas
 * retas. O dono mandou os prints do editor real e o veredito foi direto: nada
 * daquilo existe no produto.
 *
 * Então o painel passou a vestir o CHROME DE VERDADE nos quatro estados:
 *
 *  · A BARRA SUPERIOR — wordmark laranja à esquerda, a saudação com o nome em
 *    laranja e a data em caixa alta ao centro, e os quatro botões redondos
 *    (notificação com o contador, ajuda, equipe, IA) com o avatar à direita.
 *  · A BARRA LATERAL — o seletor do bot no topo, os dois grupos do print
 *    (OPERAÇÃO com cinco itens, CONSTRUÇÃO com seis), o item ativo em laranja
 *    com fundo tingido e a barra vertical à esquerda, e o cartão de faturamento
 *    no pé. Abaixo de `xl` ela recolhe para a coluna de ícones: os MESMOS onze
 *    itens, na mesma ordem, sem rótulo — é o estado que o próprio app tem (o
 *    "«" do pé é o que o aciona), e não uma lista diferente.
 *
 * O item que acende acompanha o passo (`ACTIVE_NAV`), e é ele que nomeia a tela:
 * 01 abre Bots, 02 abre Fluxos, 03 abre Financeiro, 04 abre Dashboard.
 *
 * O PASSO 02 é o editor inteiro em miniatura — cabeçalho com o nome do fluxo e a
 * contagem, barra de ferramentas, o botão "Nós" (a barra de blocos FECHADA, como
 * no print), o canvas com grade, brilho e marca d'água, o rodapé com a contagem
 * e o botão laranja de publicar, e o aviso de rascunho salvo. O fluxo em si está
 * no `FlowCanvas`.
 *
 * O QUE NÃO ENTROU, de propósito: os chips de estado do print ("1 erro · 4
 * avisos", "Sem bot") e os avisos amarelos dentro dos nós. O dono pediu a versão
 * PRONTA, e ela é a que não tem nada a corrigir.
 *
 * Nenhum valor é cunhado aqui (regra 4). Os países e os métodos vêm de
 * `payments.table`, os gateways e o extrato de `analytics.panel`, a série por
 * hora de `src/data/content.ts` — a mesma que o painel de Análises desenha — e
 * todo rótulo de interface de `howItWorks.demo.panel`, lido dos prints. A ficção
 * se declara na barra superior.
 *
 * Tudo aqui dentro é `aria-hidden` pelo palco, então o piso de tamanho é 11px.
 */
export function WonePanel({ step, className = "" }: { step: number; className?: string }) {
  const { howItWorks, highlights, payments, analytics, ui, phone } = useContent();
  const { demo } = howItWorks;
  const panel = demo.panel;

  /* O PIX confirmado é o rótulo do primeiro evento da entrega, não uma frase
     nova: é o mesmo fato, dito uma vez no dicionário. */
  const pixConfirmed = highlights.demos.delivery.steps[0].label;

  /* Os nomes das processadoras vêm do extrato de Análises — as duas que a
     página já nomeia. */
  const mainGateway = analytics.panel.statementRows[0].gateway;
  const backupGateway = analytics.panel.statementRows[2].gateway;

  const peak = HOURLY_REVENUE.indexOf(Math.max(...HOURLY_REVENUE));
  const peakValue = HOURLY_REVENUE[peak];

  /* A tela aberta é o item da lateral que está aceso — um nome só, dito num
     lugar só. */
  const [activeGroup, activeItem] = ACTIVE_NAV[step] ?? ACTIVE_NAV[0];
  const screen = panel.nav[activeGroup][activeItem];

  const counts = panel.counts
    .replace("{n}", String(FLOW_NODES))
    .replace("{e}", String(FLOW_EDGES));
  const countsNew = panel.countsNew
    .replace("{n}", String(FLOW_NODES))
    .replace("{e}", String(FLOW_EDGES));

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
      {/* ================= A BARRA SUPERIOR DO APP ================= */}
      <div className="flex h-[26px] shrink-0 items-center gap-2 border-b border-line bg-black px-2 xl:h-8 xl:px-2.5">
        <span className="flex shrink-0 items-center gap-1">
          <WoneIcon className="h-[9px] w-auto xl:h-[11px]" />
          <span className="text-[11px] leading-none font-semibold text-brand xl:text-[13px]">
            {panel.wordmark}
          </span>
        </span>

        <span className="hidden min-w-0 flex-1 flex-col items-center justify-center leading-[1.1] sm:flex">
          <span className="truncate text-[11px] font-semibold text-cream">
            {panel.greeting} <span className="text-brand">{panel.user}</span>
          </span>
          <span className="hidden truncate text-[11px] tracking-[0.16em] text-faint uppercase xl:block">
            {panel.date}
          </span>
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-1 xl:gap-1.5">
          {/* A ficção, declarada no canto — como antes, só que agora no canto da
              barra do app em vez do da barra de janela que saiu. */}
          <span className={`${LABEL} mr-0.5 shrink-0`}>{ui.simulation}</span>

          <TopButton Icon={Bell} badge={panel.notifications} />
          <TopButton Icon={CircleHelp} />
          <TopButton Icon={Users} />
          <TopButton Icon={Sparkles} />

          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand/18 text-[11px] leading-none font-semibold text-brand xl:h-5 xl:w-5">
            {panel.avatar}
          </span>
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ================= A BARRA LATERAL ================= */}
        <nav className="flex w-[34px] shrink-0 flex-col gap-0.5 border-r border-line bg-black p-1 xl:w-[108px] xl:p-1.5">
          {/* O seletor do bot. O ponto verde no ombro do ícone é o "no ar". */}
          <span className="mb-1 flex h-5 shrink-0 items-center gap-1 rounded-[8px] border border-line px-1 xl:h-6">
            <span className="relative shrink-0">
              <Bot className="h-3 w-3 text-cream/70" />
              <span className="absolute -right-px -bottom-px h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="hidden min-w-0 truncate text-[11px] font-medium text-cream xl:block">
              {phone.botName}
            </span>
            <ChevronDown className="ml-auto hidden h-2.5 w-2.5 shrink-0 text-faint xl:block" />
          </span>

          {panel.nav.map((items, group) => (
            <Fragment key={panel.navGroups[group]}>
              {/* Recolhida, a lateral troca o rótulo do grupo por um fio: a
                  separação continua existindo, o nome é que não cabe. */}
              <span className="my-1 h-px bg-line xl:hidden" />
              <span className={`${LABEL} mt-1 hidden px-1.5 xl:block`}>
                {panel.navGroups[group]}
              </span>

              {items.map((item, index) => {
                const Icone = NAV_ICONS[group][index];
                const on = group === activeGroup && index === activeItem;

                return (
                  <span
                    key={item}
                    className={`relative flex h-[18px] shrink-0 items-center justify-center gap-1.5 rounded-[6px] transition-colors duration-300 xl:h-5 xl:justify-start xl:px-1.5 ${
                      on ? "bg-brand/12 text-brand" : "text-cream/60"
                    }`}
                  >
                    {on ? (
                      <span className="absolute inset-y-[3px] -left-1 w-[2px] rounded-full bg-brand xl:-left-1.5" />
                    ) : null}
                    <Icone className="h-3 w-3 shrink-0" />
                    <span className="hidden min-w-0 truncate text-[11px] xl:block">{item}</span>
                  </span>
                );
              })}
            </Fragment>
          ))}

          {/* O cartão do pé. O valor é o acumulado do dia da série de Análises —
              a meta e o "0%" do print não têm fonte nesta página e ficaram de
              fora. */}
          <span className="mt-auto hidden flex-col gap-0.5 rounded-[8px] bg-ink-900 px-1.5 py-1 xl:flex">
            <span className={LABEL}>{panel.billing}</span>
            <span className="tnum text-[11px] leading-none font-semibold text-cream">
              {USD(REVENUE)}
            </span>
            <span className="truncate text-[11px] leading-tight text-faint">
              {analytics.panel.accumulated}
            </span>
          </span>
          <span className="hidden h-4 shrink-0 items-center justify-center xl:flex">
            <ChevronsLeft className="h-3 w-3 text-faint" />
          </span>
        </nav>

        <div className="relative min-w-0 flex-1">
          {/* ================= PASSO 01 — a tela de Bots ================= */}
          <StepLayer active={step === 0} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <p className={SCREEN}>{screen}</p>

            <div>
              <p className={LABEL}>{demo.tokenLabel}</p>
              {/* O token é valor de máquina: `<code>` é o único lugar em que a
                  mono aparece (regra 2), e o resto sai mascarado como em
                  qualquer campo de credencial. */}
              <p className={`mt-1.5 flex h-9 items-center gap-2 px-3 xl:h-10 ${CARD}`}>
                <code>@BotFather</code>
                <span className="text-[11px] tracking-[0.18em] text-cream/55">••••••••</span>
                <Check className="ml-auto h-3.5 w-3.5 shrink-0 stroke-[3] text-emerald-400" />
              </p>
            </div>

            <div className={`flex items-center gap-2.5 px-3 py-2.5 ${CARD}`}>
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

          {/* ================= PASSO 02 — o editor de fluxos ================= */}
          <StepLayer active={step === 1} className="overflow-hidden">
            {/* O CANVAS: quase preto com grade quadrada, o brilho laranja vindo
                do alto e a marca d'água em contraste baixíssimo. */}
            <span className="hiw-grade absolute inset-0" />
            <span className="hiw-brilho absolute inset-0" />
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className="text-[54px] leading-none font-bold tracking-[0.12em] text-cream/[0.05] xl:text-[92px]">
                {panel.watermark}
              </span>
            </span>

            <span className="absolute inset-0 xl:hidden">
              <FlowCanvas variant="mini" />
            </span>
            <span className="absolute inset-0 hidden xl:block">
              <FlowCanvas variant="full" />
            </span>

            {/* O CABEÇALHO do editor, flutuando sobre o canvas. */}
            <span className="absolute top-0.5 left-2 flex items-center gap-1.5 rounded-[10px] bg-ink-950/85 px-1.5 py-1 xl:top-[3px] xl:gap-2">
              <ArrowLeft className="h-3 w-3 shrink-0 text-faint" />
              <span className="min-w-0 leading-[1.2]">
                <span className="block truncate text-[11px] font-semibold text-cream xl:text-[12px]">
                  {panel.flowName}
                </span>
                <span className="block truncate text-[11px] text-faint">{counts}</span>
              </span>
            </span>

            {/* A BARRA DE FERRAMENTAS, na pílula escura. Recolhida aos ícones
                abaixo de `xl`: os oito continuam lá, na mesma ordem. */}
            {/* Os oito rótulos em 11px somam 358px: com o ícone, o respiro entre
                eles e a moldura, a pílula mede 519 e a área do editor tem 530.
                Daí os números miúdos abaixo (gap de 5, ícone de 11, `left-1`) —
                são MEDIDOS, não escolha de estilo: com `gap-[9px]` a pílula dava
                572 e "Apagar" saía cortado pela borda. */}
            <span className="absolute top-[37px] left-1 flex items-center gap-[5px] rounded-[10px] bg-ink-950/90 px-1 py-1 xl:top-[41px]">
              {panel.tools.map((tool, index) => {
                const Icone = TOOL_ICONS[index];
                return (
                  <Fragment key={tool}>
                    {index === 2 ? <span className="h-3 w-px shrink-0 bg-line" /> : null}
                    <span
                      className={`flex shrink-0 items-center gap-[3px] ${
                        TOOLS_OFF.includes(index) ? "text-cream/25" : "text-muted"
                      }`}
                    >
                      <Icone className="h-[11px] w-[11px] shrink-0" />
                      <span className="hidden text-[11px] leading-none whitespace-nowrap xl:block">
                        {tool}
                      </span>
                    </span>
                  </Fragment>
                );
              })}
            </span>

            {/* O botão da barra de blocos, FECHADA — como no print. */}
            <span className="absolute top-[60px] left-2 flex items-center gap-1 rounded-[8px] bg-ink-950/85 px-1.5 py-[3px] text-muted xl:top-[65px]">
              <PanelLeft className="h-3 w-3 shrink-0" />
              <span className="hidden text-[11px] leading-none xl:block">{panel.nodesPanel}</span>
            </span>

            {/* O aviso flutuante, acima do rodapé. Fora da tela estreita: com
                310px de canvas a pílula cobriria dois nós inteiros da última
                fileira, e ela é um aviso passageiro — não vale um nó. */}
            <span className="absolute right-2 bottom-[38px] hidden items-center gap-1 rounded-full border border-line bg-ink-900 px-2 py-[3px] text-[11px] leading-none text-cream xl:flex">
              <Check className="h-3 w-3 shrink-0 stroke-[3] text-emerald-400" />
              {panel.draftSaved}
            </span>

            {/* O RODAPÉ do editor. */}
            <span className="absolute inset-x-0 bottom-0 flex h-[26px] items-center gap-2 border-t border-line bg-ink-950 px-2 xl:h-[34px]">
              <span className="min-w-0 truncate text-[11px] font-semibold text-cream">
                {countsNew}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                <span className="hidden items-center gap-1 text-[11px] leading-none text-muted sm:flex">
                  <History className="h-3 w-3 shrink-0" />
                  {panel.history}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-brand px-2 py-1 text-[11px] leading-none font-semibold text-ink-950">
                  <CloudUpload className="h-3 w-3 shrink-0" />
                  {panel.publish}
                </span>
              </span>
            </span>
          </StepLayer>

          {/* ================= PASSO 03 — a tela de Financeiro ================= */}
          <StepLayer active={step === 2} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <div className="flex items-baseline gap-2">
              <p className={SCREEN}>{screen}</p>
              {/* A garantia nomeia os DOIS SLOTS abaixo, não a tabela: é a
                  conta da processadora que é sua, e o reserva é dela. */}
              <p className={`${LABEL} ml-auto truncate`}>{payments.guarantees[0].term}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Dois slots: o principal no ar e o reserva em espera. Os nomes
                  das processadoras são as duas que o extrato de Análises já
                  nomeia; o termo do reserva é a garantia de Pagamentos. */}
              <span className={`flex flex-col justify-center gap-0.5 px-3 py-1.5 xl:py-2 ${CARD}`}>
                <span className={LABEL}>{demo.gatewayMain}</span>
                <span className={`flex items-center gap-1.5 font-medium text-cream ${BODY}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {mainGateway}
                </span>
              </span>
              <span className={`flex flex-col justify-center gap-0.5 px-3 py-1.5 xl:py-2 ${CARD}`}>
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

          {/* ================= PASSO 04 — a tela de Dashboard ================= */}
          <StepLayer active={step === 3} className="flex flex-col gap-2.5 p-3 xl:gap-3 xl:p-4">
            <div className="flex items-center gap-2">
              <p className={SCREEN}>{screen}</p>
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

/** Um dos quatro botões redondos da direita da barra superior. */
function TopButton({ Icon, badge }: { Icon: LucideIcon; badge?: string }) {
  return (
    <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[7px] border border-line bg-ink-900 xl:h-5 xl:w-5">
      <Icon className="h-3 w-3 text-muted" />
      {badge ? (
        <span className="absolute -top-1 -right-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-brand px-[3px] text-[11px] leading-none font-semibold text-ink-950">
          {badge}
        </span>
      ) : null}
    </span>
  );
}
