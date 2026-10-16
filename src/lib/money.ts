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
 * As casas decimais NÃO seguem a moeda — seguem este preço, e isso está
 * anotado em REGRA abaixo para ninguém confundir as duas coisas.
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

/**
 * As sete moedas da tabela de Pagamentos, e nenhuma a mais.
 *
 * O LOCALE é escolhido pelos SEPARADORES que produz, não como afirmação sobre
 * o país — e por isso cada escolha está anotada. O que a tabela promete é que o
 * mesmo preço se escreve igual em PT e em EN; qual separador cada moeda usa é
 * convenção da moeda, e é isto aqui.
 *
 *   BRL pt-BR → 1.234,56   ponto de milhar, vírgula decimal
 *   USD en-US → 1,234.56   vírgula de milhar, ponto decimal
 *   EUR de-DE → 1.234,56   de-DE e NÃO pt-PT: o português de Portugal usa
 *                          ESPAÇO ESTREITO (U+202F) de milhar, e espaço não é
 *                          dígito — não recebe avanço tabular e desalinharia a
 *                          coluna de valores no primeiro preço de 4 dígitos.
 *                          A forma continental com ponto é a mesma do real, que
 *                          é o que o leitor desta página reconhece.
 *   GBP en-GB → 1,234.56
 *   MXN es-MX → 1,234.56   VÍRGULA de milhar, e está certo: é a convenção
 *                          mexicana, diferente da argentina e da colombiana.
 *                          Não "consertar" para ponto — a regra desta tabela é
 *                          seguir a moeda, e seguir a moeda às vezes significa
 *                          duas grafias sob o mesmo "$".
 *   ARS es-AR → 1.234,56
 *   COP es-CO → 1.234,56
 *
 * CASAS DECIMAIS. Zero em MXN, ARS e COP é decisão de APRESENTAÇÃO deste preço,
 * não convenção das três moedas — o peso mexicano usa dois decimais como
 * qualquer outra. O Plano Anual VIP é cotado em figura redonda nas três, e
 * "$155.000,00" gasta três caracteres para dizer que os centavos são zero.
 * Se um dia o preço deixar de ser redondo, este número sobe para 2.
 */
const REGRA = {
  BRL: { locale: "pt-BR", casas: 2, simbolo: "R$" },
  USD: { locale: "en-US", casas: 2, simbolo: "$" },
  EUR: { locale: "de-DE", casas: 2, simbolo: "€" },
  GBP: { locale: "en-GB", casas: 2, simbolo: "£" },
  MXN: { locale: "es-MX", casas: 0, simbolo: "$" },
  ARS: { locale: "es-AR", casas: 0, simbolo: "$" },
  COP: { locale: "es-CO", casas: 0, simbolo: "$" },
} as const;

export type Moeda = keyof typeof REGRA;

/**
 * O código é mesmo uma das sete?
 *
 * Isto existe porque o TIPO não protege: o dicionário é deliberadamente SEM
 * `as const` (ver o comentário em `pt.ts`), então `price.code` é `string` e
 * todo chamador passa por um `as Moeda` que o compilador aceita sem conferir
 * nada. Sem a guarda, bastava alguém acrescentar uma oitava linha de preço com
 * um código novo para `REGRA[moeda]` virar `undefined` e a leitura de
 * `.simbolo` derrubar a seção inteira de Pagamentos em tempo de render — um
 * componente de cliente que explode leva junto tudo o que está abaixo dele.
 *
 * `CheckoutBoard` já tinha decidido que, se um código não casa, a célula fica
 * VAZIA: "um número errado apresentado como verdadeiro é pior que uma célula
 * vazia". Uma exceção é pior que as duas.
 */
export function eMoeda(code: string): code is Moeda {
  return code in REGRA;
}

/** O símbolo isolado, para quem o compõe em tamanho próprio (a tabela e o
 *  checkout põem o símbolo menor que o valor). Quem não precisa separar usa
 *  `dinheiro`, que já o traz colado. Código desconhecido devolve string vazia
 *  — a célula fica vazia, ninguém explode. */
export function simbolo(moeda: Moeda): string {
  return REGRA[moeda]?.simbolo ?? "";
}

/* `Intl.NumberFormat` custa alguns décimos de milissegundo para construir, e a
   tabela de Pagamentos reconstrói a linha a cada troca de país. Sete entradas
   de cache resolvem para sempre. */
const cache = new Map<Moeda, Intl.NumberFormat>();

/** Só os dígitos, com o separador da moeda. Sem símbolo. Código desconhecido
 *  devolve string vazia, pela mesma razão de `simbolo`. */
export function numero(valor: number, moeda: Moeda): string {
  if (!REGRA[moeda]) return "";
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

/** O preço inteiro, símbolo COLADO ao número: `$650`, e não `$ 650`.
 *
 *  É escolha de casa, não regra universal — e a distinção importa porque este
 *  arquivo existe para escrever as regras certas: o `Intl` canônico do real põe
 *  um espaço inquebrável (`R$ 197,00`) e o do euro em Portugal põe o
 *  símbolo DEPOIS (`197,00 €`). O que saiu em 16/10 foi o espaço LARGO de
 *  `gap-1.5`, que abria 6px no meio de um valor e lia como dois elementos.
 *  Colado, o preço lê como uma coisa só, nas sete moedas, igual. */
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
  if (!REGRA[moeda]) return "";
  let fmt = cacheInteiro.get(moeda);
  if (!fmt) {
    fmt = new Intl.NumberFormat(REGRA[moeda].locale, {
      maximumFractionDigits: 0,
    });
    cacheInteiro.set(moeda, fmt);
  }
  return `${simbolo(moeda)}${fmt.format(valor)}`;
}
