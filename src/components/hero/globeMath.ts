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
 * OS ÂNGULOS QUE CENTRALIZAM um ponto qualquer da esfera no MEIO do disco, em
 * radianos. É a ponte entre o modelo de voo (`voo.ts`, que fala em lat/lon) e o
 * desenho (que gira em guinada e inclinação): a câmera do voo devolve um ponto,
 * e quem desenha precisa dos dois ângulos.
 *
 * Era uma TABELA (`CENTRA`, uma entrada por capital) até 17/10, e virou função
 * quando a câmera passou a seguir a bolinha: ela está entre duas capitais na
 * maior parte do tempo, e uma tabela de sete entradas não responde por um ponto
 * no meio do Atlântico.
 *
 * NÃO É `λ − λ₀` / `φ − φ₀`, e a diferença é medida: a projeção já traz o ponto
 * para a base com o centro em +Z, e o laço gira primeiro em torno de Y
 * (guinada) e depois em torno de X (inclinação). Centrar nessa ORDEM pede os
 * ângulos do vetor de base, não os da carta:
 *
 *   x₁ = cos(yaw)·x + sen(yaw)·z = 0   →   yaw   = −atan2(x, z)
 *   y₂ = cos(p)·y − sen(p)·z₁   = 0   →   pitch = atan2(y, √(x²+z²))
 *
 * Londres, por exemplo, está a λ−λ₀ = +31,9° e φ−φ₀ = +29,5°, mas quem a põe
 * no centro é yaw −22,7° / pitch +31,9°: a conta ingênua erraria o alvo por
 * 9° de guinada, uns 40px de tela no zoom de 1,8× — e o pino escorregaria para
 * fora do foco, que é exatamente o que uma câmera que ACOMPANHA não faz.
 *
 * O centro da projeção devolve (0, 0) por construção — é o enquadramento em que
 * o servidor pinta o globo, e é de lá que o mergulho de entrada parte.
 */
export function centraliza(lat: number, lon: number) {
  const [x, y, z] = baseVector(lat, lon);
  return {
    yaw: -Math.atan2(x, z),
    pitch: Math.atan2(y, Math.sqrt(x * x + z * z)),
  };
}

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
  EUR: { side: "right", nudge: 10 },
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
}

/* ------------------------------------------------------------------ a rede */

/**
 * As sete pernas da rede, em anel: México → Colômbia → Equador → Brasil →
 * Argentina → Portugal → Reino Unido → México. São os MESMOS sete países dos
 * pinos — a rede não acrescenta mercado nenhum, ela mostra que os sete estão
 * ligados.
 *
 * A ordem do anel é geográfica, não a da tabela: assim nenhuma perna cruza o
 * disco de lado a lado, e a volta se lê como um circuito. A perna que fecha o
 * anel (Londres → Cidade do México) é a única que atravessa o Atlântico por
 * cima, e é ela que diz, sem palavra, que a Europa entrou.
 *
 * ELA MUDOU DE ARQUIVO em 17/10, com a etapa 3 do globo 3D: os arcos deixaram
 * o canvas 2D e viraram linhas de verdade na cena, e a geometria passou a ter
 * dois leitores. Este arquivo já era a casa da geometria compartilhada do
 * globo (a projeção, a espiral, as capitais); a rede é geometria.
 */
export const REDE_PERNAS: [string, string][] = [
  ["MXN", "COP"],
  ["COP", "USD"],
  ["USD", "BRL"],
  ["BRL", "ARS"],
  ["ARS", "EUR"],
  ["EUR", "GBP"],
  ["GBP", "MXN"],
];

/**
 * Os dois países do outro lado do Atlântico, por código de moeda. A rede e o
 * anel do pino os tratam diferente desde 15/10: o dono pediu para a Europa
 * aparecer quando "um ponto liga no outro".
 */
export const EUROPEUS = new Set(["EUR", "GBP"]);

/** Pontos por perna. 22 dá a curva lisa a R 300 sem virar polilinha visível. */
export const REDE_PASSOS = 22;

/**
 * A ELEVAÇÃO da perna no meio do caminho, em fração do raio. É o que ergue o
 * arco do chão sem desgrudá-lo do pino (zero nas duas pontas), e desde a etapa
 * 3 é também a altura em que a BOLINHA e o RASTRO viajam — uma constante, dois
 * leitores, nenhuma chance de a bolinha correr por dentro do próprio arco.
 */
