/**
 * Gera a TEXTURA DE SÃO PAULO À NOITE do hero — `public/images/sp-noite.webp` —
 * mais os metadados `src/components/hero/spMapa.ts` e, quando o peso permite,
 * os contornos de prédio `src/components/hero/spPredios.json`.
 *
 * COMO RODAR
 *
 * O script não usa nenhuma dependência do `package.json`: só builtins do node e
 * o `sharp`, que rasteriza o SVG. O `sharp` é resolvido em três tentativas, na
 * ordem:
 *
 *   1. `SHARP_PATH`    — caminho absoluto para o `sharp` (pasta ou lib/index.js);
 *   2. `require` ancorado no CWD — então basta rodar DE DENTRO da pasta que tem
 *      o `sharp` em `node_modules`:
 *
 *        cd <pasta-com-node_modules>
 *        node C:/Users/User/Documents/wone/scripts/gera-sp.mjs
 *
 *   3. o caminho do scratchpad onde o `sharp` foi instalado em 17/10 (abaixo em
 *      SHARP_FALLBACK) — serve para repetir a geração sem preparar nada.
 *
 * Qualquer um dos três funciona de qualquer CWD; o script resolve os caminhos de
 * saída pela própria localização, nunca pelo CWD.
 *
 * A FONTE DOS DADOS, E A ATRIBUIÇÃO QUE A LICENÇA EXIGE
 *
 * Toda a geometria vem do OpenStreetMap, via Overpass API (sem chave). Os dados
 * do OSM são ODbL: a imagem gerada é um "produced work" e a página que a exibe
 * TEM DE CREDITAR, em texto visível:
 *
 *        © OpenStreetMap contributors
 *
 * O mesmo texto sai no campo `atribuicao` do `spMapa.ts` e do `spPredios.json`,
 * para o rodapé não depender de alguém lembrar deste comentário.
 *
 * Nada aqui vem do Google Maps: imagens de satélite do Google não podem ser
 * usadas fora do SDK deles, e uma foto de satélite diurna (verde, cinza, clara)
 * brigaria com a página. O que a textura faz é a cidade REAL — Tietê, Pinheiros,
 * Marginais, Paulista, Ibirapuera, Congonhas nos lugares certos — pintada na
 * paleta do site, como São Paulo se vê do espaço à noite: uma rede de luz.
 *
 * O cache do Overpass fica FORA do repositório, em `CACHE_DIR` (abaixo). Se o
 * arquivo da categoria já existe, não se baixa de novo — apague a pasta para
 * forçar um download novo.
 *
 * O PIPELINE, EM QUATRO PASSADAS
 *
 *   1. máscaras   — um SVG onde R=água, G=parque, B=aeroporto; rasterizado uma
 *                   vez, dá os três recortes de uma vez só. Serve para o chão
 *                   NÃO receber textura de quarteirão dentro do rio nem do
 *                   parque (é o que faz o Ibirapuera ler como vazio).
 *   2. chão       — buffer cru calculado em JS: ink-950 na base, quarteirões em
 *                   ink-900 modulados por ruído de baixa frequência e pelo campo
 *                   de DENSIDADE DE VIAS (a mancha urbana sai dos dados, não de
 *                   uma elipse chutada), mais um brilho quente mínimo onde a
 *                   densidade é alta.
 *   3. vetor      — um SVG com água, parques, pistas, ferrovia, as vias em três
 *                   camadas de luz e os pontos de cruzamento. Os halos são 2–3
 *                   traçados concêntricos de opacidade decrescente: a página não
 *                   usa blur, e o raster final também não.
 *   4. vinheta    — as bordas voltam ao ink-950 em espaço de pixel, depois de
 *                   tudo composto, para a placa tangente casar com o globo por
 *                   fade. Quadrada, não radial: a placa é quadrada.
 *
 * A PALETA NÃO ESTÁ ESCRITA AQUI
 *
 * Os hex saem de `src/app/globals.css`, lidos como texto. Se um token sumir ou
 * trocar de nome, o script FALHA ALTO em vez de gerar uma imagem fora da paleta.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

const CACHE_DIR = "C:/Users/User/.claude/jobs/091cb0c9/tmp/sp-osm";
const SHARP_FALLBACK =
  "C:/Users/User/AppData/Local/Temp/claude/C--Users-User-Documents-wone/f29f80ba-8256-452d-af76-9f1f744dc940/scratchpad/tools/node_modules/sharp/lib/index.js";

const SAIDA_WEBP = join(RAIZ, "public", "images", "sp-noite.webp");
const SAIDA_MAPA = join(RAIZ, "src", "components", "hero", "spMapa.ts");
const SAIDA_PREDIOS = join(RAIZ, "src", "components", "hero", "spPredios.json");

const ATRIBUICAO = "© OpenStreetMap contributors";

/* =========================================================== geometria =====
 *
 * Projeção equiretangular LOCAL: lon→x e lat→y lineares, com o fator cos(lat)
 * entrando no tamanho da caixa em graus (não na conta por ponto). Numa janela de
 * 22 km a 23,5°S o erro de escala entre o topo e a base da imagem é de ~0,2% —
 * invisível, e em troca a projeção é uma multiplicação, igual no script e no
 * componente que for posicionar a câmera.
 */

const CENTRO = { lat: -23.561, lon: -46.656 }; // Av. Paulista
const LARGURA_KM = 22;
const LADO = 2048;

const MPD_LAT = 110574; // metros por grau de latitude a ~23,5°S
const MPD_LON = 111320 * Math.cos((CENTRO.lat * Math.PI) / 180);

const MEIA_LAT = (LARGURA_KM * 500) / MPD_LAT;
const MEIA_LON = (LARGURA_KM * 500) / MPD_LON;

const BBOX = {
  norte: CENTRO.lat + MEIA_LAT,
  sul: CENTRO.lat - MEIA_LAT,
  oeste: CENTRO.lon - MEIA_LON,
  leste: CENTRO.lon + MEIA_LON,
};

const METROS_POR_PIXEL = (LARGURA_KM * 1000) / LADO;

const ESCALA_X = LADO / (BBOX.leste - BBOX.oeste);
const ESCALA_Y = LADO / (BBOX.norte - BBOX.sul);

