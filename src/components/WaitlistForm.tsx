"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Destino para onde o visitante é levado depois de entrar na lista.
 *
 * Vem do ambiente para que o canal ou bot possa mudar sem tocar no código.
 * `NEXT_PUBLIC_*` é substituída no build, então precisa estar definida na hora
 * de compilar — não basta existir no servidor em tempo de execução.
 */
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/";

const FIELD_BASE =
  "w-full rounded-xl border bg-ink-950/70 px-4 py-3 text-sm text-cream placeholder:text-faint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("loading");
    setMessage("");
    setFieldErrors({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          telegram: data.get("telegram"),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string>;
      };

      if (!response.ok) {
        setFieldErrors(body.errors ?? {});
        setMessage(body.error ?? "Não foi possível enviar. Tente novamente.");
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("success");

      // Leva para o Telegram sem tirar a landing da frente. A chamada vem
      // depois de um `await`, então perde a "ativação pelo usuário" e alguns
      // bloqueadores de pop-up barram — a tela de sucesso repete o mesmo link
      // num botão, que é a rede de segurança para esse caso.
      window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
    } catch {
      setMessage("Sem conexão com o servidor. Tente novamente.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center"
      >
        <CheckCircle2 className="h-8 w-8 text-brand" />
        <p className="font-display text-lg font-semibold text-cream">
          Tudo certo, você está na fila.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Abrimos o Telegram em outra aba. Se ela não apareceu, use o botão abaixo.
        </p>

        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
        >
          <Send className="h-4 w-4" />
          Abrir no Telegram
        </a>

        <p className="text-xs leading-relaxed text-faint">
          Assim que abrirmos uma nova leva de convites, você recebe o acesso por e-mail.
        </p>

        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="cursor-pointer text-xs font-medium text-muted underline underline-offset-4 transition-colors hover:text-cream"
        >
          Cadastrar outro contato
        </button>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto flex max-w-md flex-col gap-4 text-left"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-name" className="text-xs font-medium text-muted">
          Nome
        </label>
        <input
          id="waitlist-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          disabled={isLoading}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "waitlist-name-error" : undefined}
          placeholder="Como podemos te chamar"
          className={`${FIELD_BASE} ${
            fieldErrors.name ? "border-red-500/70" : "border-line-strong"
          }`}
        />
        {fieldErrors.name && (
          <p id="waitlist-name-error" className="text-xs text-red-400">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-email" className="text-xs font-medium text-muted">
          E-mail
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={120}
          disabled={isLoading}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "waitlist-email-error" : undefined}
          placeholder="voce@exemplo.com"
          className={`${FIELD_BASE} ${
            fieldErrors.email ? "border-red-500/70" : "border-line-strong"
          }`}
        />
        {fieldErrors.email && (
          <p id="waitlist-email-error" className="text-xs text-red-400">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-telegram" className="text-xs font-medium text-muted">
          Usuário no Telegram <span className="text-faint">(opcional)</span>
        </label>
        <input
          id="waitlist-telegram"
          name="telegram"
          type="text"
          maxLength={120}
          disabled={isLoading}
          placeholder="@seuusuario"
          className={`${FIELD_BASE} border-line-strong`}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-brand mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-4 font-bold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            Lista de espera
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </>
        )}
      </button>

      <p aria-live="polite" className="min-h-4 text-center text-xs font-medium text-red-400">
        {status === "error" ? message : ""}
      </p>

      <p className="text-center text-xs text-faint">
        O acesso à plataforma é liberado por convite. Sem spam.
      </p>
    </form>
  );
}
