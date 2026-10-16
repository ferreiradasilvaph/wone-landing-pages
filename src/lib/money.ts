/**
 * O DINHEIRO DA PÁGINA, NUM LUGAR SÓ.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTAVA ERRADO
 * ---------------------------------------------------------------------------
 * O dicionário guardava o preço JÁ FORMATADO, uma string por idioma — e por
 * isso formatava dinheiro pelo IDIOMA de quem lê, em vez de pela MOEDA:
 *
 *     pt.ts:  ARS "38.000"  COP "155.000"  USD "197,00"  GBP "155,00"
 *     en.ts:  ARS "38,000"  COP "155,000"  USD "197.00"  GBP "155.00"
 *
 * Cada idioma acertava metade da tabela. Quem lia em português via o peso
 * argentino certo e o dólar errado; quem lia em inglês, o contrário. E o dólar
 * errado do português ("$197,00") dividia a página com o "$4.062" do gráfico de
 * Análises: a MESMA vírgula valendo decimal num lugar e milhar no outro, na
 * mesma moeda, na mesma rolagem.
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE ESTE ARQUIVO GUARDA
 * ---------------------------------------------------------------------------
 * O separador segue a MOEDA, nunca o idioma. Um peso colombiano se escreve
 * "155.000" para quem lê em português E para quem lê em inglês — amarrá-lo ao
 * idioma faria o mesmo preço mudar de forma quando alguém aperta EN no meio da
 * página, que é a coisa que mais rápido denuncia um site montado às pressas.
 *
 * As casas decimais também seguem a moeda, e por leitura: moeda de valor alto
 * (peso argentino, peso colombiano, peso mexicano) sai inteira, porque dois
 * dígitos de centavo em "155.000,00" só roubam atenção do que importa.
 *
 * Por isso o dicionário passou a guardar o NÚMERO (`amount: 197`) e não a
 * string: a forma é decisão de código, e código não se duplica em dois idiomas.
 *
 * ---------------------------------------------------------------------------
 * O QUE NÃO É DINHEIRO E NÃO MORA AQUI
 * ---------------------------------------------------------------------------
 * `DeliveryDemo.segundos` ("1,2 s") e `Highlights.figura` ("28 blocos") também
 * formatam número, e DEVEM seguir o idioma — são duração e contagem, não preço.
 * Os dois ficam onde estão, de propósito. Trazê-los para cá seria aplicar a
 * regra da moeda a quem não tem moeda.
 */

/** As sete moedas da tabela de Pagamentos, e nenhuma a mais. */
const REGRA = {
  BRL: { locale: "pt-BR", casas: 2, simbolo: "R$" },
  USD: { locale: "en-US", casas: 2, simbolo: "$" },
  EUR: { locale: "pt-PT", casas: 2, simbolo: "€" },
  GBP: { locale: "en-GB", casas: 2, simbolo: "£" },
  MXN: { locale: "es-MX", casas: 0, simbolo: "$" },
  ARS: { locale: "es-AR", casas: 0, simbolo: "$" },
  COP: { locale: "es-CO", casas: 0, simbolo: "$" },
} as const;

export type Moeda = keyof typeof REGRA;

/** O símbolo isolado, para quem o compõe em tamanho próprio (a tabela e o
 *  checkout põem o símbolo menor que o valor). Quem não precisa separar usa
 *  `dinheiro`, que já o traz colado. */
export function simbolo(moeda: Moeda): string {
  return REGRA[moeda].simbolo;
}

/* `Intl.NumberFormat` custa alguns décimos de milissegundo para construir, e a
   tabela de Pagamentos reconstrói a linha a cada troca de país. Sete entradas
   de cache resolvem para sempre. */
const cache = new Map<Moeda, Intl.NumberFormat>();

/** Só os dígitos, com o separador da moeda. Sem símbolo. */
export function numero(valor: number, moeda: Moeda): string {
  let fmt = cache.get(moeda);
  if (!fmt) {
    const { locale, casas } = REGRA[moeda];
    fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    cache.set(moeda, fmt);
  }
  return fmt.format(valor);
}

/** O preço inteiro, símbolo colado ao número: `$650`, nunca `$ 650`. O espaço
 *  que havia entre os dois saiu em 16/10 — ele abria um buraco de 6px no meio
 *  de um valor, e nenhuma moeda do mundo se escreve assim. */
export function dinheiro(valor: number, moeda: Moeda): string {
  return `${simbolo(moeda)}${numero(valor, moeda)}`;
}

/* ------------------------------------------------------------------------
   TOTAIS, que é outra coisa que preço.

   Um PREÇO tem centavos porque o cliente vai pagar exatamente aquilo. Um
   TOTAL acumulado do dia não tem: "$4.062,00" gasta três caracteres para
   dizer que os centavos são zero, numa figura cujo ponto é a ordem de
   grandeza. O gráfico de Análises e o cartão da sala de operação mostram a
   mesma série e os dois são totais.

   Isto vive aqui, e não num `.replace(/,00$/)` em cada chamador, porque
   "quantas casas este número mostra" é decisão de moeda — e decisão de moeda
   mora neste arquivo. Um regex no chamador quebraria em iene (zero casas) e
   em dinar (três).
   ------------------------------------------------------------------------ */
const cacheInteiro = new Map<Moeda, Intl.NumberFormat>();

/** O total arredondado, sem casas decimais: `$4.062`. */
export function dinheiroTotal(valor: number, moeda: Moeda): string {
  let fmt = cacheInteiro.get(moeda);
  if (!fmt) {
    fmt = new Intl.NumberFormat(REGRA[moeda].locale, {
      maximumFractionDigits: 0,
    });
    cacheInteiro.set(moeda, fmt);
  }
  return `${simbolo(moeda)}${fmt.format(valor)}`;
}
