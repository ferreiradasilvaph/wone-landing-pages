import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * `/robots.txt`.
 *
 * Sem este arquivo o site não dizia nada aos buscadores — o que até funciona
 * (ausência é permissão), mas também não aponta o sitemap, e é lá que o Google
 * descobre a página sem depender de link externo.
 *
 * A rota de API fica de fora do rastreamento: ela só aceita POST, então um
 * robô que a visite só coleta um 405.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