const px = (lon) => (lon - BBOX.oeste) * ESCALA_X;
const py = (lat) => (BBOX.norte - lat) * ESCALA_Y;

/** Torre da Wone — FICÇÃO de ilustração. Ver o bloco em `spMapa.ts`. */
const TORRE = { lat: -23.5614, lon: -46.6559, nome: "Torre Wone (simulação)" };

/* ============================================================== paleta =====*/

function leTokens() {
  const css = readFileSync(join(RAIZ, "src", "app", "globals.css"), "utf8");
  const nomes = [
    "ink-950",
    "ink-900",
    "ink-850",
    "ink-800",
    "brand",
    "brand-soft",
    "brand-deep",
    "cream",
  ];
  const fora = {};
  for (const nome of nomes) {
    const m = css.match(
      new RegExp(`--${nome}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`),
    );
    if (!m) throw new Error(`token --${nome} não encontrado em globals.css`);
    fora[nome] = m[1].toLowerCase();
  }
  return fora;
}

const T = leTokens();

const rgb = (hex) => {
  const h = hex.replace("#", "");
  const n =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
};
const hex = ([r, g, b]) =>
  "#" +
  [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
const mix = (a, b, t) => {
  const A = rgb(a);
  const B = rgb(b);
  return hex([
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t,
  ]);
};

const INK950 = rgb(T["ink-950"]);
const INK900 = rgb(T["ink-900"]);
const BRAND = rgb(T.brand);

/* A água fica UM DEGRAU ABAIXO do chão: é assim que São Paulo se vê de cima à
 * noite — o rio não é azul, é a fenda preta entre duas fileiras de luz. */
const COR_AGUA = "#000001";
/* O parque é ink-850 ESFRIADO e sem textura de quarteirão por dentro. O tom
 * nominal é um degrau ACIMA das quadras, mas sem nenhuma rua acesa atravessando
 * ele o parque lê como vazio — que é como o Ibirapuera aparece de noite.
 *
 * "Mais frio" aqui é MUITO pouco. A primeira versão multiplicava o azul por
 * 1,06 e cortava o vermelho em 28%: na imagem, cada parque virou uma mancha
 * NAVY sobre o preto quente da página — chamava mais atenção que as vias, e em
 * azul, que não existe na paleta da Wone. O frio que resta é só o suficiente
 * para o parque não se confundir com uma quadra apagada. */
const COR_PARQUE = (() => {
  const [r, g, b] = rgb(T["ink-850"]);
  return hex([r * 0.68, g * 0.74, b * 0.72]);
})();
const COR_AERO = mix(T["ink-950"], "#000000", 0.45);
const CREAM = T.cream;

const VIA_ESTILO = {
  /* motorway/trunk: o filamento mais aceso, laranja da marca com núcleo creme.
   * As Marginais e os Elevados têm de ser a primeira coisa que se enxerga. */
  expressa: [
    { w: 9.0, c: T["brand-deep"], o: 0.1 },
    { w: 5.0, c: T.brand, o: 0.2 },
    { w: 2.6, c: T["brand-soft"], o: 0.72 },
    { w: 1.0, c: CREAM, o: 0.82 },
  ],
  /* primary: âmbar mais apagado — a Paulista, a Faria Lima, a Rebouças. */
  primaria: [
    { w: 4.6, c: T["brand-deep"], o: 0.14 },
    { w: 2.0, c: mix(T.brand, T["brand-deep"], 0.45), o: 0.58 },
    { w: 0.8, c: CREAM, o: 0.4 },
  ],
  /* secondary/tertiary: creme a baixa opacidade e 1px. Sozinhas quase não se
   * veem; são 20 mil, e é a soma delas que desenha a malha. */
  local: [{ w: 0.9, c: CREAM, o: 0.155 }],
};

/* ================================================================ util =====*/

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (b0, b1, v) => {
  const t = clamp01((v - b0) / (b1 - b0));
  return t * t * (3 - 2 * t);
};

/** Douglas–Peucker em coordenadas planas. `tol` na unidade dos pontos. */
function simplifica(pts, tol) {
  if (pts.length <= 2) return pts;
  const tol2 = tol * tol;
  const manter = new Uint8Array(pts.length);
  manter[0] = 1;
  manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [i0, i1] = pilha.pop();
    const [x0, y0] = pts[i0];
    const [x1, y1] = pts[i1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    let pior = -1;
    let piorD = 0;
    for (let i = i0 + 1; i < i1; i++) {
      const [x, y] = pts[i];
      let d2;
      if (len2 === 0) {
        d2 = (x - x0) ** 2 + (y - y0) ** 2;
      } else {
        let t = ((x - x0) * dx + (y - y0) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        d2 = (x - (x0 + t * dx)) ** 2 + (y - (y0 + t * dy)) ** 2;
      }
      if (d2 > piorD) {
        piorD = d2;
        pior = i;
      }
    }
    if (piorD > tol2 && pior > 0) {
      manter[pior] = 1;
      pilha.push([i0, pior], [pior, i1]);
    }
  }
  return pts.filter((_, i) => manter[i]);
}

/** Área absoluta de um anel, em m², via shoelace em metros locais. */
function areaM2(anel) {
  let s = 0;
  for (let i = 0, n = anel.length; i < n; i++) {
    const a = anel[i];
    const b = anel[(i + 1) % n];
    const ax = a.lon * MPD_LON;
    const ay = a.lat * MPD_LAT;
    const bx = b.lon * MPD_LON;
    const by = b.lat * MPD_LAT;
    s += ax * by - bx * ay;
  }
  return Math.abs(s) / 2;
}

/* =========================================================== overpass =====*/

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const BB = `(${BBOX.sul.toFixed(6)},${BBOX.oeste.toFixed(6)},${BBOX.norte.toFixed(6)},${BBOX.leste.toFixed(6)})`;

const relatorio = { download: [], contagem: {} };

async function overpass(nome, consulta) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const arq = join(CACHE_DIR, `${nome}.json`);
  if (existsSync(arq) && statSync(arq).size > 400) {
    const bytes = statSync(arq).size;
    relatorio.download.push({ nome, bytes, ms: 0, cache: true });
    console.log(`  ${nome}: cache (${(bytes / 1e6).toFixed(2)} MB)`);
    return JSON.parse(readFileSync(arq, "utf8"));
  }
  /* Os dois endpoints públicos devolvem 502/504 quando a fila está cheia — é o
   * caso normal, não um erro de consulta. Backoff exponencial alternando os
   * endpoints; só desiste depois de ESPERAS somadas (~5 min por categoria). */
  const ESPERAS = [0, 6_000, 15_000, 35_000, 70_000, 120_000];
  let ultimo;
  for (let tentativa = 0; tentativa < ESPERAS.length; tentativa++) {
    if (ESPERAS[tentativa] > 0) {
      console.log(`  ${nome}: esperando ${ESPERAS[tentativa] / 1000} s`);
      await new Promise((r) => setTimeout(r, ESPERAS[tentativa]));
    }
    const ep = ENDPOINTS[tentativa % ENDPOINTS.length];
    const t0 = Date.now();
    try {
      const r = await fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "wone-landing-sp-noite/1.0 (mapa noturno da landing)",
        },
        body: "data=" + encodeURIComponent(consulta),
      });
      if (!r.ok) {
        const corpo = (await r.text()).slice(0, 180).replace(/\s+/g, " ");
        throw new Error(`HTTP ${r.status} — ${corpo}`);
      }
      const txt = await r.text();
      const json = JSON.parse(txt);
      if (!Array.isArray(json.elements)) throw new Error("resposta sem elements");
      writeFileSync(arq, txt);
      const ms = Date.now() - t0;
      relatorio.download.push({ nome, bytes: txt.length, ms, cache: false });
      console.log(
        `  ${nome}: ${(txt.length / 1e6).toFixed(2)} MB em ${(ms / 1000).toFixed(1)} s (${json.elements.length} elementos)`,
      );
      return json;
    } catch (e) {
      ultimo = e;
      console.warn(`  ${nome}: falhou em ${ep} — ${e.message}`);
    }
  }
  throw new Error(`Overpass indisponível para "${nome}": ${ultimo?.message}`);
}

