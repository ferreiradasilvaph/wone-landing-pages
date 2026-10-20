"use client";

/**
 * OS POSTES DAS RUAS DE SÃO PAULO — as lâmpadas que a textura deixa de ser
 * capaz de desenhar quando um pixel passa a valer meio metro.
 *
 * Pedido do dono ([158], 18/10): "mostre uma imagem da torre e capriche nos
 * detalhes do prédio, crie um cenário o mais perto do real possível."
 *
 * O PROBLEMA QUE ELE RESOLVE, EM NÚMEROS. O recorte de detalhe (`SP_CENTRO`)
 * tem 1,953 m por texel. Na contemplação (Z = 9.200) a câmera está em 2,19 m/px
 * — 0,89 texel por pixel, ou seja NÍTIDO, e as vias da textura são filamentos
 * de luz finos como têm de ser. No retrato da torre (Z = 34.000) ela está em
 * 0,59 m/px: são 3,3 pixels por texel, e um filamento de luz ampliado 3,3× não
 * é mais filamento, é um QUADRADO de cor. É por isso que o `SaoPauloCena`
 * escurece o chão mais 45% nesta fase (ver `CHAO_NA_FACHADA`): a essa distância
 * o chão é a única peça da cena que não tem resolução.
 *
 * A SOLUÇÃO É DEVOLVER A LUZ EM OUTRA MOEDA. Em vez de ampliar o borrão, os
 * pontos acesos da própria textura viram LÂMPADAS: sprites de 1,8 m com disco
 * macio e mistura aditiva, que o bloom da etapa 5 transforma em halo. A 0,59
 * m/px um poste tem ~3 px de luz e ~9 px de halo — é a escala em que uma rua
 * noturna real é lida de um helicóptero, e é a escala em que a textura falha.
 * Longe (na contemplação e em todo o resto do mergulho) eles simplesmente não
 * existem: `fachada` vale zero até Z = 12.000, e o componente devolve `null`.
 *
 * POR QUE OS PONTOS NASCEM DA TEXTURA, E NÃO DE UM ARQUIVO DE POSTES. Porque
 * ela é a MESMA fonte que desenha as ruas embaixo: cada lâmpada cai exatamente
 * em cima do filamento que ela substitui, com a cor que aquele filamento tem.
 * Uma lista separada (do OSM, digamos) produziria dois mapas de ruas que quase
 * coincidem — e "quase" é a pior coisa que se pode fazer com um alinhamento.
 * A textura já está em cache quando isto roda: o `SaoPauloCena` a baixou na
 * montagem da cena, segundos antes (ver `querDetalhe`).
 *
 * O CUSTO: UM draw call, ZERO triângulos (são primitivas de ponto), nenhuma
 * textura própria, nenhuma luz. São 852 lâmpadas — medido rodando esta mesma
 * varredura sobre `sp-noite-centro.webp` fora do navegador: 9.604 células, 852
 * acima do limiar, 746 âmbar e 106 creme (as Marginais e os túneis). Dois
 * atributos de 10 kB cada. Os pontos são colhidos UMA VEZ, quando a
 * imagem decodifica — nos primeiros segundos da página, atrás da travessia do
 * 2D para o 3D e muito antes do mergulho — e devolvidos ao driver no desmonte.
 * Por quadro não há alocação nenhuma: os dois uniformes que mudam (a escala e o
 * alfa) são escritos em efeitos, por mudança de prop, não no laço de desenho.
 *
 * SÓ NO DESKTOP. O componente é montado com `!leve`: no celular a câmera para
 * em Z = 405, onde esta fase nem começa, e a textura de detalhe nem é baixada.
 */

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";

import { baseVector } from "./globeMath";
import { ALTURA_CHAO_SP, ZOOM_TORRE } from "./mergulhoSP";
import { projetaSPCentro, SP_CENTRO, SP_MAPA } from "./spMapa";

/* --------------------------------------------------------------------------
   AS CONSTANTES
   -------------------------------------------------------------------------- */

/** Metros por unidade de esfera: o raio 1 do globo é o raio da Terra. */
const RAIO_TERRA = 6_371_000;

