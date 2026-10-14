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

/**
 * O PORTEIRO DA ENTRADA — 560 bytes de JavaScript síncrono no `<head>`.
 *
 * Pedido do dono de 15/10: a home tem de abrir igual nos três caminhos (F5,
 * clique na logo, URL digitada) — sempre no topo e sempre com a coreografia do
 * hero rodando. Quatro coisas acontecem aqui, e todas precisam acontecer ANTES
 * da primeira pintura, que é por que isto não é um efeito de React:
 *
 * 1. `history.scrollRestoration = "manual"`: desliga a restauração de rolagem
 *    do navegador. Sem isto, um F5 no meio da página devolve o leitor ao
 *    mesmo pixel — e a coreografia rodaria fora da tela, para ninguém.
 * 2. A âncora velha sai da URL (`replaceState`): a nav escreve `#faq`,
 *    `#premios` etc. no endereço, e no recarregamento o navegador salta para
 *    ela. Tirar o hash ANTES da pintura é o que faz uma URL colada com âncora
 *    abrir no topo, como o dono pediu.
 * 3. A classe `wone-entrando` no `<html>`: é ela, e só ela, que arma a
 *    coreografia do CSS (`globals.css`, bloco da entrada). O estado inicial
 *    escondido do título vem do `animation-fill-mode: both` de uma animação
 *    que já está começando — nada fica escondido esperando o React, e se este
 *    script não rodar (ou falhar) a página nasce visível e estática. Com
 *    `prefers-reduced-motion: reduce` a classe não entra: sem animação nenhuma.
 * 4. `scrollTo(0, 0)` em `load` e no quadro seguinte, mais `pageshow` (o
 *    caminho do bfcache, onde o Chrome restaura a posição DEPOIS do `load`).
 *    Com um porém que a referência não tem: se o leitor já rolou por conta
 *    dele (roda, toque ou tecla) antes de a página terminar de carregar, o
 *    porteiro desiste — puxar a tela de volta debaixo da mão de quem está
 *    lendo seria pior que não fazer nada.
 *
 * `performance.now()` fica em `data-entrada`: é o relógio da entrada, e o
 * globo do hero o lê para saber se ainda vale acender a onda (ver `HeroGlobe`).
 */
const ENTRADA = `(function(){var d=document.documentElement,u=0,
t=function(){u||scrollTo(0,0)},m=function(){u=1};
try{history.scrollRestoration="manual"}catch(e){}
if(location.hash)try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
if(!matchMedia("(prefers-reduced-motion:reduce)").matches)d.classList.add("wone-entrando");
d.dataset.entrada=String(Math.round(performance.now()));
addEventListener("wheel",m,{passive:1,once:1});addEventListener("touchstart",m,{passive:1,once:1});
addEventListener("keydown",m,{once:1});addEventListener("pageshow",t);
addEventListener("load",function(){t();requestAnimationFrame(t)})})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} h-full antialiased`}
      /* O script acima escreve `class="… wone-entrando"` e `data-entrada` no
         `<html>` ANTES de o React hidratar — é todo o ponto dele. Sem este
         `suppressHydrationWarning`, a hidratação compara o `<html>` servido com
         o que está na tela, encontra os dois atributos a mais e grita no
         console ("some attributes of the server rendered HTML didn't match").
         A supressão vale só para os atributos DESTE nó, e é o caminho
         documentado para script de pré-pintura. */
      suppressHydrationWarning
    >
      {/* POR QUE UM `<head>` CRU E NÃO `next/script`.
          A doc desta versão promete que `beforeInteractive` "will always be
          injected inside the head of the HTML document"
          (`docs/01-app/03-api-reference/02-components/script.md`), mas isso
          vale para script com `src`. Medido no HTML servido desta página, o
          INLINE com `beforeInteractive` sai assim, dentro do `<body>`:
            `<script>(self.__next_s=self.__next_s||[]).push([0,{"children":…`
          — ou seja, ele é uma FILA que o runtime do Next executa depois de
          baixar o próprio pacote. Serve para um consentimento de cookies; não
          serve para cá, onde o único requisito é rodar antes da primeira
          pintura: a classe chegaria com o conteúdo já na tela, e a página
          piscaria exatamente o que o dono proibiu.
          O que a doc proíbe no root layout é `<title>` e `<meta>` à mão (isso é
          trabalho da Metadata API, que continua intacta e escreve neste mesmo
          `<head>`). Um `<script>` síncrono não concorre com ela. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: ENTRADA }} />
      </head>
      <body className="grain min-h-full flex flex-col bg-ink-950">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
