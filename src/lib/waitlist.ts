export type WaitlistEntry = {
  name: string;
  email: string;
  telegram?: string;
  createdAt: string;
};

/**
 * Ponto único de persistência da fila de espera.
 *
 * Hoje apenas registra no log do servidor, o que serve para desenvolvimento mas
 * NÃO guarda nada de forma durável. Troque o corpo desta função pelo destino
 * real (Supabase, Resend, planilha, CRM) — a rota e o formulário não mudam.
 * Lance uma exceção em caso de falha: a rota responde 500 e o formulário mostra
 * a mensagem de erro ao visitante.
 */
export async function saveWaitlistEntry(entry: WaitlistEntry): Promise<void> {
  console.log(
    "[waitlist] novo cadastro",
    JSON.stringify({
      ...entry,
      email: entry.email.replace(/^(.).*(@.*)$/, "$1***$2"),
    }),
  );
}
