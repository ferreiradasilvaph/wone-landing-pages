import type { Content } from "@/i18n/pt";
import { dinheiro, eMoeda } from "@/lib/money";

/**
 * Os sete países da Wone, como o palco do hero os lê.
 *
 * Nada aqui é cópia nova (regra 4): país, método, símbolo e ISO vêm de
 * `payments.table.countries`, e o valor de `highlights.demos.checkout.prices` —
 * as MESMAS chaves que a tabela de Pagamentos e o chat de "Como funciona"
 * usam. O palco só escolhe, por código, qual método de cada país aparece.
 *
 * Este arquivo existe para a escolha ser feita UMA vez: o rótulo de cada pino
 * do globo, o ticket que fecha o palco, a linha de status e o resumo para
 * leitor de tela precisam todos dizer a mesma coisa. Separados, divergiriam na
 * primeira revisão de copy.
 */

export type Pais = Content["payments"]["table"]["countries"][number];
export type Precos = Content["highlights"]["demos"]["checkout"]["prices"];

/**
 * Qual item de `methods` é o método que o palco mostra: o PRIMEIRO, nos sete.
 *
 * Havia um mapa por moeda aqui (México e Colômbia pegavam o segundo item),
 * porque as listas antigas abriam em "Cartão" — e cartão é o que todo mundo
 * tem, enquanto o palco existe para mostrar que o cliente paga como já paga no
 * país dele. Com a tabela de 15/10 isso deixou de ser preciso: as sete listas
 * já começam pelo meio local (PIX, SPEI, Transferência CVU / CBU, Nequi,
 * Transferência, MB WAY, Cartão), e um mapa de índices seria uma segunda
 * verdade esperando para divergir da primeira.
 */
export function metodoDe(pais: Pais) {
  return pais.methods[0];
}

/** O Plano Anual VIP na moeda do país, símbolo colado: "R$197,00".
 *  A forma sai de `money.ts` — o dicionário guarda o número, não a string. */
export function precoDe(precos: Precos, code: string) {
  const preco = precos.find((entrada) => entrada.code === code);
  return preco && eMoeda(preco.code) ? dinheiro(preco.amount, preco.code) : "";
}

/** "PIX · R$197,00" — o chip do ping e o da linha de status.
 *  Sem preco (codigo sem par, ou moeda que money.ts nao conhece) o chip fica
 *  so com o metodo: um "PIX · " com separador orfao seria pior que nada. */
export function chipDe(pais: Pais, precos: Precos) {
  const preco = precoDe(precos, pais.code);
  return preco ? `${metodoDe(pais)} · ${preco}` : metodoDe(pais);
}
