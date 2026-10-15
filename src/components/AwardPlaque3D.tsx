"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { arte } from "@/lib/arte";
import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  FrontSide,
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
/* As linhas grossas vêm dos exemplos do próprio three (nada novo no
   `package.json`): `lineBasicMaterial` desenha SEMPRE um pixel de dispositivo,
   porque o WebGL ignora `gl.lineWidth` desde o core profile — num retina isso é
   meio pixel de CSS, e meio pixel serrilha. O `LineSegments2` desenha cada
   aresta como um QUADRILÁTERO em espaço de tela, com largura em pixels de CSS e
   as bordas suavizadas pelo MSAA do canvas (`antialias: true`). */
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

/**
 * O bloco de acrílico.
 *
 * `w`/`h` são a silhueta do troféu — a altura é a de sempre, porque é ela que
 * decide quanto o objeto ocupa da caixa quadrada do canvas e a caixa não pode
 * mudar de tamanho (CLS 0). `d` é a espessura, e agora ela é geometria de
 * verdade, não um número que ninguém via.
 *
 * `d` SUBIU DE 0,40 PARA 0,52 em 15/10, com o pedido do dono de "me traga 3d
 * das placas". A espessura só existe para quem a vê: com o bloco em repouso a
 * −16° de guinada (veja `REPOUSO`), a face lateral direita projeta
 * `d·sen 16° = 0,143` de largura na tela, uns 33 px na caixa de 600 — uma
 * FAIXA, que lê como bloco. Em 0,40 eram 25 px, e com o antigo repouso em zero
 * eram zero na metade do tempo. O preço é a `ESPESSURA_OPTICA` subir junto, e
 * com ela a torção na moldura: também isso é o pedido.
 */
const PLAQUE = { w: 2.06, h: 2.9, d: 0.52 };

/**
 * O bisel das bordas, em unidades de cena.
 *
 * Pequeno de propósito: num bloco de 2,06 × 2,9 um chanfro de 9 cm é o que uma
 * fresa de verdade tira do canto de uma peça de acrílico fundido. É esse
 * chanfro que acende quando a placa gira — a face frontal é plana e devolve a
 * luz sempre igual, o bisel é que pisca.
 *
 * Subiu de 0,075 para 0,09 e daí para 0,12 em 15/10, olhando a ilustração que o
 * dono aprovou: nela o chanfro é uma FAIXA branca larga em volta da face, não um
 * fio. Na tela, na caixa de 600 px, 0,12 dá dezesseis pixels de aresta acesa —
 * o bastante para o branco do bisel ler como um contorno de luz em vez de um
 * antialias, e para a lâmina de acrílico aparecer EM VOLTA da impressão (que
 * desde 15/10 está colada por fora, veja `ARTE_FRENTE`): é no bisel, na moldura
 * e nas laterais que a transparência passa a morar.
 */
const BISEL = 0.12;
/** Raio dos cantos da silhueta: arredondado, mas ainda um retângulo. */
const CANTO = 0.11;

/**
 * A FACE PLANA do bloco — e, desde 15/10, o quadro inteiro da impressão.
 *
 * O `ExtrudeGeometry` encolhe a silhueta em `BISEL` de cada lado antes de fechar
 * a tampa, então a face plana mede `w − 2·BISEL` por `h − 2·BISEL` = 1,82 × 2,66.
 * `FOLGA_FACE` tira um centésimo de cada lado disso: é o bastante para o plano
 * da tinta nunca esbarrar na primeira faceta do chanfro (que já começa a recuar
 * em z) e pouco o bastante para não abrir faixa nenhuma a olho — um centésimo
 * de cena é 1,1 px na caixa de 560.
 *
 * O QUE ISTO SUBSTITUIU, E POR QUE
 *
 * Havia aqui uma `JANELA` de 84% da face, e os 16% restantes eram uma "moldura
 * de cristal" deliberada. O veredito do dono em 15/10 matou a ideia: "as faixas
 * laranja acabam antes da borda do bloco". E ele está certo — na ilustração que
 * ele aprovou as barras laranja e a faixa WONE BOT correm ATÉ A QUINA da face
 * impressa; pará-las a 84% não é uma moldura, é um erro de impressão.
 *
 * A moldura não some com isso: ela mudou de lugar e agora é o BISEL — 0,12 de
 * acrílico limpo em volta, que na captura mede 10 px do lado que foge da câmera
 * e 20 do lado que vem (a guinada de repouso abre o chanfro direito e fecha o
 * esquerdo), e é onde uma peça de verdade tem cristal nu. E a transparência
 * continua inteira — a tinta é recortada, e por cada vazio dela se vê o chão da
 * seção, o aro e o pódio.
 *
 * A SANGRIA
 *
 * A arte do recorte tem proporção 0,646 e a face tem 0,682: a arte é mais
 * estreita que a face. Encaixada pela ALTURA (que é onde ela já chega inteira),
 * sobram 2,6% da largura de cada lado — e é aí que entra a sangria de
 * `encaixaNaFace`: com `ClampToEdgeWrapping`, a textura amostrada fora de
 * [0,1] devolve a COLUNA DA BORDA repetida. Onde a borda do recorte é faixa
 * laranja, a faixa segue até a quina; onde é vazio, nada é desenhado. É o
 * mesmo truque da margem de sangria de uma gráfica, e pelo mesmo motivo.
 */
const FOLGA_FACE = 0.01;
const FACE = {
  w: PLAQUE.w - BISEL * 2 - FOLGA_FACE * 2,
  h: PLAQUE.h - BISEL * 2 - FOLGA_FACE * 2,
};

/**
 * Quanto a impressão fica À FRENTE da face frontal — e esta é A CORREÇÃO DE
 * 15/10.
 *
 * Veredito do dono: "está muito ruim as placas na sessão prêmios… tire essa
 * opacidade". A arte estava DENTRO do bloco, 0,17 atrás da face. Dentro do
 * bloco ela só podia ser vista pela passada de transmissão, e a passada de
 * transmissão não devolve a cena atrás do vidro: devolve um MIPMAP dela,
 * escolhido pelo `roughness` do material —
 *
 *     sigma = π·r²/(1+r);  lod = log2(largura) + log2(sigma)
 *
 * — e amostrar reduzido é, literalmente, borrar. Some a isso o alvo da
 * transmissão rodar a meia resolução no celular e o resultado medido era o que
 * se vê em `.playwright-mcp/pr-crop.png`: a raposa pastosa e o numeral "100K"
 * virado mancha pálida. Não havia valor de `roughness` que resolvesse — abaixar
 * até zero mata o reflexo largo que faz o bloco existir sobre fundo escuro.
 *
 * Então a impressão SAIU do cristal e foi para cima dele: três milésimos à
 * frente da face, desenhada na passada NORMAL, com `meshBasicMaterial` e
 * `toneMapped` falso. O que chega à tela é o arquivo, pixel por pixel, com
 * anisotropia e mipmap — opaco, nítido e saturado, que é o pedido.
 *
 * Três milésimos e não três centésimos: é o bastante para não haver briga de z
 * com a face (a 0,52 de espessura, a precisão do depth buffer ali é de ordens
 * de grandeza menor) e pouco o bastante para a impressão continuar lendo como
 * tinta NA superfície, e não como um adesivo levantado — vista de esguelha, com
 * o bloco a 23° de guinada, essa folga projeta 0,001 na tela: nada.
 *
 * O acrílico não perdeu nada com isso. O que ele refrata deixou de ser a
 * impressão (que ele estragava) e passou a ser o fundo da vitrine, o aro do
 * pódio e o halo — na moldura em volta da arte, no bisel de 0,12 e nas duas
 * faces laterais, que é onde se olha para saber se um bloco é de vidro.
 */
const ARTE_FRENTE = 0.003;

/**
 * O piso da escala em que a máscara de dissolução vive.
 *
 * Nada a ver com a arte, que desde 15/10 é OPACA e não tem canal alfa (veja
 * `scripts/recorta-placas.mjs`): este número é só o fundo do intervalo em que a
 * máscara da troca de marco é desenhada, e o par dele é o `alphaTest` que varre
 * esse intervalo quadro a quadro. Não parte de zero de propósito — `alphaTest`
 * cruzando o zero muda o define `USE_ALPHATEST` e RECOMPILA o shader.
 */
const DISSOLVE_PISO = 0.5;

/* --------------------------------------------------------------------------
   A POSE DE REPOUSO

   Pedido do dono, 15/10: "me traga 3d das placas". Um bloco de frente para a
   câmera é um retângulo: a espessura existe na geometria e não chega ao olho.
   O repouso deixou de ser zero.

   `yaw` negativo gira o lado DIREITO na direção da câmera — a normal (1,0,0)
   vira (cos16°, 0, sen16°) = (0,96, 0, 0,28), com componente em +z: a face
   lateral direita fica visível o tempo inteiro, e com ela o bisel vertical
   daquele lado, que é o fio branco que a `Environment` acende. O balanço de ±7°
   nunca chega a zero (vai de −9° a −23°), então não existe um instante em que o
   bloco se achate.

   `pitch` negativo inclina o topo para trás: é a pose em que uma placa fica
   apoiada num pódio, e é ela que mostra o bisel de BAIXO, que a câmera baixa
   (veja a `camera` do Canvas) já estava olhando por fora.
   -------------------------------------------------------------------------- */
const REPOUSO = { yaw: -0.279, pitch: -0.07, balanco: 0.122 };