export const REDE_SOBE = 0.035;

/** Vetor de base da capital, memorizado por código (sete entradas). */
const ALVOS = new Map<string, [number, number, number]>();

export function alvo(code: string): [number, number, number] {
  let v = ALVOS.get(code);
  if (!v) {
    const lugar = CAPITAIS[code] ?? { lat: 0, lon: 0 };
    v = baseVector(lugar.lat, lugar.lon);
    ALVOS.set(code, v);
  }
  return v;
}

let REDE: Float32Array | null = null;

/**
 * Os pontos das sete pernas na base da projeção, montados UMA vez (7×23
 * vetores): interpolação esférica entre as duas capitais — o grande-círculo,
 * não a reta da tela — com `REDE_SOBE` de elevação no meio do caminho e zero
 * nas pontas.
 */
/**
 * UM PONTO QUALQUER DE UMA PERNA DA REDE, sem passar pelo buffer.
 *
 * `rede()` devolve as sete pernas já amostradas em 23 passos, que é o que
 * a LINHA precisa. A faísca precisa de outra coisa: a posição num `t`
 * CONTÍNUO, porque ela percorre a perna e um salto de 1/22 por quadro
 * seria um tracejado, não uma faísca. Mesma interpolação de grande
 * círculo e mesma elevação — é a mesma curva, lida em outro lugar.
 */
/**
 * A DIREÇÃO DO SOL no espaço LOCAL da esfera, para um instante do relógio
 * da cena (ver `cena.tempo`).
 *
 * Mora aqui, e não nos dois lugares que a usam, porque é exatamente o tipo
 * de constante que diverge sem ninguém ver: os pontos de terra desenham o
 * terminador com ela e as nuvens decidem com ela qual hemisfério está
 * iluminado. Meio grau de diferença entre as duas põe nuvem no lado da
 * noite, e ninguém vai procurar o defeito numa fórmula copiada.
 *
 * Uma volta em 150 s. O 0,31 em Y é uma inclinação fixa que tira o
 * terminador de cima dos polos: um terminador exatamente meridiano lê como
 * uma fatia cortada, não como um planeta.
 */
export function solXYZ(
  tempo: number,
  fora: [number, number, number],
): [number, number, number] {
  const ang = (tempo / 150) * Math.PI * 2;
  const x = Math.cos(ang) * 0.95;
  const z = Math.sin(ang) * 0.95;
  const y = 0.31;
  const n = Math.hypot(x, y, z);
  fora[0] = x / n;
  fora[1] = y / n;
  fora[2] = z / n;
  return fora;
}

export function naPerna(
  perna: number,
  t: number,
  fora: [number, number, number],
): [number, number, number] {
  const par = REDE_PERNAS[perna % REDE_PERNAS.length];
  const a = alvo(par[0]);
  const b = alvo(par[1]);
  const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(d);
  const so = Math.sin(omega);
  const wa = so < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / so;
  const wb = so < 1e-6 ? t : Math.sin(t * omega) / so;
  const sobe = 1 + REDE_SOBE * Math.sin(Math.PI * t);
  fora[0] = (a[0] * wa + b[0] * wb) * sobe;
  fora[1] = (a[1] * wa + b[1] * wb) * sobe;
  fora[2] = (a[2] * wa + b[2] * wb) * sobe;
  return fora;
}

export function rede(): Float32Array {
  if (REDE) return REDE;
  const n = REDE_PASSOS + 1;
  const out = new Float32Array(REDE_PERNAS.length * n * 3);
  let k = 0;
  for (const [de, para] of REDE_PERNAS) {
    const a = alvo(de);
    const b = alvo(para);
    const d = Math.min(
      1,
      Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
    );
    const omega = Math.acos(d);
    const so = Math.sin(omega);
    for (let s = 0; s < n; s += 1) {
      const t = s / REDE_PASSOS;
      const wa = so < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / so;
      const wb = so < 1e-6 ? t : Math.sin(t * omega) / so;
      const sobe = 1 + REDE_SOBE * Math.sin(Math.PI * t);
      out[k] = (a[0] * wa + b[0] * wb) * sobe;
      out[k + 1] = (a[1] * wa + b[1] * wb) * sobe;
      out[k + 2] = (a[2] * wa + b[2] * wb) * sobe;
      k += 3;
    }
  }
  REDE = out;
  return out;
}
