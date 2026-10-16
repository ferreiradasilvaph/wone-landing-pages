import { Chip } from "../Chip";

/**
 * Um país no globo do palco do hero: o ponto, o anel que acende e o rótulo
 * (cidade + método · valor local).
 *
 * O nó é um ALFINETE de tamanho zero (`h-0 w-0`) posicionado em porcentagem da
 * caixa do globo — a projeção ortográfica em repouso é conta fechada
 * (`globeMath.REPOUSO`), então a porcentagem vale em qualquer raio e o alfinete
 * já sai do SERVIDOR sobre a coordenada certa, sem JavaScript medindo nada.
 *
 * Quando o globo passa a balançar, o laço do `HeroGlobe` escreve no `transform`
 * deste nó o DESLOCAMENTO a partir dessa posição de repouso — em t = 0 ele é
 * (0,0), e é por isso que o pino não salta quando o laço assume. `transform` é
 * composto: nenhum quadro passa por layout.
 *
 * O ponto é centrado por MARGEM negativa, não por `translate`: o keyframe do
 * anel anima `transform`, e qualquer `translate` de centralização no mesmo
 * elemento seria sobrescrito pela animação — o ponto sairia andando.
 *
 * O rótulo é HTML absoluto sobre o `<svg>`, nunca `<text>` dentro dele: assim
 * ele herda a Geist e o `Chip` do kit, não escala com o mapa e pode sumir
 * abaixo de `xl` por media query (lá quem nomeia o país é a linha de status).
 */
export function CountryTag({
  code,
  city,
  chip,
  left,
  top,
  side,
  nudge,
  sempre,
  active,
  animated,
  pinRef,
}: {
  /** Código da moeda — serve de `key` do anel, para ele remontar por ativação. */
  code: string;
  city: string;
  /** "PIX · R$ 197,00", montado em `paises.ts`. */
  chip: string;
  /** Posição de repouso do ponto, em % da caixa do globo. */
  left: string;
  top: string;
  /** Lado em que o rótulo abre — para DENTRO do disco (ver `globeMath.LADO`). */
  side: "left" | "right";
  /** Empurrão vertical do rótulo, em px: separa Bogotá de Quito sem mover o ponto. */
  nudge: number;
  /**
   * Rótulo visível já a partir de `lg`, e não só de 1420 — é o caso de Lisboa e
   * de Londres desde 15/10: o dono pediu para a Europa aparecer, e um pino sem
   * nome no canto do disco não diz que a Wone cobra em Portugal e no Reino
   * Unido. Os dois abrem à esquerda, para dentro do disco, longe da coluna de
   * texto do hero.
   */
  sempre?: boolean;
  active: boolean;
  /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
  animated: boolean;
  /** O laço do globo pega este nó para escrever o `transform` de cada quadro. */
  pinRef?: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <span ref={pinRef} className="absolute h-0 w-0" style={{ left, top }}>
      {/* O ponto. Desde 14/10 ele é CREME com anel laranja, e não laranja
          chapado: a terra firme do globo passou a ser toda do laranja da marca,
          e um pino laranja sobre um planeta laranja não é um pino. O creme é a
          mesma cor dos quatro países acesos no canvas — o pino é a continuação
          do brilho deles, e o anel laranja é o que o costura ao planeta.
          Ativo: 8px de creme cheio com 2px de anel; em repouso: 6px a 60% com
          1px. A transição é de cor, tamanho e anel — nada de escala, que
          brigaria com o `hero-ping`. */}
      <span
        className={`absolute top-1/2 left-1/2 rounded-full bg-cream transition-[background-color,width,height,box-shadow] duration-300 ${
          active
            ? "-mt-1 -ml-1 h-2 w-2 ring-2 ring-brand"
            : "-mt-[3px] -ml-[3px] h-1.5 w-1.5 bg-cream/60 ring-1 ring-brand/60"
        }`}
      />

      {/* O anel, só no país da vez: montar é animar, e ele só existe enquanto
          aquele país está ativo — uma volta por ativação, nunca em laço.

          `xl:hidden` desde 15/10, e não é zelo: a partir de 1280 quem pulsa é o
          CANVAS (`HeroGlobe`, 600 ms de raio e alfa), que desenha o anel na
          coordenada PROJETADA do país — ela continua andando com o balanço do
          planeta, e este anel aqui, que mora no alfinete, não. Abaixo de 1280 o
          globo é redesenhado uma vez por troca e não há laço para animar nada:
          lá este continua sendo o único pulso. Um por largura, nunca dois. */}
      {active && animated ? (
        <span
          key={code}
          /* 48px nos dois europeus, 36 nos outros: com o anel maior o olho
             encontra Lisboa e Londres do outro lado do Atlântico, que é o que o
             dono pediu em 15/10. O `key` continua sendo o país — montar é
             animar, uma volta por ativação. */
          className={`hero-ping absolute top-1/2 left-1/2 rounded-full ring-2 ring-brand xl:hidden ${
            sempre ? "-mt-6 -ml-6 h-12 w-12" : "-mt-[18px] -ml-[18px] h-9 w-9"
          }`}
        />
      ) : null}

      {/* Rótulo. O `translateY` carrega o empurrão de `nudge` junto com a
          centralização: o ponto fica onde a projeção manda, e só a caixa de
          texto se afasta do vizinho (Bogotá e Quito, a 27px um do outro).
          Some abaixo de 1420px, e não abaixo de `xl` (1280): são SETE rótulos
          desde 15/10, e abaixo dessa largura o disco encolhe até os pares
          vizinhos (Bogotá/Quito, Lisboa/Londres) se cobrirem — pior que não
          existir. Nessa faixa quem nomeia o país da vez é o `StageStatus`,
          exatamente como já acontecia a 1024 e no celular.
          1420 e não 1440: media query mede a viewport SEM a barra de rolagem,
          e uma janela de 1440 no Windows reporta 1430. */}
      <span
        style={{ transform: `translateY(calc(-50% + ${nudge}px))` }}
        className={`hero-rotulo absolute top-1/2 w-max transition-opacity duration-300 ${
          sempre ? "hero-rotulo--sempre" : ""
        } ${
          side === "right" ? "left-[14px]" : "right-[14px]"
        } ${active ? "opacity-100" : "opacity-50"}`}
      >
        <span
          className={`block text-[13px] leading-4 font-medium ${active ? "text-cream" : "text-muted"}`}
        >
          {city}
        </span>
        {/* Sempre `neutral`: o único laranja do palco é o ponto que acende (a
            regra do `Chip` reserva o `brand` ao método principal, e sete chips
            laranja fariam o destaque deixar de destacar). */}
        <Chip tone="neutral">{chip}</Chip>
      </span>
    </span>
  );
}