/**
 * O RAIO DA COLHEITA, em metros em volta da torre.
 *
 * 480 m e não os 2.000 do recorte inteiro: no fundo da fase o disco mostra
 * 375 m de largura (188 m do centro à borda), e com a obliquidade de 55° o
 * quadro alcança 188/sen 55° = 229 m ao norte e ao sul do pé do prédio. Os 480
 * são mais que o dobro disso — folga de sobra para a órbita de ±7° e para
 * qualquer reenquadre futuro —, e param bem antes de a colheita virar um
 * campo de 9.600 lâmpadas das quais 95% nunca entram no quadro.
 */
const RAIO_JANELA = 480;

/**
 * O LADO DA CÉLULA, em texels: 5 × 1,953 m = 9,8 m.
 *
 * É o espaçamento real entre postes de uma avenida brasileira (25 a 40 m) —
 * MENOS do que ele, de propósito: uma via expressa da textura tem o núcleo e o
 * halo, e uma célula de 9,8 m dá dois a três pontos na largura de uma Marginal,
 * que é o que faz uma via larga ler como via larga e não como um fio de contas.
 * Células maiores rarefazem a avenida; menores devolvem o quadrado de cor que
 * esta peça existe para desfazer, porque a 0,59 m/px dois pontos a 5 m um do
 * outro se sobrepõem e viram de novo uma mancha.
 *
 * De cada célula sai UM ponto: o texel MAIS CLARO dela. Escolher o mais claro
 * e não a média é o que mantém a lâmpada em cima do núcleo da via — a média
 * puxaria o ponto para o meio da célula, ou seja para o asfalto ao lado.
 */
const CELULA = 5;

/**
 * O LIMIAR DE LUMINÂNCIA, em sRGB. A escada da paleta do gerador (a mesma
 * tabela que o `VIA_TETO` do `SaoPauloCena` cita, aqui lida em sRGB):
 *
 *   quadras e telhados   0,080–0,082   ← nunca viram poste
 *   halo largo da via    0,227         ← nem ele: é o brilho em volta, não a luz
 *   LIMIAR               0,350
 *   núcleo laranja       0,753         ← vira poste
 *   núcleo creme         0,956         ← vira poste, e creme
 *
 * 0,35 fica no meio do vazio entre o halo e o núcleo: não há nada na paleta
 * entre 0,227 e 0,753, e por isso o número não é frágil — mover o limiar em
 * ±0,1 não muda uma lâmpada de lugar.
 */
const LIMIAR_LUZ = 0.35;

/**
 * A ALTURA DA LÂMPADA, em metros acima do chão da cena.
 *
 * 9 m é a altura de um poste de avenida (os de via expressa vão a 12, os de rua
 * a 7). Não é decoração: é o que põe a luz ACIMA do asfalto e ABAIXO do
 * primeiro andar dos vizinhos, de modo que o teste de profundidade faça o
 * trabalho sozinho — uma rua atrás de um prédio tem as lâmpadas escondidas por
 * ele, como tem de ser, sem uma única linha de oclusão escrita à mão.
 */
const ALTURA_POSTE = 9;

/**
 * O TAMANHO DA LUZ, em metros. 1,8 m é a mesma régua da `ARESTA` da torre: é o
 * menor objeto que esta cena ainda admite como objeto. No fundo da fase ele dá
 * ~3,0 px de dispositivo (1,8 m × 1,69 px/m × 1,0 de dpr) e o disco macio do
 * fragmento espalha isso em ~4,6 px de luz antes do bloom.
 */
const LUZ_METROS = 1.8;

