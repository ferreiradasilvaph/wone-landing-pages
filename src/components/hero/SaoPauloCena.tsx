"use client";

/**
 * SÃO PAULO VISTA DE CIMA — a cena que acontece quando a bolinha pousa no
 * Brasil e a câmera mergulha.
 *
 * Ela monta DENTRO do grupo da esfera do `HeroGlobe3D` (o grupo que gira em
 * guinada e inclinação); não tem câmera, não tem luz e não tem relógio. Quem
 * manda no tempo é `mergulhoSP.ts`, que devolve as três visibilidades que este
 * componente recebe como props. Fora do mergulho, `mapa = 0` e a cena inteira
 * fica `visible = false`: zero draw call, zero custo.
 *
 * A TORRE É FICÇÃO. A Wone não tem prédio na Avenida Paulista: `SP_MAPA.torre`
 * é um ponto de ilustração ao lado do MASP, e tudo que nasce dele — o prisma de
 * 240 m, a coroa e a marca — é desenho, não cadastro. Quem integra precisa
 * rotular a cena como SIMULAÇÃO.
 *
 * A LICENÇA DO MAPA. O chão é geometria real do OpenStreetMap (ODbL), e a
 * licença exige a atribuição `ATRIBUICAO` de `spMapa.ts` em texto VISÍVEL na
 * página enquanto a imagem aparece. Este componente não desenha texto; pôr a
 * linha no rodapé do hero é obrigação de quem monta.
 *
 * O CUSTO, MEDIDO: QUATRO draw calls (chão, prédios, torre, marca), quatro
 * materiais, zero luz, zero sombra, zero pós-processamento, 62.638 triângulos
 * no quadro mais cheio e 0,2 ms de CPU por quadro (0,5 no percentil 95; 5,7 no
 * primeiro quadro, que é a subida dos buffers para a GPU). Os 4.423 contornos
 * viram UMA geometria, construída uma vez no `useMemo` e devolvida ao driver
 * no `dispose`.
 *
 * NENHUMA LUZ NOVA. A iluminação dos prédios está ASSADA nas cores de vértice
 * (`MeshBasicMaterial` + `vertexColors`), e não num `MeshStandardMaterial`.
 * Dois motivos: o palco do hero ilumina pelo SHADER (os pontos de terra têm a
 * própria luz escrita neles), então uma `directionalLight` aqui mudaria o
 * resto da cena; e cor de vértice é de graça — a luz já está no buffer, não
 * custa um multiplicador por fragmento.
 */

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DoubleSide,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  ShapeUtils,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";

import { baseVector } from "./globeMath";
import { SP_MAPA } from "./spMapa";
import dadosPredios from "./spPredios.json";

/* --------------------------------------------------------------------------
   AS CONSTANTES DA CENA
   -------------------------------------------------------------------------- */

/** Metros por unidade de esfera: o raio 1 do globo é o raio da Terra. */
const RAIO_TERRA = 6_371_000;

/**
 * O chão sobe 30 m acima da superfície da esfera.
 *
 * Não é para "flutuar": é higiene de profundidade. A esfera opaca do palco tem
 * raio 0,9985 (9,5 km ABAIXO do raio 1 onde moram os pontos de terra), então o
 * mapa já ganharia a disputa; os 30 m são a folga contra o arredondamento de
 * float32 da matriz de modelo, que a esta escala vale ~0,4 m. Com a câmera
 * ORTOGRÁFICA um deslocamento radial não produz paralaxe nenhuma — ele só
 * ordena a profundidade, e por isso pode ser escolhido pelo que é seguro.
 */
const ALTURA_CHAO = 30;

/** O lado do chão, em metros: os 2048 px da textura a 10,742 m/px. */
const LADO_CHAO = SP_MAPA.lado * SP_MAPA.metrosPorPixel;

/**
 * O AFUNILAMENTO DA BORDA DOS PRÉDIOS.
 *
 * `spPredios.json` cobre um disco de 1.200 m em volta da torre, e um disco de
 * prédios tem BORDA: enquanto o mergulho ainda mostra 4 km de cidade, o olho
 * veria uma ilha de relevo com recorte circular no meio do mapa — o tipo de
 * costura que denuncia o truque. A altura, então, derrete dos 950 m aos 1.200:
 * os prédios da franja vão ficando rasos até sumirem no chão, e a ilha não tem
 * mais onde começar. No fim do mergulho o disco mostra 455 m de raio, ou seja
 * só a parte de dentro, onde o afunilamento não encosta.
 */
const RAIO_CHEIO = 950;
const RAIO_BORDA = 1200;

/**
 * A TORRE (ficção) — agora com ARQUITETURA, não um prisma.
 *
 * Era um paralelepípedo de 58×58×240 com uma faixa laranja no topo. No zoom
 * final isso dá 88 px de altura sem uma única quebra que diga "prédio": lia
 * como um bloco apoiado na maquete. O pedido do dono foi "um prédio mais
 * bonito", e o que faz um arranha-céu ser bonito a esta distância são duas
 * coisas só — a SILHUETA, que são os recuos, e as FIADAS de janela, que são a
 * única coisa capaz de dar escala humana a uma massa escura.
 *
 * O corte, de baixo para cima:
 *
 *     0 –  15 m   embasamento (76 m de lado) e a marquise em balanço
 *    15 – 108 m   fuste A (58 m), 25 andares
 *   108 – 180 m   fuste B (50 m), 19 andares — primeiro recuo
 *   180 – 240 m   fuste C (42 m), 16 andares — segundo recuo, e a marca
 *   240 – 278 m   coroa (34 m), esguia
 *   278 – 284 m   remate laranja (36 m) e o terraço escuro
 *
 * Os 240 m de parapeito são os mesmos de antes — a conta de pixels que os
 * escolheu (2,3× o vizinho mais alto do OSM, que tem 105,8 m) continua valendo
 * palavra por palavra. O que subiu foi só a coroa, que leva o topo a 284 m,
 * 2,7× o vizinho. O lado de baixo, 58 m, também não mudou: é o fuste A.
 *
 * Por que os recuos são de 8 m e não de 2 ou de 20: no fim do mergulho um
 * pixel vale 1,44 m, então um recuo de 2 m é um pixel e não existe; um de 20 m
 * deixaria a coroa com 18 m de lado, estreita demais para a placa do terraço,
 * que é a que carrega o reconhecimento da marca (ver constroiLogo).
 */
const PE_DIREITO = 3.7;
const EMBASAMENTO = { z0: 0, z1: 15, lado: 76 } as const;
const MARQUISE = { z0: 11.6, z1: 14.4, lado: 88 } as const;
const FUSTES = [
  { z0: 15, z1: 108, lado: 58 },
  { z0: 108, z1: 180, lado: 50 },
  { z0: 180, z1: 240, lado: 42 },
] as const;
const COROA = { z0: 240, z1: 278, lado: 34 } as const;
const REMATE = { z0: 278, z1: 284, lado: 36 } as const;
const TORRE_TOPO = REMATE.z1;

/**
 * A largura das arestas acesas: eram 3,2 m, e o pedido foi "mais finas e
 * contínuas até a coroa". 1,8 m dá 1,25 px no fim do mergulho — ainda acima de
 * um pixel, que é o piso abaixo do qual uma fita some entre dois quadros.
 */
const ARESTA = 1.8;

/**
 * A marca: 32 m de largura na fachada (cabe no fuste C, que tem 42) e 28 m no
 * terraço (que tem 36). As duas na proporção 642×400 do logo-icon.png.
 */
