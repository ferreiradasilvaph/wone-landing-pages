"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { pt, type Content } from "./pt";
import { en } from "./en";

export type Locale = "pt" | "en";

const DICTIONARIES: Record<Locale, Content> = { pt, en };
const STORAGE_KEY = "wone:locale";

/* --------------------------------------------------------------------------
   Store do idioma fora do React.

   `useSyncExternalStore` é o caminho certo aqui: `getServerSnapshot` devolve
   "pt" para servidor e primeira renderização do cliente (então o HTML bate e a
   hidratação não quebra), e logo depois o React troca para o valor salvo. Ler o
   `localStorage` direto no corpo do componente, ou aplicá-lo com `setState`
   dentro de um efeito, causaria divergência de HTML ou renderização em cascata.
   -------------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let cached: Locale | null = null;

function readStored(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {
    // localStorage bloqueado (janela anônima, cookies desligados).
  }
  return "pt";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): Locale {
  cached ??= readStored();
  return cached;
}

function getServerSnapshot(): Locale {
  return "pt";
}

function writeLocale(next: Locale) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Sem persistência, a escolha vale só para esta visita.
  }
  listeners.forEach((listener) => listener());
}

type LanguageValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Content;
};

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mantém o atributo lang do documento alinhado ao idioma escolhido.
  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => writeLocale(next), []);

  const value = useMemo<LanguageValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale] }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage precisa estar dentro de <LanguageProvider>.");
  }
  return context;
}

/** Atalho para quem só precisa dos textos. */
export function useContent(): Content {
  return useLanguage().t;
}