/**
 * O PISO E O TETO do sprite, em px de DISPOSITIVO.
 *
 * O piso de 1,5 px porque abaixo de um pixel um sprite não desaparece: ele
 * CINTILA, acendendo e apagando conforme o centro dele cai dentro ou fora de um
 * fragmento. Quem apaga a lâmpada é o alfa (`fachada`), não o tamanho.
 *
 * O teto de 48 px é folga dupla contra o `ALIASED_POINT_SIZE_RANGE` do driver,
 * que o `HeroGlobe3D` lê no `onCreated` e guarda em `TETO_SPRITE` (64 nas GPUs
 * mais pobres que apareceram na medição). Um `gl_PointSize` acima do teto é
 * CORTADO sem aviso, e um poste cortado apareceria no tamanho errado em vez de
 * no tamanho que a conta pediu. A 48 px a lâmpada já teria 28 m de luz — ou
 * seja, o teto só seria alcançado num zoom que esta linha do tempo não tem.
 */
const SPRITE_MIN = 1.5;
const SPRITE_MAX = 48;

/** O alfa de pico das lâmpadas, com a fase cheia. */
const ALFA_MAX = 0.9;

/* ------------------------------------------------------------------ cores

   MESMO CONTRATO DO `SaoPauloCena`, e os três ajudantes abaixo são CÓPIA
   CONSCIENTE dos de lá (eles são privados daquele arquivo, e exportá-los só
   para cá acoplaria dois componentes que não têm outra relação): a mistura
   acontece em sRGB e `paraLinear` roda UMA vez por lâmpada, no instante de
   escrever no buffer de cor. O buffer do WebGL é linear, e misturar lá dentro
   não é a mesma coisa que misturar na cor que o olho enxerga. */

type Tom = [number, number, number];

