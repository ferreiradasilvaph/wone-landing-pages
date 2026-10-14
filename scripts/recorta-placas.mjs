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
 * POR QUE A SAÍDA TEM ALFA, E POR QUE ELE É BINÁRIO
 *
 * O bloco agora é acrílico CRISTAL: o pódio, o chão e a joia ao lado têm de
 * aparecer ATRAVÉS dele. Para isso a arte impressa não pode cobrir a face
 * inteira — só a tinta (a raposa, o numeral, a faixa "WONE BOT", o laranja)
 * fica, e o resto da face vira vidro limpo.
 *
 * A primeira versão deste script ACHATAVA o papel translúcido sobre um
 * quase-preto. O bloco saiu lendo como uma laje preta polida: não havia um
 * pixel por onde ver através. O dono, 14/10: "as imagens das placas têm de ser
 * 3d e transparentes".
 *
 * O alfa da ilustração é BIMODAL — medido nas quatro, dentro do recorte:
 *
 *   alfa 16…31 (papel translúcido, (234,233,233))   32…47% dos pixels
 *   alfa 240…255 (tinta: raposa, numeral, laranja)  42…55%
 *   o meio (48…239), que é borda e sombra           ~5…8%
 *
 * Então o corte é limpo: `CORTE_ALFA` a meio caminho joga o papel para zero e
 * a tinta para 255, sem meio-termo. O papel é justamente a área de "branco
 * gelo" que daria leitura de acrílico FOSCO — e fosco é o oposto do que se
 * pediu. Vai embora inteiro.
 *
 * O ALFA TEM DE SER BINÁRIO, e não só "preservado", por dois motivos:
 *
 * 1. O `three` NÃO desenha objetos transparentes na passada de transmissão
 *    (`renderTransmissionPass` chama `renderObjects(opaqueObjects, …)`): uma
 *    arte com `transparent: true` sumiria de dentro do bloco. O plano da arte
 *    entra como material OPACO com `alphaTest` — e `alphaTest` não mistura
 *    nada: o fragmento passa inteiro ou é descartado. Alfa intermediário no
 *    arquivo não viraria borda macia, viraria só um limiar arbitrário.
 * 2. Com 0 e 255 cravados, o mipmap de um nível menor guarda a COBERTURA da
 *    tinta naquele tile, e `alphaTest` em 0,5 corta em "metade coberto" — que é
 *    o contorno certo em qualquer distância. Com o alfa original (papel em 25,
 *    tinta em 255) a média de um tile meio a meio dá 140, acima de qualquer
 *    limiar útil: a arte engordaria em borrões conforme a placa se afasta.
 *
 * O RGB dos pixels descartados fica como estava (nada de `flatten`): o filtro
 * bilinear ainda amostra a cor dos vizinhos na borda, e vizinho branco de papel
 * é melhor que vizinho preto — preto daria uma linha escura em volta de cada
 * letra.
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
 * O limiar do corte, em bytes de alfa.
 *
 * 128 é o meio exato da escala e cai no vale entre os dois picos medidos (papel
 * até 47, tinta a partir de 240), com folga dos dois lados: nenhum dos quatro
 * marcos tem massa perto daqui. O `alphaTest` do material no 3D tem de ser o
 * mesmo meio (0,5) — é o par que faz o contorno certo em qualquer distância.
 */
const CORTE_ALFA = 128;

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

  /* O corte, nos bytes crus. Não há operador do sharp para "binarize o alfa":
     `threshold` mexe nos canais de cor e `boolean` pede uma segunda imagem.
     São 197 mil pixels, uma vez por década. */
  let tinta = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= CORTE_ALFA) {
      data[i] = 255;
      tinta++;
    } else {
      data[i] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    /* `alphaQuality: 100` é o que importa aqui: no WebP o alfa é um plano
       separado, e em 100 ele sai SEM PERDA — o corte binário chega inteiro na
       textura, que é de onde vem o contorno do numeral. A cor sobe de 90 para
       95 porque o contorno de cada letra tem 2 px na tela e em 90 o encoder
       deixava franja; `lossless` nos quatro canais também serviria e custava
       100 kB por marco contra 38. */
    .webp({ quality: 95, alphaQuality: 100, effort: 6 })
    .toFile(saida);

  console.log(
    `  ${marco} → ${saida}` +
      `  (${((100 * tinta) / (info.width * info.height)).toFixed(1)}% de tinta)`,
  );
}