const LOGO_LARGURA = 22;
const LOGO_ALTURA = (LOGO_LARGURA * 400) / 642;
const LOGO_TELHADO = 24;
const LOGO_TELHADO_H = (LOGO_TELHADO * 400) / 642;
/**
 * A altura do centro da placa na fachada. A fachada vai de 15 a 240 m; o terço
 * de cima é 165–240 e o meio dele é 202. 206 põe a placa inteira dentro do
 * fuste C (180–240) com 14 m de folga em cima para a moldura.
 */
const LOGO_FACHADA_Z = 206;

/**
 * O CHÃO ESCURECE NO FUNDO DO MERGULHO — agora muito menos.
 *
 * Eram 30%, e o motivo era bom: com o mergulho terminando em Z = 14.000 a
 * textura aparecia ampliada 7,5×, e apagar o chão escondia o borrão. Com o fim
 * do mergulho recuado para 9.200 (ver `ZOOM_TORRE`) a ampliação caiu para 4,9×,
 * e com o bloom da etapa 5 pegando as vias o chão virou a FONTE DE LUZ do
 * quadro — apagá-lo em 30% agora é apagar justamente o que faz a cena parecer
 * uma cidade à noite.
 *
 * 12% é o que restou: o bastante para a geometria dos prédios continuar sendo
 * quem carrega o detalhe no fundo, e pouco o bastante para as Marginais
 * continuarem acesas. A conta usa `logo`, que é exatamente o sinal de "estamos
 * no fundo" (ela só sai de zero acima de Z = 5.000).
 */
const CHAO_NO_FUNDO = 0.12;

/* ------------------------------------------------------------------ cores

   A MISTURA ACONTECE EM sRGB, E A CONVERSÃO PARA LINEAR É A ÚLTIMA COISA.

   O buffer de cor de vértice do WebGL é LINEAR, e misturar lá dentro não é a
   mesma coisa que misturar na cor que o olho (e o `globals.css`) enxerga:
   14% de âmbar sobre o cinza do telhado, feitos em linear, saem como 43% de
   âmbar na tela — foi exatamente o que apareceu na primeira medição, uma
   cidade cor de telha onde era para haver uma cidade escura com algumas luzes.
   Então a paleta daqui são ternos em sRGB (0–1), toda interpolação é em sRGB, e
   `paraLinear` roda UMA vez por face, no instante de escrever no buffer. */

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

/* Tudo dentro da paleta da página (`globals.css`): os pretos `ink-*`, o laranja
   da marca e o âmbar das vias da textura. */
/* A PALETA DA CIDADE SUBIU DE CONTRASTE em 17/10, com o pedido de "um belo
   trabalho cinematográfico".

   O que havia era um azul-chumbo quase plano: a face iluminada a #22222E e a de
   costas a #0B0B10 — 14 pontos de luminância entre a frente e o fundo de um
   prédio. Num quadro noturno isso lê como maquete de papelão, porque é
   justamente a RAZÃO entre as faces que o olho usa para separar volumes.

   Agora a face da luz vai a #3A3A52 e a de sombra DESCE a #07070B: o contraste
   entre elas quase triplica, e a cidade ganha relevo sem ganhar brilho médio —
   o quadro continua escuro, que é o que um mapa noturno tem de ser. A aresta
   de cima, que é o fio que desenha a silhueta de cada prédio contra o céu,
   sobe junto para #51516E.

   A JANELA fica no mesmo âmbar das vias (#FFB070): é a cor da luz desta cidade,
   e inventar uma segunda seria dizer que as ruas e as salas acesas são feitas
   de lâmpadas diferentes. */
const PAREDE_LUZ = tom("#3a3a52"); // a face voltada para a luz
const PAREDE_SOMBRA = tom("#07070b"); // a face de costas
const PAREDE_TOPO = tom("#51516e"); // o fio da aresta de cima
const TELHADO = tom("#15151e");
const JANELA = tom("#ffb070"); // o mesmo âmbar das vias da textura
const TORRE_CORPO = tom("#101018");
const TORRE_LUZ = tom("#45455f");
const LARANJA = tom("#ff7700");

/* AS QUATRO CORES QUE A REFORMA DE 17/10 TROUXE — nenhuma nova: as três da
   página e o âmbar que já estava aqui.

   - VIDRO e VIDRO_LUZ são a fachada da torre. São mais ESCUROS que a parede
     da cidade de propósito: a torre tem de ler como vidro (quase preto, com
     reflexo) contra o concreto dos vizinhos, e é esse contraste de MATERIAL,
     não o de tamanho, que faz um marco parecer um marco.
   - CREME é o paper do globals.css (#FFFFE3), o mesmo da tipografia. Entra na
     marquise da rua e na faixa de luz sob a marca — os dois lugares onde um
     prédio de verdade põe luz branca, e os únicos onde ela aparece aqui.
   - OCLUSAO é o preto do contato com o chão. Não é uma cor que se veja: é a
     ausência dela na base de cada prédio, que é o que dá PESO à maquete. */
const VIDRO = tom("#0c0c14");
const VIDRO_LUZ = tom("#2a2a3e");
const CREME = tom("#ffffe3");
const OCLUSAO = tom("#04040a");

/**
 * A DIREÇÃO DA LUZ ASSADA, no referencial local (x leste, y norte, z para
 * cima): de noroeste e de cima.
 *
 * É a mesma direção da luz do palco ("quente, de cima-à-esquerda", no shader do
 * `HeroGlobe3D`): com a cidade centralizada, o alto da tela é o norte e a
 * esquerda é o oeste, então noroeste-alto na cidade é cima-à-esquerda na tela.
 * Uma segunda direção de luz faria a cidade brigar com o planeta que a cerca.
 */
const LUZ = new Vector3(-0.52, 0.52, 0.68).normalize();
/** O maior produto escalar possível para uma parede (que é sempre vertical). */
const LUZ_MAX = Math.hypot(LUZ.x, LUZ.y);

/* --------------------------------------------------------------------------
   O REFERENCIAL TANGENTE

   O mapa é um quadrado plano de 22 km colado numa esfera de raio 1. Para ele
   não sair espelhado nem girado, os três eixos locais têm de ser EXATAMENTE:

     normal = baseVector(lat, lon)                          (para fora)
     norte  = normalize(POLO − (POLO·normal)·normal)        (a tangente que
              aponta para o polo, projetada no plano)
     leste  = norte × normal

   A ORDEM DO PRODUTO VETORIAL É O ERRO FÁCIL. A terna geográfica (leste, norte,
   cima) é destra, e numa terna destra vale `leste × norte = cima`; invertendo,
   `leste = norte × cima`. Escrever `cima × norte` dá o OESTE e entrega a cidade
   espelhada — com o Pinheiros a leste e a Paulista descendo para o lado
   errado, um erro que só aparece para quem conhece São Paulo.

   A PROVA (medida, não deduzida): projetando os pontos de `SP_MAPA.pontos`
   neste referencial e comparando com os pixels que o gerador da textura
   escreveu, a Marginal Tietê cai 4.912 m ao NORTE (a textura diz 4.884), o Rio
   Pinheiros 3.722 m a OESTE (a textura diz 3.728) e a Sé 2.333 m a LESTE (2.335).
   Os ~0,5% de diferença no eixo norte-sul são a projeção equiretangular da
   textura contra a esfera de raio 6.371 km: 40 m no canto mais distante, 0,8 px
   no zoom da cidade e 7 m dentro do raio dos prédios. Não há correção a fazer.

   A geometria do chão nasce no plano XY com a normal em +Z e a primeira linha
   da imagem em +Y — ou seja, montada neste referencial ela já fica com o norte
   em cima e o leste à direita, sem rotação nenhuma. A coincidência é feliz e
   está escrita aqui para ninguém "consertá-la".

   O MAPA APARECE 7,7° TORTO NA TELA, E ESTÁ CERTO. A câmera do palco tem como
   "para cima" o eixo Y da projeção (centro em lat 22 / lon −32), não o
   meridiano de São Paulo; o ângulo entre os dois é a CONVERGÊNCIA DE
   MERIDIANOS, e aqui ela vale 7,66° (medida: o norte local cai em
   (0,133, 0,991) na tela). Endireitar pediria um rolamento do grupo inteiro —
   um terceiro ângulo no contrato e um planeta que gira na tela antes do
   mergulho. A 7,7° ninguém lê "torto", lê "globo".
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
  const posicao = normal
    .clone()
    .multiplyScalar(1 + ALTURA_CHAO / RAIO_TERRA);
  return { posicao, quaternion };
}

/* --------------------------------------------------------------------------
   OS PRÉDIOS
   -------------------------------------------------------------------------- */

