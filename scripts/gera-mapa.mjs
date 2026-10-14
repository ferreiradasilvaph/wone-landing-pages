/**
 * Gera `src/components/hero/latamDots.ts` — o mapa pontilhado da América
 * Latina do palco do hero.
 *
 *   node scripts/gera-mapa.mjs
 *
 * POR QUE UM SCRIPT, E NÃO CONTA EM RUNTIME
 *
 * O pedido do dono de 14/10 ("coloque junto a página principal uma prévia do
 * checkout internacional, mostrando um mapa sul-americano, como o da página da
 * Dotfy") põe o mapa na PRIMEIRA DOBRA, ao lado do `<h1>` que é o elemento de
 * LCP da página. Varrer a máscara de terra no cliente custaria o `atob` de 8 kB
 * e ~5.400 consultas antes da primeira pintura; fazer isso aqui, uma vez, deixa
 * no pacote só a string do `d` do `<path>`. Nada é calculado em runtime.
 *
 * COMO O PONTILHADO É FEITO COM DUAS `<path>`
 *
 * Para cada linha de latitude o script acha os TRECHOS de terra contínua e
 * emite um subcaminho horizontal `M<x1> <y>H<x2>`. No SVG o traço leva
 * `stroke-linecap="round"` e `stroke-dasharray="0 5"`: um traço de comprimento
 * zero com ponta redonda vira um ponto, e o padrão de tracejado REINICIA em
 * cada subcaminho — então cada trecho sai como uma fileira de pontos alinhados
 * na grade de 5 unidades (o passo de 1,25°). Células de terra isoladas não
 * sobrevivem ao tracejado (o Chrome pode descartar um subcaminho de
 * comprimento zero quando há `dasharray`), e por isso saem numa segunda
 * `<path>` sem `dasharray`, como `M<x> <y>h0`.
 *
 * PROJEÇÃO (a mesma registrada no cabeçalho do arquivo gerado)
 *
 *   equiretangular, longitude −120°→−30°, latitude 34°→−58°, passo 1,25°,
 *   4 unidades de viewBox por grau → viewBox "0 0 360 368", 5 unidades por
 *   passo. A faixa cobre do meio dos Estados Unidos (o topo esmaece na
 *   máscara do CSS) até a Terra do Fogo, com o México inteiro: ele é um dos
 *   quatro países da Wone e precisa aparecer, mesmo o dono tendo dito
 *   "sul-americano".
 *
 * A FONTE DOS DADOS
 *
 * `src/components/demos/landMask.ts`, a máscara de 1°×1° do Natural Earth que
 * o globo 3D da demo de checkout já usa — lida aqui como TEXTO, para o script
 * ser node puro, sem loader de TypeScript. O `isLand` é reimplementado abaixo
 * com a mesma conta de linha/coluna; se a máscara mudar de forma, este script
 * falha alto em vez de gerar um mapa errado.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = join(RAIZ, "src", "components", "demos", "landMask.ts");
const SAIDA = join(RAIZ, "src", "components", "hero", "latamDots.ts");

/* --------------------------------------------------- recorte e projeção */

const LON_MIN = -120;
const LON_MAX = -30;
const LAT_MAX = 34;
const LAT_MIN = -58;
/**
 * Passo da grade, em graus. 1° é a resolução NATIVA da máscara: qualquer passo
 * maior reamostra o dado e deixa a costa serrilhada, e a 1,25° (o primeiro
 * desenho) o mapa saiu esparso demais ao lado da referência. Subir para 1,5 se
 * algum dia a string passar de 6 kB — hoje ela tem 1,6.
 */
const PASSO = 1;
/** Unidades de viewBox por grau. */
const U = 4;
/** Unidades entre dois pontos vizinhos — é o `gap` do `stroke-dasharray`. */
const VAO = PASSO * U;

const LARGURA = Math.round((LON_MAX - LON_MIN) * U);
const ALTURA = Math.round((LAT_MAX - LAT_MIN) * U);
const COLUNAS = Math.floor((LON_MAX - LON_MIN) / PASSO);
const LINHAS = Math.floor((LAT_MAX - LAT_MIN) / PASSO);

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
const BYTES = Buffer.from(
  pedacos.map((s) => s.slice(1, -1)).join(""),
  "base64",
);

const MASK_W = 360;
const MASK_H = 180;
if (BYTES.length * 8 < MASK_W * MASK_H) {
  throw new Error(
    `máscara curta: ${BYTES.length} bytes para ${MASK_W * MASK_H} células`,
  );
}

function bit(row, col) {
  const indice = row * MASK_W + col;
  return ((BYTES[indice >> 3] >> (7 - (indice & 7))) & 1) === 1;
}

/**
 * UMA linha da máscara está corrompida na fonte, e precisa ser contornada aqui.
 *
 * A linha de latitude −16° traz 359 das 360 células marcadas como terra. O
 * globo 3D da demo de checkout convive com o defeito (lá a linha é um anel de
 * pontos perdido entre milhares); no mapa do hero ela sairia como uma régua
 * pontilhada atravessando a tela de ponta a ponta, por cima do Pacífico e do
 * Atlântico — foi o primeiro desenho que este script produziu.
 *
 * Entre os trópicos e as latitudes médias — a faixa que este mapa recorta —
 * nenhum paralelo passa de 80% de terra: acima desse limite é defeito de dado,
 * não geografia, e o script lê a linha vizinha (um grau ao norte, ~110 km), que
 * é o erro menor dos dois. O teste vale SÓ dentro do recorte (34° a −58°):
 * perto do polo sul a Antártida enche o paralelo de verdade, e lá a linha cheia
 * é o dado certo. Consertar a máscara em si pede regerar o Natural Earth e mexe
 * no dado do globo — não é desta rodada.
 */
