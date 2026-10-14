import { isNationality, saveWaitlistEntry } from "@/lib/waitlist";
import { clientAddress, rateLimited } from "@/lib/rate-limit";
import {
  EMAIL_PATTERN,
  type WaitlistErrorCode,
  type WaitlistFieldErrors,
} from "@/lib/waitlist-errors";

const MAX_FIELD_LENGTH = 120;
/** Corpo maior que isto não é um cadastro, é alguém testando a rota. */
const MAX_BODY_BYTES = 4_096;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resposta de erro: um código, nunca uma frase.
 *
 * O corpo é `{ "code": "invalid_fields" }`, e `{ code, fields }` quando há erro
 * por campo. Quem escolhe a frase é o dicionário do cliente, que sabe o idioma;
 * esta rota não sabe, e o motivo está em `src/lib/waitlist-errors.ts`. O tipo
 * `WaitlistErrorCode` é o que impede um código inventado aqui de passar sem a
 * tradução correspondente nos dois dicionários.
 */
function erro(
  code: WaitlistErrorCode,
  status: number,
  opcoes?: { fields?: WaitlistFieldErrors; headers?: HeadersInit },
) {
  const { fields, headers } = opcoes ?? {};
  return Response.json(fields ? { code, fields } : { code }, { status, headers });
}

export async function POST(request: Request) {
  if (rateLimited(clientAddress(request))) {
    return erro("rate_limited", 429, { headers: { "Retry-After": "60" } });
  }

  /* O corpo é lido como texto antes de virar JSON: assim o tamanho é conferido
     com o que realmente chegou, e não com o que o cliente diz no Content-Length,
     que ninguém é obrigado a mandar nem a mandar certo. */
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return erro("too_large", 413);
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(raw);
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("corpo não é um objeto");
    }
  } catch {
    return erro("unreadable_body", 400);
  }

  const name = asTrimmedString(payload.name);
  const email = asTrimmedString(payload.email).toLowerCase();
  const telegram = asTrimmedString(payload.telegram).replace(/^@/, "");
  const nationality = asTrimmedString(payload.nationality);
  const phone = asTrimmedString(payload.phone);

  if (
    name.length > MAX_FIELD_LENGTH ||
    email.length > MAX_FIELD_LENGTH ||
    telegram.length > MAX_FIELD_LENGTH ||
    nationality.length > MAX_FIELD_LENGTH ||
    phone.length > MAX_FIELD_LENGTH
  ) {
    /* Pelo formulário isto não acontece: os quatro campos de texto têm
       `maxLength` de 120 e a nacionalidade é um `select` de códigos de duas
       letras. Quem chega aqui está mandando POST na mão — e recebe um código,
       não uma aula sobre o limite. */
    return erro("field_too_long", 400);
  }

  /* As duas primeiras regras são as mesmas que o formulário aplica antes de
     mandar o POST — a de e-mail é literalmente a mesma expressão, importada,
     para não haver duas. A repetição aqui não é desperdício: a validação do
     cliente existe para poupar a ida à rede, não para proteger a rota, e quem
     chega por `curl` não passou por ela. */
  const fields: WaitlistFieldErrors = {};
  if (name.length < 2) {
    fields.name = "name_missing";
  }
  if (!EMAIL_PATTERN.test(email)) {
    fields.email = "email_invalid";
  }
  /* Nacionalidade segue opcional — POST sem o campo passa, como antes —, mas
     agora é uma lista fechada: aceitar qualquer texto de até 120 caracteres era
     deixar o campo do lead valer o que o remetente quisesse. */
  if (nationality !== "" && !isNationality(nationality)) {
    fields.nationality = "nationality_invalid";
  }

  if (Object.keys(fields).length > 0) {
    return erro("invalid_fields", 400, { fields });
  }

  try {
    await saveWaitlistEntry({
      name,
      email,
      telegram: telegram || undefined,
      /* A guarda repetida é para o tipo, não para a regra: daqui para baixo a
         string ou é um código da lista ou é vazia, porque o resto já voltou
         400 — e assim `WaitlistEntry.nationality` recebe o tipo da lista sem
         precisar de um `as`. */
      nationality: isNationality(nationality) ? nationality : undefined,
      phone: phone || undefined,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[waitlist] falha ao registrar cadastro", error);
    return erro("save_failed", 500);
  }

  return Response.json({ ok: true }, { status: 201 });
}