function tom(hex: string): Tom {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Interpola em sRGB, escrevendo em `saida` (que pode ser `a`). */
function mistura(saida: Tom, a: Tom, b: Tom, t: number) {
  saida[0] = a[0] + (b[0] - a[0]) * t;
  saida[1] = a[1] + (b[1] - a[1]) * t;
  saida[2] = a[2] + (b[2] - a[2]) * t;
  return saida;
}

function canalLinear(c: number) {
  return c < 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function paraLinear(saida: Tom, a: Tom) {
  saida[0] = canalLinear(a[0]);
  saida[1] = canalLinear(a[1]);
  saida[2] = canalLinear(a[2]);
  return saida;
}

/* AS DUAS CORES DA LUZ DESTA CIDADE, e nenhuma terceira: são exatamente as que
   a textura já usa nas vias, lidas de volta dela.

   - ÂMBAR é o `JANELA` do `SaoPauloCena`, que é o mesmo das vias e o mesmo das
     salas acesas dos prédios. É a cor de sódio das ruas de São Paulo.
   - CREME é o `paper` do globals.css, o creme da tipografia, e é o núcleo das
     vias `expressa` da textura — as Marginais e os túneis, que de verdade têm
     luz branca de LED onde as ruas de bairro têm sódio.

   Qual das duas cada lâmpada recebe sai do PRÓPRIO TEXEL, pela razão azul/
   vermelho dele: o âmbar tem b/r = 0,44 e o creme 0,89, e entre as duas não há
   nada na paleta. Ver `colheLampadas`. */
const AMBAR = tom("#ffb070");
const CREME = tom("#ffffe3");
const APAGADA: Tom = [0, 0, 0];

/* --------------------------------------------------------------------------
   O REFERENCIAL TANGENTE E O DESLOCAMENTO

   CÓPIA CONSCIENTE do `SaoPauloCena`, palavra por palavra, e a decisão de
   copiar em vez de exportar é deliberada: o que une os dois componentes não é
   uma função, é um CONTRATO DE POSIÇÃO — "a cena de São Paulo mora no plano
   tangente de `SP_MAPA.centro`, com o norte em +Y, e o que é medido a partir da
   torre entra deslocado de `deslocamento`". Exportar a função de lá criaria uma
   dependência entre dois componentes irmãos sem tornar o contrato mais
   explícito do que estas duas duplicatas comentadas o tornam, e tornaria o
   `SaoPauloCena` — que é a cena, com 1.700 linhas e quatro geometrias — uma
   biblioteca para o vizinho.

   SE UM DOS DOIS MUDAR, O OUTRO MUDA. Qualquer divergência aqui é
   imediatamente visível: as lâmpadas saem do lugar das ruas, e a 0,59 m/px
   meio quarteirão de erro é a tela inteira.

   A receita, na íntegra (o porquê de cada linha está no `SaoPauloCena`, no
   bloco "O REFERENCIAL TANGENTE", inclusive a ordem do produto vetorial, que é
   o erro fácil: `leste = norte × normal`, e o inverso entrega a cidade
   espelhada).
   -------------------------------------------------------------------------- */

function referencialTangente(lat: number, lon: number) {
  const normal = new Vector3(...baseVector(lat, lon));
  const polo = new Vector3(...baseVector(90, 0));
  const norte = polo
    .clone()
    .addScaledVector(normal, -polo.dot(normal))
    .normalize();
  const leste = norte.clone().cross(normal).normalize();
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(leste, norte, normal),
  );
  /* `ALTURA_CHAO_SP` vem do `mergulhoSP` — lá ele já é a duplicata declarada do
     `ALTURA_CHAO` do `SaoPauloCena` (o arquivo de tempo é puro e não pode
     importar um componente), e importá-lo de lá evita uma TERCEIRA cópia do
     mesmo 30. É a altura do chão da cena acima da superfície da esfera. */
  const posicao = normal.clone().multiplyScalar(1 + ALTURA_CHAO_SP / RAIO_TERRA);
  return { posicao, quaternion };
}

/* --------------------------------------------------------------------------
   A COLHEITA
   -------------------------------------------------------------------------- */

type Lampadas = {
  /** x,y,z em metros no referencial da cena, medidos a partir da TORRE. */
  readonly posicoes: Float32Array;
  /** r,g,b em LINEAR, uma cor por lâmpada. */
  readonly cores: Float32Array;
  readonly n: number;
};

/**
 * Lê a textura de detalhe e devolve uma lâmpada por célula acesa.
 *
 * NADA DE SORTEIO AQUI — nem determinístico. A cidade de prédios do
 * `SaoPauloCena` precisa de `sorteio()` porque inventa janelas que o cadastro
 * não tem; estas lâmpadas não são inventadas, são LIDAS: a mesma imagem produz
 * sempre os mesmos pontos, nas mesmas cores, em toda aba e em todo deploy. A
 * reprodutibilidade aqui é de graça, por construção.
 */
function colheLampadas(img: HTMLImageElement): Lampadas | null {
  const lado = SP_CENTRO.lado;
  const mpp = SP_CENTRO.metrosPorPixel;

  /* O PIXEL DA TORRE na textura de detalhe. Ela é CENTRADA na torre (ver
     `SP_CENTRO.centro`), então isto dá ~(1024, 1024) — mas sai da projeção e
     não de uma constante escrita à mão, pelo mesmo motivo do `deslocamento`:
     os dois não podem divergir se o gerador mudar a caixa. */
  const alvo = projetaSPCentro(SP_MAPA.torre.lat, SP_MAPA.torre.lon);
  const raio = Math.round(RAIO_JANELA / mpp);

  /* A janela, grampeada na caixa da textura: a torre está no meio dela, então o
     grampo nunca morde nada — ele está aqui para o dia em que alguém mover o
     centro do recorte. */
  const x0 = Math.max(0, Math.round(alvo.x) - raio);
  const y0 = Math.max(0, Math.round(alvo.y) - raio);
  const x1 = Math.min(lado, Math.round(alvo.x) + raio);
  const y1 = Math.min(lado, Math.round(alvo.y) + raio);
  const largura = x1 - x0;
  const altura = y1 - y0;
  if (largura < CELULA || altura < CELULA) return null;

  /* UM CANVAS FORA DA TELA, do tamanho da JANELA e não da textura: 492×492 em
     vez de 2048×2048 são 1,0 MB de `ImageData` em vez de 16,8 MB, e o
     `drawImage` com retângulo de origem já faz o recorte na GPU do navegador.
     Ele é descartado ao sair desta função — nada fica pendurado. */
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, x0, y0, largura, altura, 0, 0, largura, altura);
  const dados = ctx.getImageData(0, 0, largura, altura).data;

  const colunas = Math.floor(largura / CELULA);
  const linhas = Math.floor(altura / CELULA);
  /* Dimensionado pelo PIOR CASO (toda célula acesa) e cortado no fim: são
     9.604 células contra as 852 que de fato acendem, ou seja 210 kB de folga
     numa alocação que acontece uma vez na vida da página — e o `subarray` do
     fim devolve ao buffer só o que foi escrito. */
  const posicoes = new Float32Array(colunas * linhas * 3);
  const cores = new Float32Array(colunas * linhas * 3);
  const cor: Tom = [0, 0, 0];
  let p = 0;

  for (let cl = 0; cl < linhas; cl++) {
    for (let cc = 0; cc < colunas; cc++) {
      /* O TEXEL MAIS CLARO DA CÉLULA. */
      /* Só o vermelho e o azul do vencedor são guardados: o verde já entrou na
         luminância, e quem decide o TOM é a razão azul/vermelho (ver abaixo) —
         guardá-lo seria carregar um número que ninguém lê. */
      let melhor = -1;
      let mr = 0;
      let mb = 0;
      let mx = 0;
      let my = 0;
      for (let j = 0; j < CELULA; j++) {
        const ty = cl * CELULA + j;
        for (let i = 0; i < CELULA; i++) {
          const tx = cc * CELULA + i;
          const o = (ty * largura + tx) * 4;
          const r = dados[o] / 255;
          const g = dados[o + 1] / 255;
          const b = dados[o + 2] / 255;
          /* Luminância em sRGB, e não em linear: o limiar lá em cima foi medido
             na escada da paleta do gerador, que está em sRGB. */
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          if (lum > melhor) {
            melhor = lum;
            mr = r;
            mb = b;
            mx = tx;
            my = ty;
          }
        }
      }
      if (melhor < LIMIAR_LUZ) continue;

      /* A POSIÇÃO, em metros a partir da TORRE. O +0,5 põe a lâmpada no centro
         do texel e não no canto dele. O eixo y da textura cresce para o SUL
         (a primeira linha da imagem é a borda norte da caixa) e o da cena
         cresce para o NORTE — daí o sinal. */
      const dx = x0 + mx + 0.5 - alvo.x;
      const dy = y0 + my + 0.5 - alvo.y;
      posicoes[p] = dx * mpp;
      posicoes[p + 1] = -dy * mpp;
      posicoes[p + 2] = ALTURA_POSTE;

      /* A COR, do próprio texel, em duas contas.

         O TOM sai da razão azul/vermelho: 0,44 no âmbar das vias de bairro e
         0,89 no núcleo creme das expressas. A rampa de 0,45 a 0,80 é o vazio
         entre os dois, e um `mistura` em vez de um `if` porque a borda do
         núcleo creme de uma Marginal é justamente a transição entre eles — um
         degrau ali desenharia uma fronteira de cor que a via não tem. */
      const frio = Math.min(
        1,
        Math.max(0, (mb / Math.max(mr, 0.004) - 0.45) / 0.35),
      );
      mistura(cor, AMBAR, CREME, frio);

      /* O BRILHO acompanha o do texel: uma rua de bairro mal passando do
         limiar acende a 55% e o núcleo de uma expressa a 100%. Sem isto o
         campo de lâmpadas vira um carimbo de pontos iguais, que é o defeito
         oposto ao do borrão — ordenado demais para ser uma cidade. A escala
         é feita em sRGB (mistura com o preto), como manda o contrato de cor
         deste arquivo. */
      const forca =
        0.55 +
        0.45 * Math.min(1, (melhor - LIMIAR_LUZ) / (0.95 - LIMIAR_LUZ));
      mistura(cor, APAGADA, cor, forca);

      paraLinear(cor, cor);
      cores[p] = cor[0];
      cores[p + 1] = cor[1];
      cores[p + 2] = cor[2];
      p += 3;
    }
  }

  if (p === 0) return null;
  return {
    posicoes: posicoes.subarray(0, p),
    cores: cores.subarray(0, p),
    n: p / 3,
  };
}