type AnelPronto = {
  /** x0,y0,x1,y1… em metros (x leste, y norte), sentido anti-horário. */
  readonly pts: Float64Array;
  readonly n: number;
  readonly altura: number;
  readonly semente: number;
  /** A distância do centroide à torre, em metros — a régua das janelas. */
  readonly dist: number;
};

function degrau(x: number) {
  const p = x < 0 ? 0 : x > 1 ? 1 : x;
  return p * p * (3 - 2 * p);
}

/**
 * Ruído determinístico em [0,1). NADA de `Math.random`: a cidade tem de nascer
 * idêntica em todo quadro, em toda aba e em todo deploy — senão as janelas
 * acesas piscariam a cada remontagem do canvas e as alturas sorteadas mudariam
 * de uma visita para a outra.
 */
function sorteio(semente: number) {
  let x = Math.imul(semente ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  /* O `>>> 0` TEM de estar aqui, e não lá em cima: `^=` devolve inteiro COM
     sinal, e sem este último passo metade dos sorteios sai negativa — o que
     na primeira medição acendeu metade da cidade em vez de um sexto dela. */
  return (x >>> 0) / 4294967296;
}

/**
 * A altura de quem não tem `height` nem `building:levels` no OSM — 102 dos
 * 4.423. Pela ÁREA, porque é o que sobra de informação: um galpão de 4.000 m²
 * não tem a altura de uma casa de 100 m². A faixa é 9–30 m (dois a dez andares)
 * com ±2 m de sorteio para a franja não sair alinhada.
 */
function alturaPorArea(area: number, semente: number) {
  const lado = Math.sqrt(area);
  const t = degrau((lado - 10) / (63 - 10));
  return 9 + 21 * t + (sorteio(semente) - 0.5) * 4;
}

function preparaAneis(): AnelPronto[] {
  const fonte = dadosPredios.predios as ReadonlyArray<{
    c: number[][];
    h: number | null;
  }>;
  const aneis: AnelPronto[] = [];

  for (let i = 0; i < fonte.length; i++) {
    const c = fonte[i].c;
    let n = c.length;
    /* 89 dos 4.423 anéis vêm FECHADOS (último vértice igual ao primeiro). Sem
       isto eles ganhariam uma parede de largura zero, que é um triângulo
       degenerado por prédio — invisível, mas pago em todo quadro. */
    if (n > 3 && c[0][0] === c[n - 1][0] && c[0][1] === c[n - 1][1]) n--;
    if (n < 3) continue;

    // Área com sinal (fórmula do laço): dá o tamanho E o sentido de uma vez.
    let dobro = 0;
    let cx = 0;
    let cy = 0;
    for (let k = 0, j = n - 1; k < n; j = k++) {
      dobro += c[j][0] * c[k][1] - c[k][0] * c[j][1];
      cx += c[k][0];
      cy += c[k][1];
    }
    const area = Math.abs(dobro) / 2;
    if (area < 12) continue; // ruído do cadastro: 12 m² não é prédio
    cx /= n;
    cy /= n;

    const corte = 1 - degrau((Math.hypot(cx, cy) - RAIO_CHEIO) / (RAIO_BORDA - RAIO_CHEIO));
    if (corte <= 0.02) continue;

    const bruta = fonte[i].h ?? alturaPorArea(area, i * 2 + 1);
    const altura = bruta * corte;
    if (altura < 2) continue;

    /* O sentido ANTI-HORÁRIO é o contrato do resto do arquivo: é dele que sai a
       normal para fora das paredes (n = (dy, −dx)) e a face para cima do
       telhado. Chegando horário, inverte-se aqui, uma vez, e ninguém mais
       precisa pensar nisso. */
    const pts = new Float64Array(n * 2);
    if (dobro >= 0) {
      for (let k = 0; k < n; k++) {
        pts[k * 2] = c[k][0];
        pts[k * 2 + 1] = c[k][1];
      }
    } else {
      for (let k = 0; k < n; k++) {
        pts[k * 2] = c[n - 1 - k][0];
        pts[k * 2 + 1] = c[n - 1 - k][1];
      }
    }

    aneis.push({ pts, n, altura, semente: i, dist: Math.hypot(cx, cy) });
  }

  return aneis;
}

/**
 * Os 4.423 contornos em UMA geometria.
 *
 * Sem `mergeGeometries`: juntar 4.423 `ExtrudeGeometry` custa 4.423 alocações
 * intermediárias e uma cópia a mais de tudo, para chegar no mesmo buffer que
 * este laço escreve direto. O laço também é o lugar onde a cor de cada vértice
 * nasce — e é ela que carrega a luz, a aresta de cima e as janelas acesas.
 *
 * Não é indexada de propósito: cada parede e cada telhado têm a própria cor, e
 * um índice compartilhado obrigaria a duplicar os vértices do mesmo jeito.
 */
function constroiPredios(aneis: AnelPronto[]) {
  /**
   * QUANTAS FATIAS TEM CADA PAREDE.
   *
   * Uma parede era UM quadrilátero do chão ao telhado, com a cor escura
   * embaixo e clara em cima. Isso basta para um prédio de 10 m, onde o
   * degradê inteiro cabe em três pixels, e é pouco para um de 90: o
   * escurecimento da base, que é o que dá PESO à maquete, escorre por toda a
   * fachada e vira uma cortina em vez de uma sombra de contato.
   *
   * Então a parede ganha cortes horizontais, e só onde eles pagam:
   *
   *   até 40 m    1 fatia  — o degradê simples, como era (2.896 prédios)
   *   40 a 60 m   2 fatias — a oclusão presa nos 9 m de baixo (627 prédios)
   *   acima de 60 2 fatias + o FIO: os 1,2 m de cima mais claros (245 prédios)
   *
   * O fio é o pedido "telhados com um fio de aresta mais claro nos prédios
   * acima de 60 m". Ele é uma fatia da PAREDE e não uma fita no plano do
   * telhado — e isso é deliberado: no plano do telhado ele seria coplanar com
   * ele, e a esta escala (o palco tem 12.742 km de profundidade e um buffer de
   * 24 bits) um desnível de 15 cm não chega a um degrau do z-buffer. A fita
   * brigaria com o telhado em z-fighting. Na parede, vista a 32° de
   * obliquidade, ela lê exatamente como a aresta acesa do parapeito.
   */
  const fatias = (altura: number) => (altura > 40 ? (altura > 60 ? 3 : 2) : 1);

  let triangulos = 0;
  for (const a of aneis) {
    triangulos += a.n * 2 * fatias(a.altura); // as paredes
    triangulos += a.n - 2; // o telhado
  }
  const posicoes = new Float32Array(triangulos * 9);
  const cores = new Float32Array(triangulos * 9);

  let p = 0;
  const cor: Tom = [0, 0, 0];
  const corTopo: Tom = [0, 0, 0];
  const corPe: Tom = [0, 0, 0];
  const corFio: Tom = [0, 0, 0];
  const luzLinear: Tom = [0, 0, 0];
  const topoLinear: Tom = [0, 0, 0];
  const peLinear: Tom = [0, 0, 0];
  const fioLinear: Tom = [0, 0, 0];
  const v2: Vector2[] = [];
  const poco: Vector2[] = [];

  const poe = (x: number, y: number, z: number, c: Tom) => {
    posicoes[p] = x;
    posicoes[p + 1] = y;
    posicoes[p + 2] = z;
    cores[p] = c[0];
    cores[p + 1] = c[1];
    cores[p + 2] = c[2];
    p += 3;
  };

  /** Uma fatia de parede entre dois z, com a cor de baixo e a de cima. */
  const tira = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    z0: number,
    z1: number,
    cb: Tom,
    ct: Tom,
  ) => {
    poe(ax, ay, z0, cb);
    poe(bx, by, z0, cb);
    poe(bx, by, z1, ct);
    poe(ax, ay, z0, cb);
    poe(bx, by, z1, ct);
    poe(ax, ay, z1, ct);
  };

  for (const anel of aneis) {
    const { pts, n, altura, semente, dist } = anel;

    /**
     * O TOM ANDA COM A ALTURA.
     *
     * Num mapa noturno real os prédios altos são mais claros no alto (eles
     * pegam a luz que vem de cima e não têm vizinho que os sombreie) e os
     * baixos somem no escuro do quarteirão. A maquete que havia aqui tratava
     * os dois igual: a mesma mistura de 0,45 para o topo de um galpão de 9 m e
     * de uma torre de 100. O resultado era uma cidade PLANA em tom, onde só a
     * geometria separava os volumes.
     *
     * Agora o topo vai de 0,26 (galpão) a 0,60 (torre) e a base dos baixos
     * desce mais 22% para o preto. A faixa 12–95 m é a dos dados: 95 m é o
     * nonagésimo nono percentil daqui (o mais alto tem 105,8).
     */
    const grauAlt = degrau((altura - 12) / (95 - 12));

    /**
     * A DENSIDADE DE JANELAS CAI COM A DISTÂNCIA DA TORRE.
     *
     * Era uma constante: 17% das paredes acesas em todo o disco de 1.200 m.
     * O pedido foi "maior perto da Paulista e caindo com a distância", e a
     * razão é de leitura, não de realismo: o olho entra no quadro pelo centro
     * (é onde a torre está, é onde o mergulho termina), e um gradiente de luz
     * que aponta para o centro é o que o segura lá. 30% no pé da torre, 9% na
     * franja — onde os prédios já estão derretendo no chão de qualquer jeito.
     */
    const densidade = 0.3 - 0.21 * degrau(dist / RAIO_BORDA);

    const nFatias = fatias(altura);
    const temFio = nFatias === 3;
    const zFio = temFio ? altura - 1.2 : altura;
    const zOclusao = nFatias >= 2 ? 9 : 0;

    /* AS PAREDES. Para um anel anti-horário, a normal para fora da aresta
       a→b é (dy, −dx) normalizada: na aresta de baixo de um quadrado
       (0,0)→(1,0) ela dá (0,−1), que aponta para fora. */
    for (let k = 0, j = n - 1; k < n; j = k++) {
      const ax = pts[j * 2];
      const ay = pts[j * 2 + 1];
      const bx = pts[k * 2];
      const by = pts[k * 2 + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const comp = Math.hypot(dx, dy);
      if (comp < 0.05) continue; // vértice repetido no cadastro

      const luz = Math.max(0, (dy * LUZ.x - dx * LUZ.y) / comp) / LUZ_MAX;
      mistura(cor, PAREDE_SOMBRA, PAREDE_LUZ, luz);
      if (grauAlt < 1) mistura(cor, cor, PAREDE_SOMBRA, (1 - grauAlt) * 0.22);

      /* O TOPO É MAIS CLARO. Não é um truque de estilo: é o que desenha a
         silhueta de cada prédio contra o telhado do vizinho num quadro em que
         o prédio todo tem 4 px. */
      mistura(corTopo, cor, PAREDE_TOPO, 0.26 + 0.34 * grauAlt);

      /* O fio do parapeito sai do topo SEM a janela: creme sobre âmbar daria
         um rosa que não está na página, e o fio é estrutura, não luz de sala. */
      if (temFio) mistura(corFio, corTopo, CREME, 0.3);

      /* AS JANELAS ACESAS. Uma parede sorteada, só em prédios de pelo menos
         12 m, ganha âmbar na borda de cima — com a cor interpolando até a
         base, o que se vê é a luz escorrendo dos últimos andares. É o mínimo
         que faz a cidade parecer ligada; mais do que isso e o âmbar começa a
         competir com as vias da textura, que são o desenho principal. */
      if (altura >= 12 && sorteio(semente * 97 + k) < densidade) {
        mistura(corTopo, corTopo, JANELA, 0.38);
      }

      /* A OCLUSÃO DE CONTATO. O prédio não encosta no chão: ele AFUNDA nele.
         Onde há duas fatias ela é forte e curta (62% de preto nos 9 m de
         baixo); onde há uma só ela é mais fraca, porque vai se diluir pela
         fachada inteira. */
      mistura(corPe, cor, OCLUSAO, nFatias >= 2 ? 0.62 : 0.42);

      paraLinear(peLinear, corPe);
      paraLinear(luzLinear, cor);
      paraLinear(topoLinear, corTopo);

      if (nFatias >= 2) {
        tira(ax, ay, bx, by, 0, zOclusao, peLinear, luzLinear);
        tira(ax, ay, bx, by, zOclusao, zFio, luzLinear, topoLinear);
      } else {
        tira(ax, ay, bx, by, 0, zFio, peLinear, topoLinear);
      }
      if (temFio) {
        paraLinear(fioLinear, corFio);
        tira(ax, ay, bx, by, zFio, altura, fioLinear, fioLinear);
      }
    }

    /* O TELHADO. `ShapeUtils.triangulateShape` é o earcut que o próprio three
       usa no `ExtrudeGeometry` — nada novo no pacote. O sentido de cada
       triângulo é conferido pela área: earcut não promete orientação, e um
       telhado virado para baixo sumiria no `FrontSide`.

       Os `Vector2` saem de um POÇO que cresce e é reusado: são 27 mil vértices,
       e um objeto por vértice é lixo garantido logo depois do pior quadro do
       hero. O poço tira as 27 mil alocações do caminho. */
    while (poco.length < n) poco.push(new Vector2());
    v2.length = 0;
    for (let k = 0; k < n; k++) {
      v2.push(poco[k].set(pts[k * 2], pts[k * 2 + 1]));
    }
    const faces = ShapeUtils.triangulateShape(v2, []);
    /* O telhado clareia com a altura — é o que separa a torre de escritórios
       do galpão ao lado quando os dois medem poucos pixels — e um em cada
       dezesseis puxa para o âmbar, que é a laje iluminada. */
    mistura(cor, TELHADO, PAREDE_TOPO, grauAlt);
    if (sorteio(semente * 31 + 7) < 0.06) mistura(cor, cor, JANELA, 0.1);
    paraLinear(topoLinear, cor);
    for (const f of faces) {
      const a = v2[f[0]];
      const b = v2[f[1]];
      const c = v2[f[2]];
      const giro = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      poe(a.x, a.y, altura, topoLinear);
      if (giro >= 0) {
        poe(b.x, b.y, altura, topoLinear);
        poe(c.x, c.y, altura, topoLinear);
      } else {
        poe(c.x, c.y, altura, topoLinear);
        poe(b.x, b.y, altura, topoLinear);
      }
    }
  }

  const geo = new BufferGeometry();
  /* O buffer é dimensionado pelo pior caso (todas as arestas aproveitadas) e
     as paredes degeneradas descartadas no caminho deixam sobra no fim: a
     geometria usa só o que foi escrito. */
  geo.setAttribute("position", new BufferAttribute(posicoes.subarray(0, p), 3));
  geo.setAttribute("color", new BufferAttribute(cores.subarray(0, p), 3));
  geo.computeBoundingSphere();
  return { geo, triangulos: p / 9 };
}

/* --------------------------------------------------------------------------
   O CHÃO
   -------------------------------------------------------------------------- */

/**
 * O chão é um DISCO que se dissolve na borda, e não o quadrado da textura.
 *
 * Medido no laboratório: com um `PlaneGeometry` de 22 km, o quadrado APARECE —
 * no zoom da cidade ele ocupa 70% do disco do globo e as quatro arestas retas
 * sobram sobre o planeta escuro, denunciando uma foto colada na bola. Como a
 * mancha urbana é redonda e a vinheta da textura já escurece as pontas, cortar
 * o quadrado num círculo não perde cidade nenhuma: o raio de 11 km pega tudo
 * que a imagem tem de claro, e os cantos que ficam de fora (a 15,5 km) já eram
 * `ink-950`.
 *
 * A DISSOLUÇÃO é alfa POR VÉRTICE, em quatro anéis: cheia até 70% do raio,
 * 60% em 88% e zero na borda. Vértice com quatro componentes (RGBA) é o que o
 * three precisa para multiplicar o alfa do material — com três ele só
 * multiplicaria a cor, e a borda continuaria lá. Custa 640 triângulos e nenhum
 * draw call a mais: continua sendo UMA malha com UM material.
 */
function constroiChao() {
  const R = LADO_CHAO / 2;
  const SETORES = 128;
  const ANEIS = [0, 0.7, 0.88, 1];
  const ALFAS = [1, 1, 0.6, 0];

  const pos: number[] = [];
  const uv: number[] = [];
  const cor: number[] = [];
  const poe = (r: number, ang: number, alfa: number) => {
    const x = Math.cos(ang) * r * R;
    const y = Math.sin(ang) * r * R;
    pos.push(x, y, 0);
    uv.push(0.5 + x / LADO_CHAO, 0.5 + y / LADO_CHAO);
    cor.push(1, 1, 1, alfa);
  };

  const passo = (Math.PI * 2) / SETORES;
  for (let k = 0; k < SETORES; k++) {
    const a0 = k * passo;
    const a1 = (k + 1) * passo;
    for (let anel = 0; anel < ANEIS.length - 1; anel++) {
      const r0 = ANEIS[anel];
      const r1 = ANEIS[anel + 1];
      const f0 = ALFAS[anel];
      const f1 = ALFAS[anel + 1];
      if (r0 === 0) {
        // o leque do miolo: um triângulo por setor
        poe(0, 0, f0);
        poe(r1, a0, f1);
        poe(r1, a1, f1);
      } else {
        poe(r0, a0, f0);
        poe(r1, a0, f1);
        poe(r1, a1, f1);
        poe(r0, a0, f0);
        poe(r1, a1, f1);
        poe(r0, a1, f0);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(cor), 4));
  geo.computeBoundingSphere();
  return geo;
}

/* --------------------------------------------------------------------------
   A TORRE
   -------------------------------------------------------------------------- */

/**
 * A TORRE, numa geometria só — fuste com fiadas, recuos, arestas, coroa,
 * marquise, moldura e faixa de luz. Tudo é cor de vértice no mesmo material,
 * então "tudo numa geometria" aqui não é economia de memória: é economia de
 * DRAW CALL, que é a moeda que importa dentro do mergulho.
 *
 * As listas são number[] comuns e não um Float32Array dimensionado no começo,
 * ao contrário dos prédios: a torre tem ~1.600 triângulos (contra 62 mil), e
 * contar triângulos à mão para poupar uma realocação que acontece UMA vez na
 * vida da página é o tipo de precisão que só serve para quebrar quando alguém
 * acrescentar um andar.
 */
function constroiTorre() {
  const pos: number[] = [];
  const cores: number[] = [];
  const poe = (x: number, y: number, z: number, c: Tom) => {
    pos.push(x, y, z);
    cores.push(c[0], c[1], c[2]);
  };
  /* Toda cor sai daqui em LINEAR, e a mistura toda acontece antes, em sRGB —
     é o contrato do bloco de cores lá em cima. */
  const L = (t: Tom) => paraLinear([0, 0, 0], t);

  const cantos = (lado: number, cx = 0, cy = 0) => {
    const m = lado / 2;
    return [
      [cx - m, cy - m],
      [cx + m, cy - m],
      [cx + m, cy + m],
      [cx - m, cy + m],
    ] as [number, number][];
  };

  /** A luz da aresta a→b de um contorno anti-horário (normal para fora). */
  const luzDa = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const c = Math.hypot(dx, dy);
    return Math.max(0, (dy * LUZ.x - dx * LUZ.y) / c) / LUZ_MAX;
  };

  const parede = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    z0: number,
    z1: number,
    cb: Tom,
    ct: Tom,
  ) => {
    poe(ax, ay, z0, cb);
    poe(bx, by, z0, cb);
    poe(bx, by, z1, ct);
    poe(ax, ay, z0, cb);
    poe(bx, by, z1, ct);
    poe(ax, ay, z1, ct);
  };

  const tampa = (lado: number, z: number, t: Tom, cx = 0, cy = 0) => {
    const q = cantos(lado, cx, cy);
    const c = L(t);
    poe(q[0][0], q[0][1], z, c);
    poe(q[1][0], q[1][1], z, c);
    poe(q[2][0], q[2][1], z, c);
    poe(q[0][0], q[0][1], z, c);
    poe(q[2][0], q[2][1], z, c);
    poe(q[3][0], q[3][1], z, c);
  };

  /** Um bloco reto: quatro paredes com luz por face e, se pedida, a tampa. */
  const bloco = (
    lado: number,
    z0: number,
    z1: number,
    base: Tom,
    topo: Tom,
    tam: Tom | null,
    cx = 0,
    cy = 0,
  ) => {
    const q = cantos(lado, cx, cy);
    const a: Tom = [0, 0, 0];
    const b: Tom = [0, 0, 0];
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      const luz = luzDa(ax, ay, bx, by);
      mistura(a, base, topo, 0.15 + 0.85 * luz);
      mistura(b, a, PAREDE_TOPO, 0.3);
      parede(ax, ay, bx, by, z0, z1, L(a), L(b));
    }
    if (tam) tampa(lado, z1, tam, cx, cy);
  };

  /**
   * Uma chapa plana numa fachada norte-sul, para a moldura e a faixa de luz.
   * `sul` dá a normal para −y; o norte é o espelho em x, senão a chapa sai
   * virada para dentro e some no FrontSide.
   */
  const chapa = (
    sul: boolean,
    y: number,
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    c: Tom,
  ) => {
    const e = sul ? x0 : x1;
    const d = sul ? x1 : x0;
    poe(e, y, z0, c);
    poe(d, y, z0, c);
    poe(d, y, z1, c);
    poe(e, y, z0, c);
    poe(d, y, z1, c);
    poe(e, y, z1, c);
  };

  /* ---------------------------------------------------------- embasamento */

  bloco(
    EMBASAMENTO.lado,
    EMBASAMENTO.z0,
    EMBASAMENTO.z1,
    TORRE_CORPO,
    TORRE_LUZ,
    TELHADO,
  );

  /* A MARQUISE: a laje em balanço no nível da rua, com a borda acesa em creme.
     É o único branco da base, e é ele que diz "aqui se entra" — sem ele o
     embasamento é só uma caixa mais larga embaixo de outra caixa. O TOPO da
     laje fica escuro: de cima se vê o telhado dela, e uma laje branca inteira
     viraria uma mancha do tamanho de um quarteirão. */
  {
    const q = cantos(MARQUISE.lado);
    const borda = mistura([0, 0, 0], CREME, LARANJA, 0.22);
    const pe = mistura([0, 0, 0], borda, TORRE_CORPO, 0.5);
    const bl = L(borda);
    const pl = L(pe);
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      parede(ax, ay, bx, by, MARQUISE.z0, MARQUISE.z1, pl, bl);
    }
    tampa(MARQUISE.lado, MARQUISE.z1, TELHADO);
  }

  /* ------------------------------------------------- os fustes e as fiadas */

  /**
   * O ANDAR ACESO É SORTEADO POR ANDAR, não por janela.
   *
   * É a diferença entre um prédio e um ruído: num edifício de escritórios à
   * noite o que se vê de longe é um ANDAR inteiro aceso (a laje toda, porque é
   * uma laje só) e o de cima apagado. Sorteando por janela sai uma textura de
   * sal e pimenta que, a 1,44 m/px, vira cinza uniforme — exatamente o que não
   * se quer. Um em cada cinco fica apagado; os acesos variam de brilho, para a
   * fachada não virar uma grade perfeita.
   */
  const fiada = (andar: number) => {
    if (sorteio(andar * 131 + 7) < 0.34) return 0;
    return 0.42 + 0.58 * sorteio(andar * 17 + 3);
  };

  let andar = 0;
  for (const seg of FUSTES) {
    const q = cantos(seg.lado);
    const n = Math.max(1, Math.round((seg.z1 - seg.z0) / PE_DIREITO));
    const pe = (seg.z1 - seg.z0) / n;
    const vidro: Tom = [0, 0, 0];
    const acesa: Tom = [0, 0, 0];
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      mistura(vidro, VIDRO, VIDRO_LUZ, luzDa(ax, ay, bx, by));
      const vl = L(vidro);
      for (let a = 0; a < n; a++) {
        const z0 = seg.z0 + a * pe;
        /* 62% de vidro escuro embaixo e 38% de fiada em cima: a janela de um
           andar fica na parte de CIMA do pé-direito, acima do peitoril. */
        const zf = z0 + pe * 0.7;
        parede(ax, ay, bx, by, z0, zf, vl, vl);
        const nivel = fiada(andar + a);
        if (nivel > 0) {
          mistura(acesa, vidro, JANELA, 0.05 + 0.26 * nivel);
          const al = L(acesa);
          parede(ax, ay, bx, by, zf, z0 + pe, al, al);
        } else {
          parede(ax, ay, bx, by, zf, z0 + pe, vl, vl);
        }
      }
    }
    /* O TERRAÇO DO RECUO. Uma tampa inteira, e não um anel: o fuste de cima
       nasce exatamente neste z e cobre o miolo, então o anel visível sai de
       graça e sem um único triângulo em L para calcular. */
    tampa(seg.lado, seg.z1, TELHADO);
    andar += n;
  }

  /* ---------------------------------------------------- a coroa e o remate */

  /* A coroa é vidro liso, sem fiadas: é a casa de máquinas, e um prédio de
     verdade não tem escritório no último lance. O que a desenha é a silhueta
     mais estreita e as quatro arestas que continuam subindo. */
  bloco(COROA.lado, COROA.z0, COROA.z1, VIDRO, VIDRO_LUZ, null);

  const laranjaFraco = mistura([0, 0, 0], LARANJA, TORRE_CORPO, 0.3);
  bloco(
    REMATE.lado,
    REMATE.z0,
    REMATE.z1,
    laranjaFraco,
    LARANJA,
    /* A TAMPA DO REMATE É ESCURA, e isso é a diferença entre ver a marca e não
       ver: a placa do terraço é laranja chapado, e laranja sobre laranja é um
       borrão. Sobre o terraço escuro ela é a única coisa acesa no topo. */
    TORRE_CORPO,
  );

  /* -------------------------------------------------- as arestas verticais */

  /* Fitas de 1,8 m encostadas nos cantos (5 cm para fora), e não linhas: uma
     linha de WebGL tem 1 px de dispositivo e some na metade do mergulho. Elas
     acompanham cada recuo — por isso uma por segmento — e vão sem corte dos
     15 m ao alto da coroa, que é o "contínuas até a coroa" do pedido. */
  for (const seg of [...FUSTES, COROA]) {
    const m = seg.lado / 2 + 0.05;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      bloco(
        ARESTA,
        seg.z0,
        seg.z1,
        laranjaFraco,
        LARANJA,
        null,
        sx * (m - ARESTA / 2),
        sy * (m - ARESTA / 2),
      );
    }
  }

  /* ------------------------------------ a moldura e a faixa de luz da marca */

  /* O LETREIRO. A placa da marca sozinha, colada num vidro escuro, lê como um
     adesivo; o que a transforma em letreiro de topo de prédio são as duas
     coisas que todo letreiro real tem: uma MOLDURA fina que a destaca do fundo
     e uma FAIXA DE LUZ logo abaixo, que é o refletor que a ilumina de baixo
     para cima. A moldura é laranja (a cor da marca) e a faixa é creme (a luz
     branca da página), as duas a 0,35 m da parede, atrás da placa, que fica a
     0,6 m. Vão nas duas fachadas pelo mesmo motivo das placas: o SINAL da
     obliquidade é de quem integra o mergulho, e tombar a esfera para o outro
     lado não pode custar o letreiro. */
  {
    const fuste = FUSTES[FUSTES.length - 1];
    const lw = LOGO_LARGURA / 2;
    const lh = LOGO_ALTURA / 2;
    const mx = lw + 1.5; // a moldura, com 1,5 m de respiro em volta da arte
    const mz = lh + 1.5;
    const fio = 0.9; // a espessura do fio da moldura
    const molduraL = L(mistura([0, 0, 0], LARANJA, TORRE_CORPO, 0.12));
    const faixaL = L(mistura([0, 0, 0], CREME, LARANJA, 0.18));
    const Z = LOGO_FACHADA_Z;
    for (const sul of [true, false]) {
      const y = (sul ? -1 : 1) * (fuste.lado / 2 + 0.35);
      chapa(sul, y, -mx, mx, Z + mz - fio, Z + mz, molduraL);
      chapa(sul, y, -mx, mx, Z - mz, Z - mz + fio, molduraL);
      chapa(sul, y, -mx, -mx + fio, Z - mz, Z + mz, molduraL);
      chapa(sul, y, mx - fio, mx, Z - mz, Z + mz, molduraL);
      // a faixa de luz, logo abaixo da moldura
      chapa(sul, y, -mx + 1.2, mx - 1.2, Z - mz - 3.2, Z - mz - 1.7, faixaL);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(cores), 3));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * AS TRÊS PLACAS DA MARCA, numa geometria só.
 *
 * 1. no TERRAÇO do remate, deitada, com o "para cima" da arte apontando para o
 *    NORTE — é a que carrega o reconhecimento, porque numa vista a 32° um
 *    telhado encolhe só 15% (cos 32°) enquanto uma fachada encolhe 47%
 *    (sen 32°);
 * 2. na fachada SUL, no terço de cima, dentro da moldura que a torre desenha;
 * 3. na fachada NORTE, espelhada, porque o SINAL da inclinação é de quem
 *    integra (veja EstadoSP.inclinacao): tombar a esfera para o outro lado não
 *    pode custar a marca.
 *
 * A arte é logo-icon.png, laranja chapado com fundo transparente — num
 * MeshBasicMaterial ela já sai com a cor cheia, que é o que "emissivo"
 * significa numa cena sem luz.
 */
