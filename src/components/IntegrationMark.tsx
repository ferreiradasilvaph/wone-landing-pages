import { CreditCard, Infinity as InfinityIcon } from "lucide-react";

/**
 * Marca de cada integração, para a faixa de integrações mostrar o símbolo em vez
 * do nome escrito.
 *
 * Por que desenhado aqui: o `lucide-react` não traz ícone de marca (foram
 * retirados da biblioteca por questão de marca registrada) e o projeto não tem
 * nenhum SVG de logo em `public/`. O mesmo caminho que o `FlagMark` já segue
 * para as bandeiras.
 *
 * Três níveis de fidelidade, e vale saber qual é qual:
 *
 *  1. Desenhado a partir da forma real — `telegram` (avião de papel), `x` (o X),
 *     `pix` (o losango de quatro setas). São silhuetas simplificadas, não os
 *     arquivos oficiais.
 *  2. Ícone genérico que o contexto resolve — `card` (cartão) e, para a Meta, o
 *     laço do infinito. Lê como a marca ao lado do rótulo do serviço, sem
 *     reproduzir o logo.
 *  3. Monograma — `utmify`, `otimizey`. Não tenho a forma dessas marcas, e
 *     inventar um logo para empresa real seria pior do que não ter: ficaria um
 *     símbolo falso colado num nome verdadeiro. A inicial na cor da marca é
 *     claramente um marcador, não um logo.
 *  4. Símbolo do serviço, não da marca — `tiktok` e `kwai`. A nota musical e o
 *     "K" num quadrado foram reprovados, e com razão: eram logo de mentira. As
 *     duas entram na faixa como integrações de RASTREIO, então o símbolo conta
 *     isso — o evento saindo do anúncio — com a geometria de cada plataforma.
 *     Ver os `case` lá embaixo.
 *
 * Quando os SVG oficiais estiverem disponíveis, é só substituir cada `case` —
 * a assinatura do componente não muda.
 */
export function IntegrationMark({
  icon,
  name,
  className = "h-4 w-4",
  color,
}: {
  icon: string;
  name: string;
  className?: string;
  color: string;
}) {
  const common = {
    className,
    style: { color },
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "pix":
      /* Quatro pontas de seta em losango, aproximando o símbolo do PIX. */
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.6 6.3 7.3h3.1L12 4.7l2.6 2.6h3.1z" />
          <path d="M22.4 12l-5.7-5.7v3.1l2.6 2.6-2.6 2.6v3.1z" />
          <path d="M12 22.4l-5.7-5.7h3.1l2.6 2.6 2.6-2.6h3.1z" />
          <path d="M1.6 12l5.7-5.7v3.1L4.7 12l2.6 2.6v3.1z" />
        </svg>
      );

    case "card":
      return <CreditCard {...common} />;

    case "telegram":
      /* Avião de papel. `evenodd` garante que a dobra da asa seja recortada em
         vez de preenchida — com a regra padrão o resultado dependeria do sentido
         em que o subpath foi desenhado. */
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
          <path d="M22.3 2.6 2.1 10.5c-.7.3-.7 1.3 0 1.5l4.8 1.6 1.7 5.6c.2.7 1.1.8 1.5.2l2.3-3 4.6 3.4c.5.4 1.3.1 1.4-.6l3.6-15.3c.2-.7-.5-1.3-1.2-1zm-3.7 3.9-8.8 7.2a1 1 0 0 0-.3.6l-.3 2.6-1-3.4z" />
        </svg>
      );

    case "meta":
      return <InfinityIcon {...common} />;

    case "tiktok":
      /* Anúncio vertical com eco: o quadro 9:16 do vídeo curto, a linha deslocada
         à esquerda (o descasamento de cor que é a assinatura visual do TikTok,
         traduzido para um tom só) e o ponto cheio no meio, que é o pixel de
         conversão. Não é o logo: é o que a integração faz. */
      return (
        <svg
          {...common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="3" width="9.5" height="18" rx="2.6" />
          <path d="M5.5 7.5v9" />
          <circle cx="13.75" cy="12" r="1.7" fill="currentColor" stroke="none" />
        </svg>
      );

    case "kwai":
      /* Vídeo que transmite: o play do vídeo curto e, saindo dele, duas ondas —
         o evento indo embora para a plataforma. Mesma família do TikTok (as
         duas são rastreio de vídeo curto) com silhueta diferente, para não
         virarem o mesmo símbolo na faixa. */
      return (
        <svg
          {...common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 6.4a1 1 0 0 1 1.5-.86l7.2 4.46a1 1 0 0 1 0 1.7l-7.2 4.46A1 1 0 0 1 5 15.3z" fill="currentColor" stroke="none" />
          <path d="M16.8 8.6a4.6 4.6 0 0 1 0 6.8" />
          <path d="M19.9 5.8a9.4 9.4 0 0 1 0 12.4" />
        </svg>
      );

    case "x":
      /* O X. Geometria do próprio símbolo: duas barras cruzadas com o vão
         interno recortado (daí o `evenodd`). */
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );

    default:
      /* Monograma: inicial do nome na cor da marca. */
      return (
        <span
          aria-hidden
          className={`${className} grid shrink-0 place-items-center rounded font-display text-[10px] font-bold leading-none`}
          style={{ color, background: `${color}1f` }}
        >
          {name.charAt(0)}
        </span>
      );
  }
}
