import { IntegrationMark } from "./IntegrationMark";

/* Todas as marcas saem no laranja da Wone, não na cor de cada serviço. A faixa
   com nove cores brigava com o resto da página; num tom só, ela lê como uma
   linha da Wone falando de quem ela integra. */
const MARCA = "#FF7700";

/* A partir de `lg` as células ESTICAM para ocupar a faixa inteira — `grow` com
   a base no tamanho do texto (`shrink-0` continua valendo), nunca `flex-1`.
   O `flex-1` que estava aqui tem base ZERO: ele repartia a faixa em fatias
   IGUAIS, sem olhar o conteúdo. A 1.440 isso passava despercebido (113px para
   todas, e a maior, "TikTok Ads", pede 124), mas a 1.024 a fatia caía para
   84px e os nomes compridos vazavam por cima da régua da célula seguinte.
   Com `grow`, nenhuma célula fica menor que o próprio nome e a sobra se
   reparte entre elas: medido a 1.440, 115px para "PIX" e 161 para "TikTok
   Ads", somando os 1.430 da faixa. Abaixo de ~1.170px de faixa (1.024, por
   exemplo) a fila não cabe e volta a rolar com o dedo — medido: 1.108 de
   conteúdo em 1.014 de faixa —, que é o comportamento desenhado para o
   celular. */
const CELULA =
  "flex h-full shrink-0 snap-start items-center gap-2.5 border-r border-line px-6 whitespace-nowrap lg:px-4";
/* Só as integrações esticam; o rótulo mantém a largura da frase que abre a
   faixa (por isso `lg:grow` fica aqui, e não na base: duas utilidades da mesma
   propriedade na mesma célula dependeriam da ordem da folha de estilo). */
const CELULA_MARCA = `${CELULA} lg:grow`;

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
        <span className={`${CELULA} t-label`}>{title}</span>

        {items.map((item) => (
          <span key={item.name} className={CELULA_MARCA}>
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
