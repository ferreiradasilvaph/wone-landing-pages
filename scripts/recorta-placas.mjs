/**
 * Recorta, de cada ilustração de troféu, SÓ A FACE IMPRESSA — e grava
 * `public/placas/arte-<marco>.webp`.
 *
 *   node scripts/recorta-placas.mjs
 *
 * POR QUE ESTE RECORTE EXISTE
 *
 * Pedido do dono, 14/10: "preciso também que as placas sejam 3d reais.
 * tecnicamente elas estão em 2d". Ele tinha razão. Até aqui a cena colava a
 * ilustração INTEIRA (`placa-<marco>.webp`, 479×664) em dois planos com
 * `meshBasicMaterial` — material que não recebe luz nenhuma. E a ilustração já
 * traz o bloco de acrílico PINTADO: bisel desenhado, reflexo desenhado,
 * perspectiva desenhada. Resultado: um cartaz de um troféu, sempre com a mesma
 * iluminação, qualquer que fosse a luz da cena. Lia como papel.
 *
 * Agora o bloco é geometria de verdade (`ExtrudeGeometry` com bisel, acrílico
 * com `transmission` — veja `AwardPlaque3D.tsx`) e o que entra DENTRO dele é só
 * a arte impressa. Para isso a arte precisa vir sem o acrílico pintado em
 * volta: é o que este script faz.
 *
 * ONDE FICA A FACE, E COMO FOI MEDIDA
 *
 * As quatro ilustrações são o MESMO bloco desenhado no mesmo enquadramento
 * (479×664 o 100K, 479×662 as outras três) — só a arte de dentro muda. Então o
 * retângulo da face é um só, medido uma vez e conferido nas quatro.
 *
 * A medição foi por canal alfa. O "branco" do fundo da arte não é branco
 * opaco: é (235,235,235) com alfa ≈ 25 — o papel é translúcido de propósito,
 * para o acrílico aparecer por trás. Fora do bloco o alfa é 0 cravado; no bisel
 * desenhado ele passa de 60. Contando, por coluna e por linha, os pixels com
 * alfa entre 14 e 48, a face aparece como um platô e as bordas caem:
 *
 *   face medida (as quatro):  x 48…426,  y 40…616   →  378 × 576
 *
 * `INSET` tira 2,5% de cada lado disso. Não é margem de segurança abstrata: o
 * bisel desenhado REFRATA a arte para dentro por alguns pixels (dá para ver a
 * faixa "WONE BOT" fantasma repetida na borda esquerda do 500K), e sem o inset
 * esse fantasma entraria no recorte e apareceria como uma listra no acrílico de
 * verdade, que já tem o bisel dele.
 *
 *   recorte final:  left 57, top 54, 360 × 548  (proporção 0,657)
 *
 * A proporção é a mesma nas quatro, que é o que o código 3D precisa: o plano da
 * arte tem uma janela fixa dentro do bloco e nenhum marco pode esticar.
 *
 * A PERSPECTIVA, QUE FICA
 *
 * A ilustração desenha o bloco levemente virado — a lateral direita aparece. O
 * recorte não corrige isso (nada de `affine`): a distorção dentro da face é de
 * poucos pixels, some debaixo do bisel e da refração do acrílico de verdade, e
 * qualquer endireitamento com `affine` reamostraria a arte inteira para
 * resolver um erro que ninguém vê. Está registrado aqui porque foi uma
 * escolha, não um esquecimento.
 *
 * POR QUE A SAÍDA É SÓ A TINTA, COM ALFA
 *
 * Esta é a quarta tentativa, e as três primeiras erraram pelos três lados.
 *
 * A primeira ACHATAVA o papel translúcido sobre um quase-preto: o bloco saía
 * lendo como laje preta polida, sem um pixel por onde ver através. A segunda
 * binarizava o alfa, mas a arte ia para DENTRO do bloco — e o que está dentro
 * só se vê pela passada de transmissão, que devolve um mipmap borrado. A
 * terceira compunha a tinta sobre um marfim opaco: a face virava um cartão de
 * papel, e o veredito do dono em 15/10 foi direto — "tira esse fundo opaco das
 * placas e o fundo branco das placas".
 *
 * Agora: SÓ A TINTA (a raposa, o numeral, a faixa WONE BOT, as barras
 * laranja), com canal alfa, impressa na FACE FRONTAL do bloco (veja
 * `ARTE_FRENTE` em `AwardPlaque3D.tsx`). Onde não há tinta não há nada — e por
 * esses vazios se vê o cristal, o bisel aceso do outro lado e o chão escuro da
 * vitrine atrás. É assim que um acrílico com impressão UV de verdade funciona:
 * a tinta é uma camada fina sobre a peça, não um papel colado dentro dela.
 *
 * A SEPARAÇÃO É POR ALFA, E O HISTOGRAMA ENTREGA ONDE CORTAR
 *
 * Contados os 317 mil pixels de cada ilustração, em faixas de 16:
 *
 *   alfa 16…31  (o papel translúcido)          22…34% dos pixels
 *   alfa 240…255 (a tinta)                     31…42%
 *   o meio                                     o resto: borda, sombra e as
 *                                              curvas finas do desenho de fundo
 *
 * O corte em 128 — os ~50% que o dono pediu — cai no vale entre os dois picos,
 * a mais de cem níveis de cada um. Nada do que é tinta chega perto do limiar, e
 * nada do que é papel passa dele.
 *
 * A BORDA, E POR QUE ELA É SUAVIZADA DEPOIS DE BINARIZADA
 *
 * Binarizar e parar aí dá uma serra: a 360 px de largura, um contorno diagonal
 * vira degraus de um pixel que o mipmap só faz piorar. Então o alfa é
 * binarizado PRIMEIRO (para o limiar ficar exatamente onde o histograma manda,
 * sem a sombra do desenho puxando a borda para dentro) e suavizado DEPOIS, com
 * um único passe de média 3×3 — o que põe a travessia de 0 a 255 em um pixel,
 * com a curva cruzando os 50% em cima da borda original.
 *
 * Esse um pixel é o que o `alphaTest` de 0,5 da cena corta, e é também o que o
 * `alphaToCoverage` usa para desenhar a borda sem serra onde há MSAA.
 *
 * O SANGRAMENTO DE COR
 *
 * O pixel transparente ao lado de um opaco ainda carrega uma cor — e no
 * original essa cor é o papel QUASE BRANCO. Com a borda suavizada, o shader
 * interpola entre a tinta e esse branco, e cada letra ganha uma franja clara: a
 * mesma franja que o olho leu como "fundo branco" na versão anterior. Então,
 * antes de suavizar, a cor da tinta é empurrada dois pixels para dentro da
 * região vazia (veja `sangra`), e a franja passa a ser da cor da própria tinta.
 *
 * O WebP com alfa é gravado com `alphaQuality: 100`: o canal de forma é o que
 * menos pode ser comprimido com perda — um artefato ali não borra uma cor,
 * recorta um buraco.
 *
 * O QUE ESTE SCRIPT NÃO FAZ
 *
 * Não encosta nas ilustrações originais. `public/placas/placa-<marco>.webp`
 * continua intacto: é ele que o dicionário guarda em `image`, e é a foto do
 * troféu que serve de fallback 2D onde não há WebGL.
 *
 * O SHARP
 *
 * Não é dependência do projeto (a landing não processa imagem em runtime) e
 * não entra no `package.json` por causa de um script que roda de ano em ano.
 * Aponte `WONE_SHARP` para uma instalação qualquer, ou rode isto de uma pasta
 * que já tenha o pacote:
 *
 *   WONE_SHARP=/caminho/para/node_modules/sharp node scripts/recorta-placas.mjs
 */

