"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { useContent } from "@/i18n";
import {
  EMAIL_PATTERN,
  waitlistMessage,
  type WaitlistFieldErrors,
} from "@/lib/waitlist-errors";
import { CTA } from "./cta";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Destino para onde o visitante é levado depois de entrar na lista.
 *
 * Vem do ambiente para que o canal ou bot possa mudar sem tocar no código.
 * `NEXT_PUBLIC_*` é substituída no build, então precisa estar definida na hora
 * de compilar — não basta existir no servidor em tempo de execução. É por isso
 * que aqui ela pode ser nula: no build que está no ar hoje ela não existe (a
 * medição está no README), e antes esse caso caía em `https://t.me/`, a home do
 * Telegram. O botão funcionava, a frase dizia que a aba tinha aberto, e o
 * visitante terminava o funil numa tela genérica sem nada denunciar o problema.
 * Sem a variável, a tela de sucesso agora não promete Telegram nenhum.
 */
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim() || null;

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

  /* O estado guarda o CÓDIGO do erro, não a frase.

     A frase é escolhida no render, pelo dicionário do idioma de agora. Guardar
     a frase deixava a mensagem presa no idioma em que o erro aconteceu: quem
     errasse o e-mail em português e trocasse para inglês continuava lendo
     português embaixo de um formulário inteiro em inglês. O código, sendo
     protocolo, não envelhece com a troca. */
  const [errorCode, setErrorCode] = useState<unknown>(null);
  const [fieldCodes, setFieldCodes] = useState<Record<string, unknown>>({});

  /* `window.open` devolveu nada: a aba do Telegram foi barrada. Só a tela de
     sucesso olha para isto, para não afirmar o que não aconteceu. */
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);

    /* `FormData.get` devolve `string | File | null`; estes campos são texto. O
       `trim` e o `toLowerCase` são os mesmos que a rota aplica, para o que foi
       validado aqui ser exatamente o que ela recebe. */
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim().toLowerCase();

    /* Validação do cliente ANTES do fetch, com os códigos do contrato.
       O `noValidate` do formulário continua lá porque as bolhas nativas do
       navegador não traduzem — vêm no idioma do navegador, não no do site —,
       mas, sem nada no lugar delas, um envio com os dois campos vazios saía do
       navegador, atravessava a rede e voltava 400 para dizer o que já se sabia
       aqui. Agora não sai requisição nenhuma. As regras são as da rota (nome
       com 2 caracteres, `EMAIL_PATTERN` importado), e ela as repete do outro
       lado: isto poupa a ida à rede, não substitui a validação do servidor. */
    const invalid: WaitlistFieldErrors = {};
    if (name.length < 2) {
      invalid.name = "name_missing";
    }
    if (!EMAIL_PATTERN.test(email)) {
      invalid.email = "email_invalid";
    }

    if (invalid.name || invalid.email) {
      setFieldCodes(invalid);
      setErrorCode("invalid_fields");
      setStatus("error");

      /* Foco no primeiro campo reprovado: sem ele, quem navega por teclado ou
         leitor de tela fica onde estava (o botão), e a mensagem que apareceu
         dois campos acima não é anunciada por ninguém. O `namedItem` evita dois
         refs só para isto — os campos são não controlados, o formulário já é a
         fonte dos valores. */
      const first = element.elements.namedItem(invalid.name ? "name" : "email");
      if (first instanceof HTMLElement) {
        first.focus();
      }
      return;
    }

    setStatus("loading");
    setErrorCode(null);
    setFieldCodes({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          nationality: data.get("nationality"),
          telegram: data.get("telegram"),
          phone: data.get("phone"),
        }),
      });

      /* Tudo `unknown`: é JSON de rede. `waitlistMessage` é que decide o que
         fazer com um valor que não seja um código conhecido. */
      const body = (await response.json().catch(() => ({}))) as {
        code?: unknown;
        fields?: Record<string, unknown>;
      };

      if (!response.ok) {
        setFieldCodes(body.fields ?? {});
        setErrorCode(body.code);
        setStatus("error");
        return;
      }

      element.reset();
      setStatus("success");

      if (TELEGRAM_URL) {
        /* Leva para o Telegram sem tirar a landing da frente, e guarda o
           retorno: `null` é o bloqueador de pop-up tendo barrado a aba. A
           chamada vem depois de um `await`, então já perdeu a "ativação pelo
           usuário" que os navegadores exigem e alguns bloqueadores barram — a
           tela de sucesso usa este `null` para trocar a frase, e o botão fica
           lá dos dois jeitos, que é a rede de segurança.

           Sem `noopener,noreferrer` de propósito: pela especificação,
           `window.open` com `noopener` SEMPRE devolve `null`, então com eles no
           lugar era impossível distinguir aba aberta de aba barrada e o
           "abrimos o Telegram em outra aba" era um palpite. O `opener` é
           cortado na mão logo depois, como se fazia antes de a opção existir,
           para a página aberta não ganhar um ponteiro para esta. */
        const opened = window.open(TELEGRAM_URL, "_blank");
        if (opened) {
          opened.opener = null;
        }
        setPopupBlocked(opened === null);
      }
    } catch {
      /* O `fetch` nem chegou a ter resposta: não há código do servidor para
         traduzir, e este é o único que o cliente cunha por conta própria. */
      setErrorCode("network");
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

        {/* Sem `NEXT_PUBLIC_TELEGRAM_URL` no build não existe para onde mandar
            ninguém: nem botão, nem frase prometendo uma aba — só a confirmação
            e a nota. Era aqui que o fallback `https://t.me/` entregava a home
            do Telegram como se fosse o canal. A variável precisa estar
            definida na hora do `next build` (não basta no container); o README
            explica por quê e como. */}
        {TELEGRAM_URL && (
          <>
            <p className="text-sm leading-relaxed text-muted">
              {popupBlocked ? form.successBodyManual : form.successBody}
            </p>

            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${CTA} mt-2 inline-flex`}
            >
              <Send className="h-4 w-4" />
              {form.openTelegram}
            </a>
          </>
        )}

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

  /* Código → frase, aqui no render: `form.errors` é o dicionário do idioma
     atual, então trocar de idioma reescreve o que já está na tela. */
  const nameError = fieldCodes.name
    ? waitlistMessage(form.errors, fieldCodes.name)
    : null;
  const emailError = fieldCodes.email
    ? waitlistMessage(form.errors, fieldCodes.email)
    : null;

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
        {/* `aria-required` ao lado do `required` (aqui e no e-mail): com o
            `noValidate` o navegador não age sobre o `required`, e a
            obrigatoriedade não está escrita no rótulo — o atributo ARIA é o que
            resta anunciando-a a quem usa leitor de tela. */}
        <input
          id="waitlist-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-required
          maxLength={120}
          disabled={isLoading}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "waitlist-name-error" : undefined}
          placeholder={form.namePlaceholder}
          className={`${FIELD_BASE} ${
            nameError ? "border-red-500/70" : "border-line-strong"
          }`}
        />
        {nameError && (
          <p id="waitlist-name-error" className="text-xs text-red-400">
            {nameError}
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
          aria-required
          maxLength={120}
          disabled={isLoading}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "waitlist-email-error" : undefined}
          placeholder={form.emailPlaceholder}
          className={`${FIELD_BASE} ${
            emailError ? "border-red-500/70" : "border-line-strong"
          }`}
        />
        {emailError && (
          <p id="waitlist-email-error" className="text-xs text-red-400">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="waitlist-nationality" className="text-xs font-medium text-muted">
          {form.nationality}
        </label>
        {/* As opções vêm do dicionário porque os rótulos são traduzidos; os
            códigos que a rota aceita são os de `NATIONALITIES`
            (`src/lib/waitlist.ts`), e `form.countries` tem de bater com eles. */}
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
        className={`${CTA} mt-1 inline-flex cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
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
        {status === "error" ? waitlistMessage(form.errors, errorCode) : ""}
      </p>

      <p className="text-center text-xs text-faint">{form.disclaimer}</p>
    </form>
  );
}
