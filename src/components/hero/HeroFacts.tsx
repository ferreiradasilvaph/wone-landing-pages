"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import type { HeroFact } from "@/i18n/pt";
import { FlagMark } from "../FlagMark";
import { TextLink } from "../TextLink";

/**
 * O PAINEL "O QUE VEM COM A WONE", ao lado do título do hero.
 *
 * Era uma `<ul>` de seis frases paradas. Virou uma lista que o relógio do hero
 * percorre: a cada 3 s uma fileira acende, o ponto laranja dela se estica num
 * traço, um fio de 1px preenche sob ela e a área de detalhe abaixo troca de
 * conteúdo — texto curto MAIS um desenho do próprio fato (as sete bandeiras, os
 * métodos em chips, a bolha do convite, as três vias acendendo, a grade de 28
 * blocos com os 4 de IA, o traço das integrações próprias). É o pedido do dono
 * de 15/10 ("seja mais criativo... o espaço abaixo pode ser preenchido... use
 * animações criativas, funcionais e interativas"), e o que ele preenche é o
 * vão de ~140px que sobrava entre o painel e a fileira de benefícios.
 *
 * NENHUM FATO NOVO. Cada rótulo, detalhe e etiqueta repete o que a tabela de
 * Pagamentos, as garantias, os benefícios do hero ou os passos de Como Funciona
 * já afirmam — o painel só mostra de outra forma.
 *
 * ZERO RELÓGIO PRÓPRIO (regra: um relógio por viewport). O `batida` vem do
 * mesmo `setTimeout` encadeado que troca o país do globo, com os mesmos quatro
 * freios (pausar, movimento reduzido, aba oculta, hero fora da tela). Sem ele
 * nada aqui anda — e por isso a página continua com UM relógio só.
 *
 * ZERO DESLOCAMENTO DE LAYOUT. A área de detalhe tem altura CRAVADA (116px, o
 * item mais alto medido a 13rem de painel: as sete bandeiras mais a linha de
 * ISO, 110px) e o conteúdo dela é absoluto dentro dela — o item mais alto e o
 * mais baixo (a grade de blocos, 84px) ocupam a mesma caixa, então o rodapé do
 * painel e a fileira de benefícios não se movem um pixel quando o item troca.
 * É por essa altura que os `detail` do dicionário são curtos: duas linhas de
 * ~24 caracteres é o que sobra depois do micro-visual de cada item.
 *
 * A ENTRADA é CSS puro, pelas classes `facts-ent-*` (veja `ENT_LINHA` logo
 * abaixo e o bloco no fim do `globals.css`).
 */

/** Os quatro blocos de IA na grade 7×4 — linha 0 col 4, 1/1, 2/5 e 3/2. */
const BLOCOS_IA = [4, 8, 19, 23];
const BLOCOS = 28;

/**
 * A ESCADA DE ENTRADA DO PAINEL (pedido do dono, 15/10: "dê um efeito mais
 * bonitinho quando recarregar a página, nas informações adicionais à direita do
 * hero").
 *
 * Os atrasos são classes de propriedade arbitrária, como no `Hero.tsx`: elas só
 * escrevem `--ent-atraso`, que é o `animation-delay` das regras
 * `html.wone-entrando .facts-ent-*` do `globals.css`. Zero JavaScript — a
 * coreografia é a mesma de toda a home, armada pela classe que o porteiro do
 * `<head>` põe no `<html>` antes da primeira pintura (e que não entra com
 * movimento reduzido).
 *
 * O `<aside>` sobe em 450 ms; cada fileira entra 50 ms depois da anterior, e o
 * ponto laranja dela acende 80 ms depois do próprio texto. A última fileira
 * termina em 700 + 400 = 1.100 ms e o último ponto em 780 + 400 = 1.180 ms,
 * dentro de 1,2 s que é o total da entrada da home.
 */
const ENT_LINHA = [
  "[--ent-atraso:450ms]",
  "[--ent-atraso:500ms]",
  "[--ent-atraso:550ms]",
  "[--ent-atraso:600ms]",
  "[--ent-atraso:650ms]",
  "[--ent-atraso:700ms]",
];
const ENT_PONTO = [
  "[--ent-atraso:530ms]",
  "[--ent-atraso:580ms]",
  "[--ent-atraso:630ms]",
  "[--ent-atraso:680ms]",
  "[--ent-atraso:730ms]",
  "[--ent-atraso:780ms]",
];
/** O detalhe e o link entram por último, depois da escada toda. */
const ENT_BASE = "[--ent-atraso:800ms]";