/**
 * Nunca houve uma chamada "opcional" aqui: cada categoria é obrigatória para a
 * imagem. A exceção é `marcos`, que só alimenta a lista de `pontos` — se o
 * Overpass não entregar, o mapa sai igual e a lista sai vazia, com aviso.
 */
async function overpassOpcional(nome, consulta) {
  try {
    return await overpass(nome, consulta);
  } catch (e) {
    console.warn(`  ${nome}: SEGUINDO SEM — ${e.message}`);
    relatorio.semMarcos = e.message;
    return { elements: [] };
  }
}

const Q = {
  vias: `[out:json][timeout:600];
way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|secondary|tertiary)$"]${BB};
out geom;`,

  agua: `[out:json][timeout:300];
(
  way["waterway"~"^(river|canal)$"]${BB};
  way["natural"="water"]${BB};
  relation["natural"="water"]${BB};
);
out geom;`,

  verde: `[out:json][timeout:300];
(
  way["leisure"="park"]${BB};
  way["landuse"~"^(forest|grass|cemetery)$"]${BB};
  way["natural"="wood"]${BB};
  relation["leisure"="park"]${BB};
  relation["landuse"~"^(forest|grass|cemetery)$"]${BB};
  relation["natural"="wood"]${BB};
);
out geom;`,

  aero: `[out:json][timeout:300];
(
  way["aeroway"~"^(aerodrome|runway|taxiway|apron)$"]${BB};
  relation["aeroway"="aerodrome"]${BB};
);
out geom;`,

  ferrovia: `[out:json][timeout:300];
way["railway"="rail"]${BB};
out geom;`,

  /* Só o centro de um punhado de feições NOMEADAS, para a lista de `pontos` do
   * `spMapa.ts` sair dos dados e não de coordenada decorada. `out center` devolve
   * um ponto por feição — a resposta tem alguns kB. */
  marcos: `[out:json][timeout:180];
(
  nwr["name"="Avenida Paulista"]["highway"]${BB};
  nwr["name"~"^Museu de Arte de São Paulo"]${BB};
  nwr["name"="Praça da Sé"]${BB};
  nwr["name"~"^Catedral"]["name"~"Sé"]${BB};
  nwr["name"~"Ibirapuera"]["leisure"="park"]${BB};
  nwr["name"~"Congonhas"]["aeroway"="aerodrome"]${BB};
  nwr["name"~"Marginal Tiet"]["highway"]${BB};
  nwr["name"~"Faria Lima"]["highway"]${BB};
  nwr["name"~"^Rio Pinheiros"]["waterway"]${BB};
  nwr["name"~"^Rio Tiet"]["waterway"]${BB};
);
out center;`,

  predios: `[out:json][timeout:300];
(
  way["building"](around:1200,${TORRE.lat},${TORRE.lon});
  relation["building"](around:1200,${TORRE.lat},${TORRE.lon});
);
out geom;`,
};

/* ====================================================== anéis e linhas =====*/

/** Fecha e devolve os anéis de um elemento OSM (way fechada ou relation). */
function aneis(el) {
  if (el.type === "way") {
    const g = el.geometry?.filter(Boolean) ?? [];
    return g.length >= 4 ? [g] : [];
  }
  if (el.type !== "relation" || !Array.isArray(el.members)) return [];
  /* Os anéis de uma multipolygon vêm picados em várias ways; sem costurar, o
   * contorno do Tietê e dos parques grandes sai em pedaços soltos. */
  const pedacos = el.members
    .filter((m) => m.type === "way" && Array.isArray(m.geometry))
    .map((m) => m.geometry.filter(Boolean))
    .filter((g) => g.length >= 2);
  const k = (p) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
  const usados = new Set();
  const fora = [];
  for (let i = 0; i < pedacos.length; i++) {
    if (usados.has(i)) continue;
    usados.add(i);
    let anel = pedacos[i].slice();
    let cresceu = true;
    while (cresceu && k(anel[0]) !== k(anel[anel.length - 1])) {
      cresceu = false;
      for (let j = 0; j < pedacos.length; j++) {
        if (usados.has(j)) continue;
        const p = pedacos[j];
        const fim = k(anel[anel.length - 1]);
        if (k(p[0]) === fim) {
          anel = anel.concat(p.slice(1));
        } else if (k(p[p.length - 1]) === fim) {
          anel = anel.concat(p.slice(0, -1).reverse());
        } else {
          continue;
        }
        usados.add(j);
        cresceu = true;
        break;
      }
    }
    if (anel.length >= 4) fora.push(anel);
  }
  return fora;
}

