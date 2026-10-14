/**
 * Códigos de erro do cadastro: o contrato entre `POST /api/waitlist` e o
 * formulário.
 *
 * A rota devolvia a frase pronta — `{ "error": "Informe um e-mail válido." }` —
 * e frase cravada no servidor não tem idioma. Medido: com o site em inglês, o
 * botão já dizia "Join the waitlist" e o documento já tinha `lang="en"`, mas o
 * erro de e-mail inválido voltava em português, tanto no texto do campo quanto
 * no resumo do `aria-live`.
 *
 * E não é questão de traduzir a rota: o servidor não tem como saber o idioma.
 * A escolha vive no `localStorage` (`wone:locale`, veja `src/i18n/index.tsx`),
 * é lida só no cliente e não viaja no POST; não há `Accept-Language` em uso
 * nem rota por idioma. Então a rota só NOMEIA o que aconteceu e o dicionário
 * escolhe a frase, em `form.errors` de `pt.ts` e `en.ts`.
 *
 * É por isso que as chaves de `form.errors` são snake_case, fora do padrão
 * camelCase do resto do dicionário: elas não são rótulos de interface, são os
 * valores que trafegam no JSON. Chave e código são a mesma string de propósito
 * — a busca é direta, sem tabela intermediária para ficar desatualizada.
 */

export type WaitlistErrorCode =
  /** 429 — passou do limite de `src/lib/rate-limit.ts`. */
  | "rate_limited"
  /** 413 — corpo maior que `MAX_BODY_BYTES`. */
  | "too_large"
  /** 400 — o corpo não é um objeto JSON. */
  | "unreadable_body"
  /** 400 — algum campo passou de `MAX_FIELD_LENGTH`. */
  | "field_too_long"
  /** 400 — veio com `fields`, um código por campo reprovado. */
  | "invalid_fields"
  /** 500 — `saveWaitlistEntry` lançou; o lead não chegou ao destino. */
  | "save_failed"
  /** Nunca vem da rota: é o `catch` do `fetch`, quando não houve resposta. */
  | "network"
  /** Resposta sem código que este build conheça. É também o fallback. */
  | "unknown";

/** Códigos por campo, dentro de `fields` na resposta de `invalid_fields`. */
export type WaitlistFieldErrorCode =
  | "name_missing"
  | "email_invalid"
  /**
   * Nacionalidade fora de `NATIONALITIES` (`src/lib/waitlist.ts`).
   *
   * Pelo formulário não acontece: o `select` só oferece os cinco códigos de lá,
   * então este código chega de quem monta o POST na mão — e é por isso que o
   * formulário não desenha mensagem embaixo do `select`, só o resumo.
   */
  | "nationality_invalid";

/**
 * Os campos que a rota valida um por um. `telegram` e `phone` ela só limita no
 * tamanho — são opcionais e não têm formato a conferir.
 */
export type WaitlistFieldErrors = Partial<
  Record<"name" | "email" | "nationality", WaitlistFieldErrorCode>
>;

/**
 * A regra de e-mail, num só lugar.
 *
 * O formulário valida antes de chamar o `fetch` (envio vazio não precisa sair
 * do navegador) e a rota valida de novo, porque nada que vem do cliente é de
 * confiança. Com a expressão escrita duas vezes, bastava uma delas mudar para o
 * campo passar na tela o que a rota recusa — ou o contrário, que é pior: erro
 * marcado embaixo de um endereço que o servidor aceitaria.
 *
 * Mora aqui, e não em `waitlist.ts`, porque este é o único módulo do contrato
 * que os dois lados já importam: `waitlist.ts` carrega `process.env` e o
 * `fetch` do webhook, que não têm o que fazer no bundle do navegador.
 *
 * Não tenta ser a RFC 5322: recusa o que claramente não é e-mail (sem arroba,
 * sem ponto no domínio, com espaço). Quem diz se o endereço existe é o convite.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * O que o dicionário precisa ter: uma frase para cada código, nos dois idiomas.
 *
 * Esta é a trava do build. `waitlistMessage` recebe este tipo, então um código
 * novo na rota sem a frase correspondente em `pt.ts` (e, por tabela, em `en.ts`,
 * que satisfaz `Content`) quebra a compilação na chamada do formulário.
 */
export type WaitlistMessages = Record<
  WaitlistErrorCode | WaitlistFieldErrorCode,
  string
>;

/**
 * Traduz um código no idioma do dicionário recebido.
 *
 * `code` é `unknown` de propósito: vem de JSON que chegou pela rede, e ninguém
 * garante que é string nem que é um código deste build — um proxy, uma página
 * de erro da borda ou um deploy antigo aberto em outra aba devolvem qualquer
 * coisa. O desconhecido cai em `unknown`, que é uma frase de verdade e não um
 * campo vazio.
 *
 * `hasOwnProperty` em vez de `in`: com `in`, "toString" passaria por código
 * válido e a "mensagem" devolvida seria uma função.
 */
export function waitlistMessage(
  messages: WaitlistMessages,
  code: unknown,
): string {
  if (
    typeof code === "string" &&
    Object.prototype.hasOwnProperty.call(messages, code)
  ) {
    return messages[code as keyof WaitlistMessages];
  }
  return messages.unknown;
}