function constroiLogo() {
  const pos: number[] = [];
  const uv: number[] = [];
  const quad = (
    cantos: [number, number, number][],
    uvs: [number, number][],
  ) => {
    const ordem = [0, 1, 2, 0, 2, 3];
    for (const i of ordem) {
      pos.push(cantos[i][0], cantos[i][1], cantos[i][2]);
      uv.push(uvs[i][0], uvs[i][1]);
    }
  };
  const uvQuad: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  // 1. no terraço: no plano XY, u para leste, v para o norte.
  const tw = LOGO_TELHADO / 2;
  const th = LOGO_TELHADO_H / 2;
  const zTelhado = TORRE_TOPO + 0.4;
  quad(
    [
      [-tw, -th, zTelhado],
      [tw, -th, zTelhado],
      [tw, th, zTelhado],
      [-tw, th, zTelhado],
    ],
    uvQuad,
  );

  const lw = LOGO_LARGURA / 2;
  const lh = LOGO_ALTURA / 2;
  const fuste = FUSTES[FUSTES.length - 1];

  // 2. fachada sul (y negativo), 0,6 m à frente da parede.
  const ys = -(fuste.lado / 2 + 0.6);
  quad(
    [
      [-lw, ys, LOGO_FACHADA_Z - lh],
      [lw, ys, LOGO_FACHADA_Z - lh],
      [lw, ys, LOGO_FACHADA_Z + lh],
      [-lw, ys, LOGO_FACHADA_Z + lh],
    ],
    uvQuad,
  );

  // 3. fachada norte: o u anda para OESTE, senão a marca sai espelhada.
  const yn = fuste.lado / 2 + 0.6;
  quad(
    [
      [lw, yn, LOGO_FACHADA_Z - lh],
      [-lw, yn, LOGO_FACHADA_Z - lh],
      [-lw, yn, LOGO_FACHADA_Z + lh],
      [lw, yn, LOGO_FACHADA_Z + lh],
    ],
    uvQuad,
  );

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geo.computeBoundingSphere();
  return geo;
}

