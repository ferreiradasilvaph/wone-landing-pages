/* Cada integração é um ponto laranja e o nome escrito. Os glifos das marcas
   saíram daqui a pedido do dono (15/10: "troque os ícones por pontinhos
   laranjas e mantenha o nome das integrações"): nove desenhos diferentes
   davam à faixa um ritmo irregular, e o ponto único — o mesmo marcador do
   resto da página — deixa a leitura só com os nomes. Os glifos oficiais
   continuam no rodapé, onde cada integração tem a própria linha. */
const PONTO = "h-1.5 w-1.5 shrink-0 rounded-full bg-brand";

const CELULA =
  "flex h-full shrink-0 items-center gap-2.5 border-r border-line px-6 whitespace-nowrap";

/**
 * A faixa de integrações que fecha o hero: 44px de altura, largura inteira da
 * tela, um carrossel contínuo.
 *
 * O dono pediu em 15/10 que a faixa voltasse a andar ("faça dessa sessão um
 * carrossel contínuo"). A versão estática que vivia aqui existia por custo de
 * quadro na primeira dobra; o que anda agora é só `transform` numa camada
 * própria (`@keyframes band-marquee` em globals.css), o mais barato que um
 * movimento pode ser — nenhum JavaScript, nenhum relógio. A lista é
 * renderizada duas vezes e o keyframe desloca exatamente -50%, então a emenda
 * cai sempre no mesmo ponto e o laço fica imperceptível. Para no hover e, com
 * `prefers-reduced-motion`, a regra global de globals.css congela a animação
 * (a cópia que fica à vista é completa).
 *
 * O rótulo não anda: ele é a frase que abre a faixa e fica fixo à esquerda,
 * com o próprio fundo por cima do trilho que passa.
 */
export function IntegrationBand({
  title,
  items,
  className = "",
}: {
  title: string;
  items: ReadonlyArray<{ name: string; icon: string; kind: string }>;
  className?: string;
}) {
  return (
    <div className={`h-11 w-full border-y border-line bg-ink-900${className ? ` ${className}` : ""}`}>
      <div className="relative flex h-full overflow-hidden">
        <span className={`${CELULA} t-label relative z-10 bg-ink-900`}>{title}</span>

        <div className="band-marquee flex h-full w-max hover:[animation-play-state:paused]">
          {[0, 1].map((copia) => (
            <div key={copia} aria-hidden={copia === 1} className="flex h-full shrink-0">
              {items.map((item) => (
                <span key={`${copia}-${item.name}`} className={CELULA}>
                  <span aria-hidden className={PONTO} />
                  <span className="text-[13px] font-medium text-cream">{item.name}</span>
                  <span className="text-[13px] text-faint">· {item.kind}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