/**
 * Quanto a PEÇA (bloco, arte e sombra) encolheu no quadro.
 *
 * Pedido do dono, 15/10, depois de ver o palco de 600px: "diminua o tamanho:
 * placas, dorso. o pulso está ótimo".
 *
 * É uma `scale` no grupo da placa, e NÃO uma câmera mais afastada, porque as
 * duas coisas não encolhem o mesmo conjunto: afastar a câmera encolheria também
 * a joia vestida, e o pulso do 100K é justamente o que ele disse estar no
 * tamanho certo. Com a escala, a placa recua 15% e o pulso fica onde está.
 *
 * O pódio acompanha a placa (os números do `PODIO`, do `ARO`, da `BORDA` e da
 * `SOMBRA` já vêm multiplicados por 0,85): "mantenha o pódio proporcional" é o
 * pedido, e uma base do tamanho de ontem debaixo de uma placa 15% menor seria um
 * pires grande demais.
 */
const PECA = 0.85;

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
    /* Três anéis de bisel, não vinte: o chanfro tem de ser uma quina que
       acende, não uma borda macia que some. O `ExtrudeGeometry` sai sem índice
       e calcula normal por triângulo, então cada faixa do bisel é uma faceta
       plana — o facetado do dicionário vem daqui, de graça.
       Subiu de dois para três quando o bisel foi a 0,12: com dois anéis num
       chanfro largo, cada faceta cobria 22° de normal e a aresta acendia em
       dois degraus visíveis. Com três, as normais caem a 11°, 34° e 56° da
       face, e o fio branco corre pela quina em vez de pular. */
    bevelSegments: 3,
    curveSegments: 8,
  });

  /* O extrude nasce de z = 0 para a frente; isto centra o bloco na origem,
     que é onde o resto da cena (pódio, postos, travessia) o espera. */
  geo.translate(0, 0, -miolo / 2);

  BLOCO = geo;
  return geo;
}

/**
 * O limiar, em graus, acima do qual duas faces vizinhas viram uma ARESTA.
 *
 * Vinte graus separa o que é quina do que é curva. Os três anéis do bisel estão
 * a uns 22° um do outro e entram — é a quina acesa que se quer. Os oito
 * segmentos de cada canto arredondado estão a 11° e ficam de fora, senão o
 * contorno do bloco sairia desenhado como um polígono.
 */
const ARESTA_LIMIAR = 20;

/** As quinas do bloco, construídas uma vez e reusadas (como a geometria). */
let ARESTAS: EdgesGeometry | null = null;

function arestasDoBloco() {
  if (!ARESTAS) ARESTAS = new EdgesGeometry(blocoAcrilico(), ARESTA_LIMIAR);
  return ARESTAS;
}

/**
 * As mesmas quinas, em geometria de FITA — uma instância por aresta, que o
 * `LineSegments2` expande em quadrilátero no espaço de tela.
 *
 * Construída uma vez, como a malha: `fromEdgesGeometry` só copia o array de
 * posições do `EdgesGeometry`, e nada aqui depende de prop nenhuma.
 */
let LINHAS: LineSegmentsGeometry | null = null;

function linhasDoBloco() {
  if (!LINHAS) LINHAS = new LineSegmentsGeometry().fromEdgesGeometry(arestasDoBloco());
  return LINHAS;
}

/**
 * A ESPESSURA DO FIO, em pixels de CSS.
 *
 * Não é "um pixel" por acaso: 1,4. O `lineBasicMaterial` que estava aqui antes
 * desenhava um pixel de DISPOSITIVO (o WebGL ignora `gl.lineWidth`), e num
 * retina isso é meio pixel de CSS — fino demais para ser um fio de luz e, sem
 * nenhuma suavização, serrilhado em toda diagonal. Em 1,4 px de CSS o fio tem
 * corpo, e como o `LineSegments2` desenha um quadrilátero de verdade, quem
 * suaviza a borda dele é o MSAA do canvas.
 */
const LINHA_PX = 1.4;

/**
 * As duas forças da aresta: a de trás e a da frente.
 *
 * Todas as quinas desenhadas com a mesma opacidade davam um ARAME — as arestas
 * do fundo do bloco chegavam à tela tão acesas quanto as da frente, e o olho,
 * que lê linha clara como "perto", via a peça virada do avesso.
 *
 * Num acrílico de verdade a quina de trás é vista ATRAVÉS de meio centímetro de
 * material e chega mais fraca. Aqui isso vira duas passadas sobre a mesma
 * geometria: `fraca` desenha todas as quinas, `forte` repassa só as que estão à
 * frente do corpo do bloco (veja o pré-passe de profundidade, lá no JSX). Nas
 * da frente as duas somam, e a conta de mistura dá 0,895 — um fio a mais de
 * brilho que os 0,8 de antes, contra os 0,3 do que está atrás.
 */
const ARESTA_FRACA = 0.3;
const ARESTA_FORTE = 0.85;

/**
 * A CASCA DE FRESNEL: o clareado das rasantes.
 *
 * Um acrílico real não reflete igual em todo lugar. A refletância de Schlick
 * sobe de 4% de frente para quase 100% na rasante, e é por isso que, numa foto
 * de produto, o bisel e as duas laterais do bloco SEMPRE aparecem mais claros
 * que o meio da face — mesmo sem nenhuma luz apontada para eles. O bloco daqui
 * não tinha esse degrau: `envMapIntensity` dá o reflexo do estúdio, mas não dá
 * a curva.
 *
 * Então vem uma casca: a MESMA geometria, com um shader que só calcula
 * `(1 − N·V)³` e soma creme quente por cima. Expoente 3 e não 5 (o de Schlick)
 * porque 5 concentra tudo nos últimos graus e some; 3 abre a curva o bastante
 * para o chanfro inteiro responder quando o bloco balança os ±7°.
 *
 * `k` em 0,35 é o teto do efeito: na face frontal, que olha quase de frente,
 * `N·V` fica em 0,96 e o acréscimo é de 6 centésimos de milésimo — nada, que é
 * o que tem de ser, porque qualquer véu ali é regressão. Nas laterais `N·V` cai
 * a 0,28 e o acréscimo vai a 0,13: um clareado, não um halo.
 *
 * O creme é o mesmo da família do estúdio (#FFF3DF). Branco puro no meio de luz
 * quente lê como azulado — é a mesma razão do `BRANCO` lá de cima.
 */
const FRESNEL = { cor: "#FFF3DF", k: 0.35, expoente: 3 };