/** `--facts-atraso` é o `animation-delay` das classes `facts-*` do globals.css. */
function atraso(ms: number): CSSProperties {
  return { "--facts-atraso": `${ms}ms` } as CSSProperties;
}

/**
 * O micro-visual de cada `kind`, num mapa e não num `switch`: o `Record` sobre
 * a união literal de `HeroFact["kind"]` EXIGE as seis chaves, então um `kind`
 * novo no dicionário quebra o build aqui até ganhar desenho — que é o
 * comportamento que se quer.
 *
 * `anima` é a preferência de movimento já resolvida: quando é `false` nenhuma
 * classe de animação entra, e tudo nasce no estado final (as classes usam
 * `both`, então o estado final é o normal do elemento).
 */
const MICRO: Record<HeroFact["kind"], (fato: HeroFact, anima: boolean) => ReactNode> = {
  /* Sete bandeiras e, abaixo, os sete ISO em 13px. As bandeiras são
     `aria-hidden` por dentro do `FlagMark` — quem carrega a informação é a
     linha de códigos, e o nome de cada país está na tabela de Pagamentos. */
  countries: (fato, anima) => {
    const extra = fato.extra ?? [];
    return (
      <>
        <div className="flex flex-wrap gap-1">
          {extra.map((code, indice) => (
            <span
              key={code}
              className={`inline-flex ${anima ? "facts-surge" : ""}`}
              style={atraso(indice * 55)}
            >
              <FlagMark code={code} className="h-3.5 w-5" />
            </span>
          ))}
        </div>
        <p className="mt-2 text-[13px] leading-5 text-faint">{extra.join(" · ")}</p>
      </>
    );
  },

  /* Os métodos em etiquetas próprias, e não no `Chip` do kit: o chip tem 28px
     de altura e 12px de respiro lateral, e cinco deles em 168px úteis (o painel
     de 13rem menos o `p-5`) viravam três fileiras de 28 — 92px, mais do que a
     área de detalhe pode reservar. Estas têm 22px e o mesmo texto de 13px. */
  methods: (fato, anima) => (
    <div className="flex flex-wrap gap-1">
      {(fato.extra ?? []).map((nome, indice) => (
        <span
          key={nome}
          className={`rounded-full bg-cream/8 px-2 py-px text-[13px] leading-5 text-muted ${
            anima ? "facts-surge" : ""
          }`}
          style={atraso(indice * 60)}
        >
          {nome}
        </span>
      ))}
    </div>
  ),

  /* A bolha de chat em miniatura com o convite, e o contador do "~3 s" com um
     fio que preenche. O link é encurtado no dicionário ("t.me/+…"): convite de
     uso único não entra em página, e um que entrasse já estaria queimado. */
  invite: (fato, anima) => {
    const extra = fato.extra ?? [];
    return (
      <>
        <p
          className={`inline-block max-w-full rounded-field rounded-bl-[4px] bg-ink-800 px-2.5 py-1.5 text-[13px] leading-5 text-cream ${
            anima ? "facts-surge" : ""
          }`}
        >
          {extra[0]}
        </p>
        <span className="mt-2 flex items-center gap-2">
          <span className="text-[13px] leading-5 text-faint">{extra[1]}</span>
          <span className="h-px flex-1 bg-line-strong">
            <span
              className={`block h-px bg-brand ${anima ? "facts-cresce" : ""}`}
              style={atraso(120)}
            />
          </span>
        </span>
      </>
    );
  },

  /* As três vias, uma por linha: "reconciliação" tem 85px em 13px e as três
     lado a lado não caberiam nos 168px do painel. Os pontos acendem em
     sequência, 180ms entre eles — é a ordem em que as vias agem. */
  confirm: (fato, anima) => (
    <ul className="space-y-1">
      {(fato.extra ?? []).map((via, indice) => (
        <li key={via} className="flex items-center gap-2 text-[13px] leading-5 text-muted">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 shrink-0 rounded-full bg-brand ${anima ? "facts-acende" : ""}`}
            style={atraso(indice * 180)}
          />
          {via}
        </li>
      ))}
    </ul>
  ),

  /* A grade 7×4 dos 28 blocos do editor, 6px cada. Os 24 cinzas entram rápido,
     em ordem de leitura; os 4 laranja acendem depois, um a um, porque é deles
     que a legenda fala. `w-max` e não largura cheia: com `1fr` as colunas se
     esticariam até a borda do painel e os quadradinhos deixariam de ser
     quadrados. */
  blocks: (fato, anima) => (
    <div className="flex items-end gap-2">
      <div aria-hidden className="grid w-max grid-cols-7 gap-1">
        {Array.from({ length: BLOCOS }, (_, indice) => {
          const ia = BLOCOS_IA.indexOf(indice);
          return (
            <span
              key={indice}
              className={`h-1.5 w-1.5 rounded-[1px] ${ia >= 0 ? "bg-brand" : "bg-cream/20"} ${
                anima ? "facts-acende" : ""
              }`}
              style={atraso(ia >= 0 ? 420 + ia * 130 : indice * 12)}
            />
          );
        })}
      </div>
      <p className="text-[13px] leading-5 font-medium text-brand">{(fato.extra ?? [])[0]}</p>
    </div>
  ),

  /* O traço que cresce e, abaixo, as duas linhas do pedido da diretoria: "não é
     via Stripe" dito em número ("0 intermediários") e a taxa por operação. */
  own: (fato, anima) => {
    const extra = fato.extra ?? [];
    return (
      <>
        {/* Traço CURTO, de 40px: um fio da largura do painel se confundiria com
            o fio de progresso que corre sob a fileira ativa, dois dedos acima. */}
        <span className={`block h-px w-10 bg-brand ${anima ? "facts-cresce" : ""}`} />
        <p className="mt-2 text-[13px] leading-5 font-medium text-cream">{extra[0]}</p>
        <p className="text-[13px] leading-5 text-muted">{extra[1]}</p>
      </>
    );
  },
};

/** `:focus-visible` separa o foco do TECLADO do foco que vem de um clique. */
function focoDeTeclado(no: HTMLElement) {
  try {
    return no.matches(":focus-visible");
  } catch {
    /* Navegador sem o pseudo-seletor: trata todo foco como de teclado, que é o
       lado seguro (fixa o item em vez de deixar ele trocar sob a leitura). */
    return true;
  }
}

export function HeroFacts({
  facts,
  moreLabel,
  batida,
  duracaoMs,
  running,
  reduced,
}: {
  facts: readonly HeroFact[];
  /** Rodapé do painel: o rótulo do link para a seção de Recursos. */
  moreLabel: string;
  /** O contador do relógio do hero. Nasce em 0 no servidor e no cliente. */
  batida: number;
  /** Quanto dura a batida atual, para o fio de progresso dizer a verdade. */
  duracaoMs: number;
  /** Os quatro freios do relógio do hero, já resolvidos num booleano. */
  running: boolean;
  reduced: boolean;
}) {
  /** Fixado por clique: vale até um novo clique na MESMA fileira. */
  const [travado, setTravado] = useState<number | null>(null);
  /** Fixado por ponteiro ou foco de teclado: vale enquanto estiver ali. */
  const [apontado, setApontado] = useState<number | null>(null);

  const manual = travado ?? apontado;
  const ativo = manual ?? batida % facts.length;
  const fato = facts[ativo];

  /** Movimento reduzido: nada anima, e o painel fica parado no item 0. */
  const anima = !reduced;
  /** O fio só conta tempo quando há tempo correndo: automático e relógio vivo. */
  const fio = manual === null && running && anima;

  return (
    <>
      {/* A lista. `onPointerLeave` aqui e não em cada fileira: andar de uma
          fileira para a outra não pode devolver o painel ao automático por um
          quadro. */}
      <ul className="mt-3" onPointerLeave={() => setApontado(null)}>
        {facts.map((item, indice) => {
          const aceso = indice === ativo;
          return (
            <li
              key={item.kind}
              className={`facts-ent-linha relative border-b border-line ${ENT_LINHA[indice] ?? ""}`}
            >
              <button
                type="button"
                aria-pressed={aceso}
                onClick={() => {
                  /* Segundo clique na mesma fileira solta o painel. No toque não
                     há ponteiro parado em cima para devolver o automático, então
                     `apontado` também sai — senão o item ficaria preso para
                     sempre no celular. */
                  if (travado === indice) {
                    setTravado(null);
                    setApontado(null);
                    return;
                  }
                  setTravado(indice);
                }}
                /* `pointerType`: só o MOUSE fixa por passagem. No toque o
                   navegador emula um `pointerenter` antes do clique, e sem este
                   teste o primeiro toque já fixaria o item — aí o próprio clique
                   não teria o que soltar. */
                onPointerEnter={(evento) => {
                  if (evento.pointerType === "mouse") setApontado(indice);
                }}
                onFocus={(evento) => {
                  if (focoDeTeclado(evento.currentTarget)) setApontado(indice);
                }}
                onBlur={() => setApontado((atual) => (atual === indice ? null : atual))}
                /* 44px de alvo (`min-h-11`), o mínimo do portão. O `py-1` só
                   abre respiro no rótulo de DUAS linhas (48px): na de uma linha
                   quem manda é o piso de 44. Era `py-2`, e os 8px a mais em
                   quatro das seis fileiras punham o pé do painel em cima da
                   fileira de benefícios numa janela de 900 de altura. */
                className="flex min-h-11 w-full items-center gap-2.5 py-1 text-left text-[14px] leading-5 transition-colors"
              >
                {/* O PONTO QUE VIRA TRAÇO. A caixa tem os 18px do traço
                    reservados desde sempre e o ponto mora na borda esquerda
                    dela: a escala é só `transform` com origem à esquerda, então
                    o rótulo ao lado não anda um pixel quando o item acende.
                    É a CAIXA que acende na entrada, e não o ponto: a escala de
                    entrada e a do traço são a mesma propriedade, e no item
                    ativo o `fill-mode` da animação seguraria o `scale-x-[3]`
                    para fora do ar. */}
                <span
                  aria-hidden
                  className={`facts-ent-ponto relative h-1.5 w-[18px] shrink-0 ${ENT_PONTO[indice] ?? ""}`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1.5 origin-left rounded-full bg-brand transition-[transform,opacity] duration-300 ${
                      aceso ? "scale-x-[3]" : "opacity-55"
                    }`}
                  />
                </span>
                <span className={aceso ? "text-cream" : "text-muted"}>{item.label}</span>
              </button>

              {/* O fio de progresso: 1px laranja sobre a linha divisória, 3 s de
                  preenchimento. `key={batida}` é o que o faz recomeçar do zero a
                  cada passo do relógio — remontar o nó reinicia a animação. */}
              {aceso && fio ? (
                <span
                  key={batida}
                  aria-hidden
                  className="facts-fio absolute -bottom-px left-0 h-px w-full bg-brand"
                  style={{ "--facts-dur": `${duracaoMs}ms` } as CSSProperties}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* A ÁREA DE DETALHE, de altura cravada.
          `aria-live` SÓ quando foi a pessoa que escolheu a fileira: trocar de
          item com o teclado tem de ser anunciado, senão o botão muda um texto
          que o leitor de tela não vê. O avanço automático fica em `off` — um
          painel que se anuncia sozinho a cada 3 s interrompe a leitura de quem
          navega pelo cursor virtual sem nunca ter focado nada aqui (é a mesma
          razão pela qual o `StageStatus` do globo é `aria-hidden`). */}
      <div
        aria-live={manual === null ? "off" : "polite"}
        className={`facts-ent-base relative mt-3 h-[7.25rem] ${ENT_BASE}`}
      >
        <div key={ativo} className={`absolute inset-0 ${anima ? "facts-entra" : ""}`}>
          <p className="text-[13px] leading-5 text-muted">{fato.detail}</p>
          <div className="mt-2">{MICRO[fato.kind](fato, anima)}</div>
        </div>
      </div>

      {/* O rodapé: o único link do painel, no tamanho do kit (o `TEXT_LINK` já
          traz os 15px — não se sobrescreve um utilitário de tamanho com outro
          do mesmo tipo, que quem ganha passa a depender da ordem do CSS
          gerado). O `href` fica em português nos dois idiomas: âncora é valor
          técnico, como no `nav`. O pseudo-elemento leva o alvo do link de 23
          para 47px sem ocupar espaço no layout — a mesma solução do "Ver como
          funciona" ali ao lado. */}
      <div className={`facts-ent-base mt-3 border-t border-line pt-3 ${ENT_BASE}`}>
        <TextLink
          href="#recursos"
          className="relative before:absolute before:inset-x-0 before:-inset-y-[12px] before:content-['']"
        >
          {moreLabel}
        </TextLink>
      </div>
    </>
  );
}