const foraDaJanela = (g) => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of g) {
    const x = px(p.lon);
    const y = py(p.lat);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return maxX < -8 || minX > LADO + 8 || maxY < -8 || minY > LADO + 8;
};

/** Caminho SVG de um anel/linha já projetado, simplificado e arredondado. */
function caminho(g, { fechado, tol = 0.35 }) {
  let pts = g.map((p) => [px(p.lon), py(p.lat)]);
  pts = simplifica(pts, tol);
  if (pts.length < 2) return "";
  const n = (v) => (Math.round(v * 10) / 10).toString();
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${n(pts[i][0])} ${n(pts[i][1])}`;
  return fechado ? d + "Z" : d;
}

/* ================================================================ main =====*/

console.log("São Paulo à noite — gerando");
console.log(
  `bbox  ${BBOX.sul.toFixed(5)},${BBOX.oeste.toFixed(5)} .. ${BBOX.norte.toFixed(5)},${BBOX.leste.toFixed(5)}  (${LARGURA_KM} km, ${METROS_POR_PIXEL.toFixed(3)} m/px)`,
);
console.log("1. baixando do OpenStreetMap");

const dados = {};
for (const nome of ["vias", "agua", "verde", "aero", "ferrovia", "predios"]) {
  dados[nome] = await overpass(nome, Q[nome]);
}
dados.marcos = await overpassOpcional("marcos", Q.marcos);

/* ---------------------------------------------------------------- vias ---- */

const CLASSE = {
  motorway: "expressa",
  motorway_link: "expressa",
  trunk: "expressa",
  trunk_link: "expressa",
  primary: "primaria",
  secondary: "local",
  tertiary: "local",
};

const linhasVia = { expressa: [], primaria: [], local: [] };
const vertices = new Map(); // chave de nó → nível mais alto que passa por ele
const NIVEL = { local: 1, primaria: 2, expressa: 3 };
const contaVia = { expressa: 0, primaria: 0, local: 0 };
/** Comprimento de via por célula, para o campo de densidade urbana. */
const GC = 256;
const densidade = new Float32Array(GC * GC);

for (const el of dados.vias.elements) {
  if (el.type !== "way" || !Array.isArray(el.geometry)) continue;
  const classe = CLASSE[el.tags?.highway];
  if (!classe) continue;
  const g = el.geometry.filter(Boolean);
  if (g.length < 2 || foraDaJanela(g)) continue;
  const d = caminho(g, { fechado: false });
  if (!d) continue;
  linhasVia[classe].push(d);
  contaVia[classe]++;

  /* O NOME é o que separa um cruzamento de uma emenda. Uma avenida chega ao OSM
   * picada em dezenas de ways, e todas se encontram nos vértices de emenda — se
   * o critério for "dois ways passam aqui", cada Marginal vira um colar de
   * contas, com um ponto de luz a cada cem metros. Cruzamento de verdade é onde
   * se encontram ways com NOMES diferentes. */
  const nome = `${el.tags?.name ?? ""}|${el.tags?.ref ?? ""}`;
  for (const p of g) {
    const chave = `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;
    const atual = vertices.get(chave);
    const nivel = NIVEL[classe];
    if (!atual) {
      vertices.set(chave, { n: 1, nivel, lat: p.lat, lon: p.lon, nome, cruza: false });
    } else {
      atual.n++;
      if (nome !== atual.nome) atual.cruza = true;
      if (nivel > atual.nivel) atual.nivel = nivel;
    }
  }
  /* Densidade: comprimento em pixels jogado nas células do caminho. Vias
   * expressas pesam menos que a malha fina — quem desenha a mancha urbana é a
   * rua, não a via de passagem. */
  const peso = classe === "local" ? 1 : classe === "primaria" ? 0.8 : 0.45;
  for (let i = 1; i < g.length; i++) {
    const x0 = (px(g[i - 1].lon) / LADO) * GC;
    const y0 = (py(g[i - 1].lat) / LADO) * GC;
    const x1 = (px(g[i].lon) / LADO) * GC;
    const y1 = (py(g[i].lat) / LADO) * GC;
    const passos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s < passos; s++) {
      const t = (s + 0.5) / passos;
      const cx = Math.floor(x0 + (x1 - x0) * t);
      const cy = Math.floor(y0 + (y1 - y0) * t);
      if (cx < 0 || cy < 0 || cx >= GC || cy >= GC) continue;
      densidade[cy * GC + cx] += peso / passos * Math.hypot(x1 - x0, y1 - y0);
    }
  }
}

/* ------------------------------------------------- água, verde, pistas ---- */

const poliAgua = [];
const linhaRio = [];
let contaRio = 0;
for (const el of dados.agua.elements) {
  const t = el.tags ?? {};
  if (el.type === "way" && (t.waterway === "river" || t.waterway === "canal")) {
    const g = el.geometry?.filter(Boolean) ?? [];
    if (g.length < 2 || foraDaJanela(g)) continue;
    const d = caminho(g, { fechado: false, tol: 0.5 });
    if (d) {
      linhaRio.push({ d, largo: t.waterway === "river" });
      contaRio++;
    }
    continue;
  }
  if (t.natural !== "water") continue;
  for (const anel of aneis(el)) {
    if (foraDaJanela(anel)) continue;
    if (areaM2(anel) < 2500) continue;
    const d = caminho(anel, { fechado: true, tol: 0.5 });
    if (d) poliAgua.push(d);
  }
}

const poliVerde = [];
const AREA_MIN_VERDE = 15000; // 1,5 ha — abaixo disso é canteiro, não parque
for (const el of dados.verde.elements) {
  for (const anel of aneis(el)) {
    if (foraDaJanela(anel)) continue;
    if (areaM2(anel) < AREA_MIN_VERDE) continue;
    const d = caminho(anel, { fechado: true, tol: 0.6 });
    if (d) poliVerde.push(d);
  }
}

