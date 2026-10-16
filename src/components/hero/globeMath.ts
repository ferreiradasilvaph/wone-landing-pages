/**
 * A geometria do globo do palco do hero: projeção, a espiral que recupera os
 * pontos de `globeDots.ts` e a posição das sete capitais.
 *
 * Sem `"use client"` de propósito: as porcentagens de `REPOUSO` são escritas no
 * HTML do servidor (é delas que sai a posição dos pinos antes de o JS desenhar
 * um ponto), e o `HeroGlobe` usa o resto no cliente.
 *
 * PROJEÇÃO — ortográfica, centro fixo em lon −32° / lat +22°, câmera em +Z:
 *
 *   x = cosφ·sen(λ−λ0)
 *   y = cosφ0·senφ − senφ0·cosφ·cos(λ−λ0)
 *   z = senφ0·senφ + cosφ0·cosφ·cos(λ−λ0)      (= cos c; visível se z > 0)
 *   tela: sx = cx + x·R      sy = cy − y·R
 *
 * O CENTRO MUDOU DUAS VEZES EM 15/10. Era lon −72 / lat −8 (as Américas de
 * frente, as quatro capitais latinas) quando a diretoria pediu "os países do
 * continente europeu" no palco, e foi para lon −40 / lat +15, no Atlântico. No
 * mesmo dia o dono voltou: "quando um ponto ligar no outro, mostre mais os
 * países do continente europeu; melhore a visibilidade deles" — e o centro
 * subiu para lon −32 / lat +22, que traz a Europa para 0,78–0,90 de cos c (de
 * frente, não no limbo) sem perder ninguém do outro lado: a Cidade do México,
 * que é o extremo oeste, fica em 0,46, e Buenos Aires, o extremo sul, em 0,47.
 * Abaixo de ~0,35 o país entraria no encurtamento do limbo, onde o pino deixa
 * de marcar lugar e vira risco na borda.
 */

import { GLOBE_SAMPLES } from "./globeDots";

const RAD = Math.PI / 180;

/** Centro da projeção. */
export const LAT0 = 22;
export const LON0 = -32;

const COS_LAT0 = Math.cos(LAT0 * RAD);
const SIN_LAT0 = Math.sin(LAT0 * RAD);

/**
 * Capitais dos sete países onde a Wone cobra, por código de MOEDA — a mesma
 * chave de `payments.table.countries`, que é de onde o palco tira país, método
 * e valor. Equador paga em dólar, Portugal em euro e Reino Unido em libra, daí
 * USD/EUR/GBP no lugar do código do país.
 */