const FRESNEL_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    /* O olho está na origem do espaço de visão, então a direção para ele é
       simplesmente o oposto da posição do vértice. */
    vVista = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRESNEL_FRAG = /* glsl */ `
  uniform vec3 cor;
  uniform float forca;
  varying vec3 vNormal;
  varying vec3 vVista;
  void main() {
    float rasante = 1.0 - max(dot(normalize(vNormal), normalize(vVista)), 0.0);
    float a = pow(rasante, ${FRESNEL.expoente}.0) * forca;
    /* A mistura aditiva já multiplica pelo alfa; o RGB sai cru. */
    gl_FragColor = vec4(cor, a);
    /* Os dois includes existem porque um ShaderMaterial não ganha conversão de
       espaço de cor de graça: sem o segundo, o creme (que o Color guarda em
       linear) iria para um alvo sRGB sem conversão e sairia escuro. Com
       toneMapped falso o primeiro vira um bloco vazio — está aqui para que
       ligar o tone mapping um dia não quebre em silêncio. */
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * A VARREDURA DE LUZ: o reflexo de estúdio que atravessa a face.
 *
 * O que falta a um bloco parado não é brilho, é EVENTO. Numa vitrine de
 * verdade, quem passa em frente ao acrílico vê a chapa do estúdio correr pela
 * face — e é esse movimento, mais do que qualquer gradiente fixo, que diz
 * "isto é polido".
 *
 * `ciclo` 7 s porque o ciclo da própria cena é 5,8 s (veja `TROCA`): um número
 * que não divide o outro mantém a varredura caindo em momentos diferentes do
 * rodízio, e ela nunca vira parte do compasso. `travessia` 1,2 s é a duração de
 * um gesto — abaixo disso lê como piscada, acima como animação.
 *
 * `pico` 0,15 na mistura aditiva — e a primeira medida foi 0,18, com uma faixa
 * larga. Na captura aquilo virou uma MANCHA CINZA cobrindo meia face: sobre o
 * cristal vazio (onde se vê o chão a 18 de luminância) a soma levava o pixel a
 * 64, e o que o olho leu foi véu, que é exatamente a palavra que o dono já usou
 * três vezes nesta seção. Reflexo de estúdio não é neblina: é um RISCO. Então a
 * faixa estreitou (veja as gaussianas de `mapaDaVarredura`) e o pico desceu —
 * agora o núcleo tem uns 12 px na tela, a aba uns 38, e sobre o vazio o creme
 * chega a 56. Vê-se passar; não se vê parar.
 *
 * `inicio` e `curso` são o deslocamento da textura, e os números saem de uma
 * conta. A textura cobre DUAS vezes a largura da face (`repeat.x` 0,5), então
 * o centro da faixa (que mora em u = 0,5) cai na face em
 * `x = 2·(0,5 − offset)`. Para a faixa nascer fora do quadro à esquerda
 * (x = −0,4) e morrer fora à direita (x = 1,4), o deslocamento vai de 0,7 a
 * −0,2: `inicio` 0,7, `curso` 0,9. Nas duas pontas o que a face amostra é a
 * coluna preta da borda da textura, e nada é somado.
 */
const VARREDURA = { ciclo: 7, travessia: 1.2, pico: 0.15, inicio: 0.7, curso: 0.9 };

/** A faixa de luz, desenhada uma vez em `DataTexture` (como as outras daqui). */
let VARREDURA_MAPA: DataTexture | null = null;

function mapaDaVarredura() {
  if (VARREDURA_MAPA) return VARREDURA_MAPA;

  const N = 256;
  const M = 128;
  const dados = new Uint8Array(N * M * 4);

  /* A inclinação da faixa, em unidades de u por unidade de v. Com `repeat.x`
     0,5 um passo de 0,267 em u é meia largura de face ao longo da altura
     inteira — uns 20° da vertical na tela, que é a inclinação de um softbox de
     estúdio visto de frente. */
  const INCLINACAO = 0.267;

  for (let y = 0; y < M; y++) {
    const v = y / (M - 1);
    const centro = 0.5 + INCLINACAO * (v - 0.5);
    for (let x = 0; x < N; x++) {
      const u = x / (N - 1);
      const d = u - centro;
      /* Duas gaussianas: a larga é o derramado do softbox, a estreita é o
         núcleo. Somadas com pesos que fecham em 1 no centro.

         Os sigmas saem de uma conta na tela, não do olho: a textura cobre duas
         larguras de face, e a face tem uns 222 px na caixa de 560 — então um
         sigma de 1 em u vale 444 px. Em 0,085 e 0,028 a aba fica em 38 px e o
         núcleo em 12, que é um RISCO atravessando um quarto da face. (Os
         primeiros números, 0,19 e 0,055, davam 84 e 24 px: aquilo cobria meia
         placa de cinza e lia como véu — veja `VARREDURA`.) */
      const larga = Math.exp(-((d / 0.085) ** 2));
      const nucleo = Math.exp(-((d / 0.028) ** 2));
      /* E uma janela que zera as duas bordas da textura: é a coluna da borda
         que o `ClampToEdgeWrapping` repete enquanto a faixa está fora do
         quadro, e ela tem de ser preto cravado para a soma não acender nada. */
      const janela =
        Math.min(1, Math.max(0, (u - 0.04) / 0.04)) *
        Math.min(1, Math.max(0, (0.96 - u) / 0.04));
      const g = (0.38 * larga + 0.62 * nucleo) * janela;
      const i = (y * N + x) * 4;
      dados[i] = Math.round(255 * g);
      dados[i + 1] = Math.round(246 * g);
      dados[i + 2] = Math.round(228 * g);
      dados[i + 3] = 255;
    }
  }

  const textura = new DataTexture(dados, N, M, RGBAFormat);
  textura.colorSpace = SRGBColorSpace;
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  /* Gradiente puro, sem detalhe: mipmap só gastaria memória. */
  textura.generateMipmaps = false;
  textura.wrapS = ClampToEdgeWrapping;
  textura.wrapT = ClampToEdgeWrapping;
  /* Meia textura por vez: é a folga em que a faixa entra e sai do quadro. */
  textura.repeat.set(0.5, 1);
  textura.needsUpdate = true;

  VARREDURA_MAPA = textura;
  return textura;
}

/**
 * A máscara que desfaz a arte que sai.
 *
 * POR QUE NÃO É UM CROSSFADE DE OPACIDADE
 *
 * Duas artes meio transparentes, uma sobre a outra, somam-se: por meio segundo
 * veem-se as duas raposas ao mesmo tempo, e o numeral de um marco atravessado
 * pelo do outro. É o que uma impressão nunca faz.
 *
 * `alphaTest` resolve: o que desaparece são fragmentos descartados um a um, e
 * cada pixel está inteiramente numa arte ou inteiramente na outra. Esta textura
 * é o mapa que diz a ORDEM do descarte — uma rampa na diagonal somada a um ruído
 * suave, então a arte velha se desfaz numa onda irregular e a nova aparece por
 * baixo.
 *
 * POR QUE OS VALORES VIVEM EM [0,5 … 1] E NÃO EM [0 … 1]
 *
 * O shader multiplica: `diffuseColor.a = map.a * alphaMap.g`. A arte é opaca
 * (`map.a` = 1), então quem manda é só esta máscara, e o limiar varre o
 * intervalo em que ela foi desenhada: sai de 0,501 (quase tudo passa) e sobe
 * até 1,001 (nada passa).
 *
 * A escala começa na metade e não em zero porque `alphaTest` cruzando o zero
 * muda o define `USE_ALPHATEST` e RECOMPILA o shader — e recompilar a cada
 * quadro é o jeito mais caro possível de fazer isto.
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
      const valor = DISSOLVE_PISO + (1 - DISSOLVE_PISO) * onda;
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
 * O tom do vidro, a partir do `accent` do marco.
 *
 * O `accent` cru não serve: ele é a cor do MATERIAL do troféu no dicionário —
 * bronze no 10K, cristal no 100K, ouro no 500K, o laranja da marca no 1M —, e
 * num corpo que cobre a face inteira do objeto essa cor chapada vira um filtro
 * colorido por cima da impressão. Medido quando o bloco ainda usava
 * `attenuationColor`: o 1M saía com o creme do numeral em amarelo-limão.
 *
 * Puxado 96% na direção do branco, o mesmo tom vira o que se queria: um sopro
 * de cor no vidro, do tipo que só se percebe comparando um prêmio com o outro.
 * Com os 12% de opacidade do corpo (veja o material do bloco), o que chega à
 * tela é um décimo disso — o marco tinge o vidro, não a arte.
 *
 * O branco de destino é QUENTE (#FFFBF4), não o 255 puro: o estúdio desta cena
 * é creme (veja os `Lightformer`), e um vidro neutro no meio de luz quente lê
 * como azulado.
 */
const ACRILICO_TOM = 0.96;
const BRANCO = /*@__PURE__*/ new Color("#fffbf4");

function tomDoAcrilico(accent: string) {
  return new Color(accent).lerp(BRANCO, ACRILICO_TOM);
}

/* --------------------------------------------------------------------------
   O que fica ATRÁS do bloco — e por que agora é QUASE NADA

   Houve aqui um plano de fundo: `AURA`, um halo claro de 11 × 9 em z = −2,6,
   com um gradiente elíptico quente desenhado em `DataTexture`. Ele existia por
   um motivo honesto: um sólido transparente sobre o nada devolve o nada, e o
   bloco lia como laje escura.

   O dono matou a ideia em 15/10, junto com o papel marfim da impressão: "tira
   esse fundo opaco das placas e o fundo branco das placas". E ele estava certo
   duas vezes. Enquanto a arte era um retângulo OPACO no meio da face, o cristal
   só tinha a moldura em volta para provar que era cristal, e a moldura precisava
   de um campo claro atrás — daí o halo. Com a impressão recortada em tinta, o
   vazio ENTRE as letras virou vidro: há cristal entre cada perna da raposa e
   dentro de cada "0" do numeral, e a prova de transparência passou a estar no
   meio da peça, onde o olho já estava olhando.

   Aí o halo deixou de ajudar e passou a atrapalhar: era uma mancha clara de
   quase um terço do quadrado, e tudo o que se via pelos vazios da tinta era ela.
   O fundo agora é o `--floor` da seção, sem um plano sequer — o canvas é
   limpo com a cor da seção (veja `fundoDaSecao`, que continua: ela também é o
   que impede o three de limpar o alvo da transmissão com branco a 50%).

   Do que ficou atrás do bloco, sobrou o que o dono deixou passar: o aro de luz
   do pódio (veja `ARO`), cujo arco de trás atravessa o cristal. Linha clara
   que entra no vidro e sai deslocada é a prova mais barata e mais honesta de
   refração que existe, e ela cabe num fio de 7 centésimos.
   -------------------------------------------------------------------------- */

/**
 * A cor de fundo da seção que hospeda o canvas, lida do próprio DOM.
 *
 * POR QUE O CANVAS É PINTADO E NÃO TRANSPARENTE
 *
 * Não é o fundo que o `--floor` já dá: é a mesma cor, no mesmo lugar. O que ela
 * resolve é o CANAL ALFA.
 *
 * A face do bloco soma o reflexo em vez de cobrir o que está atrás (veja o
 * material do bloco). Mistura aditiva soma TAMBÉM NO ALFA — e num canvas limpo
 * com alfa zero, quem está "atrás" é a página, pelo compositor do navegador:
 * `resultado = canvasRGB + páginaRGB·(1 − canvasA)`. A face então subia o alfa
 * do canvas para perto de 1 com um RGB quase preto (o reflexo é fraco), e o
 * chão da seção parava de aparecer: medido, o miolo do bloco saía a 5 de
 * luminância contra os 18 do chão em volta. O vidro virava um buraco — mais
 * escuro que o fundo, que é o avesso de transparente.
 *
 * Limpando o canvas com a cor da seção e alfa 1, a soma acontece sobre um fundo
 * de verdade dentro do próprio WebGL, e o compositor não tem mais nada a
 * decidir. A cor não é constante escrita aqui: é lida do primeiro ancestral com
 * fundo próprio, então o token `--floor` continua morando num lugar só.
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
 * O aro de luz no topo do pódio.
 *
 * Raio um fio menor que a silhueta do bloco (0,876 de meia-largura depois de
 * `PECA`, 0,892 projetados com a guinada de repouso), então o aro corre por TRÁS
 * dele em vez de contorná-lo: o arco da frente aparece abaixo da aresta de baixo
 * do bloco, o arco de trás entra no cristal, pela faixa limpa de baixo. É ali que
 * a refração tem palco — e desde que o halo do fundo saiu, é a única prova de
 * refração que sobrou nesta cena.
 *
 * Os números são os mesmos de antes multiplicados por `PECA`: o aro é do pódio,
 * que vive FORA do grupo em escala, então ele não encolhe sozinho.
 *
 * `meshBasicMaterial` sem tone mapping: é uma luz embutida na base, não uma
 * superfície iluminada, e tem de sair da tela com o creme que está escrito
 * aqui. Opaco também importa — a passada de transmissão só desenha opacos, e um
 * aro transparente sumiria justamente de dentro do vidro, que é onde ele serve.
 */
const ARO = { raio: [0.841, 0.898] as const, cor: "#F7E2BE" };

/**
 * A BORDA DE LUZ do pódio: o segundo aro, na quina de cima do cilindro.
 *
 * Pedido de 15/10 ("o pódio um pouco mais largo e com a borda de luz"). O aro
 * de dentro existe para ser REFRATADO; este existe para DESENHAR o pódio: um
 * fio claro na quina onde a tampa encontra a saia, que é o que separa a base do
 * chão escuro da vitrine sem precisar de uma régua. Mais fraco que o de dentro,
 * e a 1,5 px de espessura na caixa de 600 — um fio, não um anel.
 *
 * 1,037 é o `topo` do `PODIO` (declarado lá embaixo, depois deste): mexeu lá,
 * mexa aqui — um fio de luz que não cai na quina é um anel solto na tampa.
 */
const BORDA = { raio: [1.007, 1.037] as const, cor: "#C9B193" };

/**
 * A SOMBRA DE CONTATO: a elipse escura que o bloco deixa no pódio.
 *
 * Sem ela o troféu PAIRA. O vão que o dono pediu entre a placa e o pódio
 * (`ENCAIXE`) resolveu um problema e criou outro: dois objetos separados por ar,
 * sobre um disco iluminado por igual, não têm como dizer qual está sobre qual.
 * A mancha escura embaixo é o que amarra os dois — é a única pista de que
 * existe um corpo acima do pódio, e o olho a lê antes de qualquer reflexo.
 *
 * Deitada no pódio e NÃO no `group` dele: a sombra acompanha a PLACA, que
 * reveza os postos com a joia vestida. Quando a placa sai do pódio a sombra sai
 * junto, e some por `opacity` conforme o bloco se afasta do eixo da base (veja
 * o `useFrame` de `Plaque`) — sombra em cima do nada seria a mancha flutuante
 * que ela veio desmentir.
 *
 * `w` maior que `h` porque é uma projeção: um bloco de 2,06 de largura visto de
 * cima deixa no chão uma elipse larga e rasa, achatada pelo ângulo da luz
 * principal.
 */
const SOMBRA = { w: 2.35, h: 0.95, forca: 0.72, alcance: 0.95 };

/** A textura da sombra, construída uma vez: preta, com alfa em elipse macia. */
let SOMBRA_MAPA: DataTexture | null = null;

function mapaDaSombra() {
  if (SOMBRA_MAPA) return SOMBRA_MAPA;

  const N = 64;
  const dados = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x / (N - 1) - 0.5) * 2;
      const dy = (y / (N - 1) - 0.5) * 2;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      /* O núcleo da sombra é mais escuro que a borda e a queda é de quinta
         ordem, como a do halo: uma rampa linear deixa um anel visível onde a
         mancha termina, e o anel denuncia que aquilo é um decalque. */
      const q = 1 - r;
      const k = q * q * q * (q * (q * 6 - 15) + 10);
      const i = (y * N + x) * 4;
      dados[i] = 0;
      dados[i + 1] = 0;
      dados[i + 2] = 0;
      dados[i + 3] = Math.round(k * 255);
    }
  }

  const textura = new DataTexture(dados, N, N, RGBAFormat);
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  textura.generateMipmaps = false;
  textura.wrapS = ClampToEdgeWrapping;
  textura.wrapT = ClampToEdgeWrapping;
  textura.needsUpdate = true;

  SOMBRA_MAPA = textura;
  return textura;
}

/**
 * Tamanho de um plano que mostra uma textura inteira, no estilo
 * `object-fit: contain`: a imagem nunca é cortada nem esticada — quem muda de
 * proporção é o plano.
 *
 * Serve às FOTOS das joias, que têm proporções diferentes entre si e não podem
 * ser cortadas. A arte da placa não passa mais por aqui: o plano dela é fixo
 * (`FACE`) e quem se ajusta é a textura, por sangria (veja `encaixaNaFace`).
 */
function planeSize(
  texture: Texture,
  maxW: number,
  maxH: number,
): [number, number] {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image?.height) return [maxW, maxH];

  const ratio = image.width / image.height;
  return ratio > maxW / maxH ? [maxW, maxW / ratio] : [maxH * ratio, maxH];
}

/**
 * Encaixa uma arte na face do bloco pela ALTURA, sangrando a largura.
 *
 * O plano da tinta tem o tamanho da face e não muda; quem se ajusta é a matriz
 * de UV da textura. `repeat.x = proporçãoDaFace / proporçãoDaArte` passa de 1
 * quando a arte é mais estreita que a face, e o `offset` centra o que sobra —
 * com isso a amostragem sai de [0,1] nas duas beiradas e, por
 * `ClampToEdgeWrapping`, devolve a coluna da borda repetida. A faixa laranja
 * que morria no corte segue até a quina; o vazio segue vazio.
 *
 * (Se um dia a arte vier MAIS LARGA que a face, a mesma conta dá `repeat.x`
 * menor que 1 e o excedente é cortado em vez de sangrado — que é o
 * comportamento certo para o outro lado do erro.)
 *
 * Idempotente de propósito: é chamada no corpo do render, a cada quadro, sobre
 * texturas que vêm de um cache compartilhado.
 */
function encaixaNaFace(texture: Texture) {
  const image = texture.image as { width: number; height: number } | undefined;
  if (!image?.width || !image?.height) return;

  const escala = FACE.w / FACE.h / (image.width / image.height);
  if (texture.repeat.x === escala) return;

  texture.repeat.set(escala, 1);
  texture.offset.set((1 - escala) / 2, 0);
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
 *
 * APERTARAM em 15/10, de ±1,25 para ±1,02, e quem mandou foi a câmera. Com ela a
 * 6,4 (veja o `Canvas`), a meia-largura visível em z = 0 caiu de 2,51 para 2,21.
 * Nos postos antigos o pódio saía pela borda esquerda e a placa pela direita —
 * foi o que a primeira captura mostrou.
 *
 * Com a peça em `PECA` as contas sobraram: o bloco girado projeta 0,892, o busto
 * do 500K (já em 0,80) projeta 0,96 e o pódio 1,122, então no posto da direita o
 * mais largo dos três chega a 2,01 contra os 2,21 do quadro. A troca anda 2,05 —
 * mais que a largura inteira da placa: continua sendo inconfundivelmente uma
 * troca de lugar.
 */
const POSTO = { esq: -1.0, dir: 1.05 };

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
 *
 * Alargou em 15/10 ("capriche na disposição dessa sessão"), de 1,15/1,30 para
 * 1,22/1,32 — e depois ENCOLHEU com a placa: estes 1,037/1,122 são aqueles
 * mesmos números multiplicados por `PECA` (0,85), porque o segundo pedido do dia
 * foi "diminua o tamanho: placas" com o pódio proporcional.
 *
 * O bloco tem 1,03 de meia-largura, 0,876 depois da escala, e girado a −23°
 * projeta 0,892; o topo em 1,037 deixa 0,145 de cada lado — base, não pires —, e
 * a borda de luz (a `BORDA`) ganha a quina onde correr sem encostar na silhueta
 * do cristal.
 *
 * E ficou MAIS BAIXO e mais achatado (0,221 de altura em y = −1,58, contra 0,30
 * em −1,72). Não é gosto: com a câmera mais perto e abaixo do eixo, a quina da
 * frente da base é o ponto mais próximo da lente em toda a cena, e o tronco de
 * visão ali é estreito — nos números antigos ela caía 8% ABAIXO da borda de
 * baixo do quadrado. Emagrecendo e descendo o cilindro, a base inteira cabe no
 * quadro com a quina da frente a 4,8% do fundo. É nessa linha que o horizonte de
 * 1px da `AwardsShowcase` é desenhado — mexeu aqui, mexa lá.
 */
const PODIO = { y: -1.58, altura: 0.221, topo: 1.037, base: 1.122 };
const PODIO_TOPO = PODIO.y + PODIO.altura / 2;

/**
 * Quanto o bloco fica ACIMA do pódio.
 *
 * O bloco tem 2,9 de altura centrado na origem (base em −1,45) e o topo do
 * pódio está em −1,57. Numa versão anterior ele afundava 0,2 na base, para o
 * aro iluminado passar por trás do cristal; o dono pediu em 14/10 o contrário
 * — "afaste um pouco (talvez um margin-padding) a placa do pódio" — e repetiu
 * em 15/10, "afaste o pódio com (margin:padding) para baixo em alguns pixels
 * (não muitos)".
 *
 * Valor negativo aqui levanta o bloco. Com o pódio em −1,58 e 0,221 de altura, o
 * topo dele está em −1,4695; o bloco, já em escala `PECA`, tem 1,2325 de
 * meia-altura, e −0,033 põe a base dele a 0,27 do topo do pódio. "Alguns, não
 * muitos" é isto: o bastante para o olho ver ar entre as duas peças, pouco o
 * bastante para o bloco continuar POUSADO no pódio em vez de pairar sobre ele —
 * e é a SOMBRA DE CONTATO (veja `SOMBRA`), que nasceu junto com esse vão, que
 * faz o olho ler "apoiado" em vez de "flutuando".
 *
 * O aro de luz não se mexe (ele é do pódio, e o pódio ficou onde estava), mas o
 * arco de trás sobe no enquadramento junto com a aresta de baixo do cristal e
 * continua entrando na moldura — que é o que ele existe para fazer.
 */
const ENCAIXE = -0.033;

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
 * Em 0,73 a foto media 1,74 × 2,63 — ainda da altura do bloco inteiro, e o dono
 * voltou ao assunto em 15/10: "diminua o pulso". Em 0,58 ela mede 1,40 × 2,09,
 * uns 72% da altura da placa: um antebraço ao lado do troféu, que é a proporção
 * que a cena quer dizer, e não um segundo cartaz do mesmo tamanho.
 *
 * O `y` vem da conta, não do olho:
 *
 *   PODIO_TOPO (−1,57) + FOLGA (0,34) + metade da altura (1,044) + o flutuar
 *   (FLOAT.sobe, 0,085) = −0,101
 *
 * — a parcela do flutuar porque a peça sobe e desce no ar, e a base não pode
 * encostar no pódio nem no ponto mais baixo do movimento. A FOLGA continua em
 * 0,34, que é o ar que o dono pediu em 14/10 entre o pulso e o pódio: encolher
 * a foto não é motivo para ela descer.
 */
const VESTIDA_ESCALA: Record<string, number> = {
  "pulseira-100k-vestida": 0.58,
  /* O dorso do 500K, 15/10: "diminua o tamanho: placas, dorso. o pulso está
     ótimo". No teto cheio a foto media 2,40 × 3,60 — mais ALTA que o bloco
     inteiro (2,9) e, depois de a placa encolher para `PECA`, meio metro de cena
     mais alta que ela. Dois objetos lado a lado em que o acessório é maior que o
     troféu dizem a coisa errada. Em 0,80 o busto fica em 1,92 × 2,88, uns 17%
     acima da placa em altura e com a mesma meia-largura: um par, não uma
     disputa. O pulso NÃO muda — ele é o que estava certo. */
  "colar-500k-vestido": 0.8,
};
/** Quanto a base da foto fica acima do topo do pódio, no mínimo. */
const FOLGA_PODIO = 0.34;

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
  /* E a borda GRAMPEADA, que também é o padrão e aqui é regra: é dela que sai a
     sangria da arte na face (veja `encaixaNaFace`) — fora de [0,1] a amostragem
     devolve a coluna da borda em vez de dar a volta pela outra ponta. */
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
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
  photo,
  worn,
  spin,
  reduced,
}: {
  accent: string;
  art: { prev: Texture | null; curr: Texture | null };
  fotos: { prev: Texture | null; curr: Texture | null };
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
  /** A sombra de contato, que só aparece com a placa sobre o pódio. */
  const matSombra = useRef<MeshBasicMaterial>(null);
  /** A faixa de luz que atravessa a face (veja `VARREDURA`). */
  const varredura = useRef<Mesh>(null);
  const matVarredura = useRef<MeshBasicMaterial>(null);
  const fade = useRef(0);

  const geometria = useMemo(() => blocoAcrilico(), []);
  const mascara = useMemo(() => mascaraDissolucao(), []);
  const sombra = useMemo(() => mapaDaSombra(), []);
  const brilho = useMemo(() => mapaDaVarredura(), []);
  const tom = useMemo(() => tomDoAcrilico(accent), [accent]);
  /* O quadro e o posto da joia vestida desta foto (veja `vestida`). */
  const vest = useMemo(() => vestida(photo), [photo]);

  /* AS DUAS PASSADAS DE ARESTA.
     Construídas à mão e não em JSX porque `LineSegments2` e `LineMaterial` não
     são elementos que o r3f conheça: declará-los pediria um `extend` global e a
     declaração de tipos que vem com ele. Dois objetos, uma geometria só — é a
     mesma fita de quinas desenhada duas vezes, com opacidades diferentes. */
  const linhas = useMemo(() => {
    const comum = {
      color: 0xfff6e0,
      linewidth: LINHA_PX,
      /* Largura em pixels de tela, não em unidades de cena: a quina de um
         acrílico não engorda quando a peça se aproxima. */
      worldUnits: false,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      /* Desligado de propósito. Com `alphaToCoverage` o alfa vira COBERTURA de
         amostras, e uma linha a 0,3 sairia pontilhada em 30% das amostras em
         vez de translúcida. Sem ele o quadrilátero é geometria comum e quem
         suaviza a borda é o MSAA do canvas, que já está ligado. */
      alphaToCoverage: false,
    };
    const fraca = new LineMaterial({ ...comum, opacity: ARESTA_FRACA });
    const forte = new LineMaterial({ ...comum, opacity: ARESTA_FORTE });
    const fita = linhasDoBloco();
    return {
      fraca,
      forte,
      atras: new LineSegments2(fita, fraca),
      frente: new LineSegments2(fita, forte),
    };
  }, []);

  /* O `LineMaterial` converte a largura em pixels para espaço de clipe usando o
     tamanho do canvas — sem isto a linha nasce com a largura errada e muda
     sozinha quando a janela muda. O tamanho é o de CSS (que é o que o material
     espera), então o fio tem 1,4 px em qualquer `dpr`. */
  const tela = useThree((estado) => estado.size);
  useEffect(() => {
    linhas.fraca.resolution.set(tela.width, tela.height);
    linhas.forte.resolution.set(tela.width, tela.height);
  }, [linhas, tela.width, tela.height]);

  /* Os dois materiais nascem aqui e não no r3f (`dispose={null}` nos
     `primitive`), então é daqui que eles saem. */
  useEffect(
    () => () => {
      linhas.fraca.dispose();
      linhas.forte.dispose();
    },
    [linhas],
  );

  /* Os uniformes da casca de Fresnel: um objeto só, para o material não ser
     reconstruído a cada quadro. */
  const fresnel = useMemo(
    () => ({
      cor: { value: new Color(FRESNEL.cor) },
      forca: { value: FRESNEL.k },
    }),
    [],
  );

  /* Arte nova em cena: a dissolução recomeça do zero. */
  useEffect(() => {
    fade.current = 0;
  }, [art.curr]);

  useFrame((state, delta) => {
    if (group.current) {
      /* A pose de repouso (veja `REPOUSO`) mais um balanço de ±7° que nunca
         chega a zero: a guinada passeia entre −9° e −23°, então a face lateral
         direita e o bisel ficam acesos o tempo inteiro e a face impressa nunca
         sai de frente para quem lê. O cursor empurra menos que antes (0,2 em vez
         de 0,28) porque agora ele soma a uma pose que já é oblíqua. */
      const sway = spin ? Math.sin(state.clock.elapsedTime * 0.45) * REPOUSO.balanco : 0;
      group.current.rotation.y = REPOUSO.yaw + sway + state.pointer.x * 0.2;
      group.current.rotation.x = REPOUSO.pitch - state.pointer.y * 0.12;
    }

    /* O outro lado do rodízio. Quando não há joia vestida para revezar, a
       placa fica no meio do quadro e nada disto roda. */
    if (palco.current && worn && !reduced) {
      const lugar = posto(state.clock.elapsedTime, 0);
      palco.current.position.x = lugar.x;
      palco.current.position.z = lugar.z;
    }

    /* A sombra de contato só existe sobre o pódio (veja `SOMBRA`): some
       conforme a placa se afasta do eixo da base, e volta quando ela retorna.
       O pódio fica no posto da esquerda quando há joia vestida para revezar, e
       no meio quando não há. */
    if (matSombra.current) {
      const eixo = worn ? POSTO.esq : 0;
      const longe = Math.abs((palco.current?.position.x ?? eixo) - eixo);
      const perto = Math.max(0, 1 - longe / SOMBRA.alcance);
      matSombra.current.opacity = SOMBRA.forca * perto * perto;
    }

    /* A VARREDURA DE LUZ (veja `VARREDURA`): a faixa do estúdio atravessando a
       face a cada 7 s.

       Só `offset` de textura e `opacity` — nenhuma geometria se mexe, nenhum
       material recompila. Fora da travessia o plano sai do laço de desenho pelo
       `visible`, e com movimento reduzido (ou com a cena pausada, que é o mesmo
       `spin`) ele nem chega a aparecer: a face volta a ser só reflexo parado. */
    if (varredura.current && matVarredura.current) {
      const fase = spin ? (state.clock.elapsedTime % VARREDURA.ciclo) / VARREDURA.travessia : 2;
      const passando = fase <= 1;
      varredura.current.visible = passando;
      if (passando) {
        /* `suave` nas duas pontas: a faixa entra e sai desacelerando, como um
           reflexo que acompanha alguém passando em frente à vitrine.

           O mapa vem do próprio material e não da variável do render: é a mesma
           textura, e assim o que se mexe quadro a quadro é só o que está
           pendurado na cena. */
        const mapa = matVarredura.current.map;
        if (mapa) mapa.offset.x = VARREDURA.inicio - VARREDURA.curso * suave(fase);
        /* E um seno na opacidade, para a faixa nascer e morrer no escuro em vez
           de aparecer cravada na borda do quadro. */
        matVarredura.current.opacity = VARREDURA.pico * Math.sin(Math.PI * fase);
      }
    }

    /* A arte que sai se desfaz pela máscara (veja `mascaraDissolucao`): o
       limiar varre a metade de cima da escala, que é onde a máscara vive. */
    fade.current = Math.min(1, fade.current + delta / CROSSFADE_S);
    const limiar = DISSOLVE_PISO + 0.001 + (1 - DISSOLVE_PISO) * fade.current;
    if (matSaindoFrente.current) matSaindoFrente.current.alphaTest = limiar;
    if (matSaindoVerso.current) matSaindoVerso.current.alphaTest = limiar;
    const aindaSaindo = fade.current < 1;
    if (saindoFrente.current) saindoFrente.current.visible = aindaSaindo;
    if (saindoVerso.current) saindoVerso.current.visible = aindaSaindo;
  });

  /* Onde a impressão fica: um fio À FRENTE da face (veja `ARTE_FRENTE`).

     A face frontal plana do `ExtrudeGeometry` está em z = +d/2 — o bisel ocupa
     `BISEL` em cada ponta da extrusão e o miolo é `d − 2·BISEL`, então o bloco
     fecha exatamente em `d` e, centrado, vai de −d/2 a +d/2. (O cálculo antigo
     subtraía o bisel de novo e punha a arte 0,17 atrás da face: era metade do
     borrão.) */
  const arteZ = PLAQUE.d / 2 + ARTE_FRENTE;
  /* A sombra de contato, em coordenadas do `palco`.

     O grupo está em `-ENCAIXE` e tem `scale` `PECA`, então um filho em `y` local
     chega ao mundo em `-ENCAIXE + y·PECA`. Invertendo para o ponto que interessa
     (um fio acima do topo do pódio) sai a conta abaixo — e ela é feita aqui, e
     não a olho, porque dois dos três números mudaram no mesmo dia. */
  const sombraY = (PODIO_TOPO + 0.012 + ENCAIXE) / PECA;

  /* A sangria da arte na face (veja `encaixaNaFace`): a matriz de UV de cada
     textura, ajustada no corpo do render porque é aqui que se sabe que a imagem
     já chegou. Idempotente e de duas comparações — mais barato que um efeito,
     que só rodaria DEPOIS do primeiro quadro e deixaria um quadro com a arte
     fora de escala. */
  if (art.curr) encaixaNaFace(art.curr);
  if (art.prev) encaixaNaFace(art.prev);

  return (
    <>
      <group ref={group}>
        {/* O troféu — bloco, arte e o que anda com eles quando a placa reveza o
            quadro com a joia vestida. O pódio ficou de fora: ele não sai do
            lugar. A posição aqui é a do primeiro quadro e a de quem pediu menos
            movimento; o resto do tempo quem manda é o rodízio, lá em cima.

            `scale` em `PECA`: a peça inteira — bloco, arte e sombra — encolheu
            15% em 15/10, a pedido do dono ("diminua o tamanho: placas, dorso. o
            pulso está ótimo"). A ESCALA e não a câmera, porque afastar a câmera
            encolheria junto a joia vestida, e o pulso do 100K é justamente o que
            ele disse estar no tamanho certo. O pódio encolheu com a placa (os
            números do `PODIO` já vêm multiplicados), que é o que mantém a
            proporção entre os dois. */}
        <group
          ref={palco}
          position={[worn ? POSTO.esq : 0, -ENCAIXE, 0]}
          scale={PECA}
        >
          {/* A SOMBRA DE CONTATO (veja `SOMBRA`): deitada no topo do pódio,
              andando com a placa e sumindo quando ela sai da base.

              `rotation` em x de −90° deita o plano; a `scale` em y dele é, por
              isso, a PROFUNDIDADE da elipse, não a altura. `depthWrite` falso e
              `renderOrder` alto para a mancha pousar sobre a tampa do pódio sem
              disputar o depth buffer com ela a doze milésimos de distância. */}
          <mesh
            position={[0, sombraY, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
          >
            <planeGeometry args={[SOMBRA.w, SOMBRA.h]} />
            <meshBasicMaterial
              ref={matSombra}
              map={sombra}
              transparent
              opacity={SOMBRA.forca}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* O BLOCO DE VIDRO — por transparência de verdade, não por
              transmissão.

              VEREDITO DO DONO, 15/10, na terceira volta: "as placas 3d devem ser
              transparentes, sem esse fundo preto, preciso que elas sejam
              transparentes".

              Ele estava descrevendo um defeito do `transmission`, não um defeito
              de ajuste, e a razão é estrutural. `transmission` não deixa a luz
              passar: ele COPIA a cena opaca num alvo próprio e amostra esse alvo
              deslocado pela refração. Atrás do bloco, nesta vitrine, há o chão
              `--floor` — um quase-preto. Então o que o acrílico "deixava passar"
              era, por construção, um retângulo preto, e nenhum valor de
              `thickness`, `ior` ou `roughness` muda isso: a cor que entra é a cor
              que sai. Era preto por fora e preto por dentro, com um contorno
              claro em volta, que é o desenho de uma laje.

              Agora o corpo é VIDRO POR ALFA: `transparent` com `opacity` baixa.
              O que se vê através dele não é uma cópia — é o próprio pixel que já
              estava no framebuffer, o chão da seção, o pódio, o aro. Sem
              refração, sim: um bloco plano de 2 × 2,9 por 0,52 de espessura
              desloca pouco mesmo no mundo real, e o que denuncia vidro numa peça
              dessas não é a torção, é o REFLEXO — o softbox na face, o fio aceso
              na quina — que o `clearcoat` continua dando por cima da
              transparência.

              DUAS OPACIDADES, E É DELA QUE VEM A ESPESSURA

              O `ExtrudeGeometry` sai com dois grupos: o 0 são as tampas (a face
              da frente e a de trás), o 1 são as paredes laterais e o bisel. Dois
              materiais, então:

              - a FRENTE em 0,12: é por ela que se olha, e é ela que tem de
                sumir. Qualquer coisa acima disso e a tinta impressa passa a ter
                um véu por cima;
              - a LATERAL e o BISEL em 0,28: é a espessura. Num vidro de verdade
                o raio que entra pela lateral atravessa 2 metros de material e o
                que entra pela face atravessa 0,5 — a borda SEMPRE lê mais densa
                que o meio, e é isso que faz o olho ver um sólido em vez de uma
                película. `envMapIntensity` maior na lateral pela mesma razão: é
                lá que o estúdio tem de acender.

              `depthWrite` falso nos dois: um corpo transparente não pode esconder
              o que vem depois dele no bucket dos transparentes (a joia que
              atravessa o quadro, a sombra no pódio). O `depthTest` fica — é ele
              que mantém a tinta impressa, que é OPACA e foi desenhada antes, por
              cima do vidro em vez de debaixo dele.

              `color` sai de `tomDoAcrilico`: o bronze do 10K, o cristal quase
              incolor do 100K, o ouro do 500K e o laranja do 1M, todos puxados
              para perto do branco. Com 12% de opacidade o que sobra é um sopro —
              que é exatamente o que um acrílico fundido tingido faz com a luz. */}
          <mesh geometry={geometria}>
            <meshPhysicalMaterial
              attach="material-0"
              /* A FACE SÓ SOMA O REFLEXO — não cobre nada.

                 Com mistura normal a 12%, a face frontal fazia
                 `resultado = vidro·0,12 + fundo·0,88`: um véu cinza uniforme
                 sobre o chão da seção, de 45 de luminância contra os 18 do
                 fundo. Medido e visto, aquilo é PELÍCULA, não vidro — e foi a
                 terceira vez que o dono usou a palavra "opaco".

                 Aditiva com difusa preta resolve pelo princípio certo: o que uma
                 lâmina de acrílico faz na direção da câmera é REFLETIR uns 4% do
                 estúdio e deixar passar o resto. Então ela SOMA o reflexo e não
                 tira nada do que está atrás — o chão continua sendo o chão, a
                 tinta impressa continua intacta, e o que aparece é só a varredura
                 clara do softbox atravessando a face. É esse gradiente, e não uma
                 cor de corpo, que diz "tem vidro aqui".

                 `envMapIntensity` 3 porque agora o reflexo é tudo o que esta face
                 tem; `clearcoat` espalha o softbox numa faixa macia em vez de um
                 ponto. */
              color="#000000"
              metalness={0}
              roughness={0.04}
              clearcoat={1}
              clearcoatRoughness={0.06}
              envMapIntensity={3}
              transparent
              opacity={0.9}
              blending={AdditiveBlending}
              depthWrite={false}
              side={FrontSide}
              /* INVISÍVEL desde 15/10 (quarta volta do dono: "deixa o fundo das
                 placas transparentes... apenas o fundo das placas"). O reflexo
                 somado do softbox, por mais que fosse só luz, pintava o miolo
                 do bloco de um cinza mais claro que o chão — e para o dono o
                 miolo É o fundo da placa, que tem de ser o chão da seção, nu.
                 As duas tampas somem (é o grupo 0 inteiro); quem continua
                 dizendo "vidro" é o que o olho usa de verdade numa peça
                 dessas: as arestas, o bisel e as laterais em 0,28, a casca de
                 Fresnel nas rasantes e a varredura de luz que passa de tempos
                 em tempos. O material fica montado, e não apagado, porque é
                 um ajuste reversível de uma linha. */
              visible={false}
            />
            <meshPhysicalMaterial
              attach="material-1"
              color={tom}
              metalness={0}
              roughness={0.04}
              clearcoat={1}
              clearcoatRoughness={0.06}
              envMapIntensity={4}
              transparent
              opacity={0.28}
              depthWrite={false}
              side={FrontSide}
            />
          </mesh>

          {/* A CASCA DE FRESNEL (veja `FRESNEL`): o clareado das rasantes.

              Mesma geometria do bloco, meio milímetro de shader. Soma creme na
              proporção `(1 − N·V)³`, que é quase zero de frente e sobe no bisel
              e nas laterais — a curva que um acrílico fundido tem e que o
              `envMapIntensity` sozinho não dá.

              `depthWrite` falso (não pode esconder nada) e `depthTest`
              LIGADO, que é o que mantém a tinta limpa: a impressão é opaca e já
              escreveu profundidade antes, então a casca não soma um fóton sobre
              ela. `renderOrder` 2 a põe depois do corpo do vidro e antes de
              tudo o que vem a seguir. */}
          <mesh geometry={geometria} renderOrder={2}>
            <shaderMaterial
              uniforms={fresnel}
              vertexShader={FRESNEL_VERT}
              fragmentShader={FRESNEL_FRAG}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              side={FrontSide}
            />
          </mesh>

          {/* AS ARESTAS, EM FIO DE CREME — agora em duas forças.

              Com o corpo em 12% de opacidade, a silhueta do bloco quase
              desaparece sobre o chão escuro — e o que o olho precisa para ler
              "peça de vidro" é justamente a QUINA, que num acrílico real
              concentra a luz e vira um fio branco.

              `EdgesGeometry` com 20° de limiar desenha só as quinas de verdade:
              os quatro cantos da face, as duas arestas de cada bisel e as
              verticais das laterais. As facetas do chanfro ficam a 22° uma da
              outra (três anéis em 67,5°) e entram; os oito segmentos de cada
              canto arredondado ficam a 11° e não entram — senão o contorno viraria
              um polígono visível.

              Creme e não branco: o estúdio desta cena é quente (veja os
              `Lightformer`), e um fio neutro no meio dele lê como azulado.

              PRIMEIRA PASSADA — todas as quinas, fracas.

              Com `depthTest` LIGADO, e não desligado: o corpo do vidro não
              escreve profundidade, então ele não esconde linha nenhuma, mas a
              TINTA e a JOIA escondem — e devem. Uma aresta de trás que cruza o
              numeral tem de passar POR TRÁS dele; desenhada por cima, viraria um
              risco no meio da impressão. Então o que sobra aqui é exatamente o
              que um acrílico mostra: a quina do fundo aparecendo pelos vazios da
              tinta. */}
          <primitive object={linhas.atras} renderOrder={4} dispose={null} />

          {/* O PRÉ-PASSE DE PROFUNDIDADE — o molde que decide quais quinas estão
              na frente.

              Desenha o bloco só no buffer de profundidade (`colorWrite` falso:
              nenhum pixel de cor sai daqui) para que a passada forte das arestas
              possa se testar contra o CORPO do vidro.

              E ele é `transparent` de propósito, o que parece contrassenso num
              passe que não escreve cor. É o que o põe na fila dos
              transparentes, DEPOIS do pódio, do aro, da sombra e da joia — que
              já foram desenhados e já estão na tela. Fosse opaco, o three o
              desenharia na primeira fila e o molde passaria a esconder tudo o
              que está ATRÁS do cristal: o arco do aro, o tampo do pódio, a joia
              na travessia. Ou seja, o avesso da regra desta seção. Aqui ele
              chega tarde, só a tempo de servir à linha, e some com o quadro.

              `polygonOffset` empurra o molde um fio para longe da câmera. As
              quinas estão EM CIMA da superfície, e sem esse empurrão metade
              delas perderia o teste de profundidade contra a própria face em que
              se apoia — o cintilar clássico de contorno sobre malha. */}
          <mesh geometry={geometria} renderOrder={5}>
            <meshBasicMaterial
              colorWrite={false}
              transparent
              depthWrite
              polygonOffset
              polygonOffsetFactor={2}
              polygonOffsetUnits={2}
              side={FrontSide}
            />
          </mesh>

          {/* SEGUNDA PASSADA — só as quinas que o molde deixa passar, fortes.

              O que está à frente do corpo acende por inteiro (as duas passadas
              somam e a mistura dá 0,895); o que está atrás ficou nos 0,3 da
              primeira. É daí que vem a profundidade: a aresta da frente é um
              fio de luz, a de trás é um fio de vidro. */}
          <primitive object={linhas.frente} renderOrder={6} dispose={null} />

          {/* A ARTE IMPRESSA, na face.

              Três milésimos À FRENTE da face frontal — veja `ARTE_FRENTE` para
              o porquê longo. O curto: dentro do bloco ela só podia ser vista
              pela passada de transmissão, que devolve um MIPMAP da cena atrás do
              vidro; era daí que vinham o borrão e a "opacidade" de que o dono
              reclamou em 15/10. Na passada normal ela chega à tela como está no
              arquivo.

              E ela ocupa a FACE INTEIRA (veja `FACE`), não mais os 84% de uma
              janela: as barras laranja e a faixa WONE BOT correm até a quina,
              como na ilustração que o dono aprovou. A moldura de cristal não
              sumiu — mudou de lugar e agora é o bisel de 0,12 em volta, que é
              onde uma peça de verdade tem acrílico nu. A transparência tampouco:
              a tinta é recortada, e por cada vazio dela se veem o chão da seção,
              o aro e o pódio.

              O verso é um segundo plano, espelhado, para o giro não mostrar o
              bloco oco por trás. */}
          {art.curr && (
            <>
              <mesh position={[0, 0, arteZ]}>
                <planeGeometry args={[FACE.w, FACE.h]} />
                {/* SÓ A TINTA — recortada por `alphaTest` e FORA da passada de
                    transmissão.

                    A arte vem do recorte COM canal alfa (veja
                    `scripts/recorta-placas.mjs`): tinta onde há desenho, nada
                    onde havia o papel. É o pedido literal do dono em 15/10 —
                    "tira esse fundo opaco das placas e o fundo branco das
                    placas" — e é por esses vazios que o cristal aparece.

                    `alphaTest` 0,5 é o mesmo limiar em que o recorte binarizou:
                    o que tem tinta sai 100% opaco, o que não tem não sai. Não
                    existe meio-termo, que é o que leria como "opacidade".

                    E OPACO, sem `transparent` — que é o que mantém a tinta
                    limpa agora que o bloco é vidro por alfa. Opaco, este plano é
                    desenhado ANTES do bloco e escreve profundidade; o bloco, que
                    vem depois no bucket dos transparentes, tem `depthTest` e é
                    REJEITADO em cada pixel de tinta. A impressão não recebe nem
                    os 12% de véu do corpo nem o reflexo do verniz: chega à tela
                    exatamente como está no arquivo.

                    (Houve uma versão `transparent` aqui, e ela existia para tirar
                    a tinta do alvo da passada de transmissão — onde o bloco
                    refratava uma cópia borrada da própria arte, o fantasma
                    cinzento que a captura daquela passada mostrava. Sem
                    transmissão não há alvo, não há cópia e não há fantasma.)

                    Sem luz, de propósito. A cena tem um refletor laranja da
                    marca e um ambiente quente — eles existem para ACENDER O
                    ACRÍLICO, e um material iluminado aqui receberia os dois na
                    tinta: medido na tela, o creme do numeral virava amarelo e a
                    raposa sumia no laranja. Tinta impressa não tem brilho
                    próprio; quem reage à luz é o bloco sob ela.

                    `toneMapped` FALSO: o r3f liga `ACESFilmicToneMapping` por
                    padrão, e o ACES puxa 1,0 para 0,8 — o laranja #FF7700 da
                    faixa chegava à tela lavado. Fora do tone mapping a tinta sai
                    como foi escrita, que é o ponto de uma impressão. */}
                <meshBasicMaterial
                  map={art.curr}
                  toneMapped={false}
                  alphaTest={0.5}
                />
              </mesh>
              {/* O verso, espelhado: só aparece se alguém girar o bloco com o
                  cursor até passar dos 90°, e existe para que, se isso
                  acontecer, não se veja a tinta de trás para a frente. */}
              <mesh position={[0, 0, -arteZ]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[FACE.w, FACE.h]} />
                <meshBasicMaterial
                  map={art.curr}
                  toneMapped={false}
                  alphaTest={0.5}
                />
              </mesh>

            </>
          )}

          {/* A VARREDURA DE LUZ (veja `VARREDURA`): o reflexo do estúdio
              passando pela face a cada 7 s.

              Três milésimos à frente da tinta — pela mesma razão de
              `ARTE_FRENTE`, e com a mesma folga: é reflexo NA superfície, e tem
              de somar por cima da impressão como soma por cima do cristal vazio.

              Quem anda não é o plano, é o `offset` da textura: nada de
              geometria para clipar na borda da face, nada de material
              recompilando, e a faixa sai cortada exatamente na quina porque o
              plano acaba ali. `blending` aditivo com um mapa preto fora da
              faixa — preto somado é nada, então o resto da face continua
              intacto.

              `visible` nasce falso: no primeiro quadro (e com movimento
              reduzido) a face é só reflexo parado, e quem decide o contrário é o
              `useFrame`, nunca o primeiro render. */}
          <mesh
            ref={varredura}
            position={[0, 0, arteZ + ARTE_FRENTE]}
            renderOrder={3}
            visible={false}
          >
            <planeGeometry args={[FACE.w, FACE.h]} />
            <meshBasicMaterial
              ref={matVarredura}
              map={brilho}
              transparent
              opacity={0}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* A arte que sai, um fio à frente da que entra, se desfazendo. */}
          {art.prev && (
            <>
              <mesh ref={saindoFrente} position={[0, 0, arteZ + 0.006]}>
                <planeGeometry args={[FACE.w, FACE.h]} />
                <meshBasicMaterial
                  ref={matSaindoFrente}
                  map={art.prev}
                  toneMapped={false}
                  alphaMap={mascara}
                  /* Começa no piso da máscara e sobe daí (veja
                     `mascaraDissolucao`); nunca cruza o zero, que mudaria o
                     define `USE_ALPHATEST` e recompilaria o shader. */
                  alphaTest={DISSOLVE_PISO + 0.001}
                />
              </mesh>
              <mesh
                ref={saindoVerso}
                position={[0, 0, -arteZ - 0.006]}
                rotation={[0, Math.PI, 0]}
              >
                <planeGeometry args={[FACE.w, FACE.h]} />
                <meshBasicMaterial
                  ref={matSaindoVerso}
                  map={art.prev}
                  toneMapped={false}
                  alphaMap={mascara}
                  alphaTest={DISSOLVE_PISO + 0.001}
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
          {/* O corpo da base: um disco escuro, e só.

              Enquanto o bloco usava transmissão, este cilindro tinha outro
              trabalho — era o que se via ATRAVÉS do acrílico na faixa de baixo,
              e um pódio preto deixava a moldura preta. Daí ele ter subido de
              #0a0a0d e ganhado brilho. Com o vidro por alfa, o que se vê através
              do bloco é o próprio chão da seção, e o pódio voltou a ser o que
              ele é na vitrine: a base contra a qual a placa se destaca. Escuro,
              portanto. Quem desenha a silhueta dele é a `BORDA`, na quina. */}
          <mesh position={[0, PODIO.y, 0]}>
            <cylinderGeometry args={[PODIO.topo, PODIO.base, PODIO.altura, 48]} />
            <meshStandardMaterial
              color="#17161c"
              /* NÃO É METAL, e esta foi a correção final do pódio.

                 Com `metalness` alto a tampa media 212 de luminância — mais
                 clara que a placa (45 no vidro, 84 na lateral) e doze vezes o
                 chão. A culpa não era do `envMapIntensity`, já em 0,012: era o
                 FRESNEL. A tampa é um disco HORIZONTAL visto a 12° da rasante, e
                 a 12° o Schlick leva a refletância de 0,09 para 0,37 — quatro
                 vezes. Metal naquele ângulo é um espelho, e o espelho pegava o
                 refletor principal da cena inteiro.

                 Dielétrico fosco não tem esse salto: com `metalness` 0 o F0 cai
                 de 0,09 para os 0,04 de um plástico, e `roughness` 0,85 espalha
                 o que sobra por um hemisfério inteiro em vez de devolvê-lo num
                 ponto. O pódio volta a ser o que tem de ser — uma base escura
                 com um fio de luz na quina —, e o olho vai primeiro ao troféu. */
              metalness={0}
              roughness={0.85}
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

          {/* A BORDA DE LUZ na quina do pódio (veja `BORDA`). */}
          <mesh
            position={[0, PODIO_TOPO + 0.004, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[BORDA.raio[0], BORDA.raio[1], 96]} />
            <meshBasicMaterial color={BORDA.cor} toneMapped={false} side={DoubleSide} />
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

  const art = useArtPair(print);
  const fotos = useArtPair(photo || undefined);

  return (
    <Canvas
      dpr={dpr}
      /* MAIS BAIXA E MAIS PERTO, pedido de 15/10 ("capriche na disposição").
         O bloco tem 2,9 de altura; a 7,3 de distância com fov 38° a altura
         visível em z = 0 era 2·tan(19°)·7,3 = 5,03, e a placa ocupava 58% da
         caixa. Em 6,4 ela vai a 66% — a 6,0 daria os 70% redondos, e não cabe:
         quem decide a distância mínima não é a placa, é a QUINA DA FRENTE DO
         PÓDIO, que está a 1,42 de raio, ou seja quase um metro e meio mais perto
         da câmera que o bloco. Ali o tronco de visão é estreito, e antes de 6,4
         a base do pódio sai cortada pela borda de baixo do quadrado.

         E 0,42 abaixo do eixo: o r3f aponta a câmera para a origem quando não se
         dá `rotation` a ela (está no `createDefaultCamera`), então descer o olho
         é uma tomada de BAIXO para cima de verdade — a que mostra o bisel
         inferior e a espessura do bloco por fora, e a que dá ao troféu o porte
         de quem está num pódio. Mais que isso e a tampa do pódio começa a se
         fechar em elipse, escondendo o aro que atravessa o cristal. */
      camera={{ position: [0, -0.42, 6.4], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        /* O chão da seção, pintado no canvas (veja `fundoDaSecao`): é o que dá
           à face aditiva do vidro um fundo de verdade para somar. */
        gl.setClearColor(fundoDaSecao(gl.domElement), 1);
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
        {/* O SOFTBOX. A chapa larga em frente ao bloco, acima e à esquerda.

            É a luz mais importante da cena, e foi ela que faltou até 15/10.

            Um sólido transparente contra um fundo escuro, com nada atrás dele,
            fica PRETO — a transmissão devolve o mesmo quase-nada que já estava
            em volta, e o bloco lê como laje polida. O que desmente isso numa
            foto de produto não é a refração nem o bisel: é o REFLEXO CLARO
            GRANDE que a chapa branca do estúdio deixa na face. É ele, mais
            claro que a página, que diz "tem vidro aqui" antes de qualquer
            outra coisa.

            Antes estava em 0,6 e numa cor fria (#C8D2F0): um sopro azulado que
            não aparecia na medida nem na tela. Agora é branco-quente, e o par
            dela é o `clearcoatRoughness` do acrílico — a rugosidade do verniz
            espalha esta chapa numa FAIXA macia que atravessa a face e lambe o
            bisel, em vez de devolvê-la como um ponto que só existe num ângulo.
            Os dois juntos são o que faz o bloco existir sobre o fundo escuro.

            Quente e não fria porque o resto do estúdio é creme (as ripas, o rim
            de trás): uma chapa azul no meio deles sai lendo como mancha, não
            como luz.

            ENCOLHEU E SAIU MAIS DO EIXO em 15/10, e aqui a conta importa. A face
            frontal é PLANA: com o bloco em repouso a −16° de guinada, ela
            devolve para a câmera a direção R ≈ (−0,53, −0,07, 0,85) — uma só,
            para a face inteira. A chapa antiga (7 × 6 a 6,2 de distância)
            cobria 59° de céu e R caía bem no meio dela: o resultado era a face
            REFLETINDO A CHAPA DE PONTA A PONTA, e a moldura de cristal lendo
            como plástico branco. Medido: 121 de luminância à esquerda, 138 em
            cima, 142 embaixo — cinza claro uniforme, que é o avesso de vidro.

            Em 4,6 × 3,6 a 6,8, a chapa cobre 36° e o centro dela fica 28° de R:
            o reflexo passa a entrar pela BORDA, e a face ganha o gradiente que
            faltava — claro no alto à esquerda, escuro embaixo à direita. É no
            escuro que a transparência aparece, porque é lá que o que está atrás
            do bloco finalmente vence o reflexo. */}
        <Lightformer
          intensity={2.3}
          color="#FFFDF8"
          position={[-3.5, 3.7, 4.6]}
          scale={[4.6, 3.6, 1]}
        />
        {/* E um fio frio no outro canto de cima, só para o reflexo não ser de
            uma cor só: vidro de verdade pega o estúdio inteiro, e dois tons na
            mesma face é o que separa reflexo de pintura. Fraco de propósito. */}
        <Lightformer
          intensity={0.9}
          color="#C8D2F0"
          position={[3.0, 2.6, 4.8]}
          scale={[3.6, 3.2, 1]}
        />

        {/* AS RIPAS DAS ARESTAS VERTICAIS, no equador e um fio atrás: creme de
            um lado, laranja da marca do outro. Estreitas em z (0,5) porque é
            essa medida que vira a espessura do fio na quina, e altas em y (5,6)
            porque a aresta tem 2,9 e o fio não pode acabar antes dela.

            CAÍRAM DE 70 PARA 12 em 15/10, e as de baixo e as da frente na mesma
            proporção. Setenta era o que custava acender o bisel por REFLEXO num
            bloco que tinha `transmission` — a quina devolvia uma fração mínima
            da luz e era preciso gritar para que ela aparecesse. O preço estava
            no resto da cena: o pódio, que lê o mesmo ambiente, saía a 228 de
            luminância, mais claro que o troféu, porque num disco horizontal
            visto a 12° da rasante o Fresnel sobe a refletância para 0,34 e
            multiplica tudo o que o estúdio tem.

            Agora a quina é uma LINHA DESENHADA (veja `arestasDoBloco`): o fio
            branco não depende mais de reflexo nenhum. As ripas voltam ao papel
            modesto de dar ao vidro o que refletir nas laterais, e a cena inteira
            desce com elas. */}
        <Lightformer
          intensity={12}
          color="#FFFBF4"
          position={[-4, 0.35, -0.5]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[1.8, 5.9, 1]}
        />
        <Lightformer
          intensity={12}
          color="#FFE6C4"
          position={[4, -0.15, -0.5]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[1.8, 5.6, 1]}
        />
        {/* E as duas deitadas, para os biséis horizontais não ficarem cegos.
            Deitadas (`rotation` em x) o `scale` troca de significado: o primeiro
            número é a largura em x, o segundo a profundidade em z — é o segundo
            que tem de ser pequeno. */}
        <Lightformer
          intensity={13}
          color="#FFFBF4"
          position={[0, 4, -0.78]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[5.6, 1.7, 1]}
        />
        <Lightformer
          intensity={13}
          color="#FFF0DF"
          position={[0, -3.8, -0.2]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[5.6, 1.5, 1]}
        />

        {/* AS DUAS RIPAS DA FRENTE, EM CIMA E EMBAIXO — e por que elas faltavam.

            O bisel tem DOIS anéis de faceta (`bevelSegments` 2), e as normais
            deles não estão a 45°: estão a uns 22,5° e 67,5° da face. A conta de
            reflexão (R = 2(N·V)N − V) com a câmera em z = 7,3 dá, para o anel de
            fora do bisel de baixo,

                N = (0, −0,383, 0,924)  →  R = (0, −0,816, 0,579)

            — ou seja, aquela faixa do chanfro mostra o que está ABAIXO E NA
            FRENTE, 35° adiante da vertical. Lá não havia nada além da chapa
            escura do chão (#20202a), e por isso a aresta de baixo media 16 de
            luminância contra os 160 da de cima: não era falta de intensidade,
            era luz no lugar errado. As ripas de −3,8 e +4, atrás, acendem o
            anel de DENTRO; estas acendem o de fora, que é o que a silhueta
            mostra.

            Estreitas em y (1,1 ⇒ ±8° a 4 de distância) para continuarem sendo
            fios na quina, e longe o bastante do eixo da câmera (±3,4 em y) para
            a face frontal, que reflete quase só a direção da câmera, não pegar
            nada delas. */}
        <Lightformer
          intensity={9}
          color="#FFFBF4"
          position={[0, 3.4, 2.1]}
          scale={[5.2, 1.1, 1]}
        />
        <Lightformer
          intensity={9}
          color="#FFF0DF"
          position={[0, -3.4, 2.2]}
          scale={[5.2, 1.1, 1]}
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
          intensity={4}
          color="#FFFFFF"
          position={[-1, 3.2, -3.4]}
          scale={[5.5, 1.3, 1]}
        />
        {/* O par lateral dele, baixo e atrás, no laranja da marca. */}
        <Lightformer
          intensity={3}
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
          intensity={2.5}
          color="#FFF6EA"
          position={[-0.4, 0.3, -5.2]}
          scale={[5.5, 5, 1]}
        />
      </Environment>

      <Plaque
        accent={accent}
        art={art}
        fotos={fotos}
        photo={photo}
        worn={worn && Boolean(photo)}
        spin={!reduced}
        reduced={!!reduced}
      />

      <Metronome onCycle={onCycle} />
    </Canvas>
  );
}
