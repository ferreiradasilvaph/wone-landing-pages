/**
 * Endereço público do site, num lugar só.
 *
 * Três arquivos precisam dele — as metatags em `layout`, o `robots.txt` e o
 * `sitemap.xml` — e os três liam a mesma variável com o mesmo `??` repetido.
 *
 * O padrão deixou de ser `localhost` em produção, e o motivo é um defeito real:
 * `NEXT_PUBLIC_SITE_URL` não estava definida no servidor, então o site no ar
 * publicava `og:image` apontando para `http://localhost:3000/images/frame-19.png`.
 * Todo link compartilhado em WhatsApp, Telegram ou LinkedIn saía sem imagem de
 * prévia — e nada no site dava sinal disso, porque a página em si funciona.
 *
 * Agora um esquecimento de variável degrada para o endereço certo em vez de
 * degradar para a máquina de quem fez o build. Definir `NEXT_PUBLIC_SITE_URL`
 * continua sendo o caminho certo, e é obrigatório se o domínio mudar: por ser
 * `NEXT_PUBLIC_*`, o valor é embutido no `next build`, não lido em tempo de
 * execução — mudá-la exige um novo deploy.
 */

/** Onde o site está publicado hoje. Trocou de domínio? Use a variável. */
const PRODUCTION_FALLBACK = "https://pedrinho.wone.bot";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? PRODUCTION_FALLBACK : "http://localhost:3000");
