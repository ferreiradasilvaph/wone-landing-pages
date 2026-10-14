import type { ReactNode } from "react";

/* A grade é a mesma nas quatro variantes: 12 colunas a partir de `lg`, uma
   coluna só abaixo disso. O que muda é onde cada peça cai. */
const GRADE = "grid lg:grid-cols-12 gap-x-8 gap-y-6";
/* A demo ao lado começa na coluna 6 (Highlights, FAQ) ou na 7 (Lista de espera,
   e a tese, que precisa de uma coluna a mais para as três linhas caberem).
   Abaixo de `lg` as duas são a mesma coisa: uma coluna. */
const LATERAL = "lg:col-start-6 lg:col-span-7";
const LATERAL_7 = "lg:col-start-7 lg:col-span-6";
/* Empilhada no celular, a demo precisa dos 40px de "cabeçalho → demo" da régua.
   Os 24px vêm do `gap-y-6` da grade; estes 16 completam a conta. */
const ASIDE_CELULAR = "mt-4 lg:mt-0";

type SectionHeadProps = {
  /** Vai no bloco do título: é a âncora de navegação da seção. */
  id: string;
  kicker: string;
  title?: string;
  /** Só na variante D: as três linhas da tese, a terceira em laranja. */
  titleLines?: readonly [string, string, string];
  lead?: string;
  variant: "A" | "B" | "C" | "D";
  /** Acompanha um título com palavra em caixa alta ("INTERNACIONAL"). */
  caps?: boolean;
  /** Coluna de texto mais estreita (4 em vez de 5), nas variantes B e D. */
  narrow?: boolean;
  /**
   * Em que coluna a demo ao lado começa. 6 é o padrão (Highlights, FAQ); a
   * Lista de espera pede 7 — a espec dá o formulário às colunas 7–12, e com 6
   * ele encostava na lista "termo — complemento" ao lado (30px de vão medidos).
   */
  asideStart?: 6 | 7;
  children?: ReactNode;
  aside?: ReactNode;
  /** Índice numerado da variante C (o `hidden lg:block` é de quem passa). */
  index?: ReactNode;
};

/**
 * O cabeçalho de toda seção, nas quatro variantes do sistema. Substituiu o
 * `SectionHeading` da page.tsx e os cabeçalhos ad hoc de cada seção, que eram
 * a origem do "tique de template": a mesma pilha centralizada repetida onze
 * vezes.
 *
 * Anatomia comum: kicker (traço laranja + caixa alta) → H2 → lead. O `<h2>` é
 * o ÚNICO heading do bloco — o kicker é um `<p>`, não um h3 —, nada é
 * centralizado, nada anima na entrada e nenhum H2 leva palavra colorida (a
 * única exceção da página é a terceira linha da tese, variante D).
 *
 *  A — título à esquerda (cols 1–7) e lead ao lado, com barra laranja, nas
 *      cols 9–12 centrado ao título; a demo vem larga embaixo.
 *      Usada por Pagamentos, Análises e Premiações.
 *  B — coluna de texto estreita (1–5, ou 1–4 com `narrow`) e demo alta ao lado
 *      (`aside`, cols 6–12, ou 7–12 com `asideStart`) alinhada ao topo da
 *      grade, na linha do kicker. Usada por Highlights, FAQ e Lista de espera.
 *  C — invertida: kicker e índice numerado nas cols 1–4, título e lead nas
 *      6–12 com o topo na mesma linha do kicker; a demo vem embaixo.
 *      Usada por Recursos.
 *  D — a tese: três linhas em `t-h2-tese`, a última em laranja, nas cols 1–6,
 *      com o palco nas 7–12. Uma vez na página — Como funciona.
 *
 * Abaixo de `lg` tudo vira uma coluna na ordem kicker → título → lead →
 * children → aside, que é a ordem em que a página é lida no celular.
 */
export function SectionHead({
  id,
  kicker,
  title,
  titleLines,
  lead,
  variant,
  caps,
  narrow,
  asideStart,
  children,
  aside,
  index,
}: SectionHeadProps) {
  const h2Caps = caps ? " t-h2-caps" : "";

  /* A tese mora em SEIS colunas, não em cinco. Medido a 1024 (o pior caso, onde
     a coluna é mais estreita e a fonte ainda é grande): a linha mais longa pede
     435px em português e 429 em inglês, e cinco colunas dão 381 — a terceira
     linha, a laranja, partia ao meio e a tese saía em quatro linhas. Seis dão
     464, com folga nos dois idiomas, e o palco ao lado começa na coluna 7. */
  const colunaTexto =
    variant === "D" ? "lg:col-span-6" : narrow ? "lg:col-span-4" : "lg:col-span-5";
  const lateral = (asideStart ?? (variant === "D" ? 7 : 6)) === 7 ? LATERAL_7 : LATERAL;

  const titulo =
    variant === "D" && titleLines ? (
      <h2 className={`t-h2-tese text-cream${h2Caps}`}>
        <span className="block">{titleLines[0]}</span>
        <span className="block">{titleLines[1]}</span>
        {/* A terceira linha é a única cor em título fora do h1: sobre preto, um
            cinza fraco aqui leria como texto desabilitado, não como ênfase. */}
        <span className="block text-brand">{titleLines[2]}</span>
      </h2>
    ) : (
      /* Sem `max-w` na variante A: a coluna de 7 já limita o título a 696px
         (medido a 1440, container de 1280 com gap-x-8), e o 44rem=704px que
         morava aqui nunca chegou a valer. Segurança e Premiações saem em três
         linhas porque os títulos têm 56 e 59 caracteres — acima dos 48 que a
         régua de copy dá a duas linhas —, não por causa de largura. */
      <h2 className={`t-h2 text-cream${h2Caps}`}>{title}</h2>
    );

  const marca = <p className="t-kicker mb-6">{kicker}</p>;

  if (variant === "A") {
    return (
      <div className={GRADE}>
        <div id={id} className="scroll-mt-24 lg:col-span-7">
          {marca}
          {titulo}
        </div>
        {lead ? <p className="t-lead-side self-center lg:col-start-9 lg:col-span-4">{lead}</p> : null}
        {children ? <div className="lg:col-span-7">{children}</div> : null}
      </div>
    );
  }

  if (variant === "C") {
    return (
      <div className={GRADE}>
        {/* O id fica no bloco do kicker: nesta variante ele e o título começam
            na mesma linha, e é o kicker que marca o alto do cabeçalho. */}
        <div id={id} className="scroll-mt-24 lg:col-span-4">
          {marca}
          {index}
        </div>
        <div className={lateral}>
          {titulo}
          {lead ? <p className="t-lead mt-6 max-w-[29rem]">{lead}</p> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
        {aside ? <div className={`${ASIDE_CELULAR} ${lateral}`}>{aside}</div> : null}
      </div>
    );
  }

  return (
    <div className={GRADE}>
      <div id={id} className={`scroll-mt-24 ${colunaTexto}`}>
        {marca}
        {titulo}
        {lead ? <p className="t-lead mt-6 max-w-[29rem]">{lead}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
      {aside ? <div className={`${ASIDE_CELULAR} ${lateral}`}>{aside}</div> : null}
    </div>
  );
}
