"use client";

import { Fragment } from "react";
import { useContent } from "@/i18n";

/* --------------------------------------------------------------------------
   Geometria do canvas, em px. Nó de largura fixa é o que torna a posição de
   cada porta aritmética — sem medir o DOM, sem ResizeObserver. É a mesma
   decisão do `FlowEditorDemo`, com os números reduzidos: lá o canvas é a seção
   inteira, aqui ele é a área de tela de um painel de 640px dentro do palco.
   -------------------------------------------------------------------------- */
/* 330 é a largura ÚTIL da tela do painel a 1440, MEDIDA no navegador: 640 de
   painel, menos as duas bordas, menos o trilho de 132, menos o respiro de 16+16
   e a coluna da paleta (122 + 12 de vão). Com 352 o flex encolhia a caixa para
   337 e esticava a altura para 262, e aí o `viewBox` do SVG passava a ser
   escalado enquanto os nós, em HTML, ficavam no lugar: as arestas desencontravam
   das caixas por alguns pixels. Daí a caixa também levar `shrink-0 self-start`,
   e a largura ter de caber de verdade. */
const W = 330;
const H = 252;
const NODE_W = 134;
const NODE_H = 34;
/* As duas colunas e as cinco linhas do funil de exemplo. O vão entre a quarta
   linha e a quinta é maior de propósito: é onde as duas saídas do "Checkout
   PIX" se separam, e os rótulos `sim`/`não` precisam de 34px para caber sobre
   as arestas sem encostar nos nós. */
const COL = [12, 180] as const;
const ROW = [6, 52, 98, 144, 212] as const;

/** Cor de cada categoria, igual à tabela do `FlowEditorDemo`. */
const FLOW_TINT = "#FF7700";
const AI_TINT = "#E879F9";
const SELL_TINT = "#32D583";
const ACCESS_TINT = "#A78BFA";

const EDGE = "rgba(255,255,227,0.16)";
const EDGE_LIT = "rgba(255,119,0,0.55)";

/**
 * O FUNIL DE EXEMPLO dentro da tela do painel, no passo 02.
 *
 * Os cinco nós são `highlights.demos.blocks.flow` — os mesmos que a seção
 * Plataforma roda no editor de verdade —, mais o "Fim" da categoria Fluxo para
 * fechar o ramo condicional. Nenhum nome é cunhado aqui: trocar o idioma
 * traduz o funil.
 *
 * O ramo é o que faz o desenho ler como EDITOR e não como lista: o "Checkout
 * PIX" tem duas saídas, `sim` e `não` (os rótulos de `builder.branchYes/No`), e
 * só a de `sim` leva ao convite. É a mesma lógica que o produto executa.
 *
 * Abaixo de `xl` o canvas sai e entra a pilha vertical de blocos: a 412 o
 * canvas de 352px não cabe na tela do painel sem rolagem horizontal, e o ramo
 * em duas colunas viraria dois nós de 60px. Mesmo caminho do `FlowEditorDemo`.
 */