import { mkdirSync, existsSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = join(RAIZ, "public", "placas");

/** Os quatro marcos, na ordem da vitrine. */
const MARCOS = ["10k", "100k", "500k", "1m"];

/**
 * A face impressa dentro do bisel desenhado, em pixels da ilustração.
 * Medida por alfa (veja o cabeçalho); vale para as quatro.
 */
const FACE = { left: 48, top: 40, right: 426, bottom: 616 };

/** Quanto se tira de cada lado da face medida, para o bisel não entrar. */
const INSET = 0.025;

/**
 * O limiar que separa tinta de papel, no canal alfa (veja o cabeçalho).
 *
 * Os ~50% que o dono pediu em 15/10, e o histograma concorda: é o vale entre o
 * pico do papel (alfa 16…31) e o pico da tinta (240…255).
 */
const LIMIAR = 128;

/** Quantos pixels a cor da tinta é empurrada para dentro do vazio. */
const SANGRIA = 2;

/**
 * Empurra a cor dos pixels com tinta para dentro da região vazia.
 *
 * Sem isto, o pixel vazio ao lado de uma letra guarda a cor do papel QUASE
 * BRANCO do original, e a suavização de um pixel da borda interpola a tinta
 * contra esse branco: cada contorno ganha uma franja clara — a mesma franja que
 * o dono leu como "fundo branco". Com a sangria, a interpolação acontece entre a
 * tinta e ela mesma.
 *
 * O alfa NÃO é tocado aqui: a máscara `dentro` é fotografada antes de cada passe
 * e só a cor viaja. Dois passes bastam porque a suavização que vem depois é de
 * um pixel só.
 */
function sangra(rgba, w, h, dentro) {
  const vizinhos = [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1];
  let atual = dentro;

  for (let passe = 0; passe < SANGRIA; passe++) {
    const proximo = atual.slice();
    for (let p = 0; p < w * h; p++) {
      if (atual[p]) continue;
      let n = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      const x = p % w;
      for (const d of vizinhos) {
        const q = p + d;
        if (q < 0 || q >= w * h || !atual[q]) continue;
        /* Não deixa o vizinho "dar a volta" pela outra ponta da linha. */
        if (Math.abs((q % w) - x) > 1) continue;
        const i = q * 4;
        r += rgba[i];
        g += rgba[i + 1];
        b += rgba[i + 2];
        n++;
      }
      if (!n) continue;
      const i = p * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      proximo[p] = 1;
    }
    atual = proximo;
  }
}

/**
 * Suaviza uma máscara binária em um pixel: média 3×3, um passe.
 *
 * Um passe de média sobre 0/255 põe a travessia inteira num pixel e cruza os
 * 50% exatamente em cima da borda binarizada — que é onde o `alphaTest` da cena
 * vai cortar. Mais passes engordariam a borda e comeriam as pernas finas do
 * desenho.
 */
function suaviza(mascara, w, h) {
  const saida = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let soma = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          soma += mascara[yy * w + xx];
          n++;
        }
      }
      saida[y * w + x] = Math.round(soma / n);
    }
  }
  return saida;
}

