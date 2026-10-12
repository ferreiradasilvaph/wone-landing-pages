import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança.
 *
 * Nenhum deles muda um pixel da página: são instruções para o navegador sobre
 * o que ele pode fazer com ela. Faltavam todos.
 *
 * Fora da lista, de propósito: `Content-Security-Policy`. Ela é a defesa mais
 * forte e também a única que quebra a página se escrita de olhos fechados —
 * esta aplicação usa estilo embutido do Next, WebGL e fontes do Google. CSP
 * aqui se faz medindo em `Report-Only` primeiro, não no commit de uma auditoria.
 */
const SECURITY_HEADERS = [
  /* Impede que o navegador adivinhe o tipo de um arquivo pelo conteúdo. Um
     upload mal servido deixa de virar script executável. */
  { key: "X-Content-Type-Options", value: "nosniff" },
  /* Ninguém embute este site num iframe: é a defesa contra clickjacking, em que
     um terceiro põe a nossa página invisível sobre a dele e colhe os cliques.
     `frame-ancestors` é a forma moderna; `X-Frame-Options` cobre o resto. */
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  /* O endereço completo só vaza para o próprio site; para fora vai só a origem,
     e para HTTP não vai nada. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* A página não usa câmera, microfone nem localização. Dizer isso em voz alta
     fecha a porta também para qualquer iframe de terceiro que venha a entrar. */
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/**
 * As artes trocadas à mão: revalidar sempre.
 *
 * Tudo em `public/` sai com `max-age=14400` — quatro horas de cache que o
 * navegador nem pergunta se ainda valem. Para um logotipo isso é ótimo. Para
 * `placas/`, `images/` e `arte/` é veneno: são arquivos de nome fixo que mudam
 * de conteúdo a cada ajuste de arte, e foi exatamente assim que as placas
 * novas — recortadas, com o acrílico translúcido — subiram para o servidor e
 * ninguém viu. Quem já tinha visitado o site continuou com as antigas, chapadas
 * e opacas, por quatro horas, enquanto o servidor respondia a versão certa a
 * quem chegasse de primeira.
 *
 * `no-cache` não proíbe guardar: manda perguntar antes de usar. O navegador
 * guarda igual e pergunta com o `ETag` na mão; se nada mudou, a resposta é um
 * `304` de alguns bytes. O preço é uma ida ao servidor por imagem, e só quando
 * a seção entra em cena — as artes carregam sob demanda. Barato perto de uma
 * tarde inteira mostrando a imagem errada.
 *
 * Fora daqui, o resto segue como está: os pacotes do Next já nascem com hash
 * no nome e podem ser guardados para sempre, porque um nome novo é um arquivo
 * novo.
 */
const ARTE_SEMPRE_FRESCA = [{ key: "Cache-Control", value: "no-cache" }];

const nextConfig: NextConfig = {
  /* `experimental.inlineCss` foi testado e revertido.
     Ele injeta o CSS da rota no <head> e remove o único recurso bloqueante da
     página (12,7 kB custando 157 ms). O problema é o que entra no lugar: o
     documento saltou de 21,8 kB para 57,6 kB transferidos, porque o CSS deixa
     de ser um arquivo com cache próprio e viaja dentro do HTML a cada visita.
     No 4G simulado do Lighthouse o FCP subiu de 1,28 s para 1,42 s. Trocar 157
     ms de bloqueio por 36 kB no caminho crítico é prejuízo. */

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/:pasta(placas|images|arte)/:arquivo*", headers: ARTE_SEMPRE_FRESCA },
    ];
  },
};

export default nextConfig;