export const CAPITAIS: Record<string, { lat: number; lon: number }> = {
  BRL: { lat: -23.55, lon: -46.63 },
  ARS: { lat: -34.6, lon: -58.38 },
  MXN: { lat: 19.43, lon: -99.13 },
  COP: { lat: 4.71, lon: -74.07 },
  USD: { lat: -0.18, lon: -78.47 },
  EUR: { lat: 38.72, lon: -9.14 },
  GBP: { lat: 51.51, lon: -0.13 },
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
export function amostra(i: number, samples: number = GLOBE_SAMPLES) {
  /* O passo acompanha o número de candidatos: a espiral europeia tem o dobro
     deles, logo um passo √2 vezes menor — e a sacudida que desmancha as listras
     precisa encolher junto, senão os pontos novos sairiam embaralhados com os
     velhos em vez de adensá-los. */
  const passo =
    samples === GLOBE_SAMPLES
      ? GLOBE_STEP
      : (Math.sqrt((4 * Math.PI) / samples) * 180) / Math.PI;
  const y = 1 - (i / (samples - 1)) * 2;
  const raio = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * i;
  const baseLat = (Math.asin(y) * 180) / Math.PI;
  const baseLon =
    (Math.atan2(Math.cos(theta) * raio, Math.sin(theta) * raio) * 180) / Math.PI;
  const span = 1 / Math.max(0.25, Math.cos(baseLat * RAD));
  return {
    lat: baseLat + (noise(i) - 0.5) * passo * 0.4,
    lon: baseLon + (noise(i + 0.5) - 0.5) * passo * span * 0.4,
  };
}

/**
 * A JANELA DA EUROPA: lon −12..30, lat 35..60 — Portugal, Espanha, França,
 * Irlanda, Reino Unido, Itália, Alemanha e vizinhos.
 *
 * Ela existe em dois lugares e faz duas coisas: no gerador (`gera-globo.mjs`)
 * recorta a segunda espiral, a que dobra a densidade de pontos; aqui, no
 * cliente, marca esses mesmos pontos para o tingimento creme permanente. É o
 * pedido do dono de 15/10 — "mostre mais os países do continente europeu,
 * melhore a visibilidade deles" —, e são as duas pontas da mesma ideia: mais
 * pontos E mais claros, não um dos dois.
 */
export const EUROPA = { lat: [35, 60], lon: [-12, 30] } as const;

export function naEuropa(lat: number, lon: number) {
  return (
    lat >= EUROPA.lat[0] &&
    lat <= EUROPA.lat[1] &&
    lon >= EUROPA.lon[0] &&
    lon <= EUROPA.lon[1]
  );
}

/* ------------------------------------------------- pinos: repouso e recuo */

/**
 * Posição de cada capital em % da caixa do globo, na orientação de REPOUSO
 * (balanço e recuo em zero) — é o que o servidor escreve no `style` de cada
 * pino, e vale em qualquer raio. O laço só acrescenta um `transform` com o
 * deslocamento a partir daqui, que nasce em (0,0): nada salta quando o JS
 * assume.
 *
 * Com o centro final de 15/10 (lon −32 / lat +22), em % da caixa: MXN
 * 6,57/41,45 · USD 13,75/63,05 · COP 16,61/60,05 · ARS 31,71/90,14 · BRL
 * 38,42/85,14 · EUR 65,17/34,50 · GBP 66,44/23,62.
 */
export const REPOUSO: Record<
  string,
  { left: string; top: string; side: "left" | "right"; nudge: number }
> = {};

/**
 * Recuo para o país ativo, em graus: `0,18·(λ−λ0)` limitado a ±2,5° de guinada
 * e ±1,5° de inclinação. É um gesto, não uma volta — os sete países ficam
 * sempre de frente.
 *
 * Os limites caíram pela metade em 15/10, junto com o palco novo: o disco
 * passou de 600 para 760px e sangra pela esquerda da janela, então o mesmo
 * ângulo que antes deslocava 26px agora desloca 33 — e o pino da Cidade do
 * México, que é o mais a oeste, mora a ~32px da borda. Com ±2,5° o pior quadro
 * ainda o deixa dentro da tela.
 */
export const RECUO: Record<string, { yaw: number; pitch: number }> = {};

/**
 * Lado em que o rótulo abre, e o empurrão vertical em px.
 *
 * O lado: o rótulo sempre cresce para DENTRO do disco — nunca para fora da
 * janela, nunca para cima da coluna de texto. Quem está na metade oeste abre à
 * direita (México, Colômbia, Equador) e quem está na leste abre à esquerda
 * (Brasil, Portugal, Reino Unido).
 * A Argentina é a exceção, e é medida: o chip dela é o mais largo dos sete
 * ("Transferência CVU / CBU · $ 38.000", 242px), o pino cai a 37% da caixa, e
 * com a caixa sangrando pela esquerda da janela isso punha o rótulo começando
 * em x −18 a 1440 — cortado pela borda. Abrindo à direita ele nasce em 252, com
 * 26px de folga até o ticket.
 *
 * O empurrão existe por dois pares: Bogotá e Quito ficam a 22px um do outro na
 * tela (são 710 km de verdade), e São Paulo e Buenos Aires a 36px com os
 * rótulos abrindo para lados opostos mas cruzando-se nas pontas. Dois rótulos
 * de 46px de altura nessas distâncias se cobrem. Quem anda é só a CAIXA DE
 * TEXTO, ±14 e ±16px; o ponto fica na coordenada exata, que é o que o mapa
 * promete. Lisboa e Londres, o terceiro par
 * próximo, ficam a 77px e não precisam de nada.
 */
const LADO: Record<string, { side: "left" | "right"; nudge: number }> = {
  MXN: { side: "right", nudge: 0 },
  COP: { side: "right", nudge: -20 },
  USD: { side: "right", nudge: 20 },
  BRL: { side: "left", nudge: -16 },
  ARS: { side: "right", nudge: 16 },
  EUR: { side: "left", nudge: 10 },
  GBP: { side: "left", nudge: -10 },
};

for (const [code, { lat, lon }] of Object.entries(CAPITAIS)) {
  const [x, y] = baseVector(lat, lon);
  const lado = LADO[code] ?? { side: "right" as const, nudge: 0 };
  REPOUSO[code] = {
    left: `${(((1 + x) / 2) * 100).toFixed(2)}%`,
    top: `${(((1 - y) / 2) * 100).toFixed(2)}%`,
    side: lado.side,
    nudge: lado.nudge,
  };
  RECUO[code] = {
    yaw: Math.max(-2.5, Math.min(2.5, 0.18 * (lon - LON0))) * RAD,
    pitch: Math.max(-1.5, Math.min(1.5, 0.18 * (lat - LAT0))) * RAD,
  };
}
