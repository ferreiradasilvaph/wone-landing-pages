import { IntegrationMark } from "./IntegrationMark";

/* Todas as marcas saem no laranja da Wone, não na cor de cada serviço. A faixa
   com nove cores brigava com o resto da página; num tom só, ela lê como uma
   linha da Wone falando de quem ela integra. */
const MARCA = "#FF7700";

/* A partir de `lg` as células dividem a largura da tela por igual (`flex-1`) em
   vez de ficarem do tamanho do texto: medido a 1440, as nove integrações mais o
   rótulo pediam 1.911px numa faixa de 1.430, e três delas — X Ads, UTMify e
   Otimizey — só apareciam rolando a faixa, sem nenhuma pista de que existiam
   (as pontas esmaecidas saíram da espec). Abaixo de `lg` a faixa continua
   rolando com o dedo, que é o comportamento desenhado para o celular. */
const CELULA =
  "flex h-full shrink-0 snap-start items-center gap-2.5 border-r border-line px-6 whitespace-nowrap lg:min-w-0 lg:flex-1 lg:px-4";

/**
 * A faixa de integrações que fecha o hero: 44px de altura, largura inteira da
 * tela, uma célula por serviço.
 *
 * Estática, de propósito. A faixa infinita que vivia aqui era um relógio de 42s
 * rodando na primeira dobra — o pior lugar da página para gastar quadro — e as
 * pontas esmaecidas escondiam metade dos nomes. Agora cada integração aparece
 * escrita, por inteiro, e no celular a mesma faixa rola na horizontal com o
 * dedo (sem barra de rolagem à vista, sem máscara, sem pílulas).
 *
 * O nome fica em texto, não em `sr-only`: quem lê com os olhos e quem lê com
 * leitor de tela recebem a mesma coisa, e o glifo é decoração (`aria-hidden`).
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
      <div className="flex h-full snap-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* O rótulo mantém a largura do texto: ele é a frase que abre a faixa. */}
        <span className={`${CELULA} t-label lg:flex-none`}>{title}</span>

        {items.map((item) => (
          <span key={item.name} className={CELULA}>
            <IntegrationMark icon={item.icon} name={item.name} color={MARCA} className="h-4 w-4" />
            <span className="text-[13px] font-medium text-cream">{item.name}</span>
            {/* O que cada marca faz cabe no celular, onde a faixa rola; no
                desktop, onde tudo tem de caber na tela, o nome é o que fica. */}
            <span className="text-[13px] text-faint lg:hidden">· {item.kind}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