const poliAero = [];
const pistas = [];
const taxi = [];
for (const el of dados.aero.elements) {
  const via = el.tags?.aeroway;
  if (via === "runway" || via === "taxiway") {
    const g = el.geometry?.filter(Boolean) ?? [];
    if (g.length < 2 || foraDaJanela(g)) continue;
    const d = caminho(g, { fechado: false, tol: 0.3 });
    if (d) (via === "runway" ? pistas : taxi).push(d);
    continue;
  }
  if (via !== "aerodrome" && via !== "apron") continue;
  for (const anel of aneis(el)) {
    if (foraDaJanela(anel)) continue;
    if (areaM2(anel) < 20000) continue;
    const d = caminho(anel, { fechado: true, tol: 0.6 });
    if (d) poliAero.push(d);
  }
}

const linhaTrem = [];
for (const el of dados.ferrovia.elements) {
  if (el.type !== "way") continue;
  const g = el.geometry?.filter(Boolean) ?? [];
  if (g.length < 2 || foraDaJanela(g)) continue;
  const d = caminho(g, { fechado: false, tol: 0.5 });
  if (d) linhaTrem.push(d);
}

relatorio.contagem = {
  "vias expressas": contaVia.expressa,
  "vias primárias": contaVia.primaria,
  "vias locais (secondary/tertiary)": contaVia.local,
  "polígonos de água": poliAgua.length,
  "eixos de rio/canal": contaRio,
  "polígonos de parque/mata": poliVerde.length,
  "polígonos de aeroporto/pátio": poliAero.length,
  pistas: pistas.length,
  "taxiways": taxi.length,
  "trechos de ferrovia": linhaTrem.length,
};

/* ====================================================== 1. as máscaras =====
 *
 * Um SVG, três canais: R = água, G = parque, B = aeroporto. Uma rasterização
 * devolve os três recortes, usados no chão para não pôr quarteirão dentro do
 * rio nem do parque.
 */

console.log("2. máscaras de água / parque / aeroporto");

const requireAqui = createRequire(join(process.cwd(), "__gera-sp__.cjs"));
async function carregaSharp() {
  const tentativas = [];
  if (process.env.SHARP_PATH) {
    const p = process.env.SHARP_PATH;
    tentativas.push(p.endsWith(".js") ? p : join(p, "lib", "index.js"));
  }
  try {
    tentativas.push(requireAqui.resolve("sharp"));
  } catch {
    /* sem sharp no CWD — segue para o fallback */
  }
  tentativas.push(SHARP_FALLBACK);
  for (const t of tentativas) {
    try {
      const mod = await import(pathToFileURL(resolve(t)).href);
      return mod.default ?? mod;
    } catch {
      /* tenta a próxima */
    }
  }
  throw new Error(
    `sharp não encontrado. Tentei:\n  ${tentativas.join("\n  ")}\nDefina SHARP_PATH ou rode o script de dentro da pasta que tem o sharp.`,
  );
}
const sharp = await carregaSharp();

