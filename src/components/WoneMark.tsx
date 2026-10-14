/**
 * Ícone oficial Wone, a partir do arquivo da marca.
 *
 * O PNG tem a geometria correta — chevrons sólidos e anéis com abertura — que a
 * aproximação em SVG não reproduzia. Fundo transparente e laranja chapado, então
 * assenta em qualquer superfície do site.
 *
 * `<img>` cru, e não `next/image`. Medido em 14/10, eram dois defeitos no mesmo
 * componente:
 *
 * 1. O `next/image` emitia `loading="lazy"` e `fetchpriority="auto"`, e nenhuma
 *    das instâncias da primeira dobra pedia prioridade. No trace do Lighthouse
 *    o pedido de `/_next/image?url=/images/logo-icon.png&w=128&q=75` saía aos
 *    1.221 ms em prioridade Low, e o `load` dele invalidava o layout aos
 *    1.251 ms — o que forçava um SEGUNDO ciclo de layout+pintura aos 2.197 ms,
 *    e foi esse segundo quadro que virou o quadro do LCP (2.482 ms).
 * 2. Um logotipo de 15,6 kB arrastava o componente de cliente do `next/image`
 *    (~16 kB crus) para o carregamento inicial.
 *
 * Trocar pelo `<img>` valeu TBT 209 → 99 ms e +3 pontos no desempenho móvel
 * (experimento E-f2), sem mexer num pixel: o navegador acha a imagem no
 * varredor de pré-carregamento, dentro do HTML, antes de rodar script nenhum.
 *
 * O preço, dito por inteiro: o PNG viaja com 16,2 kB, contra os 6,2 kB (celular)
 * e 2,8 kB (desktop) do WebP que o otimizador entregava. São ~10 kB a mais —
 * e, medidos, não custaram nem FCP nem LCP, porque esses 10 kB saem do caminho
 * de uma imagem secundária enquanto os 48 kB que saíram do pacote de script
 * saem do caminho da PRIMEIRA PINTURA. O pedido também passou dos 1.221 ms
 * para os 32 ms: agora ele acontece junto com a fonte, muito antes do paint,
 * em vez de chegar depois dele e sujar o layout.
 *
 * `width`/`height` são as medidas INTRÍNSECAS do arquivo. Elas não desenham
 * nada — quem desenha é o `className` com `h-*` e `w-auto` —, servem para o
 * navegador saber a proporção antes de a imagem chegar e não mover o layout
 * (CLS 0).
 *
 * O ponto de entrega do plano prevê `public/images/wone-mark.svg` com a marca
 * em vetor. Quando o arquivo chegar, este componente passa a SVG inline e o
 * pedido de rede desaparece de vez.
 */
export function WoneIcon({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-icon.png"
      alt="Wone"
      width={642}
      height={400}
      decoding="async"
      className={className}
    />
  );
}
