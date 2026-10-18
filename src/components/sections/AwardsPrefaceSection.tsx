"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useContent } from "@/i18n";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";
import { TextLink } from "@/components/TextLink";
import { useContagem } from "@/lib/useContagem";

/* --------------------------------------------------------------------------
   A TRILHA — os números do percurso

   Os quatro estão aqui e no `leva1.css`, e isso é deliberado: o CSS precisa
   deles para o `animation-delay` dos pinos e o componente precisa deles para
   saber quando cada numeral começa a contar. São um fato só escrito em dois
   lugares (o `--atraso` é escrito AQUI e lido lá, para não divergirem na
   metade que importa).

   PARTIDA + 3 × PERNA = 1.925 ms é quando a bolinha chega no 1M; a última
   contagem termina 900 ms depois, e é esse o fim do relógio da seção.
   -------------------------------------------------------------------------- */
/** Quanto a bolinha leva para cruzar a régua inteira (o CSS tem o mesmo). */
const PERCURSO_MS = 2200;
/* Os pinos ficam nos centros das quatro colunas — 12,5%, 37,5%, 62,5% e 87,5%
   da régua —, e a travessia é LINEAR (ver `leva1.css`): então a fração da
   largura é a fração do tempo, e os dois números abaixo saem da geometria em
   vez de serem calibrados à mão. */
/** Onde está o primeiro pino, em tempo: 12,5% do percurso. */
const PARTIDA_MS = PERCURSO_MS * 0.125;
/** De um pino ao seguinte: 25% da régua. */
const PERNA_MS = PERCURSO_MS * 0.25;
/** Quanto dura a contagem de um numeral, a partir da chegada da bolinha. */
const CONTAGEM_MS = 900;
/** O relógio da seção inteira. */
const RELOGIO_MS = PARTIDA_MS + 3 * PERNA_MS + CONTAGEM_MS;
/** Inclinação máxima de uma placa sob o cursor, em graus. */
const INCLINA = 4;

/** Saída rápida, chegada mansa — a curva de sempre, agora em aritmética. */
const suave = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u);

/**
 * O marco em notação curta, do jeito que o dicionário o escreve: "10K", "1M".
 *
 * O numeral do marco é texto do dicionário (`tier`) e o valor é número
 * (`amount`) — os dois já existiam, e o comentário de `awards.items` manda
 * mexer nos dois juntos. A contagem acontece sobre o NÚMERO e é formatada
 * aqui; o último quadro, porém, é sempre o `tier` literal (ver `numeral`
 * abaixo), então nenhuma afirmação da página passa por esta função.
 *
 * O caminho até o milhão atravessa a casa dos milhares: o quarto marco conta
 * 0K → 999K → 1M, que é a própria tese da seção vista num numeral.
 */
const curto = (valor: number) =>
  valor >= 1_000_000
    ? `${Math.round(valor / 1_000_000)}M`
    : `${Math.round(valor / 1000)}K`;

/**
 * O PREFÁCIO DA VITRINE, logo abaixo do hero.
 *
 * Pedido do dono de 15/10, literal: "crie uma sessão adicional abaixo dos
 * botões lista de espera e ver como funciona (...) uma espécie de prefácio de
 * alguma sessão da página. escolha você a sessão que ficará mais atrativa".
 *
 * A seção escolhida é PREMIAÇÕES, e a escolha tem motivo: é a mais aspiracional
 * da página — troféus de acrílico cristal e joias que chegam na casa de quem
 * vende — e a única que o visitante não consegue imaginar sozinho a partir do
 * nome. As outras candidatas (Pagamentos, Como funciona) o hero já prometeu nas
 * primeiras linhas.
 *
 * Três decisões que a mantêm PREFÁCIO, e não uma segunda vitrine:
 *
 *  - o fundo é o mesmo `--floor` da vitrine, o único tom fora da escala ink da
 *    página: o prefácio PERTENCE a ela, e ao rolar até Premiações o leitor
 *    reconhece o chão;
 *  - não tem âncora no nav (`premios-previa` existe só para o header saber que
 *    seção está à vista): um prefácio que vira item de menu deixa de ser
 *    prefácio e passa a competir com o destino;
 *  - nada aqui é novo além do texto. Os quatro marcos — numeral, linha de
 *    faturamento, item físico e ilustração — saem de `awards.items`, a mesma
 *    lista que a vitrine desenha mais abaixo. Um marco, um lugar.
 *
 * O QUE MUDOU EM 18/10 (leva 1 do pacote criativo): a seção ganhou o PERCURSO
 * que o título dela promete. "O caminho até o milhão tem quatro paradas" era
 * uma frase em cima de quatro células que não se tocavam; agora existe a
 * trilha, e a bolinha do hero — o cometa laranja — a percorre uma vez, da
 * esquerda para a direita, desenhando o fio e acendendo cada parada ao passar:
 * o pino fica, o numeral sobe de 45% para creme pleno e conta a partir do
 * zero, a linha de faturamento entra.
 *
 * O comentário anterior dizia "sem animação de entrada: a coreografia de
 * abertura é só do hero". A frase era da etapa em que a página tinha relógios
 * decorativos espalhados e o hero era a única coisa viva; o pedido de 18/10 é
 * o oposto ("a mesma criatividade do globo para o resto da página"). O que se
 * mantém dela é o essencial: UM gesto, uma vez só, com o objeto no centro — o
 * que impressiona continua sendo o troféu, não a moldura. Sem card, sem
 * sombra, sem blur, sem sheen.
 */
