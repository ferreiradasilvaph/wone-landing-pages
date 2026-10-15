"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
 * A janela em que a arte impressa cabe, sobre a face frontal.
 *
 * A face útil do bloco mede `w − 2·BISEL` por `h − 2·BISEL` (1,82 × 2,66), e a
 * janela fica em 84% da altura dela. A diferença não é margem de segurança: é
 * a MOLDURA DE CRISTAL, e desde 15/10 ela é a ÚNICA coisa que prova
 * transparência.
 *
 * Houve uma versão em que a arte vinha com o fundo recortado e só a tinta
 * ficava: a ideia era que o acrílico aparecesse por trás de cada letra. Não
 * funcionou — vidro no meio de uma figura passa por reflexo da própria figura,
 * e o que se viu foi a arte flutuando no escuro. Agora a impressão é OPACA e
 * tem papel marfim (veja `scripts/recorta-placas.mjs`), como na ilustração que
 * o dono aprovou; a prova de vidro mudou de lugar e vive na faixa limpa em
 * volta dela, no bisel e nas laterais, onde o aro do pódio e o halo do fundo
 * aparecem TORCIDOS.
 *
 * Em 84% da altura a arte mede 1,47 × 2,23 (a proporção 0,657 do recorte manda
 * na largura) e sobram 0,21 de cristal em cima e embaixo e 0,18 dos lados — e é
 * na faixa de baixo que o arco de trás do aro passa, cortado e deslocado pela
 * refração.
 */
const JANELA = { w: 1.6, h: 2.234 };

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
  const fade = useRef(0);

  const geometria = useMemo(() => blocoAcrilico(), []);
  const arestas = useMemo(() => arestasDoBloco(), []);
  const mascara = useMemo(() => mascaraDissolucao(), []);
  const sombra = useMemo(() => mapaDaSombra(), []);
  const tom = useMemo(() => tomDoAcrilico(accent), [accent]);
  /* O quadro e o posto da joia vestida desta foto (veja `vestida`). */
  const vest = useMemo(() => vestida(photo), [photo]);

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

          {/* AS ARESTAS, EM FIO DE CREME.

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
              `Lightformer`), e um fio neutro no meio dele lê como azulado. */}
          <lineSegments geometry={arestas} renderOrder={2}>
            <lineBasicMaterial
              color="#FFF6E0"
              transparent
              /* 0,8 e não 0,7: medido sobre o chão da seção (18 de luminância),
                 0,7 punha as arestas da direita em 178 e as da esquerda em 191 —
                 o portão pede 180 nas da frente. Em 0,8 a conta dá
                 0,8·250 + 0,2·18 = 204, e as duas famílias passam com folga sem
                 que o fio vire um contorno desenhado. */
              opacity={0.8}
              toneMapped={false}
              depthWrite={false}
            />
          </lineSegments>

          {/* A ARTE IMPRESSA, na face.

              Três milésimos À FRENTE da face frontal — veja `ARTE_FRENTE` para
              o porquê longo. O curto: dentro do bloco ela só podia ser vista
              pela passada de transmissão, que devolve um MIPMAP da cena atrás do
              vidro; era daí que vinham o borrão e a "opacidade" de que o dono
              reclamou em 15/10. Na passada normal ela chega à tela como está no
              arquivo.

              Ela ocupa 84% da face (veja `JANELA`), e os 16% restantes são a
              moldura de cristal: é por ali, pelo bisel e pelas duas faces
              laterais que o pódio e o halo aparecem refratados. Impressão opaca
              no meio, vidro na borda — que é como o acrílico com impressão UV da
              ilustração funciona.

              O verso é um segundo plano, espelhado, para o giro não mostrar o
              bloco oco por trás. */}
          {art.curr && (
            <>
              <mesh position={[0, 0, arteZ]}>
                <planeGeometry args={planeSize(art.curr)} />
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
                <planeGeometry args={planeSize(art.curr)} />
                <meshBasicMaterial
                  map={art.curr}
                  toneMapped={false}
                  alphaTest={0.5}
                />
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
                <planeGeometry args={planeSize(art.prev)} />
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
