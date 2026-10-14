"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Wifi, BatteryMedium, SignalHigh } from "lucide-react";
import { useContent } from "@/i18n";
import { WoneIcon } from "./WoneMark";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Ritmo do ciclo. Cada volta é uma venda: o PIX aparece com o valor, some, e a
 * mesma venda desce para a lista. Os valores vêm das próprias transações do
 * dicionário (todas entre R$ 50 e R$ 250) — nunca de `Math.random()`, que no
 * render sairia diferente no servidor e no cliente e quebraria a hidratação.
 */
const PIX_VISIBLE_MS = 2600;
const PIX_GAP_MS = 1100;
/** Quantas entregas cabem na janela do carrossel. */
const VISIBLE = 3;
/** Altura de cada linha, em px — usada no deslocamento vertical. */
const ROW_H = 48;

/* O dolar e a moeda principal do site: o produto cobra em varios paises e a
   vitrine fala para quem vende fora. O locale fica en-US para o separador de
   milhar e o decimal sairem como o mercado espera do dolar. */
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/**
 * Aparelho desenhado em HTML/CSS, no lugar de uma foto: texto nítido em
 * qualquer densidade, cores vindas dos tokens da marca e nada de PNG pesado na
 * primeira dobra.
 *
 * As entregas descem — a mais recente nasce no topo e empurra as anteriores
 * para baixo, como numa central de notificações de verdade — e cada uma soma o
 * próprio valor ao "recebido nesta simulação", ligando a venda ao caixa.
 *
 * Para leitores de tela é uma ilustração única (`role="img"` com um resumo), e
 * o interior fica escondido — solto, viraria uma enxurrada de números.
 *
 * `paused` vem de fora: o "pausar" fica sob o aparelho, no hero, porque é lá
 * que ele é um controle da página e não um botão desenhado dentro do mockup.
 * Pausado, o relógio não troca o cartão nem soma venda nenhuma; ao voltar, ele
 * retoma da venda em que parou — nada se perde e o total nunca anda para trás.
 */
