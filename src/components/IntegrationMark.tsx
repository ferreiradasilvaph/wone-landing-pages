import { CreditCard } from "lucide-react";

/**
 * O glifo de cada integração, para a faixa mostrar o símbolo junto do nome.
 *
 * São marcas de TERCEIROS em uso nominativo: a Wone integra com elas, e o
 * símbolo identifica o serviço de que a página está falando. Não são "ícones
 * CC0" nem logos licenciados pela Wone — os desenhos abaixo são reproduções
 * simplificadas das formas públicas de cada marca, inline (sem arquivo em
 * `public/`) e no laranja único da Wone, como o resto da faixa. Se algum
 * detentor pedir, o `case` sai daqui e a marca passa a aparecer só pelo nome.
 *
 * Por que desenhados aqui: o `lucide-react` tirou os ícones de marca da
 * biblioteca justamente por questão de marca registrada, então não há de onde
 * importar. O mesmo caminho que o `FlagMark` já segue para as bandeiras.
 *
 * Quem não tem glifo devolve `null` e entra na faixa só pelo nome escrito.
 * Inventar um símbolo para empresa real é pior do que não ter: fica um logo
 * falso colado num nome verdadeiro. Os `case` vazios lá embaixo são o ponto de
 * entrada dos SVG oficiais que o dono vai mandar.
 */
export function IntegrationMark({
  icon,
  className = "h-4 w-4",
  color,
}: {
  icon: string;
  /** Fica na API porque é o nome que a faixa escreve ao lado do glifo. */
  name: string;
  className?: string;
  color: string;
}) {
  const comum = {
    className,
    style: { color },
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "pix":
      /* Quatro setas apontando para fora, em diamante: a construção do símbolo
         do PIX — os quatro quadrantes com o entalhe em V na base. */
      return (
        <svg {...comum} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1.5 7.15 6.35l3.2 3.2L12 7.4l1.65 2.15 3.2-3.2z" />
          <path d="M22.5 12l-4.85-4.85-3.2 3.2L16.6 12l-2.15 1.65 3.2 3.2z" />
          <path d="M12 22.5l-4.85-4.85 3.2-3.2L12 16.6l1.65-2.15 3.2 3.2z" />
          <path d="M1.5 12l4.85-4.85 3.2 3.2L7.4 12l2.15 1.65-3.2 3.2z" />
        </svg>
      );

    case "card":
      /* Cartão não é marca: é o meio de pagamento, e o ícone genérico do lucide
         diz isso melhor do que a bandeira de uma administradora só. */
      return <CreditCard {...comum} />;

    case "telegram":
      /* O avião de papel, com a dobra da asa recortada na base — é a dobra que
         distingue a marca de um avião de papel qualquer. */
      return (
        <svg {...comum} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.91 3.79 20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56l.39-5.59 10.17-9.18c.44-.39-.1-.61-.68-.23L6.38 12.73.95 11.03c-1.18-.35-1.2-1.16.26-1.72l21.16-8.16c.98-.36 1.84.24 1.54 2.64z" />
        </svg>
      );

    case "meta":
      /* O laço do infinito. É o único glifo em traço e não em preenchimento: a
         marca é uma fita de espessura variável, e um contorno preenchido feito
         à mão ficaria irregular no tamanho em que a faixa usa (16px). */
      return (
        <svg
          {...comum}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.6 6.4c-2.4 0-4 2.1-5.6 5.6-1.6 3.5-3.2 5.6-5.6 5.6-2.3 0-4-2.3-4-5.6s1.7-5.6 4-5.6c2.4 0 4 2.1 5.6 5.6 1.6 3.5 3.2 5.6 5.6 5.6 2.3 0 4-2.3 4-5.6s-1.7-5.6-4-5.6z" />
        </svg>
      );

    case "tiktok":
      /* A nota musical da marca: o gancho da colcheia saindo do corpo redondo. */
      return (
        <svg {...comum} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );

    case "x":
      /* O X. Duas barras cruzadas com o vão interno recortado, daí o
         `evenodd` — com a regra padrão o miolo seria preenchido. */
      return (
        <svg {...comum} viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );

    /* case "kwai": */
    /* case "utmify": */
    /* case "otimizey": */
    /* Sem glifo até os arquivos oficiais chegarem em
       `public/images/marcas/<slug>.svg`; cada um vira um `case` acima, e a
       assinatura deste componente não muda. */
    default:
      return null;
  }
}
