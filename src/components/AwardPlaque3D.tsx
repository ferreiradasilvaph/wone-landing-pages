"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { arte } from "@/lib/arte";
import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DoubleSide,
  ExtrudeGeometry,
  LinearFilter,
  MeshBasicMaterial,
  RGBAFormat,
  SRGBColorSpace,
  Shape,
  TextureLoader,
  type Group,
  type Mesh,
  type Texture,
} from "three";

/**
 * O bloco de acrílico.
 *
 * `w`/`h` são a silhueta do troféu — a altura é a de sempre, porque é ela que
 * decide quanto o objeto ocupa da caixa quadrada do canvas e a caixa não pode
 * mudar de tamanho (CLS 0). `d` é a espessura, e agora ela é geometria de
 * verdade, não um número que ninguém via.
 */
const PLAQUE = { w: 2.06, h: 2.9, d: 0.4 };

/**
 * O bisel das bordas, em unidades de cena.
 *
 * Pequeno de propósito: num bloco de 2,06 × 2,9 um chanfro de 7,5 cm é o que uma
 * fresa de verdade tira do canto de uma peça de acrílico fundido. É esse
 * chanfro que acende quando a placa gira — a face frontal é plana e devolve a
 * luz sempre igual, o bisel é que pisca.
 */
const BISEL = 0.075;
/** Raio dos cantos da silhueta: arredondado, mas ainda um retângulo. */
const CANTO = 0.11;

/**
 * A janela em que a arte impressa cabe, dentro da face frontal.
 *
 * A face útil do bloco mede `w − 2·BISEL` por `h − 2·BISEL` (1,91 × 2,75), e a
 * janela fica em 78% da altura dela. A diferença não é margem de segurança: é
 * a MOLDURA DE CRISTAL. A arte entra com o fundo recortado (veja `ALFA_TINTA`),
 * então o que não é tinta já é vidro — mas vidro no meio de uma figura passa
 * por reflexo da própria figura. É a faixa limpa contornando a arte, com o aro
 * do pódio e o halo do fundo aparecendo TORCIDOS atrás dela, que diz na
 * primeira olhada que o bloco é transparente.
 *
 * Desceu de 84% quando o aro de luz entrou no pódio: a moldura só prova vidro
 * se houver moldura bastante para a deformação caber. Em 78% sobram 0,30 de
 * cristal em cima e embaixo e 0,25 dos lados — e é na faixa de baixo que o arco
 * de trás do aro passa, cortado e deslocado pela refração.
 */
const JANELA = { w: 1.49, h: 2.14 };

/**
 * Quanto a arte fica atrás da face frontal: a espessura que passa na frente dela.
 *
 * Subiu de 0,02 para 0,07 porque dois centésimos não aparecem. É esta lâmina
 * que, vista de esguelha quando o bloco balança, mostra a arte AFUNDADA no
 * acrílico em vez de impressa na superfície — a borda da figura ganha um degrau
 * de vidro na frente, e é o degrau que dá profundidade. Com `d` em 0,40 o miolo
 * tem 0,25 de folga, então os dois planos (frente e verso) ficam a 0,11 um do
 * outro, longe de qualquer briga de z.
 */
const ARTE_FUNDO = 0.07;

/**
 * O limiar que separa a tinta do vazio, na arte impressa.
 *
 * `scripts/recorta-placas.mjs` grava a arte com ALFA BINÁRIO: 255 na tinta (a
 * raposa, o numeral, a faixa "WONE BOT", o laranja) e 0 no papel translúcido
 * que a ilustração tinha em volta. Meio exato, 0,5, é o par do corte que o
 * script faz em 128 — e no mipmap, onde o alfa vira a COBERTURA de tinta do
 * tile, cortar em "metade coberto" é o que mantém o contorno no lugar conforme
 * a placa se afasta.
 *
 * `alphaTest` e não `transparent`: o `three` não desenha transparentes na
 * passada de transmissão (`renderTransmissionPass` só varre os opacos), e uma
 * arte transparente sumiria de dentro do próprio bloco.
 */
const ALFA_TINTA = 0.5;

/**
 * A espessura que o acrílico diz ter à luz — maior que a geométrica, de
 * propósito.
 *
 * `thickness` é o caminho que o raio refratado percorre dentro do sólido. Com
 * o valor geométrico (0,40) o desvio nas quinas é de poucos pixels e o bloco
 * passa por uma lâmina. Em 0,55 o bisel distorce visivelmente o que está atrás
 * dele — é o que denuncia vidro de verdade — sem que a face frontal, onde o
 * raio entra quase reto, desloque a arte um fio sequer.
 *
 * Subiu para 0,86 quando o aro de luz entrou no pódio e o halo no fundo (veja
 * `AURA`). Antes disso não havia o que torcer: o acrílico refratava escuro
 * sobre escuro e o deslocamento, por maior que fosse, não tinha contorno que o
 * denunciasse. Com uma linha clara atrás, o desvio vira o efeito — o arco do
 * aro entra no vidro e sai de lugar, e é esse degrau que o olho lê como sólido
 * transparente.
 */
const ESPESSURA_OPTICA = 0.86;

/** Quanto dura a passagem de uma arte para a outra, em segundos. */
const CROSSFADE_S = 0.55;

/* --------------------------------------------------------------------------
   O troféu, agora em três dimensões

   Pedido do dono, 14/10: "preciso também que as placas sejam 3d reais.
   tecnicamente elas estão em 2d."

   Ele estava certo, e a razão era simples: a cena colava a ILUSTRAÇÃO INTEIRA
   do troféu (`placa-<marco>.webp`, com o acrílico, o bisel e o reflexo já
   PINTADOS) em dois planos com `meshBasicMaterial` — material que não recebe
   luz nenhuma. Girar aquilo não mudava um pixel do brilho: era um cartaz
   balançando.

   Agora o troféu é:

   - um `ExtrudeGeometry` de uma silhueta de cantos arredondados, com bisel
     de poucos segmentos — facetas vivas, que é como o dicionário descreve o
     prêmio do 100K ("bloco maciço de acrílico cristal facetado");
   - acrílico de verdade em `MeshPhysicalMaterial`: `transmission` (refrata o
     que está atrás), `ior` 1,49 (o índice do PMMA, não um número bonito),
     `clearcoat` para o verniz da superfície;
   - e a ARTE IMPRESSA num plano DENTRO do bloco, dois centésimos atrás da
     face frontal — é essa espessura na frente da arte que o olho lê como
     acrílico, e é dela que vem o volume.

   A arte vem recortada por `scripts/recorta-placas.mjs`: só a face impressa da
   ilustração, sem o acrílico pintado em volta. O acrílico pintado agora
   brigaria com o acrílico de verdade.
   -------------------------------------------------------------------------- */

/** Texturas já carregadas, por caminho: voltar a um prêmio não recarrega nada. */
const CACHE = new Map<string, Texture>();

/**
 * O bloco, construído uma vez e reusado.
 *
 * Fora de componente de propósito: a geometria não depende de nenhuma prop, e
 * remontar a cena (sair e voltar à tela) não deve refazer malha nenhuma.
 */
let BLOCO: ExtrudeGeometry | null = null;

function blocoAcrilico() {
  if (BLOCO) return BLOCO;

  const { w, h, d } = PLAQUE;
  const x = -w / 2;
  const y = -h / 2;
  const r = CANTO;

  const silhueta = new Shape();
  silhueta.moveTo(x + r, y);
  silhueta.lineTo(x + w - r, y);
  silhueta.quadraticCurveTo(x + w, y, x + w, y + r);
  silhueta.lineTo(x + w, y + h - r);
  silhueta.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  silhueta.lineTo(x + r, y + h);
  silhueta.quadraticCurveTo(x, y + h, x, y + h - r);
  silhueta.lineTo(x, y + r);
  silhueta.quadraticCurveTo(x, y, x + r, y);

  /* O bisel come `BISEL` de cada ponta em z, então o miolo extrudado é
     `d − 2·BISEL` e o bloco inteiro fecha exatamente em `d`. */
  const miolo = d - BISEL * 2;

  const geo = new ExtrudeGeometry(silhueta, {
    depth: miolo,
    bevelEnabled: true,
    bevelThickness: BISEL,
    bevelSize: BISEL,
    bevelOffset: 0,
    /* Dois anéis de bisel, não vinte: o chanfro tem de ser uma quina que
       acende, não uma borda macia que some. O `ExtrudeGeometry` sai sem índice
       e calcula normal por triângulo, então cada faixa do bisel é uma faceta
       plana — o facetado do dicionário vem daqui, de graça. */
    bevelSegments: 2,
    curveSegments: 8,
  });

  /* O extrude nasce de z = 0 para a frente; isto centra o bloco na origem,
     que é onde o resto da cena (pódio, postos, travessia) o espera. */
  geo.translate(0, 0, -miolo / 2);

  BLOCO = geo;
  return geo;
}