/* --------------------------------------------------------------------------
   AS TEXTURAS
   -------------------------------------------------------------------------- */

function carrega(
  url: string,
  aniso: number,
  pronto: () => void,
  aquece?: (t: Texture) => void,
) {
  const textura = new TextureLoader().load(url, (t) => {
    t.needsUpdate = true;
    /* O ENVIO PARA A GPU, FORA DO MERGULHO.

       Medido em 17/10, na integração: o primeiro quadro em que o chão aparece
       custava 73 ms — um engasgo de quatro quadros bem no começo da descida. O
       culpado não é o desenho (o segundo mergulho da mesma sessão tem pico de
       0,8 ms): é a SUBIDA DA TEXTURA. São 2048×2048 em RGBA, 16,7 MB, mais a
       cadeia de mipmaps, e o three só faz isso no primeiro quadro em que o
       material é desenhado — que aqui é o quadro em que o mapa ainda está a 3%
       de opacidade e ninguém o vê.

       `initTexture` faz esse envio AGORA, no instante em que o arquivo acaba de
       decodificar — ou seja nos primeiros segundos da página, atrás do
       crossfade do globo, onde há folga de sobra. O mergulho chega com a
       textura já na GPU. */
    aquece?.(t);
    pronto();
  });
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = aniso;
  /* Borda grampeada: o chão é um quadrado único e fora de [0,1] não há mapa
     nenhum — repetir traria a outra ponta da cidade pela borda. */
  textura.wrapS = ClampToEdgeWrapping;
  textura.wrapT = ClampToEdgeWrapping;
  return textura;
}

