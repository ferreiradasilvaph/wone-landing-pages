import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const TITLE = "Wone — Vendas automáticas no Telegram";
const DESCRIPTION =
  "Funil de vendas, PIX e cartão, upsell, remarketing e entrega automática de acesso em canais e grupos privados do Telegram.";

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
        url: "/images/frame-19.png",
        width: 1200,
        height: 880,
        alt: "Wone Bot confirmando um PIX aprovado no celular",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/frame-19.png"],
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
