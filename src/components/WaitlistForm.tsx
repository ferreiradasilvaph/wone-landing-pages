"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { useContent } from "@/i18n";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Destino para onde o visitante é levado depois de entrar na lista.
 *
 * Vem do ambiente para que o canal ou bot possa mudar sem tocar no código.
 * `NEXT_PUBLIC_*` é substituída no build, então precisa estar definida na hora
 * de compilar — não basta existir no servidor em tempo de execução.
 */
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/";

/**
 * Campo de formulário é o caso em que a borda fica: ela é o que diz onde se
 * pode escrever. Fica fraca (`--line-strong`, 10% de creme) e laranja no foco.
 *
 * O `outline-none` aqui não cega quem navega por teclado: o `:focus-visible`
 * global do `globals.css` continua desenhando o anel da marca. O que saiu foi o
 * `focus:ring-2` — era um segundo contorno em cima do primeiro.
 */
const FIELD_BASE =
  "w-full rounded-xl border bg-ink-950/70 px-4 py-3 text-sm text-cream placeholder:text-faint outline-none transition-colors focus:border-brand";

export function WaitlistForm() {
  const { form } = useContent();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);

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
          nationality: data.get("nationality"),
          telegram: data.get("telegram"),
          phone: data.get("phone"),
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

      element.reset();
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
        className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl bg-brand/10 p-6 text-center sm:p-8"
      >
        <CheckCircle2 className="h-8 w-8 text-brand" />
        <p className="font-display text-lg font-semibold text-cream">
          {form.successTitle}
        </p>
        <p className="text-sm leading-relaxed text-muted">{form.successBody}</p>

        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-solid mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
        >
          <Send className="h-4 w-4" />
          {form.openTelegram}
        </a>

        <p className="text-xs leading-relaxed text-faint">{form.successNote}</p>

        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="cursor-pointer text-xs font-medium text-muted underline underline-offset-4 transition-colors hover:text-cream"
        >
          {form.again}
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
          {form.name}
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
          placeholder={form.namePlaceholder}
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
          {form.email}
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
          placeholder={form.emailPlaceholder}
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
        <label htmlFor="waitlist-nationality" className="text-xs font-medium text-muted">
          {form.nationality}
        </label>
        <select
          id="waitlist-nationality"
          name="nationality"
          defaultValue="BR"
          disabled={isLoading}
          className={`${FIELD_BASE} border-line-strong cursor-pointer`}
        >
          {form.countries.map((country) => (
            <option key={country.code} value={country.code} className="bg-ink-900">
              {country.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-telegram" className="text-xs font-medium text-muted">
          {form.telegram} <span className="text-faint">{form.optional}</span>
        </label>
        <input
          id="waitlist-telegram"
          name="telegram"
          type="text"
          maxLength={120}
          disabled={isLoading}
          placeholder={form.telegramPlaceholder}
          className={`${FIELD_BASE} border-line-strong`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-phone" className="text-xs font-medium text-muted">
          {form.phone} <span className="text-faint">{form.optional}</span>
        </label>
        <input
          id="waitlist-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={120}
          disabled={isLoading}
          placeholder={form.phonePlaceholder}
          className={`${FIELD_BASE} border-line-strong`}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-solid mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-8 py-4 font-bold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {form.sending}
          </>
        ) : (
          <>
            {form.submit}
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </>
        )}
      </button>

      <p
        aria-live="polite"
        className="min-h-4 text-center text-xs font-medium text-red-400"
      >
        {status === "error" ? message : ""}
      </p>

      <p className="text-center text-xs text-faint">{form.disclaimer}</p>
    </form>
  );
}