/* --------------------------------------------------------------------------
   O SHADER

   É o do cometa, com duas diferenças: o tamanho sai de METROS e não de pixels
   (daí o `uPxPorMetro`), e a cor vem por ATRIBUTO e não de dois uniformes — são
   mil lâmpadas com mil tons, não uma cabeça e um rastro.
   -------------------------------------------------------------------------- */

const luzesVert = /* glsl */ `
  attribute vec3 aCor;        /* a cor da lâmpada, JÁ em linear */
  uniform float uPxPorMetro;  /* px de CSS por metro da cena, nesta escala */
  uniform float uDpr;
  varying vec3 vCor;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(
      ${LUZ_METROS.toFixed(2)} * uPxPorMetro * uDpr,
      ${SPRITE_MIN.toFixed(1)},
      ${SPRITE_MAX.toFixed(1)}
    );
    vCor = aCor;
  }
`;

const luzesFrag = /* glsl */ `
  uniform float uAlfa;
  varying vec3 vCor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    /* O MESMO disco macio do cometa: a queda começa no CENTRO, e é ela que faz
       o sprite ler como brilho de lâmpada e não como um disco de tinta. O
       quadrado aperta o núcleo e alarga o halo. */
    float m = 1.0 - smoothstep(0.0, 0.5, d);
    m *= m;
    if (m <= 0.002) discard;
    /* Linear para sRGB, e SEM premultiplicar: a mistura aditiva do three entra
       com blendFunc(SRC_ALPHA, ONE), ou seja ela mesma multiplica o rgb pelo
       alfa. Premultiplicar aqui multiplicaria duas vezes. */
    vec3 c = linearToOutputTexel(vec4(vCor, 1.0)).rgb;
    gl_FragColor = vec4(c, uAlfa * m);
  }
`;

