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

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/**
 * Aparelho desenhado em HTML/CSS, no lugar de uma foto: texto nítido em
 * qualquer densidade, cores vindas dos tokens da marca e nada de PNG pesado na
 * primeira dobra.
 *
 * As entregas descem — a mais recente nasce no topo e empurra as anteriores
 * para baixo, como numa central de notificações de verdade — e cada uma soma o
 * próprio valor ao "recebido no mês", ligando a venda ao caixa.
 *
 * Para leitores de tela é uma ilustração única (`role="img"` com um resumo), e
 * o interior fica escondido — solto, viraria uma enxurrada de números.
 */
export function PhoneMockup() {
  const reduced = useReducedMotion();
  const { phone } = useContent();

  // Quantas vendas já entraram na lista. `tick` também é o índice da próxima a
  // ser anunciada pelo cartão do PIX.
  const [tick, setTick] = useState(0);
  // `true` enquanto o cartão do PIX está na tela, anunciando a venda seguinte.
  const [pixVisible, setPixVisible] = useState(true);

  const transactions = phone.transactions;

  /** Soma de uma volta completa pela lista de vendas. */
  const cycleSum = useMemo(
    () => transactions.reduce((sum, item) => sum + item.value, 0),
    [transactions],
  );

  /**
   * Acumulado do mês: o valor de partida mais cada venda que já desceu na lista.
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
    if (reduced) return;

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
  }, [reduced]);

  /** Venda que o cartão do PIX está anunciando agora. */
  const announced = transactions[tick % transactions.length];

  // Índice 0 é a notificação mais nova. Subtrair o slot faz a lista descer:
  // quando `tick` avança, cada item mantém a sua chave e escorrega um degrau
  // para baixo, enquanto a nova entra por cima. `tick - 1` porque a venda de
  // índice `tick` ainda está sendo anunciada pelo cartão do PIX.
  const visible = Array.from({ length: VISIBLE }, (_, slot) => {
    const position = tick - 1 - slot;
    const index = ((position % transactions.length) + transactions.length) %
      transactions.length;
    return { ...transactions[index], key: position };
  });

  return (
    <div role="img" aria-label={phone.ariaLabel} className="relative mx-auto w-fit">
      {/* Único fundo do bloco: um halo laranja que respira. A centralização fica
          no pai e a animação no filho — `breathe` anima `transform` e apagaria
          o `-translate-*` se estivesse no mesmo elemento.

          Fica bem fraco de propósito: só separa o aparelho do preto do fundo. O
          halo forte de antes era o maior glow da primeira dobra. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="animate-breathe h-full w-full rounded-full bg-brand/10 blur-[90px]" />
      </div>

      {/* Moldura — a única borda visível do bloco */}
      <div
        aria-hidden
        className="relative w-[268px] rounded-[2.6rem] border border-line-strong bg-gradient-to-b from-ink-750 via-ink-850 to-ink-900 p-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] sm:w-[300px]"
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
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
              <WoneIcon className="h-3.5 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-cream">
                {phone.botName}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                {phone.online}
              </span>
            </span>
          </div>

          {/* Anéis + logo */}
          <div className="relative flex h-[122px] items-center justify-center">
            {[126, 98, 70].map((size, index) => (
              <span
                key={size}
                className="absolute rounded-full border border-brand"
                style={{ height: size, width: size, opacity: 0.22 - index * 0.05 }}
              />
            ))}

            {[0, 1.6].map((delay) => (
              <span
                key={delay}
                className="animate-pulse-ring absolute h-[70px] w-[70px] rounded-full border border-brand/50"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}

            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 shadow-[0_0_28px_rgba(255,119,0,0.45)]">
              <WoneIcon className="h-6 w-auto" />
            </span>
          </div>

          {/* Confirmação do PIX: aparece e some com valores diferentes. A altura
              é reservada para a lista abaixo não subir quando ele sai. */}
          <div className="mx-4 h-[58px]">
            <AnimatePresence mode="wait">
              {pixVisible && (
                <motion.div
                  key={tick}
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: reduced ? 1 : 0.97, y: reduced ? 0 : 6 }}
                  transition={{ duration: reduced ? 0 : 0.42, ease: EASE }}
                  className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="tnum block text-base font-bold text-emerald-400">
                      +{BRL.format(announced.value)}
                    </span>
                    {/* O nome da venda aqui é o que amarra o cartão à linha que
                        desce em seguida: o lead vê o mesmo item nos dois. */}
                    <span className="block truncate text-[10px] text-cream/60">
                      {phone.approved} · {announced.label}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Acumulado do mês: sobe a cada entrega que desce na lista */}
          <div className="px-5 pt-3">
            <span className="t-eyebrow text-faint">{phone.received}</span>
            <motion.p
              key={total}
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.5 }}
              className="tnum mt-0.5 text-xl font-bold text-cream"
            >
              {BRL.format(total)}
            </motion.p>
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
                  className="absolute inset-x-4 top-0 flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-900/70 px-3 py-2"
                >
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[11px] font-medium text-cream">
                      {item.label}
                    </span>
                    <span className="tnum block text-[10px] text-faint">
                      {item.amount}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
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
