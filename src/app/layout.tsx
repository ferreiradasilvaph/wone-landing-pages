import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/i18n";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const TITLE = "Wone — Vendas automáticas no Telegram";
const DESCRIPTION =
  "Funil de vendas, PIX e cartão, upsell, remarketing e entrega automática de acesso em canais e grupos privados do Telegram.";

/**
 * Imagem de prévia dos links compartilhados.
 *
 * A anterior era `frame-19.png`, um print da tela do bot. Três defeitos de uma
 * vez: mostrava valores em reais ("R$ 142.580,00", "PIX Aprovado") depois que o
 * site passou a falar em dólar; media 1200×896 no arquivo mas estava declarada
 * aqui como 1200×880 — e nenhuma das duas é a proporção que WhatsApp, Telegram
 * e LinkedIn usam, que é 1,91:1 (1200×630). Fora da proporção, cada app corta
 * por conta própria, e o corte caía justamente no número inventado.
 *
 * A nova é montada do zero em 1200×630 com a marca oficial, o mesmo título do
 * hero e a mesma lead, sem um número sequer. 12,2 kB em PNG de paleta indexada
 * (bit depth 4, PLTE de 16 cores) — o limite do Facebook é 8 MB e o do X é
 * 5 MB, então o peso aqui é irrelevante; o que importa é que a imagem é a
 * primeira coisa que carrega numa prévia de link, antes do texto.
 *
 * Os ícones (aba, iOS, Android) NÃO aparecem neste objeto: vêm da convenção de
 * arquivo do Next — `src/app/icon.png`, `icon1.png` e `apple-icon.png`. O
 * `favicon.ico` que o create-next-app deixou (o triângulo da Vercel) foi
 * removido; ele tinha prioridade sobre o `icon.png` na lista de `<link>`.
 */
const OG_IMAGE = "/images/og.png";
const OG_ALT = "Wone: venda pelo Telegram no automático";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Wone",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OG_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, alt: OG_ALT }],
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col bg-ink-950">
        {/* Os blocos com animação de entrada nascem em opacity: 0 e só aparecem
            quando o IntersectionObserver dispara. Sem JavaScript isso deixaria
            a página em branco, então aqui o estado final é forçado. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