/* --------------------------------------------------------------------------
   O COMPONENTE
   -------------------------------------------------------------------------- */

export type SaoPauloLuzesProps = {
  /**
   * O DETALHE DE PERTO: 0 = o mergulho de sempre, 1 = o retrato da torre.
   * É o mesmo sinal que o `SaoPauloCena` recebe (`LIMIAR.fachada`, entre
   * Z = 12.000 e 26.000) e aqui ele é o INTERRUPTOR: em zero o componente
   * devolve `null`, e no meio da rampa ele é o alfa das lâmpadas.
   */
  fachada: number;
  /**
   * A ESCALA DE TELA DA CÂMERA, em degraus de 1/16 de nat (ver `cidadeSP`, no
   * `HeroGlobe3D`). O padrão é `ZOOM_TORRE`, o fim da contemplação, que é o que
   * `ZERO_SP` publica quando não há mergulho.
   *
   * Uma cena sem câmera precisa dele porque uma LÂMPADA NÃO TEM TAMANHO EM
   * METROS: ela é um sprite, e sprite tem tamanho em pixels. A conta está no
   * efeito lá embaixo.
   */
  zoom?: number;
  /**
   * A CAMADA DO BRILHO da etapa 5, ou `undefined` para não participar dele.
   *
   * As lâmpadas são o objeto desta cena que MAIS depende do bloom: sem ele são
   * três pixels de âmbar, com ele são a luz de uma rua. Entram na camada por
   * conta própria, como a placa da marca, em vez de o compositor sair
   * procurando a malha pela cena.
   */
  camadaBrilho?: number;
};

/**
 * Monte DENTRO do grupo que gira, logo depois do `<SaoPauloCena/>` e só no
 * desktop:
 *
 *   {!leve ? <SaoPauloLuzes fachada={…} zoom={…} camadaBrilho={…} /> : null}
 */