export function PhoneMockup({ paused = false }: { paused?: boolean }) {
  const reduced = useReducedMotion();
  const { phone, ui } = useContent();

  // Quantas vendas já entraram na lista. `tick` também é o índice da próxima a
  // ser anunciada pelo cartão do PIX.
  const [tick, setTick] = useState(0);
  // `true` enquanto o cartão do PIX está na tela, anunciando a venda seguinte.
  const [pixVisible, setPixVisible] = useState(true);
  // Aba em segundo plano: o relógio para. `setTimeout` continua disparando em
  // aba oculta (o navegador só o estrangula para 1×/s), então sem isto o
  // visitante que volta de outra aba encontra o total somado às cegas — e o
  // portão pede zero relógio rodando com a aba escondida. O estado nasce
  // `false` e só é lido dentro do efeito: o primeiro render é igual nos dois
  // casos, no servidor e no cliente.
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /**
   * Movimento reduzido: o relógio abaixo não vai rodar nunca, e a lista nasce
   * vazia — quem pede menos movimento ficava com um aparelho em branco na
   * primeira dobra, "RECEBIDO NESTA SIMULAÇÃO $0.00" sobre 150px de nada
   * (medido: 9 s com `reduce` ligado, zero linhas). Semear `tick` em 1 mostra
   * UMA venda na lista e o total que bate com ela, sem animação alguma.
   *
   * Dentro de um efeito de propósito: `useReducedMotion` jamais decide o
   * primeiro render (ele é `null` no servidor), então o HTML do servidor
   * continua igual com e sem a preferência — é a regra 7, e é o que mantém a
   * hidratação intacta.
   *
   * O estado vai num timeout, e não direto no corpo do efeito, porque
   * `setState` síncrono aqui dispara renderização em cascata (e o lint reprova,
   * com razão) — o mesmo caminho que o `useNearViewport` de `Highlights` usa.
   */
  useEffect(() => {
    if (!reduced) return;
    const id = window.setTimeout(() => setTick((value) => (value === 0 ? 1 : value)), 0);
    return () => window.clearTimeout(id);
  }, [reduced]);

  const transactions = phone.transactions;

  /** Soma de uma volta completa pela lista de vendas. */
  const cycleSum = useMemo(
    () => transactions.reduce((sum, item) => sum + item.value, 0),
    [transactions],
  );

  /**
   * Recebido nesta simulação: a soma das vendas que já desceram na lista, a
   * partir de `phone.monthStart`, hoje zero — o total conta só o que o visitante
   * viu acontecer, e nenhum faturamento que ninguém mediu.
   *
   * É derivado de `tick`, e não guardado num estado próprio: assim o número
   * grande não tem como divergir das notificações — ele é, por construção, a
   * soma delas — e nunca anda para trás. Antes havia um teto que, ao ser
   * ultrapassado, devolvia o contador ao início: o cartão anunciava uma entrada
   * e o total caía mais de mil reais na mesma batida.
   */
  const total = useMemo(() => {
    const laps = Math.floor(tick / transactions.length);
    const rest = tick % transactions.length;
    let sum = phone.monthStart + laps * cycleSum;
    for (let index = 0; index < rest; index += 1) {
      sum += transactions[index].value;
    }
    return sum;
  }, [tick, transactions, cycleSum, phone.monthStart]);

  /**
   * Um ciclo só, para o valor anunciado e o que desce na lista baterem.
   *
   * O PIX mostra a venda de índice `tick`; quando ele sai, essa mesma venda
   * entra no topo da lista e, porque o acumulado é derivado de `tick`, soma ao
   * total na mesma batida. Dois temporizadores independentes faziam o cartão
   * anunciar um valor e a lista receber outro.
   *
   * `tick` avança por updater puro, que o StrictMode pode invocar duas vezes
   * sem efeito colateral — nada de somar o acumulado aqui dentro.
   */
  useEffect(() => {
    if (reduced || paused || tabHidden) return;

    let cancelled = false;
    let timer: number;

    const hide = () => {
      if (cancelled) return;
      setPixVisible(false);

      timer = window.setTimeout(() => {
        if (cancelled) return;
        setTick((value) => value + 1);
        setPixVisible(true);
        timer = window.setTimeout(hide, PIX_VISIBLE_MS);
      }, PIX_GAP_MS);
    };

    timer = window.setTimeout(hide, PIX_VISIBLE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reduced, paused, tabHidden]);

  /** Venda que o cartão do PIX está anunciando agora. */
  const announced = transactions[tick % transactions.length];

  // Índice 0 é a notificação mais nova. Subtrair o slot faz a lista descer:
  // quando `tick` avança, cada item mantém a sua chave e escorrega um degrau
  // para baixo, enquanto a nova entra por cima. `tick - 1` porque a venda de
  // índice `tick` ainda está sendo anunciada pelo cartão do PIX.
  //
  // A lista começa VAZIA (posições negativas ficam de fora): o aparelho abria
  // com três entregas já feitas e, logo acima delas, "recebido nesta simulação
  // $0.00" — o total só conta o que o visitante viu descer, e as três linhas
  // diziam o contrário. Vazia, ela também mostra melhor o que a simulação
  // existe para mostrar: o cartão sai, a linha desce, o total sobe. A caixa tem
  // altura reservada (150px), então encher não mexe em nada (CLS 0).
  const visible = Array.from({ length: VISIBLE }, (_, slot) => tick - 1 - slot)
    .filter((position) => position >= 0)
    .map((position) => {
      const index = position % transactions.length;
      return { ...transactions[index], key: position };
    });

  return (
    <div role="img" aria-label={phone.ariaLabel} className="relative mx-auto w-fit">
      {/* O halo laranja que respirava atrás do aparelho saiu: era o maior blur
          da primeira dobra, e o preto chapado é o fundo que a página escolheu.
          O que separa o telefone do fundo agora é a sombra da moldura. */}

      {/* Moldura — a única borda e a única sombra do site (--shadow-device) */}
      <div
        aria-hidden
        className="rounded-device relative w-[268px] border border-line-strong bg-gradient-to-b from-ink-750 via-ink-850 to-ink-900 p-[3px] sm:w-[300px]"
        style={{ boxShadow: "var(--shadow-device)" }}
      >
        <div className="relative overflow-hidden rounded-[2.35rem] bg-ink-950">
          {/* Barra de status */}
          <div className="flex items-center justify-between px-6 pt-3.5 pb-1 text-[11px] font-medium text-cream">
            <span className="tnum">21:47</span>
            <span className="flex items-center gap-1 text-cream/70">
              <SignalHigh className="h-3.5 w-3.5" />
              <Wifi className="h-3.5 w-3.5" />
              <BatteryMedium className="h-4 w-4" />
            </span>
          </div>

          <div className="absolute top-2.5 left-1/2 h-6 w-20 -translate-x-1/2 rounded-full bg-black" />

          {/* Cabeçalho do chat */}
          <div className="mt-2 flex items-center gap-2.5 border-b border-line px-5 pb-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/15">
              <WoneIcon className="h-3.5 w-auto" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-cream">
                {phone.botName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                {phone.online}
              </span>
            </span>
            {/* A ficção se declara dentro do próprio objeto (regra 4): a tela é
                uma simulação, e quem olha lê isso no mesmo lugar em que lê o
                nome do bot. */}
            <span className="t-label ml-auto shrink-0">{ui.simulation}</span>
          </div>

          {/* Marca, no bloco de 40px. Os três anéis fixos e os dois que pulsavam
              saíram: eram o relógio decorativo da primeira dobra, e o aparelho
              já tem movimento onde ele significa alguma coisa — a venda que
              entra. Sem eles o telefone encolhe ~70px, que é o que faz o cartão
              do PIX caber na primeira tela do celular. */}
          <div className="flex h-12 items-center justify-center sm:h-14">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
              <WoneIcon className="h-5 w-auto" />
            </span>
          </div>

          {/* Confirmação do PIX: aparece e some com valores diferentes. A altura
              é reservada para a lista abaixo não subir quando ele sai — 72px =
              20 de respiro + 19 do valor + duas linhas de 13 (o estado e o
              nome do plano, que passaram a ocupar uma linha cada). */}
          <div className="mx-4 h-[72px]">
            {/* `initial={false}`: o primeiro cartão nasce pintado, no HTML do
                servidor, com e sem movimento reduzido (regra 1 — o hero não
                anima na entrada). Só as trocas seguintes têm travessia. */}
            <AnimatePresence initial={false} mode="wait">
              {pixVisible && (
                <motion.div
                  key={tick}
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 6 }}
                  transition={{ duration: reduced ? 0 : 0.42, ease: EASE }}
                  className="rounded-field flex items-center gap-2.5 bg-emerald-500/12 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="tnum block text-base font-semibold text-emerald-400">
                      +{USD.format(announced.value)}
                    </span>
                    {/* Estado e nome do plano em DUAS linhas. Na mesma linha,
                        separados por "·", o `truncate` comia justamente o que o
                        cartão existe para anunciar: a 412px saía "Pagamento
                        aprovado · Plano Tri…". E o ponto-médio é para termos
                        irmãos — aqui são um estado e um nome de produto. O nome
                        da venda amarra o cartão à linha que desce em seguida: o
                        lead vê o mesmo item nos dois. */}
                    <span className="block truncate text-[11px] text-cream/60">
                      {phone.approved}
                    </span>
                    <span className="block truncate text-[11px] text-cream/60">
                      {announced.label}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Total da simulação: sobe a cada entrega que desce na lista. O
              número trocava com um fade a cada venda — na primeira dobra isso
              era uma entrada animada a mais, e o que o visitante precisa ver é
              o valor mudando, não o valor aparecendo. */}
          <div className="px-5 pt-3">
            {/* A `.t-label` da página tem 13px, e esta linha é a mais longa do
                aparelho: aqui ela vai na escala de dentro do telefone (11px é o
                piso do portão), com a mesma forma de rótulo de máquina. */}
            <span className="text-[11px] font-medium tracking-[0.08em] text-faint uppercase">
              {phone.received}
            </span>
            <p className="tnum mt-0.5 text-xl font-semibold text-cream">
              {USD.format(total)}
            </p>
          </div>

          {/* Entregas descendo: a mais nova nasce em cima e empurra as outras */}
          <div className="relative mt-3 h-[150px] overflow-hidden px-4 pb-6">
            <AnimatePresence initial={false}>
              {visible.map((item, slot) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: -ROW_H }}
                  animate={{ opacity: 1, y: slot * ROW_H }}
                  exit={{ opacity: 0, y: VISIBLE * ROW_H }}
                  transition={{ duration: reduced ? 0 : 0.55, ease: EASE }}
                  className="rounded-field absolute inset-x-4 top-0 flex items-center justify-between gap-2 bg-ink-850 px-3 py-2"
                >
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[11px] font-medium text-cream">
                      {item.label}
                    </span>
                    <span className="tnum block text-[11px] text-faint">
                      {item.amount}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    {phone.success}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Desvanece a base, para a entrega que sai não cortar em linha reta */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-950 to-transparent" />
          </div>

          <span className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-cream/25" />
        </div>
      </div>
    </div>
  );
}
