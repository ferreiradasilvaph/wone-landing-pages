import { Chip } from "../Chip";

/**
 * Um país no mapa do palco do hero: o ponto, o anel que acende e o rótulo
 * (cidade + método · valor local).
 *
 * O nó é um ALFINETE de tamanho zero (`h-0 w-0`) posicionado em porcentagem da
 * caixa do mapa — a caixa tem a mesma razão do `viewBox`, então porcentagem da
 * caixa é porcentagem do `viewBox`, e o alfinete cai sobre a coordenada certa
 * em qualquer largura de tela, sem uma linha de JavaScript medindo nada.
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
  active,
  animated,
}: {
  /** Código da moeda — serve de `key` do anel, para ele remontar por ativação. */
  code: string;
  city: string;
  /** "PIX · R$ 197,00", montado em `paises.ts`. */
  chip: string;
  /** Posição do ponto, em % da caixa do mapa. */
  left: string;
  top: string;
  /** Lado em que o rótulo abre. México e Colômbia à direita; Brasil e Argentina à esquerda. */
  side: "left" | "right";
  active: boolean;
  /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
  animated: boolean;
}) {
  return (
    <span className="absolute h-0 w-0" style={{ left, top }}>
      {/* O ponto. Ativo: 8px em laranja cheio; em repouso: 6px a 50%. A
          transição é de cor e tamanho — nada de escala, que brigaria com o
          anel. */}
      <span
        className={`absolute top-1/2 left-1/2 rounded-full bg-brand transition-[background-color,width,height] duration-300 ${
          active ? "-mt-1 -ml-1 h-2 w-2" : "-mt-[3px] -ml-[3px] h-1.5 w-1.5 bg-brand/50"
        }`}
      />

      {/* O anel, só no país da vez: montar é animar, e ele só existe enquanto
          aquele país está ativo — uma volta por ativação, nunca em laço. */}
      {active && animated ? (
        <span
          key={code}
          className="hero-ping absolute top-1/2 left-1/2 -mt-[18px] -ml-[18px] h-9 w-9 rounded-full ring-2 ring-brand"
        />
      ) : null}

      {/* Rótulo. Some abaixo de 1420px, e não mais abaixo de `xl` (1280): com o
          telefone de 620 o mapa passou a 620×606, e a faixa que vai do ponto do
          México (23,2% do frame) ao de São Paulo (81,5%) mede 354px. De 1280 a
          1419 sobram menos de 354 entre a moldura do aparelho e a borda da
          janela, e o rótulo do México nasceria metade atrás do telefone — pior
          que não existir. Nessa faixa quem nomeia o país é o `StageStatus`,
          exatamente como já acontecia a 1024 e no celular.
          1420 e não 1440: media query mede a viewport SEM a barra de rolagem,
          e uma janela de 1440 no Windows reporta 1430. */}
      <span
        className={`absolute top-1/2 hidden w-max -translate-y-1/2 transition-opacity duration-300 min-[1420px]:block ${
          side === "right" ? "left-[14px]" : "right-[14px]"
        } ${active ? "opacity-100" : "opacity-50"}`}
      >
        <span
          className={`block text-[13px] leading-4 font-medium ${active ? "text-cream" : "text-muted"}`}
        >
          {city}
        </span>
        {/* Sempre `neutral`: o único laranja do palco é o ponto que acende (a
            regra do `Chip` reserva o `brand` ao método principal, e quatro
            chips laranja fariam o destaque deixar de destacar). */}
        <Chip tone="neutral">{chip}</Chip>
      </span>
    </span>
  );
}