/**
 * A máscara que desfaz a arte que sai.
 *
 * POR QUE NÃO É UM CROSSFADE DE OPACIDADE
 *
 * O `three` NÃO desenha objetos transparentes na passada de transmissão: o
 * alvo que o acrílico refrata é renderizado só com os opacos
 * (`renderTransmissionPass` chama `renderObjects(opaqueObjects, …)`). Uma arte
 * com `transparent: true` sumiria de dentro do bloco durante o meio segundo da
 * transição — a cada 5,8 s o troféu piscaria vazio.
 *
 * `alphaTest` resolve sem sair do bucket dos opacos: o material continua
 * opaco, e o que desaparece são fragmentos descartados um a um. Esta textura é
 * o mapa que diz a ORDEM do descarte — uma rampa na diagonal somada a um ruído
 * suave, então a arte velha se desfaz numa onda irregular e a nova aparece por
 * baixo.
 *
 * POR QUE OS VALORES VIVEM EM [0,5 … 1] E NÃO EM [0 … 1]
 *
 * O shader multiplica: `diffuseColor.a = map.a * alphaMap.g`. O `map.a` agora é
 * o recorte da tinta (0 ou 1, veja `ALFA_TINTA`) e tem de continuar sendo
 * cortado em 0,5 — se o limiar partisse de 0,001 para dissolver, os pixels de
 * cobertura parcial do mipmap (`a` ≈ 0,2) passariam, e a arte que sai apareceria
 * com a borda inchada pelo meio segundo da transição.
 *
 * Com a máscara ocupando a metade de cima da escala, as duas contas cabem num
 * limiar só: ele sai de 0,501 (tinta inteira passa, cobertura parcial não) e
 * sobe até 1,001 (nada passa). Não parte de zero também porque `alphaTest`
 * cruzando o zero muda o define `USE_ALPHATEST` e RECOMPILA o shader, e
 * recompilar a cada quadro é o jeito mais caro possível de fazer isto.
 *
 * (A leitura é no canal verde: `alphamap_fragment` faz `diffuseColor.a *=
 * texture2D(alphaMap, …).g`. Por isso RGBA com os três canais iguais, e não
 * um `RedFormat` que pareceria economizar e devolveria zero.)
 */
let MASCARA: DataTexture | null = null;

function mascaraDissolucao() {
  if (MASCARA) return MASCARA;

  const N = 96;
  const G = 8;

  /* Grade pseudoaleatória com semente fixa: a onda é sempre a mesma, em
     qualquer máquina e em qualquer recarga. */
  const grade = new Float32Array((G + 1) * (G + 1));
  let s = 0x9e3779b9;
  for (let i = 0; i < grade.length; i++) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    grade[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const macio = (q: number) => q * q * (3 - 2 * q);
  const ruido = (u: number, v: number) => {
    const px = u * G;
    const py = v * G;
    const x0 = Math.min(G - 1, Math.floor(px));
    const y0 = Math.min(G - 1, Math.floor(py));
    const fx = macio(px - x0);
    const fy = macio(py - y0);
    const a = grade[y0 * (G + 1) + x0];
    const b = grade[y0 * (G + 1) + x0 + 1];
    const c = grade[(y0 + 1) * (G + 1) + x0];
    const d = grade[(y0 + 1) * (G + 1) + x0 + 1];
    const cima = a + (b - a) * fx;
    const baixo = c + (d - c) * fx;
    return cima + (baixo - cima) * fy;
  };

  const dados = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / (N - 1);
      const v = y / (N - 1);
      const rampa = 0.78 * v + 0.22 * u;
      const onda = Math.min(1, Math.max(0, 0.74 * rampa + 0.26 * ruido(u, v)));
      /* Metade de cima da escala: veja o cabeçalho. */
      const valor = ALFA_TINTA + (1 - ALFA_TINTA) * onda;
      const i = (y * N + x) * 4;
      const byte = Math.round(valor * 255);
      dados[i] = byte;
      dados[i + 1] = byte;
      dados[i + 2] = byte;
      dados[i + 3] = 255;
    }
  }

  const textura = new DataTexture(dados, N, N, RGBAFormat);
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  /* Sem mipmap: `alphaTest` lê o valor cru, e um nível borrado faria a onda
     perder a forma conforme a placa se afasta. */
  textura.generateMipmaps = false;
  textura.wrapS = ClampToEdgeWrapping;
  textura.wrapT = ClampToEdgeWrapping;
  textura.needsUpdate = true;

  MASCARA = textura;
  return textura;
}

/**
 * O tom do miolo do acrílico, a partir do `accent` do marco.
 *
 * O `accent` cru NÃO serve de `attenuationColor`. A conta do three é
 * `-log(cor) / distancia`: um canal em zero vira coeficiente infinito e some
 * por completo, por mais fino que seja o bloco. O laranja da marca (#FF7700)
 * tem azul zero — medido na tela, o 1M saía com o creme do numeral em amarelo
 * limão e a raposa escurecida, porque o acrílico tinha comido o azul inteiro
 * da arte atrás dele.
 *
 * Puxado para perto do branco, o mesmo tom vira o que se queria: um fio de cor
 * no vidro. A `DISTANCIA` curta (da ordem da espessura) é o que mantém esse
 * fio visível — com a atenuação medida em unidades de cena, uma distância
 * grande num bloco de 0,40 não tingiria nada.
 *
 * Em 0,9 (era 0,78) desde que a moldura virou cristal: ali a luz atravessa sem
 * tinta na frente, e o tingimento, que antes só se via como um véu sobre a arte
 * escura, passou a pintar a moldura inteira. Cristal quase incolor com um
 * sopro do marco é o alvo — não um filtro colorido.
 */
const ACRILICO_TOM = 0.9;
const ACRILICO_DISTANCIA = 1.5;
const BRANCO = /*@__PURE__*/ new Color("#ffffff");

function tomDoAcrilico(accent: string) {
  return new Color(accent).lerp(BRANCO, ACRILICO_TOM);
}

/* --------------------------------------------------------------------------
   O que fica ATRÁS do bloco — e por que sem isso ele nunca ia parecer vidro

   Olhar do dono, 14/10, depois de o acrílico já estar fisicamente correto: "o
   bloco ainda lê como uma laje escura". Estava certo, e o material não tinha
   culpa. Um sólido TRANSPARENTE mostra o que está atrás dele; atrás dele havia
   o chão preto da vitrine. Transparência perfeita sobre o nada devolve o nada —
   e o nada, com um contorno em volta, é exatamente o desenho de uma laje.

   Vidro não se vê: vê-se o que ele DEFORMA. Então entraram duas coisas claras
   atrás do bloco, e é delas que a transparência passa a ser evidente:

   - `AURA`, um halo de luz no fundo da vitrine — o softbox de trás da foto de
     produto. Dá à moldura de cristal um campo claro para mostrar, em vez do
     preto que ela mostrava.
   - o ARO no topo do pódio (veja `ARO`): uma linha fina e clara cujo
     arco de trás passa POR DENTRO do bloco. Linha reta que entra no vidro e sai
     deslocada é a prova mais barata e mais honesta de refração que existe.
   -------------------------------------------------------------------------- */

/**
 * O halo do fundo: onde fica, quanto mede e qual é o claro dele.
 *
 * `z` atrás de tudo (a joia dos cantos vive em −0,6), e o plano é MAIOR que o
 * tronco da câmera naquela profundidade — a meia-altura visível em z = −2,6 é
 * (7,3 + 2,6)·tan 19° = 3,41, e o plano vai a ±4,5. Isso não é folga por
 * desencargo: é o que garante que a borda do plano NUNCA apareça. Se
 * aparecesse, qualquer diferença de um bit entre o `base` daqui e a cor com que
 * o canvas é limpo viraria um retângulo visível no meio da seção.
 *
 * `centro` é um carvão QUENTE, não o `ink-800` frio: a vitrine inteira é
 * `--floor` (#110f0e), que já puxa para o marrom, e um halo azulado no meio
 * dela lia como mancha. Cinco vezes a luminância do chão é o bastante para a
 * moldura de cristal ter o que mostrar e pouco para a seção continuar escura —
 * medido na captura a 1440, o halo chega a 79 de luminância contra os 15 do
 * `--floor`, e some antes da borda do canvas.
 */