/* --------------------------------------------------------------------------
   O COMPONENTE
   -------------------------------------------------------------------------- */

export type SaoPauloCenaProps = {
  /** O chão: 0 = sem mapa, 1 = o mapa noturno opaco. */
  mapa: number;
  /** A altura dos prédios: 0 = rentes ao chão, 1 = altura real. */
  predios: number;
  /** A marca na torre: 0 = apagada, 1 = acesa. */
  logo: number;
  /**
   * A CAMADA DO BRILHO da etapa 5, ou `undefined` para não participar dele.
   *
   * A marca na fachada é um dos cinco objetos que o pós-processamento acende —
   * e é o único que mora aqui dentro. Em vez de o compositor sair procurando a
   * malha pela cena (frágil: ela nasce e morre com `logo`), a placa entra na
   * camada por conta própria, e o `SelectiveBloom` a encontra pelo teste de
   * camada como encontra os outros quatro.
   *
   * No celular não há compositor nenhum: a prop chega `undefined` e nada é
   * tocado.
   */
  camadaBrilho?: number;
};

/**
 * Monte DENTRO do grupo que gira a esfera, como irmão dos pontos de terra:
 *
 *   <group rotation={[pitch - inclinacao, yaw + orbita, 0]}>
 *     …os pontos, os arcos, o cometa…
 *     <SaoPauloCena mapa={e.mapa} predios={e.predios} logo={e.logo} />
 *   </group>
 *
 * com `e = mergulhoSP(ms)`. O componente não lê relógio nenhum.
 */
