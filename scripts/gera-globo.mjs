/**
 * Gera `src/components/hero/globeDots.ts` — a nuvem de pontos de terra firme do
 * globo do palco do hero.
 *
 *   node scripts/gera-globo.mjs
 *
 * POR QUE UM SCRIPT, E NÃO CONTA EM RUNTIME
 *
 * O globo nasce na PRIMEIRA DOBRA, ao lado do `<h1>` que é o elemento de LCP da
 * página. Varrer a máscara no cliente custaria o `atob` de 8 kB e 18.000
 * consultas antes de o primeiro ponto aparecer. Aqui a varredura é feita uma
 * vez, em build, e o cliente recebe só os ÍNDICES dos candidatos que caíram em
 * terra — o resto ele recalcula com a mesma espiral, em ~0,4 ms dentro de um
 * efeito.
 *
 * O FORMATO (por que índices, e não xyz)
 *
 * Guardar x,y,z em Int16 custaria 30,6 kB de bytes (≈40 kB de base64). O índice
 * do candidato na espiral de Fibonacci é a MESMA informação, e os índices são
 * crescentes: guardados como deltas de 1 byte (com escape em 255 para os vãos
 * dos oceanos) cabem em ~5,1 kB → 6,6 kB de base64. Mais um bitmap de 1 bit por
 * ponto para a costa (0,85 kB). Total ≈ 7,5 kB.
 *
 * A FONTE DOS DADOS
 *
 * `src/components/demos/landMask.ts`, a máscara de 1°×1° do Natural Earth que o
 * globo 3D da demo de checkout já usa — lida aqui como TEXTO, para o script ser
 * node puro, sem loader de TypeScript. Se a máscara mudar de forma, este script
 * falha alto em vez de gerar uma nuvem errada.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = join(RAIZ, "src", "components", "demos", "landMask.ts");
const SAIDA = join(RAIZ, "src", "components", "hero", "globeDots.ts");

/* ---------------------------------------------------------------- máscara */

const fonte = readFileSync(ENTRADA, "utf8");
const bloco = fonte.match(/const MASK_BASE64 = \[([\s\S]*?)\]\.join\(""\);/);
if (!bloco) {
  throw new Error(`MASK_BASE64 não encontrada em ${ENTRADA}`);
}
const pedacos = bloco[1].match(/"([^"]*)"/g);
if (!pedacos || pedacos.length === 0) {
  throw new Error(`MASK_BASE64 vazia em ${ENTRADA}`);
}
const BYTES = Buffer.from(pedacos.map((s) => s.slice(1, -1)).join(""), "base64");

const MASK_W = 360;
const MASK_H = 180;
if (BYTES.length * 8 < MASK_W * MASK_H) {
  throw new Error(`máscara curta: ${BYTES.length} bytes para ${MASK_W * MASK_H} células`);
}

function bit(row, col) {
  const indice = row * MASK_W + col;
  return ((BYTES[indice >> 3] >> (7 - (indice & 7))) & 1) === 1;
}

/**
 * A linha de latitude −16° está corrompida na fonte: 359 das 360 células vêm
 * marcadas como terra. No mapa 2D que este globo substituiu ela saía como uma régua atravessando os dois
 * oceanos; no globo sairia como um anel completo em volta do planeta, que é
 * pior: fica à frente, no meio da América do Sul. A correção é a mesma do mapa
 * antigo: linha com mais de 80% de terra entre −60° e 60° é defeito de
 * dado (nenhum paralelo dessa faixa chega perto disso), e se lê a vizinha. Fora
 * dessa faixa a Antártida enche o paralelo de verdade, e lá o dado está certo.
 */
const LIMITE_DEFEITO = Math.round(MASK_W * 0.8);
const LINHA_BOA = Array.from({ length: MASK_H }, (_, row) => row);
const defeituosas = [];
for (let row = 0; row < MASK_H; row += 1) {
  const lat = 90 - row;
  if (lat > 60 || lat < -60) continue;
  let terra = 0;
  for (let col = 0; col < MASK_W; col += 1) if (bit(row, col)) terra += 1;
  if (terra <= LIMITE_DEFEITO) continue;
  defeituosas.push(lat);
  LINHA_BOA[row] = LINHA_BOA[row - 1] ?? row + 1;
}

/** A mesma conta de `landMask.ts`: linha 0 no polo norte, coluna 0 em 180° W. */
function isLand(lat, lon) {
  const row = Math.min(MASK_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_H)));
  const col = Math.min(MASK_W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * MASK_W)));
  return bit(LINHA_BOA[row], col);
}

/* ------------------------------------------------------------- amostragem */

/**
 * ATENÇÃO: este trecho é gêmeo de `amostra()` em
 * `src/components/hero/globeMath.ts`. O cliente REFAZ esta conta para cada
 * índice que sai daqui — se uma das duas mudar sem a outra, a nuvem sai
 * deslocada da costa. A fórmula é a mesma do globo 3D da demo
 * (`src/components/demos/GlobeScene.tsx`), de onde veio a linguagem visual.
 */