const AURA = {
  centro: "#5d4e40",
  z: -2.6,
  w: 11,
  h: 9,
  /* O miolo do halo, em fração do plano: elipse um pouco mais alta que larga,
     com o centro ligeiramente abaixo do meio — é atrás do BLOCO que ele precisa
     estar, e o bloco desce 0,2 no encaixe do pódio. */
  raioX: 0.28,
  raioY: 0.32,
  centroY: 0.54,
};

/** Um halo por cor de fundo. Na prática, um. */
const AURAS = new Map<string, DataTexture>();

/**
 * O gradiente do halo, em bytes sRGB.
 *
 * A mistura é feita em sRGB de propósito, e não no espaço linear de trabalho do
 * three: em linear, dois tons escuros se misturam por um meio bem mais claro
 * que o olho espera, e o halo ganhava um degrau pálido na metade do caminho.
 * Aqui o valor em k = 0 é o `base` BYTE A BYTE — o mesmo número que o
 * `setClearColor` escreve —, então não há emenda possível entre o plano e o
 * resto do canvas.
 */
function auraDoFundo(base: string) {
  const pronta = AURAS.get(base);
  if (pronta) return pronta;

  const N = 128;
  const hexBase = new Color(base).getHex(SRGBColorSpace);
  const hexCentro = new Color(AURA.centro).getHex(SRGBColorSpace);
  const canal = (hex: number, i: number) => (hex >> (16 - i * 8)) & 255;

  const dados = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x / (N - 1) - 0.5) / AURA.raioX;
      const dy = (y / (N - 1) - AURA.centroY) / AURA.raioY;
      const r = Math.sqrt(dx * dx + dy * dy);
      const q = Math.min(1, Math.max(0, 1 - r));
      /* Suavizada duas vezes: uma rampa linear deixa um anel visível onde o
         halo termina, e o anel denuncia o truque. */
      const k = q * q * q * (q * (q * 6 - 15) + 10);
      const i = (y * N + x) * 4;
      for (let c = 0; c < 3; c++) {
        const b = canal(hexBase, c);
        dados[i + c] = Math.round(b + (canal(hexCentro, c) - b) * k);
      }
      dados[i + 3] = 255;
    }
  }

  const textura = new DataTexture(dados, N, N, RGBAFormat);
  textura.colorSpace = SRGBColorSpace;
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  textura.generateMipmaps = false;
  textura.wrapS = ClampToEdgeWrapping;
  textura.wrapT = ClampToEdgeWrapping;
  textura.needsUpdate = true;

  AURAS.set(base, textura);
  return textura;
}

/**
 * O aro de luz no topo do pódio.
 *
 * Raio um fio menor que a meia-largura do bloco (1,03), então o aro corre por
 * TRÁS dele em vez de contorná-lo: o arco da frente aparece abaixo da aresta de
 * baixo do bloco, o arco de trás entra no cristal. Com a câmera em y = 0 e o
 * pódio em −1,57, o arco de trás projeta-se por volta de y = −1,34 na face do
 * bloco — abaixo da janela da arte, bem no meio da faixa limpa de cristal. É
 * ali que a refração tem palco.
 *
 * `meshBasicMaterial` sem tone mapping: é uma luz embutida na base, não uma
 * superfície iluminada, e tem de sair da tela com o creme que está escrito
 * aqui. Opaco também importa — a passada de transmissão só desenha opacos, e um
 * aro transparente sumiria justamente de dentro do vidro, que é onde ele serve.
 */
const ARO = { raio: [0.99, 1.056] as const, cor: "#F7E2BE" };

/**
 * A cor de fundo da seção que hospeda o canvas, lida do próprio DOM.
 *
 * POR QUE O CANVAS DEIXOU DE SER TRANSPARENTE
 *
 * Com `alpha` ligado e o fundo limpo em transparente, o `three` limpa o ALVO
 * DA TRANSMISSÃO com branco a 50% (está no `renderTransmissionPass`: "if
 * (_currentClearAlpha < 1) setClearColor(0xffffff, 0.5)"). O acrílico então
 * refrata um branco leitoso em toda a moldura onde não há arte atrás — o bloco
 * saía parecendo vidro fosco de banheiro, e a arte dentro dele, lavada.
 *
 * Limpando com a cor da seção e alfa 1, o alvo da transmissão recebe a MESMA
 * cor, e o que se vê através do acrílico é o chão escuro da vitrine — que é o
 * que está atrás do troféu de verdade.
 *
 * A cor não é constante escrita aqui: é lida do primeiro ancestral com fundo
 * próprio. O retângulo do canvas passa a ser opaco, mas pintado exatamente da
 * cor que já estava ali — invisível na página, e sem repetir o token `--floor`
 * num segundo lugar, onde ele poderia ficar para trás.
 */
function fundoDaSecao(canvas: HTMLCanvasElement) {
  let no: HTMLElement | null = canvas.parentElement;
  while (no) {
    const cor = getComputedStyle(no).backgroundColor;
    /* Só serve o que o `Color` do three sabe ler e o que não é transparente. */
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*(1|1\.0+|0?\.\d*[1-9]\d*))?\s*\)$/.test(cor)) {
      return cor;
    }
    no = no.parentElement;
  }
  /* Nenhum ancestral pintado: o chão da vitrine, que é onde esta cena vive. */
  return "#110f0e";
}

/**
 * Tamanho de um plano que mostra uma textura inteira, no estilo
 * `object-fit: contain`: a imagem nunca é cortada nem esticada — quem muda de
 * proporção é o plano.
 */
function planeSize(
  texture: Texture,
  maxW = JANELA.w,
  maxH = JANELA.h,
): [number, number] {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image?.height) return [maxW, maxH];

  const ratio = image.width / image.height;
  return ratio > maxW / maxH ? [maxW, maxW / ratio] : [maxH * ratio, maxH];
}

/* --------------------------------------------------------------------------
   Os objetos em volta

   Cada marco traz a joia que o acompanha — a pulseira do 100K, o colar do
   500K, o anel do 1M. A mesma peça aparece quatro vezes, uma em cada canto,
   atrás da placa: lidas juntas, as quatro dizem "isto também chega na sua
   casa" sem precisar de legenda.

   Ficam na mesma `group` da placa, então acompanham o vaivém e ganham
   paralaxe em vez de parecerem adesivos colados no canvas.
   -------------------------------------------------------------------------- */

/**
 * Cantos onde os quatro objetos se posicionam.
 *
 * `fase` desencontra o flutuar de cada um: com o mesmo relógio e a mesma conta,
 * os quatro subiriam e desceriam em formação, que é a única coisa que denuncia
 * na hora que aquilo é código e não um objeto solto no ar.
 */
const ITEM_SPOTS: {
  pos: [number, number, number];
  tilt: number;
  fase: number;
  giro: number;
}[] = [
  { pos: [-1.74, 1.46, -0.6], tilt: 0.07, fase: 0, giro: 1 },
  { pos: [1.74, 1.46, -0.6], tilt: -0.07, fase: 1.9, giro: -0.82 },
  { pos: [-1.74, -1.46, -0.6], tilt: -0.05, fase: 3.4, giro: 0.74 },
  { pos: [1.74, -1.46, -0.6], tilt: 0.05, fase: 5.1, giro: -1.08 },
];

/**
 * Os dois lugares que a placa e a joia vestida dividem entre si.
 *
 * Não são "o lugar da placa" e "o lugar da joia": são dois postos vagos, e
 * cada uma ocupa um de cada vez. A troca é o que amarra as duas numa cena só
 * — paradas lado a lado, elas eram dois cartazes pendurados no mesmo quadro;
 * revezando o mesmo par de lugares, viram duas peças de uma coisa só.
 */
const POSTO = { esq: -1.2, dir: 1.3 };

const ITEM_SOLO: (typeof ITEM_SPOTS)[number] = {
  pos: [POSTO.dir, 0.04, -0.25],
  tilt: 0.03,
  fase: 0.7,
  giro: 1,
};