export default function SaoPauloCena({
  mapa,
  predios,
  logo,
  camadaBrilho,
}: SaoPauloCenaProps) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const base = useMemo(
    () => referencialTangente(SP_MAPA.centro.lat, SP_MAPA.centro.lon),
    [],
  );

  /**
   * O DESLOCAMENTO DOS PRÉDIOS. O chão é centrado em `SP_MAPA.centro` (o meio
   * da caixa da textura) e os prédios são medidos a partir de `SP_MAPA.torre`
   * (o ponto da Paulista). São 9,7 m a leste e 44 m ao sul de diferença — meio
   * quarteirão, invisível no zoom da cidade e gritante no fim do mergulho, onde
   * um pixel vale 1,44 m. A conta sai da própria projeção da textura, e não de
   * uma constante escrita à mão, para os dois não poderem divergir.
   */
  const deslocamento = useMemo(() => {
    const meio = SP_MAPA.lado / 2;
    const px = (SP_MAPA.torre.px - meio) * SP_MAPA.metrosPorPixel;
    const py = -(SP_MAPA.torre.py - meio) * SP_MAPA.metrosPorPixel;
    return [px, py, 0] as [number, number, number];
  }, []);

  /* A CIDADE INTEIRA É CONSTRUÍDA UMA VEZ, no primeiro quadro em que o mergulho
     o componente monta — 4.423 contornos, 3.769 prédios depois dos filtros,
     61.945 triângulos, 4,3 MB. Medido: 40 ms na primeira vez e 17 com o motor
     quente, pagos no mesmo instante em que o canvas do hero nasce (atrás dos
     600 ms de travessia do 2D para o 3D), e nunca mais. O `useMemo` sem
     dependência nenhuma é o que garante o "uma vez": as props mudam a cada
     quadro do mergulho e nada aqui pode ser refeito por causa delas. */
  const pecas = useMemo(() => {
    const aneis = preparaAneis();
    const { geo: predioGeo, triangulos } = constroiPredios(aneis);
    return {
      predioGeo,
      torreGeo: constroiTorre(),
      logoGeo: constroiLogo(),
      chaoGeo: constroiChao(),
      triangulos,
      aneis: aneis.length,
    };
  }, []);

  const texturas = useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    const aquece = (t: Texture) => gl.initTexture(t);
    return {
      chao: carrega(SP_MAPA.textura, aniso, invalidate, aquece),
      logo: carrega("/images/logo-icon.png", aniso, invalidate, aquece),
    };
  }, [gl, invalidate]);

  const materiais = useMemo(() => {
    const chao = new MeshBasicMaterial({
      map: texturas.chao,
      transparent: true,
      /* O alfa da borda vem do atributo de cor RGBA do disco. */
      vertexColors: true,
      /* Sem escrever profundidade: o chão é a camada de baixo e não pode
         recortar os prédios, que são desenhados antes dele (opacos primeiro).
         O TESTE continua ligado — é ele que faz o prédio tapar o mapa. */
      depthWrite: false,
      toneMapped: false,
    });
    const predio = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const torre = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const marca = new MeshBasicMaterial({
      map: texturas.logo,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      /* As placas estão a 0,6 m da parede e 0,4 m do telhado. Com a câmera
         ortográfica do palco a profundidade é LINEAR, e sub-metro cabe dentro
         de um degrau do buffer de 24 bits dependendo do near/far de quem
         integra — o deslocamento de polígono resolve isso sem depender disso. */
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      /* Dois lados: as três placas são quadriláteros soltos e o sentido delas
         não pode custar a marca; o corpo opaco da torre já esconde a de trás.
         `forceSinglePass` junto, e isto foi MEDIDO: um material transparente de
         dois lados é desenhado em DUAS passadas pelo three (traseiras e depois
         dianteiras), e era esse o quinto draw call que aparecia no laboratório.
         As três placas não se cruzam entre si — uma passada basta. */
      side: DoubleSide,
      forceSinglePass: true,
    });
    return { chao, predio, torre, marca };
  }, [texturas]);

  /* Devolver tudo ao driver no desmonte: o canvas do hero morre quando o
     usuário sai da seção no celular, e geometria de 4,4 mil prédios não pode
     ficar pendurada na GPU. */
  useEffect(
    () => () => {
      pecas.predioGeo.dispose();
      pecas.torreGeo.dispose();
      pecas.logoGeo.dispose();
      pecas.chaoGeo.dispose();
      materiais.chao.dispose();
      materiais.predio.dispose();
      materiais.torre.dispose();
      materiais.marca.dispose();
      texturas.chao.dispose();
      texturas.logo.dispose();
    },
    [pecas, materiais, texturas],
  );

  /* Fora do mergulho a cena some inteira: nada de material transparente com
     opacidade zero ocupando um draw call em todo quadro do tour. */
  if (mapa <= 0.002) return null;

  const alturaPredios = Math.max(predios, 0.0001);
  const mostraPredios = predios > 0.004;

  /**
   * OS PRÉDIOS NÃO SÓ SOBEM: ELES ACENDEM.
   *
   * Medido no laboratório, em Z = 2.100 com `predios = 0,07`: a malha rasa é
   * uma MANCHA cinza-azulada de 254 px no meio de um mapa de 633 px — os
   * telhados têm a área inteira desde o primeiro quadro, só a altura é que
   * cresce, e uma cidade deitada é uma lona cobrindo as ruas. Multiplicar a cor
   * do material pela altura resolve sem transparência (que, com 62 mil
   * triângulos que se cruzam, traria ordenação e não uma cidade): a mancha
   * nasce preta sobre o preto do mapa e ganha cor junto com o volume.
   *
   * O expoente 1,35 e não 1: a curva de altura já é um smoothstep, e com
   * expoente 1 a mancha aparecia cedo demais na metade de baixo da subida.
   */
  const brilho = Math.pow(predios, 1.35);

  return (
    <group position={base.posicao} quaternion={base.quaternion} scale={1 / RAIO_TERRA}>
      <mesh
        geometry={pecas.chaoGeo}
        material={materiais.chao}
        material-opacity={mapa * (1 - CHAO_NO_FUNDO * logo)}
        renderOrder={2}
        ref={(no) => {
          /* O CHÃO ENTRA NO BLOOM (etapa 5, pedido de 17/10 por "um belo
             trabalho cinematográfico"). É o mapa noturno: as vias são
             filamentos de luz âmbar sobre preto, e é exatamente o tipo de coisa
             que um bloom existe para tratar. O limiar de luminância do efeito
             (0,12) deixa o preto do mapa de fora sozinho — só as vias passam. */
          if (no && camadaBrilho !== undefined) no.layers.enable(camadaBrilho);
        }}
      />

      {mostraPredios ? (
        <group position={deslocamento}>
          {/* Os prédios SOBEM do chão: a visibilidade é escala no eixo Z local
              (que aqui é o "para cima"), não opacidade. */}
          <group scale={[1, 1, alturaPredios]}>
            <mesh
              geometry={pecas.predioGeo}
              material={materiais.predio}
              ref={(no) => {
                /* Os prédios também: o que brilha neles são as JANELAS, que
                   são do mesmo âmbar das vias. As paredes, bem abaixo do
                   limiar, não sangram nada. */
                if (no && camadaBrilho !== undefined) no.layers.enable(camadaBrilho);
              }}
              material-color-r={brilho}
              material-color-g={brilho}
              material-color-b={brilho}
            />
            <mesh
              geometry={pecas.torreGeo}
              material={materiais.torre}
              material-color-r={brilho}
              material-color-g={brilho}
              material-color-b={brilho}
            />
          </group>

          {logo > 0.002 ? (
            /* As placas ficam FORA do grupo que escala: dentro dele a marca
               seria achatada junto com a torre. Elas podem ficar paradas porque
               `logo` só sai de zero quando `predios` já vale 1 — os limiares de
               `mergulhoSP` não se cruzam (5.000 contra 1.600–5.000). */
            <mesh
              geometry={pecas.logoGeo}
              material={materiais.marca}
              material-opacity={logo}
              renderOrder={3}
              ref={(no) => {
                /* A placa entra na camada do brilho assim que existe. `enable`
                   e não `set`: a camada 0 tem de continuar ligada, ou a marca
                   sumiria da passada normal e só apareceria no bloom. */
                if (no && camadaBrilho !== undefined) {
                  no.layers.enable(camadaBrilho);
                }
              }}
            />
          ) : null}
        </group>
      ) : null}
    </group>
  );
}
