/**
 * A geometria do globo do palco do hero: projeção, a espiral que recupera os
 * pontos de `globeDots.ts` e a posição das quatro capitais.
 *
 * Sem `"use client"` de propósito: as porcentagens de `REPOUSO` são escritas no
 * HTML do servidor (é delas que sai a posição dos pinos antes de o JS desenhar
 * um ponto), e o `HeroGlobe` usa o resto no cliente.
 *
 * PROJEÇÃO — ortográfica, centro fixo em lon −72° / lat −8°, câmera em +Z:
 *
 *   x = cosφ·sen(λ−λ0)
 *   y = cosφ0·senφ − senφ0·cosφ·cos(λ−λ0)
 *   z = senφ0·senφ + cosφ0·cosφ·cos(λ−λ0)      (= cos c; visível se z > 0)
 *   tela: sx = cx + x·R      sy = cy − y·R
 *
 * O centro é o que põe a América do Sul inteira de frente com o México ainda
 * dentro do disco: os quatro países da Wone nunca passam para o outro lado (o
 * menor `z` do envelope inteiro de balanço é 0,669).
 */

import { GLOBE_SAMPLES } from "./globeDots";

const RAD = Math.PI / 180;

/** Centro da projeção. */
export const LAT0 = -8;
export const LON0 = -72;

const COS_LAT0 = Math.cos(LAT0 * RAD);
const SIN_LAT0 = Math.sin(LAT0 * RAD);

/** Capitais dos quatro países onde a Wone cobra, por código de moeda. */
export const CAPITAIS: Record<string, { lat: number; lon: number }> = {
  BRL: { lat: -23.55, lon: -46.63 },
  ARS: { lat: -34.6, lon: -58.38 },
  MXN: { lat: 19.43, lon: -99.13 },
  COP: { lat: 4.71, lon: -74.07 },
};

/** Vetor unitário da coordenada, já na base da projeção (câmera em +Z). */
export function baseVector(lat: number, lon: number): [number, number, number] {
  const phi = lat * RAD;
  const dl = (lon - LON0) * RAD;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosDl = Math.cos(dl);
  return [
    cosPhi * Math.sin(dl),
    COS_LAT0 * sinPhi - SIN_LAT0 * cosPhi * cosDl,
    SIN_LAT0 * sinPhi + COS_LAT0 * cosPhi * cosDl,
  ];
}

/* ------------------------------------------------------------- a espiral */

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Passo médio entre dois candidatos, em graus. */
export const GLOBE_STEP = (Math.sqrt((4 * Math.PI) / GLOBE_SAMPLES) * 180) / Math.PI;

/** Ruído determinístico: mesma nuvem em todo recarregamento, sem `Math.random`. */
export function noise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Lat/lon do candidato `i` da espiral de Fibonacci, com a mesma sacudida de 40%
 * do passo que desmancha as listras contra a grade de 1° da máscara.
 *
 * GÊMEA de `amostra()` em `scripts/gera-globo.mjs`: o script decide QUAIS
 * índices caem em terra, esta função diz ONDE cada um está. Mudar uma sem a
 * outra desloca a nuvem da costa.
 */
export function amostra(i: number) {
  const y = 1 - (i / (GLOBE_SAMPLES - 1)) * 2;
  const raio = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * i;
  const baseLat = (Math.asin(y) * 180) / Math.PI;
  const baseLon =
    (Math.atan2(Math.cos(theta) * raio, Math.sin(theta) * raio) * 180) / Math.PI;
  const span = 1 / Math.max(0.25, Math.cos(baseLat * RAD));
  return {
    lat: baseLat + (noise(i) - 0.5) * GLOBE_STEP * 0.4,
    lon: baseLon + (noise(i + 0.5) - 0.5) * GLOBE_STEP * span * 0.4,
  };
}

/* ------------------------------------------------- pinos: repouso e recuo */

/**
 * Posição de cada capital em % da caixa do globo, na orientação de REPOUSO
 * (balanço e recuo em zero) — é o que o servidor escreve no `style` de cada
 * pino, e vale em qualquer raio. O laço só acrescenta um `transform` com o
 * deslocamento a partir daqui, que nasce em (0,0): nada salta quando o JS
 * assume.
 *
 * Medidas a 1440 (R 300, centro 1230,452): MXN 1101,318 · COP 1219,386 ·
 * BRL 1348,536 · ARS 1288,587.
 */
export const REPOUSO: Record<
  string,
  { left: string; top: string; side: "left" | "right" }
> = {};

/**
 * Recuo para o país ativo, em graus: `0,18·(λ−λ0)` limitado a ±5° de guinada e
 * `0,18·(φ−φ0)` limitado a ±3° de inclinação. É um gesto, não uma volta — os
 * quatro países ficam sempre de frente.
 *
 * Valores: MXN −4,9/+3,0 · COP −0,4/+2,3 · BRL +4,6/−2,8 · ARS +2,5/−3,0.
 */
export const RECUO: Record<string, { yaw: number; pitch: number }> = {};

/** Lado em que o rótulo abre. México e Colômbia à direita; Brasil e Argentina à esquerda. */
const LADO: Record<string, "left" | "right"> = {
  MXN: "right",
  COP: "right",
  BRL: "left",
  ARS: "left",
};

for (const [code, { lat, lon }] of Object.entries(CAPITAIS)) {
  const [x, y] = baseVector(lat, lon);
  REPOUSO[code] = {
    left: `${(((1 + x) / 2) * 100).toFixed(2)}%`,
    top: `${(((1 - y) / 2) * 100).toFixed(2)}%`,
    side: LADO[code] ?? "right",
  };
  RECUO[code] = {
    yaw: Math.max(-5, Math.min(5, 0.18 * (lon - LON0))) * RAD,
    pitch: Math.max(-3, Math.min(3, 0.18 * (lat - LAT0))) * RAD,
  };
}
