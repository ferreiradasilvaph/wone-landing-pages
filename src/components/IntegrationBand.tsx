/* Cada integração é um ponto laranja e o nome escrito. Os glifos das marcas
   saíram daqui a pedido do dono (15/10: "troque os ícones por pontinhos
   laranjas e mantenha o nome das integrações"): nove desenhos diferentes
   davam à faixa um ritmo irregular, e o ponto único — o mesmo marcador do
   resto da página — deixa a leitura só com os nomes. Os glifos oficiais
   continuam no rodapé, onde cada integração tem a própria linha. */
const PONTO = "h-1.5 w-1.5 shrink-0 rounded-full bg-brand";

/**
 * QUANTAS CÓPIAS DA LISTA O TRILHO CARREGA — e por que não são duas.
 *
 * Eram duas, com o keyframe deslocando −50% (uma cópia). Isso só fecha o laço
 * enquanto UMA cópia cobrir a tela, e a lista mede 1.627px: a partir daí, no
 * instante em que o laço reinicia, o fim do conteúdo já passou da borda e sobra
 * faixa vazia. Medido em 16/10, com o trilho congelado no fim da volta: a 1920
 * o conteúdo acabava em 1.627 e a tela ia até 1.910 — 282px de buraco; a 2560,
 * 933px. Abaixo de 1.627 nunca aparecia, e é por isso que passou despercebido.
 *
 * Com N cópias e um deslocamento de −100%/N, o trilho anda exatamente UMA
 * cópia por volta — então a velocidade não depende de N, e o que N compra é
 * quanto de tela as cópias restantes cobrem: (N−1) × 1.627. Com quatro, 4.881px,
 * que cobre qualquer monitor que exista hoje, incluindo os ultrawide de 3440 e
 * 4096. Se a lista encolher um dia, a conta é essa — não um palpite novo.
 */
const COPIAS = [0, 1, 2, 3];

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
 * O RÓTULO SAIU DA TELA em 15/10, a pedido do dono ("remova o escrito 'por onde
 * cada venda passa' e deixe apenas o carrossel com as integrações"). Ele era uma
 * célula fixa à esquerda, com o próprio fundo por cima do trilho — e era também
 * o único ponto da faixa que não andava, o que cortava o carrossel em dois.
 *
 * A frase não foi apagada, mudou de natureza: vira o `aria-label` da faixa.
 * Sem ela, quem usa leitor de tela ouviria nove nomes de marca soltos entre o
 * hero e a próxima seção, sem nada dizendo o que são. O dicionário continua com
 * a chave, e quem já a tinha na tela — ninguém mais — não a perde.
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
    <div
      aria-label={title}
      className={`h-11 w-full border-y border-line bg-ink-900${className ? ` ${className}` : ""}`}
    >
      <div className="relative flex h-full overflow-hidden">
        <div className="band-marquee flex h-full w-max hover:[animation-play-state:paused]">
          {COPIAS.map((copia) => (
            <div key={copia} aria-hidden={copia > 0} className="flex h-full shrink-0">
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