export function FlowCanvas() {
  const { highlights } = useContent();
  const { flow, categories, builder, aiTag } = highlights.demos.blocks;
  /* "Fim" é o item 5 da categoria Fluxo — o terminal do ramo recusado. */
  const endName = categories[0].items[5].name;

  /** Cada nó: coluna, linha, cor e se leva a etiqueta de IA. */
  const nodes = [
    { name: flow[0], col: 0, row: 0, tint: FLOW_TINT, ai: false },
    { name: flow[1], col: 0, row: 1, tint: AI_TINT, ai: true },
    { name: flow[2], col: 0, row: 2, tint: SELL_TINT, ai: false },
    { name: flow[3], col: 0, row: 3, tint: SELL_TINT, ai: false },
    { name: flow[4], col: 1, row: 4, tint: ACCESS_TINT, ai: false },
    { name: endName, col: 0, row: 4, tint: FLOW_TINT, ai: false },
  ];

  /* O centro horizontal de cada coluna, e as bordas de onde as arestas saem. */
  const cx = (col: number) => COL[col] + NODE_W / 2;
  const bottom = (row: number) => ROW[row] + NODE_H;

  return (
    <div className="relative hidden shrink-0 self-start xl:block" style={{ width: W, height: H }}>
      {/* A malha de pontos é o que faz a área ler como canvas de edição. As
          duas paradas do `radial-gradient` caem no mesmo 1px, então o ponto tem
          borda dura e não existe rampa de cor — não é degradê (mesma nota do
          `FlowEditorDemo`). */}
      <div
        className="absolute inset-0 rounded-field bg-ink-950"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,227,0.07) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      <svg className="absolute inset-0" width={W} height={H} aria-hidden>
        {/* A corrente: três arestas retas entre os quatro primeiros nós. */}
        {[0, 1, 2].map((row) => (
          <line
            key={row}
            x1={cx(0)}
            y1={bottom(row)}
            x2={cx(0)}
            y2={ROW[row + 1]}
            stroke={EDGE_LIT}
            strokeWidth={1.25}
          />
        ))}
        {/* O ramo recusado desce reto para o "Fim" e fica em tom neutro: o
            caminho que a venda NÃO toma não ganha laranja. */}
        <line
          x1={cx(0)}
          y1={bottom(3)}
          x2={cx(0)}
          y2={ROW[4]}
          stroke={EDGE}
          strokeWidth={1.25}
        />
        {/* O ramo aprovado vira à direita, em curva, até o "Gerar convite". */}
        <path
          d={`M ${cx(0)} ${bottom(3)} C ${cx(0)} ${bottom(3) + 20}, ${cx(1)} ${ROW[4] - 20}, ${cx(1)} ${ROW[4]}`}
          fill="none"
          stroke={EDGE_LIT}
          strokeWidth={1.25}
        />
      </svg>

      {/* Os rótulos das duas saídas, sobre as arestas */}
      <span
        className="absolute rounded-full bg-ink-950 px-1 text-[11px] text-faint"
        style={{ left: cx(0) + 6, top: bottom(3) + 6 }}
      >
        {builder.branchNo}
      </span>
      <span
        className="absolute rounded-full bg-ink-950 px-1 text-[11px] text-brand"
        style={{ left: (cx(0) + cx(1)) / 2 - 8, top: bottom(3) + 8 }}
      >
        {builder.branchYes}
      </span>

      {nodes.map((node) => (
        <span
          key={node.name}
          className="absolute flex items-center gap-2 overflow-hidden rounded-field bg-ink-800 pr-2 pl-3"
          style={{ left: COL[node.col], top: ROW[node.row], width: NODE_W, height: NODE_H }}
        >
          {/* A porta de entrada e a cor da categoria, do mesmo vocabulário do
              editor de verdade. */}
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: node.tint }}
          />
          <span className="min-w-0 truncate text-[11px] font-medium text-cream">{node.name}</span>
          {node.ai ? (
            <span className="ml-auto shrink-0 rounded-full bg-cream/8 px-1.5 text-[11px] text-muted">
              {aiTag}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/**
 * O mesmo funil na tela estreita: pilha vertical com fio de 10px entre os nós.
 * Sem ramo e sem "Fim" — a 412 cada nó tem a largura toda da tela do painel, e
 * o que o passo 02 precisa dizer é a ORDEM.
 */
export function FlowStack() {
  const { highlights } = useContent();
  const { flow, aiTag } = highlights.demos.blocks;
  const tint = [FLOW_TINT, AI_TINT, SELL_TINT, SELL_TINT, ACCESS_TINT];

  return (
    <div className="flex flex-col xl:hidden">
      {flow.map((name, index) => (
        <Fragment key={name}>
          {index > 0 ? <span className="ml-[9px] h-2 w-px bg-brand/45" /> : null}
          <span className="flex h-6 items-center gap-2 rounded-field bg-ink-800 pr-2 pl-3">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: tint[index] }}
            />
            <span className="min-w-0 truncate text-[11px] font-medium text-cream">{name}</span>
            {index === 1 ? (
              <span className="ml-auto shrink-0 rounded-full bg-cream/8 px-1.5 text-[11px] text-muted">
                {aiTag}
              </span>
            ) : null}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