const SAMPLES = 18000;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const STEP = (Math.sqrt((4 * Math.PI) / SAMPLES) * 180) / Math.PI;

function noise(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function amostra(i) {
  const y = 1 - (i / (SAMPLES - 1)) * 2;
  const raio = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN * i;
  const baseLat = (Math.asin(y) * 180) / Math.PI;
  const baseLon =
    (Math.atan2(Math.cos(theta) * raio, Math.sin(theta) * raio) * 180) / Math.PI;
  /* Longitude anda mais rápido perto dos polos: o passo cresce com 1/cos. */
  const span = 1 / Math.max(0.25, Math.cos((baseLat * Math.PI) / 180));
  return {
    lat: baseLat + (noise(i) - 0.5) * STEP * 0.4,
    lon: baseLon + (noise(i + 0.5) - 0.5) * STEP * span * 0.4,
    span,
  };
}

const indices = [];
const costas = [];

for (let i = 0; i < SAMPLES; i += 1) {
  const { lat, lon, span } = amostra(i);
  if (!isLand(lat, lon)) continue;

  const vizinho = span * STEP;
  const costa =
    !isLand(lat + STEP, lon) ||
    !isLand(lat - STEP, lon) ||
    !isLand(lat, lon + vizinho) ||
    !isLand(lat, lon - vizinho);

  indices.push(i);
  costas.push(costa ? 1 : 0);
}

/* ---------------------------------------------------------- codificação */

const deltas = [];
let anterior = -1;
let maiorVao = 0;
let escapes = 0;
for (const i of indices) {
  let d = i - anterior;
  anterior = i;
  if (d > maiorVao) maiorVao = d;
  while (d >= 255) {
    deltas.push(255);
    escapes += 1;
    d -= 255;
  }
  deltas.push(d);
}

const bitmap = Buffer.alloc(Math.ceil(costas.length / 8));
costas.forEach((valor, k) => {
  if (valor) bitmap[k >> 3] |= 1 << (7 - (k & 7));
});

const DELTAS = Buffer.from(deltas).toString("base64");
const COAST = bitmap.toString("base64");
const COSTA_N = costas.reduce((soma, v) => soma + v, 0);

/* ---------------------------------------------------------------- escrita */

const arquivo = `/**
 * GERADO — NÃO EDITE À MÃO. Rode \`node scripts/gera-globo.mjs\`.
 *
 * A nuvem de terra firme do globo do palco do hero: ${indices.length} pontos sorteados numa
 * espiral de Fibonacci de ${SAMPLES} candidatos (passo ${STEP.toFixed(2).replace(".", ",")}°) e filtrados pela máscara
 * de 1°×1° de \`src/components/demos/landMask.ts\` — o mesmo dado do globo 3D da
 * demo de checkout, varrido em tempo de build para não custar nada no cliente.
 *
 * O que vai aqui são os ÍNDICES dos candidatos, em deltas de 1 byte (escape em
 * 255; maior vão ${maiorVao}, ${escapes} escape${escapes === 1 ? "" : "s"}), mais um bitmap de 1 bit por ponto para a
 * costa (${COSTA_N} pontos, ${Math.round((COSTA_N / indices.length) * 100)}%). O cliente recupera lat/lon refazendo a espiral em
 * \`globeMath.amostra()\` — que é gêmea do trecho correspondente do script.
 *
 * Tamanho: ${DELTAS.length} + ${COAST.length} = ${DELTAS.length + COAST.length} caracteres (alvo ≤ 8192).
 */

/** Candidatos da espiral. A conta de \`amostra(i)\` depende deste número. */
export const GLOBE_SAMPLES = ${SAMPLES};

/** Quantos pontos de terra firme saíram da peneira. */
export const GLOBE_COUNT = ${indices.length};

/** Deltas do índice do candidato, 1 byte cada, com escape em 255. */
export const GLOBE_DELTAS =
  "${DELTAS}";

/** 1 bit por ponto, na ordem dos deltas: ligado quando o vizinho já é mar. */
export const GLOBE_COAST =
  "${COAST}";
`;

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, arquivo, "utf8");

console.log(
  `globeDots.ts: ${indices.length} pontos (${COSTA_N} de costa), ` +
    `${deltas.length} bytes de delta + ${bitmap.length} de bitmap = ` +
    `${DELTAS.length + COAST.length} caracteres de base64 (alvo ≤ 8192)`,
);
if (defeituosas.length > 0) {
  console.log(
    `máscara: linha(s) de latitude ${defeituosas.join(", ")}° descartada(s) por ` +
      `excesso de terra (defeito na fonte); lida(s) a vizinha`,
  );
}
