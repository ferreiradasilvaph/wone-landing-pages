import { CountryTag } from "./CountryTag";
import { LATAM_DOTS, LATAM_GAP, LATAM_RUNS, LATAM_VIEWBOX } from "./latamDots";

/**
 * O mapa pontilhado da América Latina do palco do hero.
 *
 * É o pedido do dono de 14/10, literal: "coloque junto a página principal uma
 * prévia do checkout internacional, mostrando um mapa sul-americano, como o da
 * página da Dotfy". O recorte vai do México à Argentina — "sul-americano" nas
 * palavras dele, mas o México é um dos quatro países da Wone e precisa
 * aparecer.
 *
 * COMO OS PONTOS SÃO DESENHADOS
 *
 * Duas `<path>` e nada mais. `LATAM_RUNS` são os trechos de terra contínua de
 * cada linha de latitude, traçados com `stroke-linecap="round"` e
 * `stroke-dasharray="0 4"`: traço de comprimento zero com ponta redonda é um
 * ponto, e o tracejado reinicia em cada subcaminho, então cada trecho sai como
 * uma fileira de pontos alinhados na grade. `LATAM_DOTS` são as ilhas de uma
 * célula, em subcaminhos `h0` numa path SEM `dasharray` — com ele o Chrome pode
 * descartar um subcaminho de comprimento zero.
 *
 * As duas strings somam ~1,4 kB e saem de `scripts/gera-mapa.mjs` em tempo de
 * build (veja `latamDots.ts`). Nada é calculado em runtime, não há imagem para
 * baixar, e `<svg>` inline NÃO é candidato a LCP — o `<h1>` ao lado continua
 * sendo o elemento de LCP da página.
 *
 * COMO ELE SANGRA ATÉ A BORDA DA TELA
 *
 * A camada é filha do palco (colunas 7–12 do container) e estica o lado direito
 * por `calc` do que o container reserva de margem e de respiro: é a conta exata
 * para o mapa encostar na borda da janela em qualquer largura, sem medir nada
 * em JavaScript. Dentro dela o *frame* fica 3rem mais à direita ainda (5rem a
 * partir de `xl`, desde que o telefone ficou mais alto), o que joga a ponta
 * leste do Brasil para fora da tela — a sangria que a referência tem. Quem
 * corta é o `overflow-hidden` da camada (e o `overflow-x-clip` da seção, para a
 * barra de rolagem do Windows que entra nos `100vw`).
 */

/**
 * As quatro cidades, em % da caixa do mapa.
 *
 * A caixa tem a mesma razão do `viewBox` (360×368), então % da caixa é % do
 * `viewBox`, e a conta é a da projeção equiretangular do script:
 * `x = (lon + 120) · 4` sobre 360, `y = (34 − lat) · 4` sobre 368.
 */
const CIDADES: Record<string, { left: string; top: string; side: "left" | "right" }> = {
  /* Cidade do México — 19,43 N / 99,13 W → x 83,5 · y 58,3 */
  MXN: { left: "23.19%", top: "15.84%", side: "right" },
  /* Bogotá — 4,71 N / 74,07 W → x 183,7 · y 117,2 */
  COP: { left: "51.03%", top: "31.84%", side: "right" },
  /* São Paulo — 23,55 S / 46,63 W → x 293,5 · y 230,2 */
  BRL: { left: "81.52%", top: "62.55%", side: "left" },
  /* Buenos Aires — 34,60 S / 58,38 W → x 246,5 · y 274,4 */
  ARS: { left: "68.47%", top: "74.57%", side: "left" },
};

/**
 * Esmaecimento do topo, só no `<svg>` — nunca no frame, que levaria os pings
 * junto. É o corte da latitude 34° no meio dos Estados Unidos: sem ele o mapa
 * terminaria numa régua reta de pontos atravessando a tela. 13% dos 620px do
 * frame são 81px, e o ping do México (15,84% = 98px) cai abaixo do fim do
 * degradê — a razão de o esmaecimento ser em %, e não em pixels.
 */
const ESMAECE = "linear-gradient(to bottom, transparent 0, #000 13%, #000 100%)";

export function LatamMap({
  pins,
  activeIndex,
  animated,
}: {
  /** Na ordem de `payments.table.countries`: Brasil, Argentina, México, Colômbia. */
  pins: { code: string; city: string; chip: string }[];
  activeIndex: number;
  animated: boolean;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-y-0 -right-4 -left-4 overflow-hidden sm:-right-6 sm:-left-6 lg:left-0 lg:right-[calc(-1*((100vw-min(100vw,80rem))/2+2rem))]"
    >
      {/* A ALTURA DO MAPA É A DO APARELHO, encostada na base do palco — não mais
          `h-full`. Com o telefone em 620 o palco foi a 656, e um frame de 656
          seria 642 de largura: como ele é ancorado à DIREITA, crescer de largura
          empurra o lado oeste do mapa para a esquerda, e a 1440 o ping do México
          (23% do frame) caía atrás da moldura do telefone. Casando a altura com
          a do aparelho o mapa cresce com o palco (554 → 620) sem comer o espaço
          dos rótulos, e os 36px que sobram no alto do palco são justamente a
          linha do rótulo "CHECKOUT INTERNACIONAL".
          O deslocamento à direita subiu de 48 para 80px a partir de `xl` pelo
          mesmo motivo: é o que põe o ponto de São Paulo (81,5% do frame) a 23px
          da borda da janela e o do México 14px à direita da moldura, com os
          anéis dos dois dentro da tela a 1440 e a 1920. Em `lg` ele é 64: com
          48 o ponto de Bogotá nascia exatamente sobre a borda direita da
          moldura a 1024, meio ponto dentro, meio fora. */}
      <div className="absolute bottom-0 left-1/2 h-[560px] -translate-x-1/2 aspect-[900/920] lg:left-auto lg:-right-16 lg:translate-x-0 xl:-right-20 xl:h-[620px]">
        {/* `text-cream/14` no celular e 16% a partir de `lg`. Os 9% de antes
            mediam 1,19:1 de contraste sobre o ink-950 (pico de luminância 25
            num fundo 8): no celular, onde o mapa fica ATRÁS do aparelho, o mapa
            simplesmente não existia. 14% leva o pico a ~38 e o mapa aparece sem
            disputar leitura com a tela do telefone, que está na frente. A cor
            vai por `currentColor` para as duas paths herdarem de um lugar só. */}
        <svg
          viewBox={LATAM_VIEWBOX}
          className="h-full w-full text-cream/14 lg:text-cream/16"
          style={{ maskImage: ESMAECE, WebkitMaskImage: ESMAECE }}
        >
          <path
            d={LATAM_RUNS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray={`0 ${LATAM_GAP}`}
          />
          <path
            d={LATAM_DOTS}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        {pins.map((pin, index) => {
          const cidade = CIDADES[pin.code];
          if (!cidade) return null;
          return (
            <CountryTag
              key={pin.code}
              code={pin.code}
              city={pin.city}
              chip={pin.chip}
              left={cidade.left}
              top={cidade.top}
              side={cidade.side}
              active={index === activeIndex}
              animated={animated}
            />
          );
        })}
      </div>
    </div>
  );
}