/**
 * O compasso do rodízio.
 *
 * `parada` é o tempo em que cada uma fica no seu posto — longo de propósito:
 * a placa traz texto, e texto que anda não se lê. `passo` é a travessia.
 *
 * `frente` e `fundo` são o quanto cada uma sai do plano ao atravessar. Elas
 * se cruzam no meio do caminho, e sem essa diferença de profundidade os dois
 * objetos passariam um dentro do outro.
 *
 * `frente` é bem menor que `fundo` porque vir para a frente aproxima da
 * câmera, e o que se aproxima cresce: 0.7 já dá 11% a mais de tamanho
 * aparente, que é o suficiente para ler como passagem por cima sem que a
 * peça encoste nas bordas do canvas.
 *
 * `parada` + `passo` é o ciclo da cena, e o `CICLO_MS` da `AwardsShowcase`
 * (5,8 s) é a cópia dele: é assim que a troca de marco cai no instante em que
 * a travessia termina. Mexeu aqui, mexa lá.
 */
const TROCA = { parada: 4.2, passo: 1.6, frente: 0.7, fundo: 1.5 };

/** Começa devagar, acelera, chega devagar. */
function suave(p: number) {
  const q = Math.min(1, Math.max(0, p));
  return q * q * (3 - 2 * q);
}

/**
 * Onde está, neste instante, quem começou a cena no posto `lado`.
 *
 * As duas leem o mesmo relógio e fazem a mesma conta, cada uma com o seu
 * `lado` — então ninguém precisa avisar ninguém de nada. Sem estado
 * compartilhado não há como as duas saírem de sincronia e acabarem as duas no
 * mesmo lugar, que é o único jeito de esta cena quebrar feio.
 */
function posto(t: number, lado: 0 | 1) {
  const ciclo = TROCA.parada + TROCA.passo;
  const voltas = Math.floor(t / ciclo);
  const p = suave((t - voltas * ciclo - TROCA.parada) / TROCA.passo);

  /* A cada volta os dois postos se invertem: quem estava à esquerda na volta
     par está à direita na ímpar. */
  const naEsquerda = (lado + voltas) % 2 === 0;
  const de = naEsquerda ? POSTO.esq : POSTO.dir;
  const para = naEsquerda ? POSTO.dir : POSTO.esq;

  return {
    x: de + (para - de) * p,
    z: Math.sin(Math.PI * p) * (naEsquerda ? TROCA.frente : -TROCA.fundo),
  };
}

/** Quanto a peça cresce sob o cursor. */
const ITEM_HOVER = 1.16;
/**
 * O quadro em que uma foto real cabe.
 *
 * Contido, de propósito: são quatro cópias da mesma peça girando em volta da
 * placa, e quatro chapas grandes no ar disputam com o que elas deveriam estar
 * acompanhando. A placa é que é o assunto.
 */
const FOTO_MAX = { w: 0.6, h: 0.66 };
/**
 * O quadro da joia vestida, que aparece sozinha e precisa encarar a placa.
 *
 * Maior que o da joia solta porque a imagem não é só a joia: ela já vem com o
 * corpo que a veste desenhado em volta, e a peça de metal ocupa menos da
 * metade do quadro. Os dois arquivos são mais altos que largos — 1000×1500 o
 * dorso, 970×1465 o pulso —, então os dois param na altura, e `w` aqui é só o
 * teto que nenhum dos dois alcança.
 *
 * Não cresce mais que isto porque a altura visível em z = 0 é de pouco mais
 * de 5, e a peça ainda sobe e desce no ar; passando daqui, a cabeça do busto
 * começa a encostar na borda de cima do canvas.
 */
const FOTO_SOLO = { w: 2.42, h: 3.6 };

/**
 * O pódio: onde fica e onde termina.
 *
 * O topo é um número que outra coisa precisa saber — a foto da joia vestida tem
 * de parar ACIMA dele —, então ele sai daqui e não de um `-1.72` repetido.
 */
const PODIO = { y: -1.72, altura: 0.3, topo: 1.15, base: 1.3 };
const PODIO_TOPO = PODIO.y + PODIO.altura / 2;

/**
 * Quanto o bloco afunda no pódio.
 *
 * O bloco tem 2,9 de altura centrado na origem, então a base dele cai em −1,45
 * e o topo do pódio está em −1,57: encostados, sem se tocar. Assim o acrílico
 * não tinha NADA atrás de si — a transparência existia e não aparecia, porque
 * através do vidro só se via o mesmo fundo escuro que já estava em volta.
 *
 * Encaixado 0,2, o aro de cima do pódio — que é a parte iluminada dele — passa
 * POR TRÁS da moldura de cristal e sai de lá torto, cortado na linha onde entra
 * no vidro. É a leitura mais barata e mais honesta de "isto é um sólido
 * transparente apoiado numa base", e é também como a peça de verdade é montada:
 * o bloco entra num rasgo da base, não fica equilibrado em cima dela.
 */
const ENCAIXE = 0.2;

/**
 * O quadro da joia vestida, por fotografia.
 *
 * `FOTO_SOLO` é o teto do par, e o dorso do 500K o usa inteiro: naquela foto o
 * busto preenche o quadro de ponta a ponta, e o que desce até a borda de baixo
 * é o peito — massa de imagem, que o pódio esconde sem estranheza.
 *
 * O pulso do 100K é outra fotografia. O antebraço entra pela diagonal e a
 * pulseira ocupa menos de um terço do quadro, então no mesmo teto (a) a FOTO
 * ficava maior que a placa que ela deveria acompanhar, e (b) a base dela —
 * braço vazio, recortado em linha reta — descia 0,19 ABAIXO do topo do pódio e
 * atravessava o cilindro. Era disso que o dono reclamou em 14/10: "o pulso está
 * passando por dentro da imagem do pódio".
 *
 * Em 0,73 a foto mede 1,74 × 2,63 e cabe ao lado do bloco (2,06 de largura) com
 * folga. O `y` vem da conta, não do olho:
 *
 *   PODIO_TOPO (−1,57) + FOLGA (0,12) + metade da altura (1,314) + o flutuar
 *   (FLOAT.sobe, 0,085) = −0,051
 *
 * — a parcela do flutuar porque a peça sobe e desce no ar, e a base não pode
 * encostar no pódio nem no ponto mais baixo do movimento.
 */
const VESTIDA_ESCALA: Record<string, number> = { "pulseira-100k-vestida": 0.73 };
/** Quanto a base da foto fica acima do topo do pódio, no mínimo. */
const FOLGA_PODIO = 0.12;

/** Meia espessura entre as duas faces de uma foto. */
const FOTO_PELE = 0.005;
/**
 * O flutuar de cada objeto.
 *
 * `gira` é a volta contínua da joia solta: ela roda em torno do próprio eixo,
 * como rodaria na mão de alguém. As duas faces costas com costas seguram isso
 * — a imagem nunca some de perfil nem aparece espelhada do outro lado.
 *
 * `olha` é para a joia vestida, que não dá a volta: um busto girando põe a
 * pessoa de costas para quem olha, e a joia some junto. Essa oscila.
 *
 * `sobe` e `balanca` completam — senos de períodos que não se dividem, para a
 * pose nunca se repetir exatamente.
 */
const FLOAT = { sobe: 0.085, balanca: 0.22, olha: 0.32, gira: 0.5 };

/**
 * O quadro e o posto da joia vestida deste marco (veja `VESTIDA_ESCALA`).
 *
 * A escala é procurada pelo nome do arquivo porque é da FOTOGRAFIA que ela
 * depende — de quanto daquele quadro é joia e quanto é braço vazio —, e não do
 * marco: trocar a foto do 100K por um close da pulseira dispensa o ajuste, e o
 * ajuste some junto com o nome.
 */
function vestida(photo?: string) {
  const nome = photo?.split("/").pop()?.replace(/\.\w+$/, "") ?? "";
  const escala = VESTIDA_ESCALA[nome] ?? 1;
  const quadro = { w: FOTO_SOLO.w * escala, h: FOTO_SOLO.h * escala };

  /* Sem ajuste, a foto fica onde o posto manda. Com ajuste, ela SOBE até
     assentar acima do pódio — a conta está em `VESTIDA_ESCALA`. */
  const y =
    escala === 1
      ? ITEM_SOLO.pos[1]
      : PODIO_TOPO + FOLGA_PODIO + quadro.h / 2 + FLOAT.sobe;

  return {
    quadro,
    spot: { ...ITEM_SOLO, pos: [ITEM_SOLO.pos[0], y, ITEM_SOLO.pos[2]] as [number, number, number] },
  };
}

