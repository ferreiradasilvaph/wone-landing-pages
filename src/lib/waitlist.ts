export type WaitlistEntry = {
  name: string;
  email: string;
  telegram?: string;
  /** Código do país escolhido no formulário (BR, AR, MX, CO, OT). */
  nationality?: string;
  phone?: string;
  createdAt: string;
};

/**
 * Para onde vai o cadastro. Qualquer endereço que aceite um POST com JSON
 * serve: função da Supabase, webhook do n8n/Make/Zapier, canal do Discord,
 * rota do seu back-end. Sem a variável, o comportamento é o de sempre — só o
 * log, que não guarda nada.
 */
const DESTINATION = process.env.WAITLIST_WEBHOOK_URL;

/** Depois disto o destino é considerado fora do ar. */
const TIMEOUT_MS = 8_000;

/** E-mail no log sai mascarado: log de produção não é lugar de dado pessoal. */
function masked(entry: WaitlistEntry) {
  return {
    ...entry,
    email: entry.email.replace(/^(.).*(@.*)$/, "$1***$2"),
    phone: entry.phone ? `***${entry.phone.slice(-4)}` : undefined,
  };
}

/**
 * Ponto único de persistência da fila de espera.
 *
 * O formulário mostra "você está na fila" quando esta função retorna sem erro,
 * então ela é a única coisa entre um lead e o esquecimento. Enquanto era só um
 * `console.log`, todo cadastro feito em produção morria no log do container —
 * o visitante via sucesso e ninguém do outro lado ficava sabendo.
 *
 * Agora há um destino de verdade quando `WAITLIST_WEBHOOK_URL` está definida, e
 * o aviso fica barulhento quando não está. A falha é propagada de propósito: a
 * rota responde 500 e o visitante vê o erro em vez de uma tela de sucesso
 * mentindo para ele. Perder o lead é ruim; perder o lead e dizer que deu certo
 * é pior, porque ninguém vai atrás.
 */
export async function saveWaitlistEntry(entry: WaitlistEntry): Promise<void> {
  console.log("[waitlist] novo cadastro", JSON.stringify(masked(entry)));

  if (!DESTINATION) {
    console.warn(
      "[waitlist] WAITLIST_WEBHOOK_URL não configurada — este cadastro existe " +
        "apenas na linha acima, e o log do container some no próximo deploy.",
    );
    return;
  }

  const response = await fetch(DESTINATION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `destino da fila respondeu ${response.status} ${response.statusText}`,
    );
  }
}