async function carregaSharp() {
  const bruto = process.env.WONE_SHARP ?? "sharp";
  /* Caminho absoluto no Windows ("C:\…") não é URL válida para o `import`
     dinâmico; o `pathToFileURL` resolve isso sem mexer no nome de pacote. */
  const caminho = isAbsolute(bruto) ? pathToFileURL(bruto).href : bruto;
  try {
    return (await import(caminho)).default;
  } catch (erro) {
    console.error(
      "sharp não encontrado. Aponte WONE_SHARP para uma instalação do pacote.",
    );
    throw erro;
  }
}

const sharp = await carregaSharp();

if (!existsSync(PASTA)) mkdirSync(PASTA, { recursive: true });

const larguraFace = FACE.right - FACE.left;
const alturaFace = FACE.bottom - FACE.top;
const dx = Math.round(larguraFace * INSET);
const dy = Math.round(alturaFace * INSET);

const RECORTE = {
  left: FACE.left + dx,
  top: FACE.top + dy,
  width: larguraFace - dx * 2,
  height: alturaFace - dy * 2,
};

console.log(
  `recorte: left ${RECORTE.left} top ${RECORTE.top} ${RECORTE.width}×${RECORTE.height}` +
    ` (proporção ${(RECORTE.width / RECORTE.height).toFixed(3)})`,
);

for (const marco of MARCOS) {
  const entrada = join(PASTA, `placa-${marco}.webp`);
  const saida = join(PASTA, `arte-${marco}.webp`);

  const { data, info } = await sharp(entrada)
    .extract(RECORTE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h } = info;
  const n = w * h;

  /* 1. Binariza: o que é tinta fica, o que é papel some. */
  const dentro = new Uint8Array(n);
  let tinta = 0;
  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] >= LIMIAR) {
      dentro[p] = 1;
      tinta++;
    }
  }

  /* 2. Empurra a cor da tinta para dentro do vazio, para a borda suavizada não
        interpolar contra o branco do papel (veja `sangra`). */
  sangra(data, w, h, dentro);

  /* 3. Suaviza a máscara em um pixel e grava-a de volta no canal alfa. */
  const mascara = suaviza(
    Uint8Array.from(dentro, (v) => (v ? 255 : 0)),
    w,
    h,
  );
  for (let p = 0; p < n; p++) data[p * 4 + 3] = mascara[p];

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    /* `alphaQuality` cheio: a cor pode perder um fio na compressão, a FORMA não
       — um artefato no canal alfa não borra um tom, abre um buraco no meio de
       uma letra. */
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(saida);

  console.log(
    `  ${marco} → ${saida}  (${((100 * tinta) / n).toFixed(1)}% de tinta)`,
  );
}