const svgMascara = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">
<rect width="${LADO}" height="${LADO}" fill="#000"/>
<g fill="#00f" fill-rule="evenodd">${poliAero.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="#0f0" fill-rule="evenodd">${poliVerde.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="#f00" fill-rule="evenodd">${poliAgua.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="none" stroke="#f00" stroke-linecap="round" stroke-linejoin="round">${linhaRio
  .map((l) => `<path d="${l.d}" stroke-width="${l.largo ? 4.4 : 2.2}"/>`)
  .join("")}</g>
</svg>`;

const { data: mascara } = await sharp(Buffer.from(svgMascara))
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

/* ============================================================ 2. o chão =====*/

console.log("3. chão: quarteirões sobre a densidade de vias");

/* O campo de densidade sai cru e espetado; três passagens de média 3×3 na GRADE
 * (não na imagem) transformam contagem de via em mancha urbana. */
function suavizaGrade(g, vezes) {
  let a = g;
  for (let v = 0; v < vezes; v++) {
    const b = new Float32Array(GC * GC);
    for (let y = 0; y < GC; y++) {
      for (let x = 0; x < GC; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy < 0 || xx < 0 || yy >= GC || xx >= GC) continue;
            s += a[yy * GC + xx];
            n++;
          }
        }
        b[y * GC + x] = s / n;
      }
    }
    a = b;
  }
  return a;
}
const campo = suavizaGrade(densidade, 3);
let p98 = 0;
{
  const ord = Array.from(campo).sort((a, b) => a - b);
  p98 = ord[Math.floor(ord.length * 0.98)] || 1;
}

const amostraCampo = (x, y) => {
  const gx = Math.min(GC - 1.001, Math.max(0, (x / LADO) * GC - 0.5));
  const gy = Math.min(GC - 1.001, Math.max(0, (y / LADO) * GC - 0.5));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const v =
    campo[y0 * GC + x0] * (1 - fx) * (1 - fy) +
    campo[y0 * GC + x0 + 1] * fx * (1 - fy) +
    campo[(y0 + 1) * GC + x0] * (1 - fx) * fy +
    campo[(y0 + 1) * GC + x0 + 1] * fx * fy;
  return clamp01(v / p98);
};

/* Ruído de valor em três oitavas largas. Os "quarteirões" são de baixa
 * frequência de propósito: a 10,7 m/px um quarteirão real tem 9 px, e desenhar
 * isso daria xadrez. O que a textura entrega é a variação de DENSIDADE entre
 * bairros, que é o que se vê de longe. */
function oitava(semente, cels) {
  const r = mulberry32(semente);
  const g = new Float32Array((cels + 1) * (cels + 1));
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const gx = (x / LADO) * cels;
    const gy = (y / LADO) * cels;
    const x0 = Math.min(cels - 1, Math.floor(gx));
    const y0 = Math.min(cels - 1, Math.floor(gy));
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const w = cels + 1;
    return (
      g[y0 * w + x0] * (1 - sx) * (1 - sy) +
      g[y0 * w + x0 + 1] * sx * (1 - sy) +
      g[(y0 + 1) * w + x0] * (1 - sx) * sy +
      g[(y0 + 1) * w + x0 + 1] * sx * sy
    );
  };
}
const n1 = oitava(0x5a17, 14);
const n2 = oitava(0x9e37, 37);
const n3 = oitava(0xc2b2, 96);

const chao = Buffer.alloc(LADO * LADO * 3);
for (let y = 0; y < LADO; y++) {
  for (let x = 0; x < LADO; x++) {
    const i = (y * LADO + x) * 3;
    const u = amostraCampo(x + 0.5, y + 0.5);
    const mAgua = mascara[i] / 255;
    const mVerde = mascara[i + 1] / 255;
    const mAero = mascara[i + 2] / 255;
    const livre = clamp01(1 - Math.max(mAgua, mVerde, mAero));
    const ruido = 0.5 * n1(x, y) + 0.32 * n2(x, y) + 0.18 * n3(x, y);
    /* `t` é quanto a quadra sobe do chão (ink-950) para o ink-900. */
    const t = clamp01(Math.pow(u, 0.72) * (0.4 + 0.6 * ruido) * 1.35) * livre;
    /* O brilho de céu: onde a cidade é mais densa, o preto puxa quase nada para
     * o laranja. Teto em 5% — mais que isso vira névoa alaranjada e come o
     * contraste dos filamentos. */
    const g = Math.pow(u, 1.7) * 0.05 * livre;
    for (let c = 0; c < 3; c++) {
      const base = INK950[c] + (INK900[c] - INK950[c]) * t;
      chao[i + c] = base + (BRAND[c] - base) * g;
    }
  }
}

/* ============================================================ 3. o vetor =====
 *
 * Um SVG só, com as linhas em `<defs>` e desenhadas por `<use>` — cada camada
 * de halo reusa o mesmo `d` em vez de repeti-lo, o que tira megabytes do arquivo
 * que o librsvg tem de engolir.
 */

console.log("4. vetor: água, parques, pistas, vias e pontos de luz");

/* --- pontos de luz nos cruzamentos ---------------------------------------- */
const luzForte = [];
const luzFraca = [];
const sorte = mulberry32(0x7_0ca1);
for (const v of vertices.values()) {
  if (!v.cruza) continue;
  const x = px(v.lon);
  const y = py(v.lat);
  if (x < -4 || y < -4 || x > LADO + 4 || y > LADO + 4) continue;
  const u = amostraCampo(x, y);
  if (v.nivel >= 2) {
    /* Cruzamento de primária ou acima: sempre acende. */
    luzForte.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10, u]);
  } else if (v.n >= 3 && sorte() < 0.1 + 0.55 * Math.pow(u, 1.3)) {
    /* Malha fina: só uma fração, e a fração cresce com a densidade — é o que
     * faz o centro expandido (Sé–Paulista–Faria Lima) brilhar mais. */
    luzFraca.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10, u]);
  }
}
console.log(
  `   pontos de luz: ${luzForte.length} fortes, ${luzFraca.length} fracos`,
);
relatorio.contagem["pontos de luz (fortes/fracos)"] =
  `${luzForte.length} / ${luzFraca.length}`;

const defs = [];
const usos = [];
for (const [classe, estilos] of Object.entries(VIA_ESTILO)) {
  const ds = linhasVia[classe];
  if (!ds.length) continue;
  defs.push(
    `<g id="v-${classe}" fill="none" stroke-linecap="round" stroke-linejoin="round">${ds
      .map((d) => `<path d="${d}"/>`)
      .join("")}</g>`,
  );
  for (const e of estilos) {
    usos.push(
      `<use href="#v-${classe}" stroke="${e.c}" stroke-width="${e.w}" stroke-opacity="${e.o}"/>`,
    );
  }
}

const circulos = (lista, raio, cor, opBase, opGanho) =>
  lista
    .map(
      ([x, y, u]) =>
        `<circle cx="${x}" cy="${y}" r="${raio}" fill="${cor}" fill-opacity="${(opBase + opGanho * u).toFixed(3)}"/>`,
    )
    .join("");

const svgVetor = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">
<defs>${defs.join("")}</defs>

<g fill="${COR_PARQUE}" fill-rule="evenodd">${poliVerde.map((d) => `<path d="${d}"/>`).join("")}</g>

<g fill="${COR_AERO}" fill-rule="evenodd">${poliAero.map((d) => `<path d="${d}"/>`).join("")}</g>

<g fill="${COR_AGUA}" fill-rule="evenodd">${poliAgua.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="none" stroke="${COR_AGUA}" stroke-linecap="round" stroke-linejoin="round">${linhaRio
  .map((l) => `<path d="${l.d}" stroke-width="${l.largo ? 4.4 : 2.0}"/>`)
  .join("")}</g>

<g fill="none" stroke="${CREAM}" stroke-opacity="0.085" stroke-width="0.7" stroke-dasharray="1.6 3.2">${linhaTrem
  .map((d) => `<path d="${d}"/>`)
  .join("")}</g>

<g fill="none" stroke-linecap="butt">${taxi
  .map((d) => `<path d="${d}" stroke="${CREAM}" stroke-opacity="0.07" stroke-width="1.6"/>`)
  .join("")}</g>
<g fill="none" stroke-linecap="butt">${pistas
  .map(
    (d) =>
      `<path d="${d}" stroke="${CREAM}" stroke-opacity="0.3" stroke-width="5.6"/><path d="${d}" stroke="${COR_AERO}" stroke-width="4.2"/>`,
  )
  .join("")}</g>

${usos.join("\n")}

<g>${circulos(luzFraca, 0.75, CREAM, 0.12, 0.22)}</g>
<g>${circulos(luzForte, 2.6, T.brand, 0.015, 0.045)}</g>
<g>${circulos(luzForte, 1.15, CREAM, 0.28, 0.32)}</g>
</svg>`;

console.log(`   SVG do vetor: ${(svgVetor.length / 1e6).toFixed(2)} MB`);

const { data: vetor } = await sharp(Buffer.from(svgVetor), { limitInputPixels: false })
  .raw()
  .toBuffer({ resolveWithObject: true });

/* ====================================== 4. composição, vinheta, arquivo =====*/

console.log("5. compondo, vinheta e webp");

const final = Buffer.alloc(LADO * LADO * 3);
for (let y = 0; y < LADO; y++) {
  const ny = (y + 0.5) / LADO * 2 - 1;
  for (let x = 0; x < LADO; x++) {
    const i3 = (y * LADO + x) * 3;
    const i4 = (y * LADO + x) * 4;
    const a = vetor[i4 + 3] / 255;
    const nx = ((x + 0.5) / LADO) * 2 - 1;
    /* Vinheta QUADRADA: a textura vai numa placa quadrada tangente ao globo, e
     * o fade tem de chegar ao ink-950 na beirada toda, canto incluído. */
    const q = Math.max(Math.abs(nx), Math.abs(ny));
    const f = suave(0.6, 0.995, q);
    for (let c = 0; c < 3; c++) {
      const comp = chao[i3 + c] * (1 - a) + vetor[i4 + c] * a;
      final[i3 + c] = Math.round(comp + (INK950[c] - comp) * f);
    }
  }
}

mkdirSync(dirname(SAIDA_WEBP), { recursive: true });
const TETO = 400 * 1024;
let qualidade = 80;
let webp = null;
for (const q of [80, 76, 72, 68, 64, 60, 56, 52]) {
  webp = await sharp(final, { raw: { width: LADO, height: LADO, channels: 3 } })
    .webp({ quality: q, effort: 6, smartSubsample: true })
    .toBuffer();
  qualidade = q;
  console.log(`   q=${q} → ${(webp.length / 1024).toFixed(0)} kB`);
  if (webp.length <= TETO) break;
}
writeFileSync(SAIDA_WEBP, webp);
console.log(
  `   ${SAIDA_WEBP}: ${webp.length} bytes (${(webp.length / 1024).toFixed(0)} kB) q=${qualidade}`,
);

/* ========================================================= os metadados =====*/

console.log("6. spMapa.ts");

const ALVOS = [
  { nome: "Avenida Paulista / MASP", teste: (t) => t.name === "Avenida Paulista" && t.highway, perto: [-23.5614, -46.6559] },
  { nome: "Praça da Sé", teste: (t) => /^Pra(ç|c)a da S(é|e)$/.test(t.name ?? "") || /^Catedral/.test(t.name ?? ""), perto: [-23.5505, -46.6333] },
  { nome: "Parque Ibirapuera", teste: (t) => t.leisure === "park" && /Ibirapuera/.test(t.name ?? ""), perto: [-23.5874, -46.6576] },
  { nome: "Aeroporto de Congonhas", teste: (t) => t.aeroway === "aerodrome" && /Congonhas/.test(t.name ?? ""), perto: [-23.6266, -46.6556] },
  { nome: "Marginal Tietê", teste: (t) => /Marginal Tiet/.test(t.name ?? "") && t.highway, perto: [-23.5162, -46.6487] },
  { nome: "Rio Tietê", teste: (t) => /^Rio Tiet/.test(t.name ?? "") && t.waterway, perto: [-23.5162, -46.6487] },
  { nome: "Avenida Brigadeiro Faria Lima", teste: (t) => /Faria Lima/.test(t.name ?? "") && t.highway, perto: [-23.5752, -46.6893] },
  { nome: "Rio Pinheiros", teste: (t) => /^Rio Pinheiros/.test(t.name ?? "") && t.waterway, perto: [-23.5894, -46.7004] },
];

const pontos = [];
const naoAchados = [];
for (const alvo of ALVOS) {
  let melhor = null;
  for (const el of dados.marcos.elements) {
    const t = el.tags ?? {};
    if (!alvo.teste(t)) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const d = Math.hypot(
      (lat - alvo.perto[0]) * MPD_LAT,
      (lon - alvo.perto[1]) * MPD_LON,
    );
    if (!melhor || d < melhor.d) melhor = { lat, lon, d, nome: t.name };
  }
  if (!melhor || melhor.d > 6000) {
    naoAchados.push(alvo.nome);
    continue;
  }
  pontos.push({
    nome: alvo.nome,
    osm: melhor.nome ?? null,
    lat: Math.round(melhor.lat * 1e6) / 1e6,
    lon: Math.round(melhor.lon * 1e6) / 1e6,
    px: Math.round(px(melhor.lon) * 10) / 10,
    py: Math.round(py(melhor.lat) * 10) / 10,
    desvioM: Math.round(melhor.d),
  });
}
if (naoAchados.length) console.log(`   não localizados: ${naoAchados.join(", ")}`);
relatorio.pontos = pontos;
relatorio.naoAchados = naoAchados;

/* Quão perto a torre fictícia caiu da geometria real da Avenida Paulista. */
let distTorrePaulista = Infinity;
for (const el of dados.vias.elements) {
  if (el.tags?.name !== "Avenida Paulista") continue;
  for (const p of el.geometry ?? []) {
    if (!p) continue;
    const d = Math.hypot(
      (p.lat - TORRE.lat) * MPD_LAT,
      (p.lon - TORRE.lon) * MPD_LON,
    );
    if (d < distTorrePaulista) distTorrePaulista = d;
  }
}
relatorio.torrePaulistaM = Math.round(distTorrePaulista);
console.log(
  `   torre a ${Math.round(distTorrePaulista)} m do eixo da Avenida Paulista`,
);

const num = (v, casas) => Number(v.toFixed(casas));

const tsPontos = pontos
  .map(
    (p) =>
      `    {\n      nome: ${JSON.stringify(p.nome)},\n      osm: ${JSON.stringify(p.osm)},\n      lat: ${p.lat},\n      lon: ${p.lon},\n      px: ${p.px},\n      py: ${p.py},\n    },`,
  )
  .join("\n");

const ts = `/**
 * Metadados da textura \`public/images/sp-noite.webp\` — o mapa noturno de São
 * Paulo do hero.
 *
 * GERADO POR \`scripts/gera-sp.mjs\`. Não edite à mão: rode o script.
 *
 * A geometria é REAL, do OpenStreetMap. Os dados são ODbL, e a licença exige que
 * a atribuição de \`ATRIBUICAO\` apareça em texto visível na página que mostra a
 * imagem — é por isso que ela é um campo exportado e não um comentário.
 *
 * A TORRE É FICÇÃO. A Wone não tem torre na Avenida Paulista: \`torre\` é o ponto
 * escolhido para a ilustração 3D da próxima etapa, ao lado do MASP — a
 * ${relatorio.torrePaulistaM} m do eixo da avenida nos dados do OSM. Tudo que nascer desse ponto tem
 * de aparecer na interface rotulado como SIMULAÇÃO.
 *
 * A projeção é equiretangular local — a mesma do script, repetida aqui em
 * \`projetaSP\` para a câmera não refazer a conta de cabeça.
 */

export type PontoSP = {
  /** Como o ponto é chamado na página. */
  readonly nome: string;
  /** O \`name\` da feição no OpenStreetMap de onde o ponto saiu, quando existe. */
  readonly osm: string | null;
  readonly lat: number;
  readonly lon: number;
  /** Pixel na textura de ${LADO}×${LADO}, com a origem no canto noroeste. */
  readonly px: number;
  readonly py: number;
};

export type MapaSP = {
  readonly textura: string;
  readonly lado: number;
  readonly larguraKm: number;
  readonly metrosPorPixel: number;
  readonly centro: { readonly lat: number; readonly lon: number };
  readonly bbox: {
    readonly norte: number;
    readonly sul: number;
    readonly oeste: number;
    readonly leste: number;
  };
  readonly atribuicao: string;
  readonly torre: {
    readonly nome: string;
    readonly lat: number;
    readonly lon: number;
    readonly px: number;
    readonly py: number;
    readonly ficcao: true;
  };
  readonly pontos: readonly PontoSP[];
};

export const ATRIBUICAO = ${JSON.stringify(ATRIBUICAO)};

export const SP_MAPA: MapaSP = {
  textura: "/images/sp-noite.webp",
  lado: ${LADO},
  larguraKm: ${LARGURA_KM},
  metrosPorPixel: ${num(METROS_POR_PIXEL, 6)},
  centro: { lat: ${CENTRO.lat}, lon: ${CENTRO.lon} },
  bbox: {
    norte: ${num(BBOX.norte, 6)},
    sul: ${num(BBOX.sul, 6)},
    oeste: ${num(BBOX.oeste, 6)},
    leste: ${num(BBOX.leste, 6)},
  },
  atribuicao: ATRIBUICAO,
  torre: {
    nome: ${JSON.stringify(TORRE.nome)},
    lat: ${TORRE.lat},
    lon: ${TORRE.lon},
    px: ${num(px(TORRE.lon), 1)},
    py: ${num(py(TORRE.lat), 1)},
    ficcao: true,
  },
  pontos: [
${tsPontos}
  ],
};

/** lat/lon → pixel da textura. Fora da caixa o resultado sai fora de [0, lado]. */
export function projetaSP(lat: number, lon: number): { x: number; y: number } {
  const { bbox, lado } = SP_MAPA;
  return {
    x: ((lon - bbox.oeste) / (bbox.leste - bbox.oeste)) * lado,
    y: ((bbox.norte - lat) / (bbox.norte - bbox.sul)) * lado,
  };
}
`;
writeFileSync(SAIDA_MAPA, ts);
console.log(`   ${SAIDA_MAPA}: ${pontos.length} pontos`);

/* ============================================================= prédios =====*/

console.log("7. spPredios.json");

const TETO_PREDIOS = 120 * 1024; // gzip
const predios = [];
let comAltura = 0;
for (const el of dados.predios.elements) {
  for (const anel of aneis(el)) {
    const area = areaM2(anel);
    if (area < 150) continue;
    /* Metros relativos ao centro da torre; y positivo aponta para o NORTE. */
    let pts = anel.map((p) => [
      (p.lon - TORRE.lon) * MPD_LON,
      (p.lat - TORRE.lat) * MPD_LAT,
    ]);
    if (
      pts.length > 2 &&
      Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-6 &&
      Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-6
    ) {
      pts = pts.slice(0, -1);
    }
    pts = simplifica(pts, 3);
    if (pts.length < 3) continue;
    const t = el.tags ?? {};
    let h = null;
    const hTag = parseFloat(String(t.height ?? "").replace(",", "."));
    const nivTag = parseFloat(String(t["building:levels"] ?? "").replace(",", "."));
    if (Number.isFinite(hTag) && hTag > 0) h = Math.round(hTag * 10) / 10;
    else if (Number.isFinite(nivTag) && nivTag > 0)
      h = Math.round(nivTag * 3.2 * 10) / 10;
    if (h !== null) comAltura++;
    predios.push({
      c: pts.map(([x, y]) => [Math.round(x), Math.round(y)]),
      h,
    });
  }
}

const json = JSON.stringify({
  fonte: "OpenStreetMap",
  atribuicao: ATRIBUICAO,
  centro: { lat: TORRE.lat, lon: TORRE.lon },
  raioM: 1200,
  unidade: "metros relativos ao centro; x+ leste, y+ norte",
  alturaNula: "sem height nem building:levels no OSM — sorteie pela área",
  predios,
});
const gz = gzipSync(Buffer.from(json), { level: 9 }).length;
console.log(
  `   ${predios.length} prédios (${comAltura} com altura real) — ${(json.length / 1024).toFixed(0)} kB cru, ${(gz / 1024).toFixed(0)} kB gzip`,
);
relatorio.predios = { total: predios.length, comAltura, cru: json.length, gzip: gz };

if (gz <= TETO_PREDIOS) {
  writeFileSync(SAIDA_PREDIOS, json);
  relatorio.predios.gravado = true;
  console.log(`   ${SAIDA_PREDIOS}: gravado`);
} else {
  relatorio.predios.gravado = false;
  console.log(
    `   NÃO gravado: ${(gz / 1024).toFixed(0)} kB gzip passa do teto de ${TETO_PREDIOS / 1024} kB`,
  );
}

/* ============================================================ relatório =====*/

console.log("\n--- relatório ---");
console.log(JSON.stringify(relatorio, null, 2));