export default function SaoPauloLuzes({
  fachada,
  zoom = ZOOM_TORRE,
  camadaBrilho,
}: SaoPauloLuzesProps) {
  /* A LARGURA DO CANVAS EM PX DE CSS e o dpr: os dois lados da conta de "quanto
     mede um metro na tela". Por seletor, e não pelo objeto inteiro do `useThree`,
     para o componente só renderizar quando ESTES números mudam. */
  const larguraTela = useThree((s) => s.size.width);
  const dpr = useThree((s) => s.viewport.dpr);

  const [lampadas, setLampadas] = useState<Lampadas | null>(null);

  const base = useMemo(
    () => referencialTangente(SP_MAPA.centro.lat, SP_MAPA.centro.lon),
    [],
  );

  /**
   * O DESLOCAMENTO — a mesma cópia consciente do `SaoPauloCena`, pelo motivo
   * escrito lá em cima. O chão é centrado em `SP_MAPA.centro` (o meio da caixa
   * da textura grande) e tudo o que é medido a partir da torre — os prédios, o
   * recorte de detalhe e estas lâmpadas — entra deslocado dos 9,7 m a leste e
   * 44 m ao sul que separam um do outro. Meio quarteirão: invisível no zoom da
   * cidade, e a 0,59 m/px a tela inteira.
   */
  const deslocamento = useMemo(() => {
    const meio = SP_MAPA.lado / 2;
    const px = (SP_MAPA.torre.px - meio) * SP_MAPA.metrosPorPixel;
    const py = -(SP_MAPA.torre.py - meio) * SP_MAPA.metrosPorPixel;
    return [px, py, 0] as [number, number, number];
  }, []);

  /**
   * A COLHEITA, UMA VEZ, QUANDO A IMAGEM DECODIFICA.
   *
   * Na montagem e não na primeira vez que `fachada` sai de zero, e isto é
   * deliberado: colher no meio do mergulho poria a decodificação da imagem e a
   * varredura de 242 mil texels exatamente no instante em que a câmera está
   * correndo. Aqui elas acontecem nos primeiros segundos da página, atrás da
   * travessia do 2D para o 3D — o mesmo raciocínio do `initTexture` do
   * `SaoPauloCena`, que sobe a textura para a GPU fora do mergulho.
   *
   * O ARQUIVO JÁ ESTÁ EM CACHE: o `SaoPauloCena` o pediu na montagem da cena
   * (`querDetalhe`), e este `new Image()` com o mesmo URL é servido pelo cache
   * do navegador — não é um segundo download.
   *
   * O OUVINTE ANTES DO `src`, e nunca um caminho síncrono para o caso de o
   * `complete` já ser verdadeiro: o evento `load` de uma imagem recém-criada é
   * despachado numa tarefa própria mesmo vindo do cache, de modo que o
   * `setLampadas` nunca acontece durante o efeito.
   */
  useEffect(() => {
    let vivo = true;
    const img = new Image();
    const aoCarregar = () => {
      if (!vivo) return;
      const colhidas = colheLampadas(img);
      if (colhidas) setLampadas(colhidas);
    };
    img.addEventListener("load", aoCarregar);
    img.src = SP_CENTRO.arquivo;
    return () => {
      vivo = false;
      img.removeEventListener("load", aoCarregar);
    };
  }, []);

  /**
   * A GEOMETRIA E O MATERIAL, construídos no quadro em que as lâmpadas ficam
   * prontas e nunca mais.
   *
   * Os dois uniformes que mudam saem daqui por FUNÇÕES e não como objeto: um
   * uniforme é estado da GPU, não estado de React, e tudo o que sai de um
   * `useMemo` é imutável para quem o recebe (`react-hooks`). É o mesmo idioma
   * do `poeAvenidas` do `SaoPauloCena`.
   */
  const pecas = useMemo(() => {
    if (!lampadas) return null;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(lampadas.posicoes, 3));
    geo.setAttribute("aCor", new BufferAttribute(lampadas.cores, 3));
    geo.computeBoundingSphere();

    const uPxPorMetro = { value: 0 };
    const uDpr = { value: 1 };
    const uAlfa = { value: 0 };
    const material = new ShaderMaterial({
      vertexShader: luzesVert,
      fragmentShader: luzesFrag,
      uniforms: { uPxPorMetro, uDpr, uAlfa },
      transparent: true,
      /* Sem escrever profundidade (luz somada não recorta nada) e COM o teste
         ligado: é ele que faz um prédio na frente esconder as lâmpadas da rua
         atrás dele. */
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return {
      geo,
      material,
      poeEscala: (px: number, d: number) => {
        uPxPorMetro.value = px;
        uDpr.value = d;
      },
      poeAlfa: (a: number) => {
        uAlfa.value = a;
      },
    };
  }, [lampadas]);

  /**
   * O TAMANHO DE UM METRO NA TELA, escrito por MUDANÇA e nunca por quadro.
   *
   *     px por metro = (largura do canvas em CSS / 2) · zoom / 6.371.000
   *
   * De onde ela sai: a câmera do palco é ortográfica com frustum ±1 e
   * `camera.zoom = Z`, ou seja a metade da largura do canvas mostra 1/Z unidade
   * de esfera, e uma unidade de esfera é o raio da Terra. Conferindo com os
   * números do mergulho: a 1440×900 o canvas tem 633 px, e em Z = 9.200 isso dá
   * 0,457 px/m (2,19 m/px, o número da contemplação) e em Z = 34.000 dá
   * 1,689 px/m (0,59 m/px, o número do retrato). Bate com os dois.
   *
   * O `kCine` NÃO ENTRA, e tem de não entrar: no modo cinema a caixa do canvas
   * já saltou para o tamanho final de uma vez e o crescimento vira
   * `camera.zoom · kCine`, mas `kCine = aparente/M` vale exatamente 1 enquanto
   * `q.mergulho` vale 1 — ou seja durante toda a parada em São Paulo. A largura
   * que o `useThree` entrega aqui já é a do canvas crescido.
   *
   * DUAS ESCRITAS POR MUDANÇA DE DEGRAU: o `zoom` chega quantizado em 1/16 de
   * nat (ver `cidadeSP`, no `HeroGlobe3D`), de modo que a fase inteira custa
   * algumas dezenas de escritas contra os seus ~250 quadros.
   */
  useEffect(() => {
    if (!pecas) return;
    pecas.poeEscala((larguraTela / 2) * (zoom / RAIO_TERRA), dpr);
  }, [pecas, larguraTela, zoom, dpr]);

  /* O ALFA. Em degraus de 1/64, como as outras visibilidades da cidade. */
  useEffect(() => {
    if (!pecas) return;
    pecas.poeAlfa(ALFA_MAX * fachada);
  }, [pecas, fachada]);

  /* Devolver tudo ao driver no desmonte: o canvas do hero morre quando o
     usuário sai da seção, e um buffer de 852 lâmpadas não pode ficar pendurado
     na GPU. */
  useEffect(() => {
    if (!pecas) return;
    return () => {
      pecas.geo.dispose();
      pecas.material.dispose();
    };
  }, [pecas]);

  /* Fora da fase do retrato não há objeto nenhum: zero draw call, zero custo —
     e é esta linha que garante que a contemplação (Z = 9.200, onde `fachada`
     vale ZERO CRAVADO por construção do limiar) continue exatamente como era
     antes de 18/10. */
  if (!pecas || fachada <= 0.002) return null;

  return (
    <group position={base.posicao} quaternion={base.quaternion} scale={1 / RAIO_TERRA}>
      <points
        geometry={pecas.geo}
        material={pecas.material}
        position={deslocamento}
        /* A caixa delimitadora é um quadrado de 960 m dentro de um planeta de
           12.742 km: o corte por frustum nunca acertaria a conta com a esfera
           inteira girada e deslocada, e um draw call de 852 pontos não vale o
           teste. O cometa e as marcas fazem o mesmo. */
        frustumCulled={false}
        /* DEPOIS DOS DOIS CHÃOS (2 e 2,2). Os três são transparentes, nenhum
           escreve profundidade, e quem decide a ordem é este número: desenhada
           depois das lâmpadas, a textura do chão pintaria por cima delas — com
           a opacidade que ela ainda tem no retrato (48%), apagaria metade da
           luz que esta peça existe para acrescentar. */
        renderOrder={2.4}
        ref={(no) => {
          if (no && camadaBrilho !== undefined) no.layers.enable(camadaBrilho);
        }}
      />
    </group>
  );
}
