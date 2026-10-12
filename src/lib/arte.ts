/**
 * O endereço de uma arte, carimbado com a versão desta build.
 *
 * As placas e as joias moram em `public/` com nome fixo: `placa-500k.webp` é
 * sempre `placa-500k.webp`, por mais que o arquivo por trás mude. Para o
 * navegador, endereço igual é arquivo igual — e ele guarda o que já baixou.
 *
 * Isso custou uma tarde. As placas recortadas, com o acrílico translúcido,
 * subiram para o servidor e ninguém viu: quem já tinha visitado o site
 * continuou vendo as antigas, chapadas, enquanto a origem respondia a versão
 * certa a quem chegasse de primeira. Medido na própria página: a mesma URL
 * devolvia 108.502 bytes do disco do navegador e 92.650 da rede.
 *
 * Nem os cabeçalhos resolvem sozinhos. A origem manda `no-cache` — está em
 * `next.config.ts` —, mas o Cloudflare na frente reescreve para quatro horas,
 * e isso só se desliga no painel dele. E um Ctrl+Shift+R também não alcança
 * estas imagens: elas não vêm no HTML, são buscadas por JavaScript depois que
 * a página carregou, e o furo de cache do recarregamento forçado não vale
 * para o que é pedido mais tarde.
 *
 * O que vale em qualquer um desses casos é mudar o endereço. Um `?v=` novo é,
 * para todo cache do caminho, um arquivo que ninguém tem — navegador, CDN e
 * proxy vão buscar na origem sem ninguém precisar pedir. O carimbo é o
 * instante da build: muda a cada deploy e só a cada deploy, então a arte
 * recarrega uma vez quando sobe algo novo e fica em cache até o próximo.
 *
 * Toda arte servida de `public/` passa por aqui — a da placa e a da joia, no
 * pré-carregamento do carrossel e na textura da cena 3D. Se as duas pontas não
 * pedirem o mesmo endereço, o pré-carregamento aquece uma entrada que a cena
 * não vai usar, e a troca de marco volta a esperar a rede.
 */
const VERSAO = process.env.NEXT_PUBLIC_ARTE_V;

export function arte(src: string) {
  return VERSAO ? `${src}?v=${VERSAO}` : src;
}
