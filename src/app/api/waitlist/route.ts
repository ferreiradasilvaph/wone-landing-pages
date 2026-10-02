import { saveWaitlistEntry } from "@/lib/waitlist";

const MAX_FIELD_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Não foi possível ler os dados enviados." },
      { status: 400 },
    );
  }

  const name = asTrimmedString(payload.name);
  const email = asTrimmedString(payload.email).toLowerCase();
  const telegram = asTrimmedString(payload.telegram).replace(/^@/, "");

  if (
    name.length > MAX_FIELD_LENGTH ||
    email.length > MAX_FIELD_LENGTH ||
    telegram.length > MAX_FIELD_LENGTH
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