const LIMITE_DEFEITO = Math.round(MASK_W * 0.8);
const ROW_TOPO = Math.floor(90 - LAT_MAX);
const ROW_BASE = Math.floor(90 - LAT_MIN);
const LINHA_BOA = Array.from({ length: MASK_H }, (_, row) => row);
const defeituosas = [];
for (let row = ROW_TOPO; row <= Math.min(MASK_H - 1, ROW_BASE); row += 1) {
  let terra = 0;
  for (let col = 0; col < MASK_W; col += 1) if (bit(row, col)) terra += 1;
  if (terra <= LIMITE_DEFEITO) continue;
  defeituosas.push(90 - row);
  // A vizinha de cima primeiro (já validada nesta varredura), a de baixo como
  // reserva se o defeito cair na primeira linha do recorte.
  LINHA_BOA[row] = row > ROW_TOPO ? LINHA_BOA[row - 1] : Math.min(MASK_H - 1, row + 1);
}

/** A mesma conta de `landMask.ts`: linha 0 no polo norte, coluna 0 em 180° W. */
function isLand(lat, lon) {
  const row = Math.min(MASK_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_H)));
  const col = Math.min(MASK_W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * MASK_W)));
  return bit(LINHA_BOA[row], col);
}

/* ---------------------------------------------------------------- varredura */

const trechos = [];
const pontos = [];

for (let linha = 0; linha <= LINHAS; linha += 1) {
  const lat = LAT_MAX - linha * PASSO;
  const y = linha * VAO;
  if (y > ALTURA) break;

  let inicio = -1;
  for (let coluna = 0; coluna <= COLUNAS + 1; coluna += 1) {
    const lon = LON_MIN + coluna * PASSO;
    const terra = coluna <= COLUNAS && isLand(lat, lon);

    if (terra && inicio < 0) inicio = coluna;
    if (!terra && inicio >= 0) {
      const x1 = inicio * VAO;
      const x2 = (coluna - 1) * VAO;
      // Uma célula sozinha não tem comprimento para o tracejado morder: vai na
      // path sem `dasharray`, como subcaminho de comprimento zero.
      if (x2 > x1) trechos.push(`M${x1} ${y}H${x2}`);
      else pontos.push(`M${x1} ${y}h0`);
      inicio = -1;
    }
  }
}

const RUNS = trechos.join("");
const DOTS = pontos.join("");

/* ---------------------------------------------------------------- escrita */

const cabecalho = `/**
 * GERADO — NÃO EDITE À MÃO. Rode \`node scripts/gera-mapa.mjs\`.
 *
 * O mapa pontilhado da América Latina do palco do hero, atendendo ao pedido do
 * dono de 14/10 (uma prévia do checkout internacional na página principal, com
 * um mapa como o da referência). Os pontos vêm da máscara de terra de
 * \`src/components/demos/landMask.ts\` — o mesmo dado do globo 3D da demo de
 * checkout —, varrida em tempo de build para não custar nada no cliente.
 *
 * Projeção: equiretangular, longitude ${LON_MIN}° a ${LON_MAX}°, latitude ${LAT_MAX}° a ${LAT_MIN}°.
 * Passo da grade: ${String(PASSO).replace(".", ",")}° (${VAO} unidades de viewBox entre pontos vizinhos).
 * Escala: ${U} unidades de viewBox por grau → viewBox "0 0 ${LARGURA} ${ALTURA}".
 *
 * \`LATAM_RUNS\` são os trechos de terra contínua, desenhados com
 * \`stroke-dasharray="0 ${VAO}"\` e \`stroke-linecap="round"\`: o tracejado reinicia em
 * cada subcaminho, então cada trecho vira uma fileira de pontos na grade.
 * \`LATAM_DOTS\` são as células isoladas, em subcaminhos de comprimento zero
 * (\`h0\`) numa path SEM \`dasharray\` — com ele o Chrome pode descartá-las.
 *
 * Tamanho: ${RUNS.length} + ${DOTS.length} = ${RUNS.length + DOTS.length} caracteres (${trechos.length} trechos, ${pontos.length} pontos isolados).
 */

/** O viewBox que as duas paths abaixo pressupõem. Razão ${(LARGURA / ALTURA).toFixed(3)}. */
export const LATAM_VIEWBOX = "0 0 ${LARGURA} ${ALTURA}";

/** Vão entre dois pontos vizinhos, em unidades de viewBox: o gap do tracejado. */
export const LATAM_GAP = ${VAO};

/** Trechos de terra contínua — \`stroke-dasharray="0 ${VAO}"\`. */
export const LATAM_RUNS =
  "${RUNS}";

/** Células de terra isoladas — mesma path, sem \`dasharray\`. */
export const LATAM_DOTS =
  "${DOTS}";
`;

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, cabecalho, "utf8");

console.log(
  `latamDots.ts: ${trechos.length} trechos + ${pontos.length} pontos isolados = ` +
    `${RUNS.length + DOTS.length} caracteres de \`d\` (alvo ≤ 6144)`,
);
if (defeituosas.length > 0) {
  console.log(
    `máscara: linha(s) de latitude ${defeituosas.join(", ")}° descartada(s) por ` +
      `excesso de terra (defeito na fonte); lida(s) a vizinha`,
  );
}
