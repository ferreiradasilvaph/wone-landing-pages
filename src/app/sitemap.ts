import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * `/sitemap.xml`.
 *
 * O site é de uma página só, então o sitemap tem uma entrada — e é justamente
 * por ser uma página só que ele vale a pena: não existe link interno para o
 * rastreador seguir, e a data de modificação dá a ele um motivo para voltar.
 *
 * Os dois idiomas moram na mesma URL (a troca é no cliente, guardada no
 * `localStorage`), então não há `alternates` a declarar: seria apontar duas
 * vezes para o mesmo endereço.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
