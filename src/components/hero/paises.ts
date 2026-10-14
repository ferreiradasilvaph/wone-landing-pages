import type { Content } from "@/i18n/pt";

/**
 * Os quatro países da Wone, como o palco do hero os lê.
 *
 * Nada aqui é cópia nova (regra 4): país, método, símbolo e ISO vêm de
 * `payments.table.countries`, e o valor de `highlights.demos.checkout.prices` —
 * as MESMAS chaves que a tabela de Pagamentos e o chat de "Como funciona"
 * usam. O palco só escolhe, por código, qual método de cada país aparece.
 *
 * Este arquivo existe para a escolha ser feita UMA vez: o telefone (bolha de
 * oferta e botão "Pagar com…"), o rótulo de cada ping do mapa, a linha de
 * status do celular e o resumo para leitor de tela precisam todos dizer a mesma
 * coisa. Separados, divergiriam na primeira revisão de copy.
 */

export type Pais = Content["payments"]["table"]["countries"][number];
export type Precos = Content["highlights"]["demos"]["checkout"]["prices"];

/**
 * Qual item de `methods` é o método que o palco mostra, por moeda.
 *
 * Brasil tem ["PIX", "Cartão"] e Argentina ["Cartão local"] — nos dois o
 * primeiro serve. México tem ["Cartão", "SPEI"] e Colômbia ["Cartão", "PSE"], e
 * nesses o que identifica o país é o SEGUNDO: cartão é o que todo mundo tem, e
 * o palco existe para mostrar que o cliente paga como já paga no país dele.
 */
const METODO: Record<string, number> = { BRL: 0, ARS: 0, MXN: 1, COP: 1 };

/** O método do país, com o texto do dicionário (PT em pt, EN em en). */
export function metodoDe(pais: Pais) {
  return pais.methods[METODO[pais.code] ?? 0];
}

/** O valor do Plano Anual VIP na moeda do país, sem símbolo. */
export function precoDe(precos: Precos, code: string) {
  return precos.find((preco) => preco.code === code)?.display ?? "";
}

/** "PIX · R$ 197,00" — o chip do ping e o da linha de status. */
export function chipDe(pais: Pais, precos: Precos) {
  return `${metodoDe(pais)} · ${pais.symbol} ${precoDe(precos, pais.code)}`;
}
