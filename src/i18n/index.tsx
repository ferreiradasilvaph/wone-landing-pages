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

export type Locale = "pt" | "en";

const STORAGE_KEY = "wone:locale";

/* --------------------------------------------------------------------------
   Só o português viaja no caminho crítico.

   `en.ts` era importado estaticamente aqui, e com isso os DOIS dicionários
   viajavam no mesmo pacote da página: o chunk `0_jl7c56e2nfr.js`, 18,1 kB
   transferidos / 54,7 kB crus, continha "Venda pelo Telegram" E "Sell on
   Telegram" — medido em 14/10, no trace do Lighthouse. Quem lê em português
   (a origem do tráfego) baixava a tradução inteira antes da primeira pintura,
   e é pintura que o Lighthouse cobra no FCP e no LCP do h1.

   Agora o inglês entra por `import("./en")`, sob demanda. O caminho precisa
   ser literal — nem variável, nem template —, ou o bundler não liga o chunk à
   chamada.

   O preço, honestamente: quem já escolheu inglês antes vê o português por uma
   ida à rede, porque a escolha guardada só pode ser lida depois da montagem e
   agora o dicionário dela também precisa chegar. O ganho é que todo mundo
   pinta a primeira tela mais cedo.

   `Partial` e não `Record`: o inglês pode não estar em memória. O tipo
   `Content` continua saindo de `pt.ts` (regra 5), e atribuir aqui o que o
   `import()` devolve é o que mantém a verificação — um campo novo em `pt.ts`
   sem tradução continua quebrando o build.
   -------------------------------------------------------------------------- */
const DICIONARIOS: Partial<Record<Locale, Content>> = { pt };

/* --------------------------------------------------------------------------
   Store do idioma fora do React.

   `useSyncExternalStore` é o caminho certo aqui: `getServerSnapshot` devolve
   "pt" para servidor e primeira renderização do cliente (então o HTML bate e a
   hidratação não quebra), e logo depois o React troca para o valor salvo. Ler o
   `localStorage` direto no corpo do componente, ou aplicá-lo com `setState`
   dentro de um efeito, causaria divergência de HTML ou renderização em cascata.
   -------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

/**
 * O idioma que está NA TELA.
 *
 * Nunca um idioma cujo dicionário ainda não chegou: `aplicar` só o troca
 * depois de o `import()` resolver, e é a mesma troca que avisa os ouvintes.
 * Assim um render nunca encontra um `locale` sem texto correspondente.
 */
let aplicado: Locale = "pt";

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
  return aplicado;
}

function getServerSnapshot(): Locale {
  return "pt";
}

async function aplicar(next: Locale) {
  if (next === aplicado) return;

  if (!DICIONARIOS[next]) {
    const { en } = await import("./en");
    DICIONARIOS.en = en;
  }

  aplicado = next;
  listeners.forEach((listener) => listener());
}

/* O `catch` não é decoração: `aplicar` agora espera a REDE. Se o chunk do
   inglês não chegar (deploy trocado no meio da visita, conexão caindo), sem
   isto a promessa rejeitada vira um erro não tratado no console. Com ele, a
   página simplesmente continua no idioma em que estava — que é o pior caso
   honesto de uma tradução que não baixou. */
function pedir(next: Locale) {
  aplicar(next).catch(() => {});
}

function writeLocale(next: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Sem persistência, a escolha vale só para esta visita.
  }
  pedir(next);
}

type LanguageValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Content;
};

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* A escolha guardada entra depois da montagem, e só então o dicionário dela é
     pedido. O `getSnapshot` não pode fazer isso: ele é síncrono e teria de
     devolver um idioma sem texto. */
  useEffect(() => {
    pedir(readStored());
  }, []);

  // Mantém o atributo lang do documento alinhado ao idioma escolhido.
  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => writeLocale(next), []);

  const value = useMemo<LanguageValue>(
    /* O `?? pt` nunca acontece — `aplicado` só vira "en" com o dicionário em
       memória —, mas é ele que prova ao tipo que `t` existe sempre. */
    () => ({ locale, setLocale, t: DICIONARIOS[locale] ?? pt }),
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