/**
 * Um dos quatro objetos.
 *
 * A escala é interpolada quadro a quadro em vez de sair de uma transição CSS —
 * dentro do canvas não existe CSS, e o amortecimento exponencial chega ao mesmo
 * lugar em qualquer taxa de quadros. Quem pediu menos movimento recebe o
 * tamanho final na hora, sem o caminho.
 *
 * Entrar e sair também é tamanho: a peça nasce em zero e cresce, e a do marco
 * anterior encolhe até sumir.
 */
function ItemCard({
  foto,
  spot,
  quadro,
  vestida,
  outgoing,
  reduced,
}: {
  /** A imagem da joia que este canto mostra. */
  foto: Texture;
  spot: (typeof ITEM_SPOTS)[number];
  /** O quadro em que ela cabe: o dos cantos ou o da joia vestida. */
  quadro: { w: number; h: number };
  /** Vestida oscila; solta dá a volta. */
  vestida: boolean;
  outgoing?: boolean;
  reduced: boolean;
}) {
  const pivot = useRef<Group>(null);
  const [hot, setHot] = useState(false);

  /* O cursor é do documento, não do mesh: sair da página com ele em "pointer"
     deixaria a mão pendurada na tela. */
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  useFrame((state, delta) => {
    if (!pivot.current) return;

    /* A travessia entre marcos é feita no tamanho, não na opacidade. Metal
       meio transparente mostra o próprio avesso e vira vidro sujo; encolher
       até sumir mantém a peça sólida do começo ao fim. */
    const target = outgoing ? 0 : hot ? ITEM_HOVER : 1;

    const now = pivot.current.scale.x;
    const step = reduced ? 1 : 1 - Math.exp(-10 * Math.min(delta, 0.05));
    const next = now + (target - now) * step;
    pivot.current.scale.setScalar(next);

    /* Encolheu até sumir: para de ser desenhada. Sem isto a peça que saiu
       continuaria no laço de render para sempre, do tamanho de nada. */
    pivot.current.visible = next > 0.012;
    if (!pivot.current.visible) return;

    /* No ar: a joia solta dá a volta inteira, a vestida oscila. As duas sobem
       e descem e balançam junto, em senos de períodos que não se dividem —
       então a pose nunca se repete exatamente. */
    if (!reduced) {
      const t = state.clock.elapsedTime + spot.fase;
      pivot.current.position.y = spot.pos[1] + Math.sin(t * 0.62) * FLOAT.sobe;
      pivot.current.rotation.y = vestida
        ? Math.sin(t * 0.39 * spot.giro) * FLOAT.olha
        : t * FLOAT.gira * spot.giro;
      pivot.current.rotation.x = Math.sin(t * 0.43) * FLOAT.balanca;

      /* A joia vestida reveza os postos com a placa. O relógio da travessia é
         o limpo, sem a `fase` — essa desencontra o flutuar dos quatro cantos,
         e aqui ela atrasaria a troca em relação à placa, que lê o mesmo
         relógio do outro lado. */
      if (vestida) {
        const lugar = posto(state.clock.elapsedTime, 1);
        pivot.current.position.x = lugar.x;
        pivot.current.position.z = spot.pos[2] + lugar.z;
      }
    }
  });

  return (
    <group
      ref={pivot}
      position={spot.pos}
      rotation={[0, 0, spot.tilt]}
      scale={0}
      onPointerOver={(event) => {
        if (outgoing) return;
        event.stopPropagation();
        setHot(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHot(false);
        document.body.style.cursor = "";
      }}
    >
      {/* Duas faces costas com costas: assim a imagem não some ao virar de
          perfil nem aparece espelhada do outro lado. */}
      <mesh position={[0, 0, FOTO_PELE]}>
        <planeGeometry args={planeSize(foto, quadro.w, quadro.h)} />
        <meshBasicMaterial map={foto} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -FOTO_PELE]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={planeSize(foto, quadro.w, quadro.h)} />
        <meshBasicMaterial map={foto} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Quantas amostras a GPU desta máquina aceita por pixel em superfície oblíqua.
 *
 * Preenchido no `onCreated` do canvas, que é a única hora em que existe um
 * renderizador para perguntar. A arte é impressa num plano que PASSA O TEMPO
 * INTEIRO torto — o bloco balança ±14° e segue o cursor —, e é exatamente esse
 * o caso que o filtro bilinear não resolve: ele amostra um quadrado alinhado à
 * tela onde o pixel cobre um retângulo esticado na textura, e o numeral sai
 * pastoso de um lado. Com anisotropia o contorno aguenta a inclinação.
 *
 * Teto em 8: além disso o ganho não aparece numa textura de 360 px e a conta
 * segue sendo por pixel, a cada quadro, inclusive no alvo da transmissão.
 */
let ANISO = 1;

/** Dá a uma textura de arte o tratamento de nitidez. Idempotente. */
function afina(texture: Texture) {
  texture.colorSpace = SRGBColorSpace;
  /* Mipmap ligado (é o padrão do loader, dito aqui porque é intencional): a
     arte aparece reduzida a quase metade na tela, e sem mipmap o numeral
     cintila a cada grau de balanço. */
  texture.generateMipmaps = true;
  if (texture.anisotropy !== ANISO) {
    texture.anisotropy = ANISO;
    texture.needsUpdate = true;
  }
}

/**
 * Carrega (ou devolve do cache) uma arte. Sempre assíncrono.
 *
 * O endereço passa por `arte()`, que carimba a versão da build. Sem isso o
 * navegador devolve do disco a placa do deploy anterior e a arte nova só
 * aparece horas depois — ou nunca, para quem não limpa o cache.
 */
function loadArt(caminho: string) {
  const src = arte(caminho);
  const cached = CACHE.get(src);
  if (cached) {
    /* O cache sobrevive à desmontagem do canvas; a anisotropia pode ter sido
       descoberta depois que esta textura entrou. */
    afina(cached);
    return Promise.resolve(cached);
  }

  return new Promise<Texture>((resolve, reject) => {
    new TextureLoader().load(
      src,
      (texture) => {
        afina(texture);
        CACHE.set(src, texture);
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

/**
 * A arte em cena e a que está saindo.
 *
 * O par só muda quando a nova termina de carregar — é isso que impede o bloco
 * vazio de aparecer entre uma arte e outra. Arquivo ausente não derruba nada:
 * o `catch` deixa a arte anterior onde está.
 */
function useArtPair(src?: string) {
  const [pair, setPair] = useState<{ prev: Texture | null; curr: Texture | null }>({
    prev: null,
    curr: null,
  });
  const current = useRef<Texture | null>(null);

  useEffect(() => {
    /* Marco sem imagem — hoje só o 10K, que ainda não tem foto do item. O que
       estava em cena sai pela travessia em vez de ficar pendurado do marco
       anterior. */
    if (!src) {
      if (current.current) {
        const prev = current.current;
        current.current = null;
        setPair({ prev, curr: null });
      }
      return;
    }

    let alive = true;
    loadArt(src)
      .then((texture) => {
        if (!alive || current.current === texture) return;
        const prev = current.current;
        current.current = texture;
        setPair({ prev, curr: texture });
      })
      .catch(() => {
        /* Sem arquivo, sem troca: fica a arte que já estava. */
      });

    return () => {
      alive = false;
    };
  }, [src]);

  return pair;
}

/**
 * O troféu em cena, com a joia ao lado ou nos quatro cantos.
 */
function Plaque({
  accent,
  art,
  fotos,
  fundo,
  photo,
  worn,
  spin,
  reduced,
}: {
  accent: string;
  art: { prev: Texture | null; curr: Texture | null };
  fotos: { prev: Texture | null; curr: Texture | null };
  /** A cor com que o canvas é limpo: é nela que o halo do fundo se dissolve. */
  fundo: string;
  /** O caminho da foto em cena: é dele que sai o quadro da joia vestida. */
  photo?: string;
  /** A joia é vestida: aparece uma vez só, ao lado da placa. */
  worn: boolean;
  reduced: boolean;
  spin: boolean;
}) {
  const group = useRef<Group>(null);
  /** A placa, que anda em bloco quando troca de posto — sem o pódio. */
  const palco = useRef<Group>(null);
  /** Os dois planos da arte que está saindo, para sumirem de vez no fim. */
  const saindoFrente = useRef<Mesh>(null);
  const saindoVerso = useRef<Mesh>(null);
  /** E os materiais deles, onde o limiar da dissolução sobe quadro a quadro. */
  const matSaindoFrente = useRef<MeshBasicMaterial>(null);
  const matSaindoVerso = useRef<MeshBasicMaterial>(null);
  const fade = useRef(0);

  const geometria = useMemo(() => blocoAcrilico(), []);
  const mascara = useMemo(() => mascaraDissolucao(), []);
  const tom = useMemo(() => tomDoAcrilico(accent), [accent]);
  const halo = useMemo(() => auraDoFundo(fundo), [fundo]);
  /* O quadro e o posto da joia vestida desta foto (veja `vestida`). */
  const vest = useMemo(() => vestida(photo), [photo]);

  /* Arte nova em cena: a dissolução recomeça do zero. */
  useEffect(() => {
    fade.current = 0;
  }, [art.curr]);

  useFrame((state, delta) => {
    if (group.current) {
      /* ±14°: o bastante para a lateral e o bisel entrarem e saírem da luz —
         é aí que a espessura aparece —, e pouco o bastante para a face
         impressa nunca sair de frente para quem lê. */
      const sway = spin ? Math.sin(state.clock.elapsedTime * 0.45) * 0.245 : 0;
      group.current.rotation.y = sway + state.pointer.x * 0.28;
      group.current.rotation.x = -state.pointer.y * 0.14;
    }

    /* O outro lado do rodízio. Quando não há joia vestida para revezar, a
       placa fica no meio do quadro e nada disto roda. */
    if (palco.current && worn && !reduced) {
      const lugar = posto(state.clock.elapsedTime, 0);
      palco.current.position.x = lugar.x;
      palco.current.position.z = lugar.z;
    }

    /* A arte que sai se desfaz pela máscara (veja `mascaraDissolucao`): o
       limiar varre a metade de cima da escala, que é onde a máscara vive. */
    fade.current = Math.min(1, fade.current + delta / CROSSFADE_S);
    const limiar = ALFA_TINTA + 0.001 + (1 - ALFA_TINTA) * fade.current;
    if (matSaindoFrente.current) matSaindoFrente.current.alphaTest = limiar;
    if (matSaindoVerso.current) matSaindoVerso.current.alphaTest = limiar;
    const aindaSaindo = fade.current < 1;
    if (saindoFrente.current) saindoFrente.current.visible = aindaSaindo;
    if (saindoVerso.current) saindoVerso.current.visible = aindaSaindo;
  });

  /* A face frontal do bloco e o lugar da arte dentro dele. */
  const faceZ = PLAQUE.d / 2 - BISEL;
  const arteZ = faceZ - ARTE_FUNDO;

  return (
    <>
      {/* O HALO DO FUNDO (veja `AURA`).

          Fora do `group` que balança: ele é a sala, não o objeto. Girando junto
          com o bloco, o claro do meio andaria pela tela e o truque apareceria.

          `toneMapped` falso para a borda do halo bater byte a byte com a cor de
          limpeza do canvas, e sem `depthWrite` porque não há nada atrás dele
          para esconder — é o fundo. */}
      <mesh position={[0, 0, AURA.z]} renderOrder={-1}>
        <planeGeometry args={[AURA.w, AURA.h]} />
        <meshBasicMaterial map={halo} toneMapped={false} depthWrite={false} />
      </mesh>

      <group ref={group}>
        {/* O troféu — bloco, arte e o que anda com eles quando a placa reveza o
            quadro com a joia vestida. O pódio ficou de fora: ele não sai do
            lugar. A posição aqui é a do primeiro quadro e a de quem pediu menos
            movimento; o resto do tempo quem manda é o rodízio, lá em cima. */}
        <group ref={palco} position={[worn ? POSTO.esq : 0, -ENCAIXE, 0]}>
          {/* O bloco de acrílico.

              `ior` 1,49 é o índice de refração do PMMA — o acrílico de verdade.
              `transmission` 1 com `thickness` (veja `ESPESSURA_OPTICA`) faz a luz
              ATRAVESSAR o bloco e sair torta nas quinas, que é o que distingue
              um sólido transparente de um vidro desenhado. `roughness` 0,03 e
              `clearcoat` 1 são a superfície polida de fábrica.

              `attenuationColor` tinge o miolo de leve, e por caminho óptico:
              quanto mais acrílico a luz atravessa, mais cor pega. O bronze do
              10K, o cristal quase incolor do 100K, o ouro do 500K e o laranja do
              1M saem do material, não de um filtro por cima — pálidos, pelo
              motivo que `tomDoAcrilico` explica.

              O MESMO MATERIAL NO CELULAR, E POR QUÊ

              A transmissão é cara: re-renderiza a cena opaca inteira num alvo
              próprio e refaz os mipmaps dele a cada quadro. A saída prevista era
              uma variante barata abaixo de 1024 — sem transmissão, com o bloco
              translúcido comum. Duas coisas desaconselharam:

              1. A MEDIDA não pediu. Contagem de `requestAnimationFrame` por
                 segundo com o canvas à vista, no Chrome do Playwright, dez
                 amostras de 1 s: 144 fps de mediana a 412×915 COM transmissão, e
                 143 a 1440×900. Os portões são 30 e 55.
              2. As duas variantes baratas testadas ficaram piores, e de formas
                 opostas: branco a 28% de opacidade virou uma lâmina leitosa
                 cinza sobre o chão escuro (mistura normal escurece o que está
                 embaixo, e embaixo está a arte); mistura aditiva com difusa
                 preta sumiu com o bloco e deixou só uns fios nas quinas.

              O que degrada em tela pequena é a RESOLUÇÃO do alvo de transmissão,
              não o material (veja `onCreated`): metade dos pixels num canvas que
              já é de 247 px, com o mesmo acrílico. */}
          <mesh geometry={geometria}>
            <meshPhysicalMaterial
              color="#ffffff"
              metalness={0}
              roughness={0.03}
              transmission={1}
              thickness={ESPESSURA_OPTICA}
              ior={1.49}
              clearcoat={1}
              clearcoatRoughness={0.04}
              envMapIntensity={5.6}
              specularIntensity={1}
              attenuationColor={tom}
              attenuationDistance={ACRILICO_DISTANCIA}
            />
          </mesh>

          {/* A ARTE IMPRESSA, por dentro.

              Dois centésimos atrás da face frontal: é essa lâmina de acrílico na
              frente da arte que o olho lê como espessura. Colada por fora seria
              um adesivo — foi exatamente disso que o dono reclamou.

              O verso é um segundo plano, espelhado, para o giro não mostrar o
              bloco oco por trás. */}
          {art.curr && (
            <>
              <mesh position={[0, 0, arteZ]}>
                <planeGeometry args={planeSize(art.curr)} />
                {/* Opaco de propósito (`transparent` fica falso): o acrílico
                    refrata só o que a passada de transmissão desenha, e ela
                    desenha só opacos.

                    Sem luz, também de propósito. A cena tem um refletor laranja
                    da marca e um ambiente quente — eles existem para ACENDER O
                    ACRÍLICO, e um material iluminado aqui dentro os receberia na
                    tinta: medido na tela, o creme do numeral virava amarelo e a
                    raposa sumia no laranja. Tinta impressa não tem brilho
                    próprio; quem reage à luz é o bloco na frente dela, e é dele
                    que vem o volume.

                    E `alphaTest` (veja `ALFA_TINTA`) é o que deixa o bloco ser
                    CRISTAL: a arte vem com o papel translúcido recortado, e aqui
                    cada fragmento fora da tinta é descartado — sem sair do bucket
                    dos opacos, então a arte continua valendo para a passada de
                    transmissão e, por onde não há tinta, o que se vê através do
                    bloco é o pódio e o chão, refratados. */}
                <meshBasicMaterial map={art.curr} alphaTest={ALFA_TINTA} />
              </mesh>
              <mesh position={[0, 0, -arteZ]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={planeSize(art.curr)} />
                <meshBasicMaterial map={art.curr} alphaTest={ALFA_TINTA} />
              </mesh>
            </>
          )}

          {/* A arte que sai, um fio à frente da que entra, se desfazendo. */}
          {art.prev && (
            <>
              <mesh ref={saindoFrente} position={[0, 0, arteZ + 0.006]}>
                <planeGeometry args={planeSize(art.prev)} />
                <meshBasicMaterial
                  ref={matSaindoFrente}
                  map={art.prev}
                  alphaMap={mascara}
                  /* Começa no corte da tinta e sobe daí (veja
                     `mascaraDissolucao`); nunca cruza o zero, que mudaria o
                     define `USE_ALPHATEST` e recompilaria o shader. */
                  alphaTest={ALFA_TINTA + 0.001}
                />
              </mesh>
              <mesh
                ref={saindoVerso}
                position={[0, 0, -arteZ - 0.006]}
                rotation={[0, Math.PI, 0]}
              >
                <planeGeometry args={planeSize(art.prev)} />
                <meshBasicMaterial
                  ref={matSaindoVerso}
                  map={art.prev}
                  alphaMap={mascara}
                  alphaTest={ALFA_TINTA + 0.001}
                />
              </mesh>
            </>
          )}
        </group>

        {/* O pódio.

            Fica onde está e não acompanha o rodízio: ele não é a placa, é o
            chão dela. Andando junto virava um objeto voador, e eram três coisas
            se mexendo num quadro só. Parado, vira o ponto de referência que
            deixa a troca legível — é contra ele que se vê a placa sair e a joia
            chegar. */}
        <group position={[worn ? POSTO.esq : 0, 0, 0]}>
          {/* O corpo da base. Subiu de #0a0a0d e ganhou `envMapIntensity`: ele é
              o que se vê ATRAVÉS do bloco na faixa de baixo, e preto atrás de
              vidro continua sendo preto. Em #16151b com as ripas do estúdio
              refletindo nele, o cilindro passa a ter um lado claro e outro
              escuro — e é esse contraste, torcido pela refração, que a moldura de
              cristal mostra. */}
          <mesh position={[0, PODIO.y, 0]}>
            <cylinderGeometry args={[PODIO.topo, PODIO.base, PODIO.altura, 48]} />
            <meshStandardMaterial
              color="#16151b"
              /* `roughness` alta e `envMapIntensity` baixa, e não o contrário: a
                 tampa do pódio é um disco HORIZONTAL, e horizontal é exatamente
                 a orientação que espelha a ripa de cima — a que mais subiu para
                 acender o bisel. Em 0,26 de rugosidade a tampa virava uma chapa
                 branca estourada, mais clara que o troféu — e a culpa não é do
                 `color`, é do FRESNEL: a câmera vê a tampa a 12° da rasante, e a
                 12° o Schlick sobe de F0 = 0,016 para 0,34, vinte vezes. Em 0,3
                 de `envMapIntensity` o disco volta a ser uma base iluminada (uns
                 110 de luminância) em vez da fonte de luz da cena. */
              metalness={0.75}
              roughness={0.6}
              envMapIntensity={0.3}
            />
          </mesh>

          {/* O ARO DE LUZ (veja `ARO`): o arco de trás atravessa o cristal. */}
          <mesh
            position={[0, PODIO_TOPO + 0.006, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[ARO.raio[0], ARO.raio[1], 72]} />
            <meshBasicMaterial color={ARO.cor} toneMapped={false} side={DoubleSide} />
          </mesh>
        </group>

        {/* A joia: uma vez ao lado da placa quando é vestida, quatro vezes nos
            cantos quando é a peça solta. A do marco que sai continua em cena até
            a travessia terminar. */}
        {(worn ? [vest.spot] : ITEM_SPOTS).map((spot, index) => (
          <group key={index}>
            {fotos.prev && (
              <ItemCard
                key={`sai-${fotos.prev.uuid}`}
                foto={fotos.prev}
                spot={spot}
                quadro={worn ? vest.quadro : FOTO_MAX}
                vestida={worn}
                outgoing
                reduced={reduced}
              />
            )}
            {fotos.curr && (
              <ItemCard
                key={`entra-${fotos.curr.uuid}`}
                foto={fotos.curr}
                spot={spot}
                quadro={worn ? vest.quadro : FOTO_MAX}
                vestida={worn}
                reduced={reduced}
              />
            )}
          </group>
        ))}
      </group>
    </>
  );
}

/**
 * O compasso da cena, dito para fora.
 *
 * Não desenha nada e não toca em nada: só avisa, a cada volta inteira de
 * `TROCA` (parada + travessia), que uma travessia acabou de terminar — é o
 * instante em que as duas peças estão paradas nos postos. A vitrine usa isto
 * para trocar de marco, em vez de manter um `setTimeout` próprio de 5,8 s: dois
 * relógios contando o mesmo tempo a partir de instantes diferentes (um na
 * hidratação, outro no primeiro quadro, depois do download do three) saem de
 * fase, e a troca pegava a placa no meio do caminho.
 *
 * A volta 0 chega no primeiro quadro e serve de "a cena começou": é o que
 * acerta o relógio da rail lá fora.
 *
 * Fora da tela o `frameloop` é `demand` e não há quadro nenhum — então não há
 * aviso, e a vitrine não anda sozinha escondida. Pelo mesmo caminho, com
 * movimento reduzido ela não anda nunca.
 */
function Metronome({ onCycle }: { onCycle?: (volta: number) => void }) {
  const volta = useRef(-1);
  const aviso = useRef(onCycle);

  useEffect(() => {
    aviso.current = onCycle;
  }, [onCycle]);

  useFrame((state) => {
    const atual = Math.floor(state.clock.elapsedTime / (TROCA.parada + TROCA.passo));
    if (atual === volta.current) return;
    volta.current = atual;
    aviso.current?.(atual);
  });

  return null;
}

/**
 * Canvas da placa. Importado por `next/dynamic` com `ssr: false` no carrossel,
 * e montado só quando a seção se aproxima.
 */
export default function AwardPlaque3D({
  accent,
  print,
  photo,
  worn = false,
  visible = true,
  onCycle,
}: {
  accent: string;
  /** A arte impressa do marco — recortada, sem o acrílico pintado em volta. */
  print?: string;
  /** Caminho da imagem da joia, quando o marco tem uma. */
  photo?: string;
  /** A joia aparece vestida: uma vez só, dividindo o quadro com a placa. */
  worn?: boolean;
  /**
   * `false` quando a seção saiu da tela — ou quando o visitante pausou a
   * vitrine: nos dois casos o laço de render para, a cena congela no quadro em
   * que está e não manda mais aviso. Quem desenha não muda.
   */
  visible?: boolean;
  /** Fim de cada travessia (veja `Metronome`); a volta 0 é o primeiro quadro. */
  onCycle?: (volta: number) => void;
}) {
  const reduced = useReducedMotion();

  /* `dpr` limitado: em telas retina o custo de preencher o canvas com um
     material transmissivo cresce rápido — e no celular ele era o suficiente
     para a placa andar aos tropeços. O componente só roda no cliente
     (`ssr: false`), então ler a largura aqui é seguro.

     O teto do desktop subiu de 1,5 para 2 depois de medir: com o canvas à
     vista, dez amostras de 1 s de `requestAnimationFrame` deram 143 fps de
     mediana a 1440×900 em 1,5 e 141 em 2 — e os portões são 55 no desktop e 30
     no celular. 2 é o `devicePixelRatio` de um retina inteiro, e é na diagonal
     do numeral que a diferença aparece. O celular fica em 1: lá o gargalo é o
     alvo da transmissão, não a nitidez da letra. */
  const dpr = useMemo<[number, number]>(
    () => (window.innerWidth < 640 ? [1, 1] : [1, 2]),
    [],
  );

  /**
   * O quanto do canvas o alvo da transmissão recebe.
   *
   * `transmission` custa uma RE-RENDERIZAÇÃO da cena opaca inteira num alvo
   * próprio, mais os mipmaps dele, a cada quadro — de longe a conta mais cara
   * desta cena. Esta é a válvula: metade dos pixels abaixo de 1024, resolução
   * cheia acima.
   *
   * É aqui que o celular economiza, e não no material. O que o acrílico
   * refrata é a ARTE, com o numeral e a faixa "WONE BOT": em 0,7 no desktop o
   * texto já saía pastoso, e o fps não mudava — então lá fica cheio. No
   * celular a caixa inteira do canvas tem 247 px e metade disso ainda sobra
   * para o que se enxerga num telefone.
   *
   * Lido uma vez, como o `dpr`: girar o telefone no meio da visita não vale
   * uma troca de alvo.
   */
  const escalaTransmissao = useMemo(
    () => (window.innerWidth < 1024 ? 0.5 : 1),
    [],
  );

  const art = useArtPair(print);
  const fotos = useArtPair(photo || undefined);

  /**
   * A cor com que o canvas é limpo, descoberta no `onCreated` (veja
   * `fundoDaSecao`) e guardada porque o halo do fundo precisa dela para se
   * dissolver sem emenda (veja `AURA`).
   *
   * O palpite inicial é o `--floor` da vitrine, que é onde esta cena vive — e
   * é por isso que, na esmagadora maioria das vezes, este `setFundo` não
   * provoca render nenhum: o valor que chega é o mesmo que já está aqui.
   */
  const [fundo, setFundo] = useState("#110f0e");

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 7.3], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        /* Veja `escalaTransmissao`. */
        gl.transmissionResolutionScale = escalaTransmissao;
        /* O fundo da seção, opaco (veja `fundoDaSecao`). Guardado em hexa
           normalizado — o DOM devolve "rgb(17, 15, 14)" e o palpite daqui é
           "#110f0e": sem normalizar, duas grafias da MESMA cor fariam um
           render e um halo a mais, por nada. */
        const cor = fundoDaSecao(gl.domElement);
        gl.setClearColor(cor, 1);
        setFundo(`#${new Color(cor).getHexString(SRGBColorSpace)}`);
        /* A anisotropia desta GPU, para as artes (veja `ANISO`). As que já
           estiverem em cache recebem o ajuste agora; as próximas, no `afina`
           do `loadArt`. */
        ANISO = Math.min(8, gl.capabilities.getMaxAnisotropy());
        CACHE.forEach(afina);
      }}
      // Fora da tela — ou em pausa —, desenha um quadro e para.
      frameloop={reduced || !visible ? "demand" : "always"}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.9} color={accent} />

      {/* Ambiente próprio, renderizado uma vez.

          Era `preset="city"`: um HDR de megabytes vindo de CDN, convertido em
          PMREM a cada montagem. Era parte do engasgo no celular. Os lightformers
          abaixo dão ao acrílico o que refletir sem rede e sem conversão cara.

          ONDE AS RIPAS FICAM, E POR QUE NÃO ERA NA FRENTE

          A primeira versão pôs as quatro ripas em z = +3,4, na frente do bloco,
          porque "é de lá que se olha". Elas quase não acendiam o bisel, e a
          conta diz por quê. O bisel da aresta esquerda tem normal (−0,71, 0,
          0,71); a câmera, de (0, 0, 7.3), chega naquele ponto por V ≈ (0,14, 0,
          0,99). O raio refletido é

              R = 2(N·V)N − V ≈ (−0,99,  0, −0,14)

          — ou seja, o bisel esquerdo mostra o que está QUASE A 90° À ESQUERDA,
          e um fio atrás. Pela mesma conta o bisel de cima mostra (0, 0,98,
          −0,19), o de baixo o simétrico, e a face lateral esquerda mostra
          (0,5, 0, −0,87), lá atrás à direita. Nenhuma dessas direções é onde as
          ripas estavam: a 45° à frente elas iluminavam a FACE, que é plana e
          devolve luz uniforme, e deixavam as quinas no escuro. Daí a laje.

          Agora as ripas formam um ARO DE RECORTE no equador da cena, em z ≈
          −0,5: é a posição de rim light de estúdio, e é exatamente onde o
          cálculo acima aponta. Cada ripa é estreita na direção em que o fio
          tem de ser fino e longa na direção da aresta que ela acende — uma
          fonte larga lava a quina inteira e some; uma ripa estreita vira um
          fio que corre pela faceta conforme o bloco gira.

          128 px e não 64: a ripa estreita ocupa uns 7° do cubo, e em 64 px isso
          dava 5 pixels de fio com a escada aparecendo no reflexo. Continua
          sendo um render só (`frames={1}`) e meio megabyte de textura. */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={1.6} color="#FFF4E8" position={[3.5, 5, 4]} scale={7} />
        <Lightformer intensity={1.3} color={accent} position={[-5, -1, -3]} scale={9} />
        <Lightformer intensity={0.5} color="#20202a" position={[0, -5, 2]} scale={12} />
        {/* A chapa larga em frente ao bloco, e por que ela existe.

            Um sólido transparente contra um fundo escuro, com nada atrás dele,
            fica PRETO — a transmissão devolve o mesmo quase-nada que já estava
            em volta, e o bloco lê como laje polida. Quem desmente isso, numa
            foto de produto, é o SOFTBOX: a chapa branca na frente da peça, que
            a face de acrílico reflete como um gradiente claro de cima a baixo.
            É esse gradiente, mais claro que a página, que diz "tem vidro aqui"
            antes de qualquer refração.

            Fria e fraca de propósito: é reflexo de estúdio, não iluminação da
            arte — a arte está atrás da face e não recebe luz nenhuma. */}
        <Lightformer
          intensity={0.6}
          color="#C8D2F0"
          /* Fora de eixo, e não centrada: centrada ela lava a face inteira por
             igual e o bloco vira um cartão cinza. Deslocada para cima e para a
             esquerda, o reflexo atravessa a face em diagonal — claro de um
             canto, escuro do outro —, e é o gradiente que faz o olho ler
             superfície polida. */
          position={[-2.1, 1.9, 5.4]}
          scale={[6.5, 5.5, 1]}
        />

        {/* AS RIPAS DAS ARESTAS VERTICAIS, no equador e um fio atrás: creme de
            um lado, laranja da marca do outro. Estreitas em z (0,5) porque é
            essa medida que vira a espessura do fio na quina, e altas em y (5,6)
            porque a aresta tem 2,9 e o fio não pode acabar antes dela. */}
        <Lightformer
          intensity={62}
          color="#FFFBF4"
          position={[-4, 0.35, -0.5]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[0.5, 5.6, 1]}
        />
        <Lightformer
          intensity={36}
          color="#FFD9A8"
          position={[4, -0.15, -0.5]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[0.45, 5.2, 1]}
        />
        {/* E as duas deitadas, para os biséis horizontais não ficarem cegos.
            Deitadas (`rotation` em x) o `scale` troca de significado: o primeiro
            número é a largura em x, o segundo a profundidade em z — é o segundo
            que tem de ser pequeno. */}
        <Lightformer
          intensity={40}
          color="#FFFBF4"
          position={[0, 4, -0.6]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[4.8, 0.45, 1]}
        />
        <Lightformer
          intensity={22}
          color="#FFE9D2"
          position={[0, -3.8, -0.6]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[4.8, 0.45, 1]}
        />

        {/* O RIM BRANCO ATRÁS-E-ACIMA.

            Sem `rotation`, então o `Lightformer` aponta sozinho para a origem.
            É a luz de contorno clássica: vem de trás do ombro do objeto e
            desenha a silhueta. No acrílico ela faz duas coisas que nenhuma das
            ripas faz — acende o bisel de CIMA-ATRÁS, que a câmera vê através do
            bloco (a aresta de trás aparece dentro do vidro, deslocada pela
            refração, e é o par dela com a aresta da frente que dá espessura ao
            olho), e devolve um claro à moldura de cristal por refração interna
            quando o bloco balança para um lado. */}
        <Lightformer
          intensity={9}
          color="#FFFFFF"
          position={[-1, 3.2, -3.4]}
          scale={[5.5, 1.3, 1]}
        />
        {/* O par lateral dele, baixo e atrás, no laranja da marca. */}
        <Lightformer
          intensity={7}
          color="#FF7700"
          position={[3.6, -0.6, -3.2]}
          scale={[3.4, 3.4, 1]}
        />
        {/* A CHAPA DE TRÁS.

            A face lateral do bloco tem normal (±1, 0, 0) e, pela mesma conta das
            ripas, reflete a direção (∓0,14, 0, −0,99) — quase exatamente PARA
            TRÁS. Sem nada ali ela é um retângulo preto, e um retângulo preto na
            lateral é a definição de laje: a espessura existe e não se vê.

            Larga e fraca, não é um fio: a lateral é uma superfície, e o que ela
            precisa é de um tom, não de um risco. */}
        <Lightformer
          intensity={5}
          color="#FFF6EA"
          position={[-0.4, 0.3, -5.2]}
          scale={[5.5, 5, 1]}
        />
      </Environment>

      <Plaque
        accent={accent}
        art={art}
        fotos={fotos}
        fundo={fundo}
        photo={photo}
        worn={worn && Boolean(photo)}
        spin={!reduced}
        reduced={!!reduced}
      />

      <Metronome onCycle={onCycle} />
    </Canvas>
  );
}
