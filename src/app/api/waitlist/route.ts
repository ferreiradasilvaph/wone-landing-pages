import { saveWaitlistEntry } from "@/lib/waitlist";
import { clientAddress, rateLimited } from "@/lib/rate-limit";

const MAX_FIELD_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Corpo maior que isto não é um cadastro, é alguém testando a rota. */
const MAX_BODY_BYTES = 4_096;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (rateLimited(clientAddress(request))) {
    return Response.json(
      { error: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  /* O corpo é lido como texto antes de virar JSON: assim o tamanho é conferido
     com o que realmente chegou, e não com o que o cliente diz no Content-Length,
     que ninguém é obrigado a mandar nem a mandar certo. */
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Dados enviados grandes demais." }, { status: 413 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(raw);
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("corpo não é um objeto");
    }
  } catch {
    return Response.json(
      { error: "Não foi possível ler os dados enviados." },
      { status: 400 },
    );
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
    return Response.json(
      { error: `Cada campo aceita no máximo ${MAX_FIELD_LENGTH} caracteres.` },
      { status: 400 },
    );
  }

  const errors: Record<string, string> = {};
  if (name.length < 2) {
    errors.name = "Informe seu nome.";
  }
  if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (Object.keys(errors).length > 0) {
    return Response.json(
      { error: "Confira os campos destacados.", errors },
      { status: 400 },
    );
  }

  try {
    await saveWaitlistEntry({
      name,
      email,
      telegram: telegram || undefined,
      nationality: nationality || undefined,
      phone: phone || undefined,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[waitlist] falha ao registrar cadastro", error);
    return Response.json(
      { error: "Não foi possível registrar agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
