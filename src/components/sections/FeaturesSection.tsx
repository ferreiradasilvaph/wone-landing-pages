"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useContent } from "@/i18n";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { Section } from "@/components/Section";
import { SectionHead } from "@/components/SectionHead";

/**
 * Os dez recursos, um por vez, no carrossel (variante C: cabeçalho invertido,
 * demo larga embaixo).
 *
 * O estado de qual card está no centro mora AQUI, e não no carrossel, porque
 * duas peças o usam: o carrossel e o índice 01–10 ao lado do título. O índice é
 * o que a referência põe na coluna estreita da variante invertida — uma lista
 * numerada que também é o sumário da seção: dá para ver os dez nomes sem
 * esperar o rodízio passar por eles.
 *
 * Desde 18/10 ele também é o lugar onde se VÊ o rodízio andar: o marcador de
 * 1px desliza do item que sai para o item que entra (leva 2). Antes, com o
 * carrossel passando de card sozinho a cada 4,5s, o que mudava de cor estava a
 * 600px do que se estava olhando e nada ligava uma coisa à outra.
 *
 * `overflow-x-clip` na seção é o que deixa o carrossel sangrar além do
 * container sem abrir barra de rolagem horizontal na página.
 */
export function FeaturesSection() {
  const { features } = useContent();
  const [active, setActive] = useState(0);

  /** Os dez `<span>` de título do índice: é neles que o marcador se mede. */
  const titulosRef = useRef<(HTMLElement | null)[]>([]);
  /** O marcador deslizante e o trilho (o wrapper) contra o qual ele é medido. */
  const marcadorRef = useRef<HTMLSpanElement>(null);
  const trilhoRef = useRef<HTMLDivElement>(null);
  /** Já está embaixo de algum item? Decide se a próxima troca desliza. */
  const noLugar = useRef(false);

  /**
   * Põe o marcador embaixo do TEXTO do item ativo.
   *
   * Mede o `<span>` do título (não o botão: o botão tem 44px de alvo e o
   * numeral na frente, e sublinhar aquilo daria um fio de 1px correndo por
   * baixo de "01" também) e o wrapper, e escreve três variáveis — `--x`, `--y`
   * e `--w`. O nó tem 1px de largura, então `scaleX(--w)` é a largura do texto:
   * é o que permite um elemento só servir a dez rótulos de larguras
   * diferentes, nos dois idiomas (ver `.feat-marcador` em leva2.css).
   *
   * Duas medidas e três escritas, e SÓ quando o ativo muda ou a janela muda de
   * largura — nunca por quadro. É a mesma mecânica do `.header-sub` do nav.
   */
  const posicionaMarcador = useCallback(() => {
    const barra = marcadorRef.current;
    const trilho = trilhoRef.current;
    if (!barra || !trilho) return;

    /* Abaixo de `lg` o wrapper é `hidden`: não existe índice na tela, e medir
       ali devolveria zeros. `offsetParent === null` é o teste de "está em
       display: none" sem consultar largura de tela em JavaScript. */
    const alvo = trilho.offsetParent === null ? null : titulosRef.current[active];
    const caixa = alvo?.getBoundingClientRect();
    if (!caixa || caixa.width === 0) {
      /* Sai de cena por opacidade, nunca por `display`: o percurso da próxima
         troca parte de onde o marcador está. */
      barra.style.opacity = "0";
      noLugar.current = false;
      return;
    }

    const base = trilho.getBoundingClientRect();
    /* A PRIMEIRA APARIÇÃO NÃO DESLIZA. Sem isto o marcador viria da quina de
       cima do índice até o primeiro item — um percurso que não aconteceu
       (ninguém trocou de card; a página só chegou). Desligar a transição,
       medir e religar custa um reflow forçado, uma vez por visita. */
    if (!noLugar.current) barra.style.transition = "none";
    barra.style.setProperty("--x", `${(caixa.left - base.left).toFixed(1)}px`);
    /* +2px: o fio fica DOIS pixels abaixo da última linha do texto, que é o vão
       que o sublinhado do nav também usa. */
    barra.style.setProperty("--y", `${(caixa.bottom - base.top + 2).toFixed(1)}px`);
    barra.style.setProperty("--w", caixa.width.toFixed(1));
    barra.style.opacity = "1";
    if (!noLugar.current) {
      void barra.offsetWidth;
      barra.style.transition = "";
      noLugar.current = true;
    }
  }, [active]);

  /* A troca de card é o que move o marcador. `features` entra na lista porque
     trocar de idioma troca a largura dos dez rótulos. */
  useEffect(() => {
    posicionaMarcador();
  }, [features, posicionaMarcador]);

  /* Mudou a largura da janela, mudou o lugar do item — e a grade 5×2 do índice
     é das primeiras coisas a se mexer. Coalescido em rAF: uma rajada de eventos
     de `resize` vira UMA medida, e o `frame` guardado é o que impede o
     enfileiramento. Passivo, porque nada aqui cancela nada. */
  useEffect(() => {
    let frame = 0;

    const escreve = () => {
      frame = 0;
      posicionaMarcador();
    };
    const pede = () => {
      if (!frame) frame = requestAnimationFrame(escreve);
    };

    window.addEventListener("resize", pede, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", pede);
    };
  }, [posicionaMarcador]);

  return (
    <Section anchor="recursos" tone="ink-850" className="overflow-x-clip">
      <SectionHead
        variant="C"
        id="recursos"
        kicker={features.kicker}
        title={features.title}
        lead={features.lead}
        index={
          /* Duas colunas de cinco, não dez linhas de 24px: cada item precisa de
             44px de alvo (portão de acessibilidade), e dez linhas de 44 dariam
             440px de índice — mais alto que o palco que ele comanda. Em 5×2 o
             bloco fecha em 220px, com os números em coluna como na referência.

             O `hidden lg:block` (e o `mt-1`) subiram da `<ol>` para o WRAPPER,
             que entrou por causa do marcador: filho de `<ol>` tem de ser
             `<li>`, então o fio não pode morar dentro da lista. O wrapper é o
             `relative` contra o qual as medidas são tomadas, e abaixo de lg ele
             é o que desliga o índice inteiro — a seção ali é uma coluna só, e o
             índice sairia entre o título e o carrossel repetindo o que a barra
             de progresso do próprio carrossel já diz. */
          <div ref={trilhoRef} className="relative mt-1 hidden lg:block">
            <ol className="grid grid-flow-col grid-rows-5 justify-start gap-x-8">
              {features.items.map((item, index) => {
                const isActive = index === active;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-current={isActive}
                      className={`flex h-11 cursor-pointer items-center gap-3 text-[13px] transition-colors ${
                        isActive ? "text-cream" : "text-faint hover:text-cream"
                      }`}
                    >
                      <span className="tnum">{String(index + 1).padStart(2, "0")}</span>
                      <span
                        ref={(node) => {
                          titulosRef.current[index] = node;
                        }}
                      >
                        {item.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {/* UM nó para os dez itens, posicionado por `transform` e esticado
                por `scaleX` — não dez fios trocando de opacidade. Nasce
                invisível e de largura zero (`w-px` + `--w` 0) porque o HTML do
                servidor não sabe onde o item ativo vai cair; a primeira medida
                o põe no lugar e o acende. */}
            <span
              ref={marcadorRef}
              aria-hidden
              className="feat-marcador pointer-events-none absolute top-0 left-0 h-px w-px bg-brand opacity-0"
            />
          </div>
        }
      />

      <div className="mt-10 lg:mt-14">
        <FeatureCarousel active={active} onSelect={setActive} />
      </div>
    </Section>
  );
}