export function AwardsPrefaceSection() {
  const { awards, awardsPreface } = useContent();
  const regua = useRef<HTMLUListElement>(null);
  /* Um relógio para a seção: a trilha (em CSS) e as quatro contagens (aqui)
     leem a mesma linha do tempo. Ver `useContagem` para o arme e os freios. */
  const { t, animar } = useContagem(regua, RELOGIO_MS, { amount: 0.15 });

  /* A INCLINAÇÃO DAS PLACAS AO CURSOR, desktop apenas.

     O ponteiro escreve duas variáveis por célula e o CSS inclina a placa até
     4° (`.trilha-placa`, leva1.css). O rAF existe para coalescer: um
     `pointermove` pode chegar mais de uma vez por quadro, e cada chegada
     escreveria estilo de graça.

     `pointer: fine` é a condição, não a largura: é ela que separa quem TEM um
     ponteiro para seguir de quem tem o dedo. No celular nada disto é
     instalado, nenhuma variável é escrita e a regra do CSS é uma identidade.
     A pergunta vive no efeito, nunca no render — o primeiro render do cliente
     tem de ser igual ao do servidor.

     As quatro caixas são medidas por quadro, e não guardadas: a régua é 4×1 em
     `lg` e 2×2 abaixo, e a página rola. Guardar as medidas pediria invalidar
     no `resize` e na rolagem, o que custa mais do que um `getBoundingClientRect`
     por célula enquanto o cursor está dentro da seção. Fora dela nada roda: o
     `pointerleave` cancela o quadro pendente e devolve as placas ao prumo pela
     transição do CSS. */
  useEffect(() => {
    const lista = regua.current;
    if (!lista) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const escreve = () => {
      frame = 0;
      for (const celula of Array.from(lista.children) as HTMLElement[]) {
        const caixa = celula.getBoundingClientRect();
        if (caixa.width === 0 || caixa.height === 0) continue;
        const dx = (px - (caixa.left + caixa.width / 2)) / (caixa.width / 2);
        const dy = (py - (caixa.top + caixa.height / 2)) / (caixa.height / 2);
        const trava = (v: number) => Math.max(-1, Math.min(1, v)) * INCLINA;
        celula.style.setProperty("--ry", `${trava(dx).toFixed(2)}deg`);
        celula.style.setProperty("--rx", `${(-trava(dy)).toFixed(2)}deg`);
      }
    };

    const aoMover = (evento: PointerEvent) => {
      px = evento.clientX;
      py = evento.clientY;
      if (!frame) frame = requestAnimationFrame(escreve);
    };

    const aoSair = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      for (const celula of Array.from(lista.children) as HTMLElement[]) {
        celula.style.setProperty("--rx", "0deg");
        celula.style.setProperty("--ry", "0deg");
      }
    };

    lista.addEventListener("pointermove", aoMover);
    lista.addEventListener("pointerleave", aoSair);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      lista.removeEventListener("pointermove", aoMover);
      lista.removeEventListener("pointerleave", aoSair);
    };
  }, []);

  /** Quando a bolinha chega no marco `i`. É o `--atraso` do CSS, em ms. */
  const chegada = (i: number) => PARTIDA_MS + i * PERNA_MS;

  /**
   * O numeral do marco, no tempo `t`.
   *
   * O ÚLTIMO QUADRO É O DICIONÁRIO, sempre: `tier` literal, não o resultado de
   * `curto()`. A contagem é um movimento, e nenhum movimento desta página pode
   * ser o que decide o número que fica na tela — se um dia um marco tiver uma
   * notação que a função curta não produz, o que se vê no fim continua sendo o
   * que o dicionário diz.
   */
  const numeral = (indice: number, tier: string, amount: number) => {
    const u = Math.min(1, Math.max(0, (t - chegada(indice)) / CONTAGEM_MS));
    return u >= 1 ? tier : curto(amount * suave(u));
  };

  return (
    <Section anchor="premios-previa" tone="floor" short>
      <SectionHead
        variant="A"
        id="premios-previa"
        kicker={awardsPreface.kicker}
        title={awardsPreface.title}
        lead={awardsPreface.lead}
      />

      {/* O palco da trilha: a régua e o fio que a atravessa moram na mesma
          caixa relativa, porque o fio é absoluto e precisa de uma origem. O
          respiro de cima mudou de lugar (era do `<ul>`) e nada mais. */}
      <div
        className={`relative mt-10 lg:mt-12${animar ? " trilha" : ""}${
          animar && t > 0 ? " trilha--roda" : ""
        }`}
      >
        {/* A TRILHA, a partir de `lg`.

            Abaixo de 1024 a régua é 2×2 e um fio horizontal ligaria "10K" a
            "100K" numa fileira e "500K" a "1M" na outra — duas trilhas onde
            existe uma. No celular ficam a contagem e a entrada das linhas de
            faturamento, que são o que a bolinha ACENDE: o gesto sobrevive sem
            a geometria mentir sobre o caminho.

            `h-0`: a caixa é uma LINHA, não um bloco. Ela não ocupa altura
            nenhuma no layout — o que vive aqui dentro é absoluto, e o fio cai
            no vão de 16px entre a arte do troféu e o numeral (ver
            `.trilha-palco`). */}
        <div
          aria-hidden
          className="trilha-palco pointer-events-none absolute inset-x-0 hidden h-0 lg:block"
        >
          {/* O fio: 1px de creme a 18%, recolhido à esquerda e desenhado pela
              própria bolinha (`scaleX`, mesma duração, mesma curva linear). */}
          <span className="trilha-fio absolute inset-x-0 top-0 h-px bg-cream/18" />

          {/* Os quatro pinos, nos centros das colunas: 12,5%, 37,5%, 62,5% e
              87,5%. Cada um é um ponto que FICA e um anel que abre e apaga —
              o pouso do cometa do hero, do tamanho desta seção. */}
          {awards.items.map((item, indice) => (
            <span
              key={item.tier}
              className="absolute top-0 block h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2"
              style={
                {
                  left: `${12.5 + indice * 25}%`,
                  "--atraso": `${chegada(indice)}ms`,
                } as CSSProperties
              }
            >
              <span className="trilha-pino absolute inset-0 rounded-full bg-brand" />
              <span className="trilha-pulso absolute inset-0 rounded-full border border-brand" />
            </span>
          ))}

          {/* A BOLINHA. O trilho tem a largura da régua, então `translateX`
              de 0 a 100% é o percurso inteiro sem um px medido no DOM — e a
              conta continua certa em qualquer largura de janela. A cauda
              aponta para a esquerda, que é de onde ela veio.

              SÓ EXISTE QUANDO VOA. Ela é a única peça da trilha que não tem
              estado de repouso: o fio cheio, o pino aceso e o valor na tela
              são o desenho pronto desta régua, mas um cometa parado é um ponto
              laranja esquecido na borda esquerda — foi o que apareceu com
              `prefers-reduced-motion` (sem classe, sem animação, `translateX`
              em zero). Sem voo, sem cometa: ele não vai para o HTML do
              servidor nem para quem pediu menos movimento. */}
          {animar && (
            <span className="trilha-bolinha absolute inset-x-0 top-0 block">
              <span className="bolinha">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
          )}
        </div>

        {/* A RÉGUA dos quatro marcos: uma fileira de quatro em `lg`, 2×2 abaixo.
            O que separa as células é régua, não caixa — `border-t` no alto da
            grade e `divide-x` entre elas. O `divide-x` só entra a partir de `lg`
            de propósito: em 2×2 ele daria borda à esquerda da terceira célula, que
            é a primeira da segunda linha. */}
        <ul
          ref={regua}
          className="grid grid-cols-2 border-t border-line lg:grid-cols-4 lg:divide-x lg:divide-line"
        >
          {awards.items.map((item, indice) => (
            /* `trilha-placa` é só a perspectiva da inclinação: o `<li>` é o
               olho de cada troféu, e o `<a>` é o que gira. Quatro perspectivas
               e não uma na régua inteira — com um ponto de fuga só, as placas
               das pontas saem cisalhadas. */
            <li
              key={item.tier}
              className="trilha-placa"
              style={{ "--atraso": `${chegada(indice)}ms` } as CSSProperties}
            >
              {/* O alvo é a célula INTEIRA (bem acima dos 44px do portão), e leva
                  para a vitrine. `group` existe por uma razão só: no hover o
                  numeral vira laranja, e nada mais se move. */}
              <a
                href="#premios"
                className="group flex h-full flex-col items-center px-3 pt-6 pb-7 text-center lg:px-6"
              >
                {/* A ilustração do troféu, em caixa CRAVADA (e não `w-auto`): os
                    quatro arquivos têm 479×662, menos o de 100K, que tem 479×664.
                    Com a largura automática a proporção do atributo e a do arquivo
                    divergiriam em 0,4px na chegada da imagem — com a caixa fixa e
                    `object-contain` não há como mover nada, e a arte continua
                    centrada e inteira. `<img>` cru e não `next/image`, pelo mesmo
                    motivo medido em `WoneMark`. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  width={479}
                  height={664}
                  loading="lazy"
                  decoding="async"
                  className="h-[128px] w-[93px] shrink-0 object-contain lg:h-[168px] lg:w-[122px]"
                />

                {/* O numeral do marco: 2rem em 600, tabular (os quatro ficam com
                    a mesma largura de dígito numa fileira só).

                    A LARGURA É RESERVADA PELO MAIOR VALOR, e não pelo final: o
                    quarto marco atravessa a casa dos milhares antes de virar
                    "1M", e "999K" é mais largo que "1M". Quem segura a caixa é
                    o FANTASMA invisível — `000K`, e não `999K`, porque com
                    `tnum` todo dígito mede igual e o zero é o gabarito que se
                    lê. De quebra, os quatro numerais ficam com a mesma largura
                    na fileira, que é o que uma régua pede.

                    E O NUMERAL QUE CONTA FICA FORA DO FLUXO, por cima do
                    fantasma e centrado por `transform` (`.trilha-num`). As duas
                    coisas são CLS medido, não gosto: lado a lado na mesma
                    célula de grade, a largura da célula passa a ser o maior dos
                    dois a cada quadro; e centrado por `text-align`, o texto
                    anda 10px para a esquerda a cada dígito que entra. Juntas
                    davam 0,00121 no celular. Fora do fluxo e movido por
                    `transform`, zero. */}
                <span className="tnum relative mt-4 inline-block text-[2rem] leading-none font-semibold text-cream transition-colors group-hover:text-brand">
                  <span aria-hidden className="invisible">000K</span>
                  <span className="trilha-num trilha-acende">
                    {numeral(indice, item.tier, item.amount)}
                  </span>
                </span>

                <span className="t-label trilha-valor mt-3">{item.milestoneLine}</span>

                {/* O item físico em duas linhas no máximo: é o que o prefácio
                    promete, e a descrição inteira do troféu é assunto da vitrine. */}
                <span className="mt-2 line-clamp-2 text-[14px] leading-snug text-muted">
                  {item.awardItem}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* A ação de menos peso da página fecha o prefácio: leva à vitrine, que é
          onde o marco se abre inteiro. */}
      <p className="mt-8">
        <TextLink href="#premios">{awardsPreface.link}</TextLink>
      </p>
    </Section>
  );
}
