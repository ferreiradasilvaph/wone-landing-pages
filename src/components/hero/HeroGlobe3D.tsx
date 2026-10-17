"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  type Mesh,
  type OrthographicCamera,
  type Points,
  type ShaderMaterial,
  Vector3,
} from "three";
/* As linhas de espessura em PIXEL vêm dos exemplos do próprio three — nada
   novo no `package.json`, e exatamente os mesmos três módulos que as placas de
   Prêmios já importam (`AwardPlaque3D.tsx`). O `lineBasicMaterial` do core
   desenha sempre UM pixel de dispositivo, porque o WebGL ignora `gl.lineWidth`
   desde o core profile; o `LineSegments2` desenha cada segmento como um
   quadrilátero em espaço de tela, com largura em px de CSS e borda suavizada no
   próprio shader. É o que mantém o arco na mesma escala de fios do resto da
   página, perto ou longe. */
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import {
  ARCO_PASSOS,
  cena,
  type Cena,
  CHEGOU_DENTRO,
  CHEGOU_FORA,
  COSTA,
  PAIS_BORDA,
  PAIS_NUCLEO,
  PULSO_MS,
  TERRA,
  VIGIA_DENTRO,
  VIGIA_FORA,
  ZOOM_ANEL,
  type Nuvem,
} from "./cena";
import { alvo, EUROPEUS, rede, REDE_PASSOS, REDE_PERNAS } from "./globeMath";

/* --------------------------------------------------------------------------
   O PLANETA EM 3D — ETAPAS 1, 2 E 3

   Pedido do dono, 17/10: "quero que o globo do hero tenha um visual IMPACTANTE,
   de nível premiado (Awwwards / Stripe / Vercel / GitHub globe). Hoje ele é um
   canvas 2D de pontos; está correto, mas plano."

   O QUE ESTÁ AQUI, POR ETAPA:
     1. a base — a esfera que esconde o lado de trás, os 5.458 pontos de terra
        num `Points` só, a câmera ortográfica e o relógio emprestado do 2D;
     2. a atmosfera e a luz — o fresnel na borda do disco, a luz quente de
        cima-à-esquerda, o preenchimento frio no lado escuro, e o tamanho e o
        alfa de cada ponto caindo com a inclinação, tudo no SHADER;
     3. os arcos e o cometa — as sete pernas da rede erguidas da superfície e a
        bolinha com rastro e partículas, que saíram do canvas 2D.

   O QUE AINDA NÃO ESTÁ: os pinos e os rótulos continuam DOM, posicionados pelo
   laço do 2D (etapa 4); não há pós-processamento (etapa 5); e no celular nada
   disto monta (etapa 6).

   NENHUMA BIBLIOTECA NOVA. `three`, `@react-three/fiber` e os três módulos de
   linha dos exemplos do three já estavam no projeto desde as placas de Prêmios.

   QUEM MANDA É O LAÇO DO 2D. `frameloop` é `demand` e ninguém chama
   `invalidate()`: quem desenha é `entrega()` (em `cena.ts`), chamada pelo laço
   do `HeroGlobe` dentro do MESMO `requestAnimationFrame` em que o 2D acabou de
   se desenhar. Um relógio, um estado — e pausa de graça: sem laço do 2D (aba
   oculta, hero fora da tela, movimento reduzido) o 3D desenha zero quadros.

   A GEOMETRIA É A DO 2D, LETRA POR LETRA. A derivação está em `cena.ts`: um
   `Group` com `rotation = (pitch, yaw, 0)` na ordem XYZ do three mais uma
   `OrthographicCamera` de frustum ±1 com `zoom = Z` põem cada ponto da
   superfície no mesmo pixel em que a projeção do canvas 2D o desenha. É por
   isso que os PINOS, que continuam sendo DOM posicionado pelo 2D, ficam
   colados na esfera 3D sem uma linha de recálculo — medido em 0,13 px de
   desvio máximo. Nenhuma `PerspectiveCamera`: é ela que descolaria os dois.
   -------------------------------------------------------------------------- */

/**
 * O RAIO DA ESFERA, contra a unidade dos pontos.
 *
 * Ela faz o que o 2D faz com `z2 <= 0`: esconde o hemisfério de trás. No 2D
 * isso é um `if` por ponto; aqui é o buffer de profundidade, que é a mesma
 * verdade escrita em hardware — e que vale de graça para os ARCOS e para o
 * COMETA da etapa 3, em vez de um `if` novo por objeto.
 *
 * 0,9985 e não 1: com os dois raios iguais os pontos do meio do disco
 * disputariam a mesma profundidade da superfície embaixo deles e piscariam.
 * A 1,5 milésimo de folga o ponto central está ~2.500 unidades à frente num
 * buffer de 24 bits. E a coroa `r > 0,9985`, onde a esfera deixaria de cobrir
 * os pontos de trás, JAMAIS aparece: a vigia mostra o pedaço `r < 1/Z` da
 * esfera, e o voo nunca desce de Z = 1,112 (a perna de Londres a São Paulo, a
 * mais longa das sete), ou seja nunca mostra além de `r = 0,90`.
 */
const RAIO_ESFERA = 0.9985;

/** A duração do crossfade, igual à do `.globe-tres` em `hero.css`. */
const FADE_MS = 600;

/**
 * Segmentos da esfera: 64×48 no desktop, para o fresnel não facetar perto da
 * borda; 32×24 no celular (etapa 6), onde a borda tem metade dos pixels e a
 * faceta de 11° some na própria suavização do fresnel. 3.072 triângulos contra
 * 768.
 */
const ESFERA_SEG = [64, 48] as const;
const ESFERA_SEG_LEVE = [32, 24] as const;

/* --------------------------------------------------------------------------
   ETAPA 2 — A ATMOSFERA

   Pedido: "shader de atmosfera FRESNEL na esfera: borda acesa em laranja/âmbar
   da marca, decaindo para o centro; intensidade modesta — a página não tem
   glow, isto é a única exceção autorizada, e tem de ler como atmosfera, não
   como halo de botão."

   ELA É BORDA, NÃO CORPO — e este é o veredito do dono em 17/10, vendo a
   primeira versão rodar: "tire a opacidade do globo, deixe apenas nos
   continentes". A primeira versão era o fresnel clássico, `(1 − N·V)^k`, e ele
   acendia o DISCO INTEIRO: numa ortográfica `N·V` é o `z₂` do 2D, e com a vigia
   mostrando só o calote `r < 1/Z` a rampa inteira do fresnel cai DENTRO do que
   se vê. O planeta virou um prato quente sobre a página — exatamente o que a
   landing não faz em lugar nenhum.

   A conta aqui é outra, e sai da geometria da VIGIA. A borda que o olho lê como
   "borda do planeta" não é a silhueta da esfera (z₂ → 0, que nunca está em
   cena: o zoom nunca desce de 1,112, então o que se vê acaba em r = 0,90): é o
   recorte circular. E o recorte está sempre em `r = 1/Z`. Então o shader
   multiplica o raio pelo zoom — `rs = r·Z`, que vale 1 na borda em QUALQUER
   enquadramento — e acende só os últimos 24% dele. O corpo do disco recebe
   zero tinta e zero alfa, e por ele se vê a página, o oceano em CSS e a marca
   d'água, que é o elemento de LCP desta página.

   Isso também mata, de graça, o defeito da versão anterior: ela abria junto com
   o zoom (a mesma faixa de esfera ficava 1,41 vez mais inclinada no meio de uma
   perna longa do que no pouso, e o fresnel ali era o dobro). Ancorada na vigia,
   a atmosfera é a MESMA no pouso e no meio da travessia.

   A INTENSIDADE é 0,26 na borda e cai a 12% dela um décimo de raio para dentro.
   O fio de `.globe-air`, que já desenha a circunferência em CSS, está em 22%: a
   atmosfera acompanha essa borda e não compete com ela. É o teto do que esta
   página admite de brilho, e é a única exceção à regra de a landing não ter
   glow.
   -------------------------------------------------------------------------- */
const ATM_EXP = 1.6;
const ATM_FORCA = 0.26;
/**
 * O PÉ DA RAMPA DA TERRA, no 3D: um âmbar VIVO, e não o braseiro #8A3F0A do
 * canvas 2D.
 *
 * Pedido do dono, 17/10: "deixe o globo mais vívido em cores (...) puxe o pé da
 * rampa para um âmbar vivo e o topo para o #FF7700 puro". O braseiro do 2D é
 * um marrom — matiz 25°, saturação 87%, LUZ 29% —, e sobre o preto da página,
 * a 9% de alfa, ele devolve um cinza-terroso. A referência que o dono aprovou
 * (`public/images/sp-noite.webp`) mostra o contrário: as vias fracas do mapa
 * noturno são LARANJA fracas, não marrons. Este #D4600A tem a mesma matiz e
 * 13 pontos de luz a mais, então o lado da sombra continua escuro (o alfa é que
 * manda nisso) e para de ser sujo.
 */
const TERRA_PE = "#d4600a";

/** O âmbar da atmosfera: o laranja da marca puxado para a luz. */
const ATM_COR = "#ff9a3c";

const atmosferaVert = /* glsl */ `
  varying vec3 vP;
  void main() {
    /* O NORMAL em espaço de câmera. Numa ortográfica com a câmera em +Z ele é
       a própria posição na esfera unitária já girada: vP.z é o z2 do 2D, e
       length(vP.xy) é a distância ao centro do disco, em raios de esfera. */
    vP = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosferaFrag = /* glsl */ `
  uniform vec3 uCor;
  uniform float uForca;
  uniform float uExp;
  uniform float uZoom;
  varying vec3 vP;
  void main() {
    /* rs = 1 EXATAMENTE na borda da vigia, em qualquer zoom: a vigia mostra o
       pedaço r < 1/Z da esfera, então multiplicar o raio por Z põe a borda em
       1. É o que faz a atmosfera ser BORDA e não corpo — e, de quebra, o que a
       mantém idêntica no pouso e no meio da perna mais longa, que foi o defeito
       da primeira versão (ela abria com o zoom e lavava o planeta). */
    float rs = length(vP.xy) * uZoom;
    float b = smoothstep(0.76, 1.0, rs);
    #ifdef LEVE
      /* No celular o expoente é 2, que é uma multiplicação — pow é a única
         função cara deste shader, e ele roda em cada fragmento do disco. A
         curva muda de 1,6 para 2,0: a atmosfera fica um fio mais contida, o
         que num disco de 340 px é exatamente o que se quer. */
      float f = b * b * uForca;
    #else
      float f = pow(b, uExp) * uForca;
    #endif
    /* SEM discard: o fragmento descartado não escreve PROFUNDIDADE, e é a
       profundidade desta esfera que esconde o hemisfério de trás. No corpo do
       disco ele escreve (0,0,0,0) — zero tinta, zero alfa — e a página
       continua aparecendo inteira por baixo do canvas. */
    vec3 c = linearToOutputTexel(vec4(uCor, 1.0)).rgb;
    /* PREMULTIPLICADO, e a conversão vem ANTES do alfa: o canvas é entregue
       premultiplicado ao compositor, e sRGB(cor)·a não é o mesmo que
       sRGB(cor·a). */
    gl_FragColor = vec4(c * f, f);
  }
`;

/* --------------------------------------------------------------------------
   ETAPA 2 — OS PONTOS DE TERRA, COM LUZ E PROFUNDIDADE

   Pedido: "pontos com profundidade: tamanho e alfa caindo com a inclinação em
   relação à câmera (o 2D já faz isso com 0,62 + 0,38·z₂) — replique no shader
   dos `Points` via atributo/uniform, não em JS por quadro".

   É o que está abaixo, e é a conta do `HeroGlobe` copiada LINHA POR LINHA para
   GLSL: o fator de volume, a luz de cima-à-esquerda, o realce de estúdio, a
   queda do alfa no limbo, a rampa dos dez baldes, o creme dos sete países e o
   degrau e meio do país da vez. O que no 2D é um laço de 5.458 iterações em
   JavaScript por quadro, aqui é o vertex shader — e por isso ele pode ser
   EXATO em vez de uma média: a luz é fixa em espaço de CÂMERA (ela não gira com
   o planeta), e era justamente isso que não cabia num atributo de vértice.

   A RAMPA DOS BALDES, SEM OS BALDES. O 2D quantiza o alfa calculado em seis
   degraus (`balde = (alfa·13,04)|0`, depois `ALFA[balde]`), e essa tabela NÃO é
   a identidade: ela multiplica por ~1,56 e soma 0,09. Ignorar isso foi o que
   deixou a primeira versão da nuvem 3D pálida ao lado da 2D. Aqui a mesma
   transformação é aplicada de forma contínua — mesmos extremos (0,09 e 0,70),
   sem os degraus, ou seja sem o faixamento que os seis níveis produzem numa
   terra firme agora muito mais acesa.

   O PAÍS DA VEZ É UM `uniform`, não um buffer reescrito: `uAtivo` é o índice da
   cidade, e o vértice compara com o seu próprio (`aPonto.w`). Sete trocas por
   volta deixaram de custar um envio de 87 kB à GPU.
   -------------------------------------------------------------------------- */

/**
 * A LUZ DE PREENCHIMENTO, fria e fraca (etapa 2).
 *
 * Direção oposta à principal e um pouco abaixo, para pegar o lado que a luz
 * quente abandona. A cor é um azul de madrugada muito dessaturado, e a força é
 * 0,10: o bastante para o continente do lado escuro continuar sendo um
 * continente — e não um buraco — sem roubar o laranja da marca, que é a cor
 * desta página. Acima de ~0,15 ela começa a cinzar a silhueta, que é o defeito
 * que uma luz de preenchimento existe para evitar.
 */
const FRIA_DIR = [0.52, -0.38, 0.33];
const FRIA_COR = "#3d5878";
const FRIA_FORCA = 0.1;

/**
 * O TAMANHO DO SPRITE contra o raio que o 2D desenha.
 *
 * O `PointsMaterial` desenhava quadrados; aqui o fragment recorta um DISCO com
 * a borda suavizada entre 0,34 e 0,50 do sprite. A área coberta por esse disco
 * equivale à de um círculo cheio de raio 0,42·S, então para o ponto ter na tela
 * o mesmo raio que o `arc()` do canvas 2D desenha, o sprite precisa de
 * `S = raio / 0,42 = 2,4·raio`. Em px de DISPOSITIVO, daí o `uDpr`.
 *
 * O disco suavizado no shader é também o que permitiu DESLIGAR o MSAA do
 * canvas: a única aresta da cena eram as bordas dos pontos, e elas agora são
 * resolvidas por um `smoothstep` de dois fragmentos em vez de pelo resolve de
 * um framebuffer inteiro.
 */
const SPRITE = 2.65;

const pontosVert = /* glsl */ `
  attribute vec4 aPonto;        /* rb, ac (costa), tingimento, índice do país */
  uniform float uDpr;
  uniform float uGrao;          /* Z^0,6: o grao do 2D, do outro lado da conta */
  uniform float uAtivo;
  uniform vec3 uBraseiro;
  uniform vec3 uLaranja;
  uniform vec3 uCosta;
  uniform vec3 uPaisBorda;
  uniform vec3 uPaisNucleo;
  uniform vec3 uFria;
  uniform vec3 uFriaDir;
  uniform float uFriaForca;
  varying vec4 vCor;

  void main() {
    /* (x₁, y₂, z₂): o vetor JÁ GIRADO, em espaço de câmera. Com w = 0 a
       matriz aplica só a rotação — e como o ponto é unitário, o resultado
       também é. São as mesmas três variáveis do laço do 2D. */
    vec3 p = (modelViewMatrix * vec4(position, 0.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    float z2 = p.z;
    /* VOLUME: z2 é o cosseno do ângulo ao centro do disco, então este fator
       vale 1 no meio da bola e 0,62 no limbo, e multiplica ALFA e RAIO. É o que
       separa uma esfera de um adesivo. */
    float vol = 0.62 + 0.38 * z2;
    float lit = clamp((-0.55 * p.x + 0.62 * p.y + 0.56 * p.z) * 0.55 + 0.45, 0.0, 1.0);
    float realce = max(0.0, lit - 0.74) * 1.4;
    float u = clamp(z2 / 0.18, 0.0, 1.0);
    float limbo = u * u * (3.0 - 2.0 * u);

    float rb = aPonto.x;
    float ac = aPonto.y;
    float t  = aPonto.z;
    /* 1,0 quando este ponto pertence à cidade da vez. aPonto.w é 255 para
       "nenhum país", e 255 nunca empata com um índice de 0 a 6. */
    float aceso = 1.0 - step(0.5, abs(aPonto.w - uAtivo));

    vec3 cor;
    float alfa;
    float extra = 1.0;

    if (t > 0.02) {
      /* Os sete países em creme, e o da vez meio passo acima — a queda até o
         limbo é mais branda aqui (0,75 a 1,0) porque são eles que carregam a
         informação da tela. Os três degraus subiram com o pedido de 17/10
         ("países marcados em creme mais luminoso"): 0,26/0,50/0,86 viraram
         0,32/0,64/0,98. */
      float s = t * mix(1.0, 1.6, aceso) * (0.75 + 0.25 * z2);
      alfa = s >= 1.2 ? 0.90 : (s >= 0.6 ? 0.60 : 0.30);
      cor = s >= 1.2 ? uPaisNucleo : uPaisBorda;
      extra = 1.18;
    } else {
      float bruto = (0.06 + 0.32 * lit + 0.1 * realce + ac) * limbo * vol;
      /* A RAMPA, mais vívida (pedido do dono, 17/10). Era a tabela de baldes
         do 2D escrita de forma contínua — 0,09 a 0,70 —, e o que mudou foi o
         TOPO, não o pé: 0,90 no lado do sol contra os mesmos 0,09 no lado da
         sombra. A razão entre os dois passou de 7,8 para 10, e é ESSA razão que
         é a vivacidade — o pedido diz com todas as letras que "o contraste
         claro/escuro é a vivacidade, não um brilho uniforme". Levantar o pé
         junto teria clareado o planeta e achatado o volume. */
      alfa = clamp(0.09 + 2.3 * bruto, 0.09, 0.84);
      /* A COR SAI DA LUZ, nao do alfa. No 2D as duas coisas eram a mesma — o
         balde escolhia cor E alfa —, e isso funcionava porque la o alfa
         saturava rapido. Aqui o alfa quase nunca chega ao teto, entao amarrar
         a cor a ele deixava o continente inteiro num meio-termo avermelhado:
         nenhum ponto chegava ao #FF7700, que e justamente a cor da marca e o
         que o pedido de 17/10 manda ver no lado do sol. Com a luz no comando,
         todo o quadrante iluminado e laranja CHEIO, e e o ALFA que diz o quao
         forte ele aparece. Duas variaveis, dois trabalhos. */
      cor = mix(uBraseiro, uLaranja, smoothstep(0.30, 0.78, lit));
      /* O NÚCLEO CREME nos pontos de sol a pino, e é a referência que o dono
         aprovou (public/images/sp-noite.webp, o mapa noturno de São Paulo):
         as vias mais fortes não são "mais laranja", elas têm um FIO CREME por
         dentro do laranja. Aqui o mesmo: só o topo da luz (acima de 0,88, uns
         6% dos pontos acesos) puxa até 30% para o creme da marca. Pouco de
         propósito — o creme CHEIO é a cor dos sete países, e ela não pode ser
         diluída num planeta de terra laranja. */
      cor = mix(cor, uPaisNucleo, smoothstep(0.88, 1.0, lit) * 0.3);
      /* A costa só vira laranja claro ONDE HÁ LUZ: um fio claro no lado da
         sombra desenharia um litoral que o sol não está mostrando. O corte é o
         mesmo do 2D (balde >= 4, ou seja bruto >= 4/13,04). */
      if (ac > 0.0 && bruto >= 0.3067) {
        cor = uCosta;
        alfa = 0.68;
      }
    }

    /* O PREENCHIMENTO FRIO, só onde a luz quente não chega. */
    float frio = max(0.0, dot(normalize(p), normalize(uFriaDir))) * (1.0 - lit);
    cor += uFria * frio * uFriaForca;

    float raio = rb * (0.72 + 0.4 * lit + 0.12 * realce) * vol * extra * uGrao;
    gl_PointSize = raio * uDpr * ${SPRITE.toFixed(2)};
    vCor = vec4(cor, alfa);
  }
`;

const pontosFrag = /* glsl */ `
  varying vec4 vCor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float m = 1.0 - smoothstep(0.40, 0.5, d);
    if (m <= 0.002) discard;
    gl_FragColor = vec4(vCor.rgb, vCor.a * m);
    /* Linear para sRGB: ver a nota no shader da atmosfera. Aqui o alfa e
       direto (a mistura normal do three multiplica por ele no blend), entao o
       include padrao serve — ele toca so o rgb. */
    #include <colorspace_fragment>
  }
`;

/* --------------------------------------------------------------------------
   ETAPA 3 — O COMETA: BOLINHA, RASTRO E PARTÍCULAS

   Pedido: "a bolinha como ponto emissivo creme na posição `bola` do estado
   compartilhado, elevada o mesmo tanto da perna; atrás dela um rastro luminoso
   (segmentos com alfa decrescente) e partículas discretas (poucas dezenas,
   `Points`, vida curta) — tem de continuar lendo como a mesma bolinha de hoje,
   só com volume."

   UM `Points` SÓ, e é o que torna isto barato: 96 vértices num `drawcall`,
   reescritos por quadro a partir do arco que o estado compartilhado publica. O
   vértice 0 é a CABEÇA (creme, grande), 1 a 63 são o RASTRO (alfa e raio
   caindo para trás) e 64 a 95 são as PARTÍCULAS — sorteadas uma vez, em volta
   da linha, com vida curta e ciclo próprio.

   O RASTRO É UMA FILEIRA DE PONTOS, E NÃO UMA LINHA, porque luminosidade aqui é
   SOMA: os sprites se sobrepõem com mistura aditiva e o que o olho lê é um
   traço que brilha mais onde há mais deles — ou seja, logo atrás da cabeça.
   Uma polilinha de alfa decrescente daria a mesma geometria e nenhum brilho.
   63 pontos sobre os ~150 px de rastro caem a 2,4 px um do outro, e o sprite
   tem 3: não há conta de contas a fazer, a linha é contínua.

   A ALTURA é `REDE_SOBE`, a mesma das pernas da rede — a bolinha viaja POR
   CIMA do planeta, dentro do próprio arco, e não raspando o chão como no 2D.
   É o "com volume" do pedido, e é a única coisa que muda de LUGAR na migração.
   -------------------------------------------------------------------------- */

/** Vértices do cometa: 1 cabeça + 63 de rastro + 32 partículas. */
/**
 * A LUZ NO CHÃO (etapa 4): um disco emissivo discreto na superfície, sob o
 * pino que pousou.
 *
 * Ela é o VÉRTICE 0 deste mesmo `Points`, e não um objeto novo — o fragmento
 * de disco macio e a mistura aditiva que o rastro já usa são exatamente o que
 * um "disco emissivo" quer dizer. Zero `drawcall` a mais.
 *
 * 26 px de raio e 0,42 de alfa: o bastante para o olho entender que a cidade
 * ACENDEU quando a bolinha para nela, e pouco o bastante para não virar um
 * holofote — a 1,35× de escala isso é um halo de 52 px num disco de 634, uns
 * 8% do diâmetro. Sobe em 450 ms com o pouso (mais lento que o pulso, que é o
 * gesto rápido da chegada) e cai em 300 ms quando a câmera parte.
 */
const LUZ_RAIO = 26;
const LUZ_ALFA = 0.42;
const LUZ_SOBE_MS = 450;
const LUZ_CAI_MS = 300;

const COMETA_LUZ = 1;
const COMETA_CABECA = 2;
const COMETA_RASTRO = 63;
const COMETA_PARTICULAS = 32;
const COMETA_N =
  COMETA_LUZ + COMETA_CABECA + COMETA_RASTRO + COMETA_PARTICULAS;

/**
 * O comprimento do rastro, em fração da perna.
 *
 * 0,34 e não 1: o 2D traçava o arco INTEIRO desde a origem, porque lá o rastro
 * era um fio fino de 1,25 px. Aqui ele é luminoso, e um fio luminoso do
 * tamanho da perna é um risco atravessando o planeta, não um cometa. Um terço
 * da perna são 28° de arco na perna mais longa e 2,2° na mais curta — de novo a
 * mesma leitura do 2D, onde "a bolinha vira cometa só quando há viagem para
 * isso".
 */
const COMETA_COMPRIMENTO = 0.34;
/** Raio da cabeça e da ponta do rastro, em px de CSS. */
const COMETA_RAIO = 5.2;
const RASTRO_RAIO = 2.6;
/** Quanto tempo o rastro leva para apagar depois do pouso, em ms. */
const RASTRO_SOME_MS = 1000;

const cometaVert = /* glsl */ `
  attribute vec3 aPeso;   /* raio em px de CSS, alfa, mistura cabeça↔rastro */
  uniform float uDpr;
  uniform float uGrao;
  uniform vec3 uCabeca;
  uniform vec3 uRastro;
  varying vec4 vCor;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aPeso.x * uDpr * uGrao * ${SPRITE.toFixed(2)};
    vCor = vec4(mix(uRastro, uCabeca, aPeso.z), aPeso.y);
  }
`;

const cometaFrag = /* glsl */ `
  varying vec4 vCor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    /* Mais macio que o dos pontos de terra: a queda começa no centro, e é ela
       que faz o sprite ler como BRILHO e não como disco. */
    float m = 1.0 - smoothstep(0.0, 0.5, d);
    m *= m;
    if (m <= 0.002) discard;
    /* Linear para sRGB, e SEM premultiplicar: a mistura aditiva do three ja
       entra com blendFunc(SRC_ALPHA, ONE), ou seja ela mesma multiplica o rgb
       pelo alfa. Premultiplicar aqui multiplicaria duas vezes, e o cometa
       saia com um quarto do brilho que o numero pedia. */
    vec3 c = linearToOutputTexel(vec4(vCor.rgb, 1.0)).rgb;
    gl_FragColor = vec4(c, vCor.a * m);
  }
`;

/* --------------------------------------------------------------------------
   ETAPA 3 — OS ARCOS DA REDE

   As sete pernas de `REDE_PERNAS`, que até agora o canvas 2D traçava rente ao
   chão, erguidas 3,5% do raio no meio do caminho e desenhadas como LINHAS DE
   VERDADE, com largura em px de tela.

   UM `drawcall` para as sete, e as três forças do 2D preservadas assim: a
   LARGURA e o ALFA são do material (iguais para todas), e a diferença entre
   "perna das Américas" e "perna que toca a Europa" vai na COR DO VÉRTICE —
   sobre um planeta quase preto, modular brilho e modular alfa dão a mesma
   leitura, e esta forma cabe num `drawcall` só. O FLASH da chegada à Europa
   (pedido de 15/10: "quando um ponto ligar no outro, mostre mais os países do
   continente europeu") é um SEGUNDO objeto, com as duas pernas da cidade da
   vez, que só existe enquanto ela é Lisboa ou Londres e desaparece em 1 s.
   -------------------------------------------------------------------------- */

/** Largura do fio da rede, em px de CSS — a escala de fios da página. */
const REDE_FIO = 1.9;
/** Alfa da rede, e o brilho relativo das pernas que não tocam a Europa. */
const REDE_ALFA = 0.3;
const REDE_FRACA = 0.47;
/** O núcleo creme por dentro do arco: fio fino, alfa alto. */
const NUCLEO_FIO = 0.85;
const NUCLEO_ALFA = 0.26;
/** Largura e alfa do flash. */
const FLASH_FIO = 2.2;
const FLASH_MS = 1000;

/**
 * A nuvem de terra virada em geometria: UM `BufferGeometry`, UM `drawcall`.
 *
 * `position` são os vetores da base da projeção — os mesmos `bx/by/bz` que o 2D
 * gira por quadro, sem nenhuma conversão: a base do 2D JÁ é a base do 3D.
 * `aPonto` leva os quatro números que o shader precisa e que não dependem do
 * quadro: o raio base do ponto, o acréscimo de costa, a força do tingimento e
 * de qual dos sete países ele é.
 */
function geometriaDaTerra(nuvem: Nuvem, salto: number) {
  /* O SALTO é a versão leve do celular (etapa 6): 2 toma um ponto sim, um
     não, e a nuvem cai de 5.458 para 2.729. É o MESMO `salto` que o canvas 2D
     já usava lá desde sempre, e é o jeito certo de ralear uma espiral de
     Fibonacci — ela é uniforme por construção, então metade dela continua
     uniforme. Peneirar por região deixaria buracos; sortear deixaria grumos. */
  const n = Math.ceil(nuvem.bx.length / salto);
  const pos = new Float32Array(n * 3);
  const dado = new Float32Array(n * 4);
  for (let k = 0; k < n; k += 1) {
    const i = k * salto;
    pos[k * 3] = nuvem.bx[i];
    pos[k * 3 + 1] = nuvem.by[i];
    pos[k * 3 + 2] = nuvem.bz[i];
    dado[k * 4] = nuvem.rb[i];
    dado[k * 4 + 1] = nuvem.ac[i];
    dado[k * 4 + 2] = nuvem.tingimento[i];
    dado[k * 4 + 3] = nuvem.pais[i];
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aPonto", new BufferAttribute(dado, 4));
  /* A esfera de contorno é conhecida (raio 1 na origem): varrer 5.458 vértices
     devolveria o mesmo número por 0,1 ms. */
  g.computeBoundingSphere();
  g.boundingSphere!.radius = 1;
  return g;
}

/** Uma polilinha de `n` pontos virada em segmentos para o `LineSegments2`. */
function emSegmentos(pts: Float32Array, inicio: number, n: number) {
  const out = new Float32Array((n - 1) * 6);
  for (let s = 0; s < n - 1; s += 1) {
    const a = (inicio + s) * 3;
    out[s * 6] = pts[a];
    out[s * 6 + 1] = pts[a + 1];
    out[s * 6 + 2] = pts[a + 2];
    out[s * 6 + 3] = pts[a + 3];
    out[s * 6 + 4] = pts[a + 4];
    out[s * 6 + 5] = pts[a + 5];
  }
  return out;
}

/**
 * O PLANETA: a esfera com a atmosfera e a nuvem de terra, dentro do grupo que
 * gira.
 *
 * O GRUPO É O QUE GIRA, e a câmera fica parada — exatamente como no 2D, onde o
 * giro é aplicado aos vetores e a tela nunca se move. `rotation = (pitch, yaw,
 * 0)` na ordem padrão `XYZ` do three dá a matriz `Rx(pitch)·Ry(yaw)`, ou seja Y
 * PRIMEIRO e X depois: a ordem do laço do 2D, letra por letra. Trocar a ordem
 * aqui desencaixaria os pinos do planeta em pleno voo, e seria invisível em
 * repouso — o tipo de defeito que só aparece na captura.
 */
function Planeta({
  aoDesenhar,
  leve,
}: {
  aoDesenhar: () => void;
  leve: boolean;
}) {
  const grupo = useRef<Group>(null);
  const terra = useRef<Points>(null);
  const cometaNo = useRef<Points>(null);
  const marcasNo = useRef<Points>(null);
  const esferaNo = useRef<Mesh>(null);
  const redeNo = useRef<LineSegments2>(null);
  const nucleoNo = useRef<LineSegments2>(null);
  const flashNo = useRef<LineSegments2>(null);
  const avanca = useThree((estado) => estado.advance);

  /**
   * TUDO O QUE A CENA TEM, montado UMA vez.
   *
   * Num só `useMemo` de propósito: geometrias, materiais e os objetos de
   * `uniforms` são o MESMO fato — "a cena existe" — e separá-los em cinco
   * memos daria cinco oportunidades de um deles se refazer sozinho e zerar os
   * uniformes que o `useFrame` escreve.
   */
  const cena3d = useMemo(() => {
    const q = cena();
    const cores = {
      braseiro: new Color(TERRA_PE),
      laranja: new Color(TERRA[TERRA.length - 1]),
      costa: new Color(COSTA),
      paisBorda: new Color(PAIS_BORDA),
      paisNucleo: new Color(PAIS_NUCLEO),
      fria: new Color(FRIA_COR),
      atm: new Color(ATM_COR),
    };

    /* ------------------------------------------------------- a terra firme */
    const geoTerra = q.nuvem ? geometriaDaTerra(q.nuvem, leve ? 2 : 1) : null;
    const uTerra = {
      uDpr: { value: 1 },
      uGrao: { value: 1 },
      uAtivo: { value: -1 },
      uBraseiro: { value: cores.braseiro },
      uLaranja: { value: cores.laranja },
      uCosta: { value: cores.costa },
      uPaisBorda: { value: cores.paisBorda },
      uPaisNucleo: { value: cores.paisNucleo },
      uFria: { value: cores.fria },
      uFriaDir: { value: FRIA_DIR },
      uFriaForca: { value: FRIA_FORCA },
    };

    /* ----------------------------------------------------------- a esfera */
    /* `defines` é um objeto memorizado como os uniformes: trocá-lo por um
       literal a cada render faria o three recompilar o shader por quadro. */
    const defines = leve ? { LEVE: "" } : {};
    const uAtm = {
      uCor: { value: cores.atm },
      uForca: { value: ATM_FORCA },
      uExp: { value: ATM_EXP },
      uZoom: { value: 1 },
    };

    /* ------------------------------------------------------- os arcos (3) */
    const pts = rede();
    const n = REDE_PASSOS + 1;
    const seg = (n - 1) * REDE_PERNAS.length;
    const posRede = new Float32Array(seg * 6);
    const corRede = new Float32Array(seg * 6);
    let k = 0;
    for (let p = 0; p < REDE_PERNAS.length; p += 1) {
      const forca = REDE_PERNAS[p].some((c) => EUROPEUS.has(c)) ? 1 : REDE_FRACA;
      posRede.set(emSegmentos(pts, p * n, n), k * 6);
      for (let s = 0; s < n - 1; s += 1) {
        for (let v = 0; v < 2; v += 1) {
          const i = (k + s) * 6 + v * 3;
          corRede[i] = cores.laranja.r * forca;
          corRede[i + 1] = cores.laranja.g * forca;
          corRede[i + 2] = cores.laranja.b * forca;
        }
      }
      k += n - 1;
    }
    const gRede = new LineSegmentsGeometry();
    gRede.setPositions(posRede);
    gRede.setColors(corRede);
    const mRede = new LineMaterial({
      linewidth: REDE_FIO,
      vertexColors: true,
      transparent: true,
      opacity: REDE_ALFA,
      depthWrite: false,
    });
    const linhaRede = new LineSegments2(gRede, mRede);
    /* A caixa de contorno é a da esfera erguida: calculá-la varrendo os
       segmentos daria o mesmo número, e o `frustumCulled` nunca corta nada
       aqui — a cena inteira cabe no quadro por construção. */
    linhaRede.frustumCulled = false;

    /* O NÚCLEO CREME do arco — a referência que o dono aprovou em 17/10 é o
       mapa noturno de São Paulo (`public/images/sp-noite.webp`): nas Marginais
       a via não é "um laranja mais forte", é um corpo laranja largo com um FIO
       CREME por dentro. Duas linhas sobre a MESMA polilinha, então: o corpo
       com 1,9 px no laranja da marca e o núcleo com 0,7 px no creme, cada um
       com o seu alfa. Duas chamadas de desenho, e é o preço exato do que a
       referência mostra — um shader que pintasse o gradiente ao longo da
       largura da linha custaria o mesmo em fragmentos e um `onBeforeCompile`
       em cima de um material dos exemplos do three. */
    const corNucleo = new Float32Array(seg * 6);
    for (let i = 0; i < seg * 6; i += 3) {
      /* O MESMO perfil de força do corpo (a perna que toca a Europa é mais
         forte), só que no creme: o núcleo não pode igualar pernas que o corpo
         separa. A razão entre os dois canais verdes dá a força de volta. */
      const forca = corRede[i + 1] / cores.laranja.g;
      corNucleo[i] = cores.paisNucleo.r * forca;
      corNucleo[i + 1] = cores.paisNucleo.g * forca;
      corNucleo[i + 2] = cores.paisNucleo.b * forca;
    }
    const gNucleo = new LineSegmentsGeometry();
    gNucleo.setPositions(posRede);
    gNucleo.setColors(corNucleo);
    const mNucleo = new LineMaterial({
      linewidth: NUCLEO_FIO,
      vertexColors: true,
      transparent: true,
      opacity: NUCLEO_ALFA,
      depthWrite: false,
    });
    const linhaNucleo = new LineSegments2(gNucleo, mNucleo);
    linhaNucleo.frustumCulled = false;
    /* NO CELULAR O NÚCLEO NÃO EXISTE (etapa 6): são sete linhas de 22 segmentos
       cada desenhadas uma segunda vez, e num disco de 340 px o fio creme de
       0,85 px já não se separa do corpo laranja. Paga-se um `drawcall` e uma
       passada de fragmentos por uma diferença que a tela não mostra. */
    linhaNucleo.visible = !leve;

    const gFlash = new LineSegmentsGeometry();
    gFlash.setPositions(new Float32Array((n - 1) * 2 * 6));
    const mFlash = new LineMaterial({
      color: cores.laranja.getHex(),
      linewidth: FLASH_FIO,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const linhaFlash = new LineSegments2(gFlash, mFlash);
    linhaFlash.frustumCulled = false;
    linhaFlash.visible = false;

    /* ---------------------------------------------------------- o cometa */
    const posCometa = new Float32Array(COMETA_N * 3);
    const pesoCometa = new Float32Array(COMETA_N * 3);
    const gCometa = new BufferGeometry();
    gCometa.setAttribute("position", new BufferAttribute(posCometa, 3));
    gCometa.setAttribute("aPeso", new BufferAttribute(pesoCometa, 3));
    gCometa.setDrawRange(0, 0);
    gCometa.boundingSphere = null;
    const uCometa = {
      uDpr: { value: 1 },
      uGrao: { value: 1 },
      uCabeca: { value: cores.paisNucleo },
      uRastro: { value: cores.costa },
    };
    /* Sorteio determinístico das faíscas: a mesma cena em todo recarregamento,
       sem `Math.random` — a mesma regra do resto do globo. */
    const semente = new Float32Array(COMETA_PARTICULAS * 3);
    const ruido = (x: number) => {
      const v = Math.sin(x * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let i = 0; i < COMETA_PARTICULAS; i += 1) {
      semente[i * 3] = ruido(i + 0.11);
      semente[i * 3 + 1] = ruido(i + 0.37) - 0.5;
      semente[i * 3 + 2] = ruido(i + 0.73) - 0.5;
    }

    /* ------------------------------------------- os aneis (etapa 4) */
    const posMarcas = new Float32Array(2 * 3);
    const marcas = new Float32Array(2 * 3);
    const gMarcas = new BufferGeometry();
    gMarcas.setAttribute("position", new BufferAttribute(posMarcas, 3));
    gMarcas.setAttribute("aMarca", new BufferAttribute(marcas, 3));
    const uMarcas = {
      uDpr: { value: 1 },
      uFio: { value: ANEL_FIO },
      uFolga: { value: ANEL_FOLGA },
      /* O TETO do `gl_PointSize` desta GPU, perguntado ao driver no
         `onCreated` do `Canvas`. O padrão só garante 1 px; na prática um
         desktop dá 255 ou mais e um celular costuma dar 63 a 1024. O pulso
         chega a 30 px de raio, ou seja 66 px de sprite a dpr 1 — colado no
         piso de um Android antigo, e por isso o número é perguntado em vez de
         suposto. */
      uTeto: { value: 64 },
      uCor: { value: cores.laranja },
    };

    return {
      geoTerra,
      uTerra,
      uAtm,
      defines,
      uCometa,
      uMarcas,
      gMarcas,
      marcas,
      linhaRede,
      linhaNucleo,
      linhaFlash,
      gFlash,
      pts,
      n,
      gCometa,
      posCometa,
      pesoCometa,
      semente,
    };
  }, [leve]);

  /* A PONTE: o laço do 2D passa a ter como desenhar esta cena. Registrada em
     efeito porque é um fato de ciclo de vida — ao desmontar, o 2D volta a
     pintar tudo sozinho, e é isso que faz o fallback e a volta para o celular
     não terem código próprio. */
  useEffect(() => {
    const atual = cena();
    atual.avanca = avanca;
    atual.marcos.montou = performance.now();
    return () => {
      atual.avanca = null;
      atual.pronto = false;
      atual.nasceu = 0;
      atual.espia3d = null;
    };
  }, [avanca]);

  useEffect(
    () => () => {
      cena3d.geoTerra?.dispose();
      cena3d.linhaRede.geometry.dispose();
      cena3d.linhaRede.material.dispose();
      cena3d.linhaNucleo.geometry.dispose();
      cena3d.linhaNucleo.material.dispose();
      cena3d.linhaFlash.geometry.dispose();
      cena3d.linhaFlash.material.dispose();
      cena3d.gCometa.dispose();
      cena3d.gMarcas.dispose();
    },
    [cena3d],
  );

  const escala = useRef(0);
  const cidade = useRef(-1);
  const quadros = useRef(0);
  const tela = useRef(0);

  /* A câmera e o `gl` vêm do ARGUMENTO do `useFrame`, não de `useThree`: os
     dois são objetos que este laço MUTA, e mutar o retorno de um hook é o que o
     compilador do React proíbe — com razão, porque ele guarda esse retorno
     entre renders. Pelo argumento, o objeto é o do quadro. */
  useFrame((estado) => {
    const camera = estado.camera as OrthographicCamera;
    const q = cena();
    const g = grupo.current;
    const rede3d = redeNo.current;
    const flash3d = flashNo.current;
    const cometa3d = cometaNo.current;
    const marcas3d = marcasNo.current;
    if (!g || !rede3d || !flash3d || !cometa3d || !marcas3d) return;

    /* A CÂMERA DO QUADRO, lida e não calculada: os três números são os mesmos
       que o `desenha()` do 2D acabou de usar. */
    g.rotation.set(q.pitch, q.yaw, 0);

    /* O ZOOM pela `zoom` da câmera ortográfica, que é precisamente o que a
       matriz do canvas 2D faz: com o frustum em ±1, `zoom = Z` recorta o
       frustum para ±1/Z, e um ponto em `x₁` cai em `R + Z·R·x₁` — a conta do
       2D, sem um fator de ajuste. `updateProjectionMatrix` só quando muda:
       durante o pouso a escala é constante por 1,8 s. */
    if (q.escala !== escala.current) {
      escala.current = q.escala;
      camera.zoom = q.escala;
      camera.updateProjectionMatrix();
      /* `grao` = Z^0,6: o ponto cresce por MENOS que a escala, então os vãos
         entre eles ABREM e aproximar REVELA a nuvem em vez de só ampliá-la. É
         a mesma curva do canvas 2D, escrita do outro lado da conta. */
      const grao = Math.pow(q.escala, 0.6);
      const mt = terra.current?.material as ShaderMaterial | undefined;
      const mc = cometa3d.material as ShaderMaterial;
      if (mt) mt.uniforms.uGrao.value = grao;
      mc.uniforms.uGrao.value = grao;
      /* A atmosfera precisa do zoom para saber ONDE fica a borda da vigia. */
      const ma = esferaNo.current?.material as ShaderMaterial | undefined;
      if (ma) ma.uniforms.uZoom.value = q.escala;
    }

    /* O PAÍS DA VEZ: um `uniform`, não um buffer reescrito. */
    if (q.cidade !== cidade.current) {
      cidade.current = q.cidade;
      const mt = terra.current?.material as ShaderMaterial | undefined;
      if (mt) mt.uniforms.uAtivo.value = q.cidade;
      montaFlash(q, cena3d, flash3d);
    }

    /* A RESOLUÇÃO das linhas de espessura em pixel. Só na mudança de tamanho —
       é a única coisa aqui que depende da caixa. */
    if (estado.size.width !== tela.current) {
      tela.current = estado.size.width;
      const mr = rede3d.material as LineMaterial;
      const mf = flash3d.material as LineMaterial;
      mr.resolution.set(estado.size.width, estado.size.height);
      mf.resolution.set(estado.size.width, estado.size.height);
      const mn = nucleoNo.current?.material as LineMaterial | undefined;
      mn?.resolution.set(estado.size.width, estado.size.height);
      const mt = terra.current?.material as ShaderMaterial | undefined;
      const mc = cometa3d.material as ShaderMaterial;
      if (mt) mt.uniforms.uDpr.value = estado.viewport.dpr;
      mc.uniforms.uDpr.value = estado.viewport.dpr;
      const mm = marcas3d.material as ShaderMaterial;
      mm.uniforms.uDpr.value = estado.viewport.dpr;
      mm.uniforms.uTeto.value = TETO_SPRITE.valor;
    }

    /* O FLASH da chegada à Europa: 1 s de laranja cheio nas duas pernas da
       cidade da vez, e só no POUSO. */
    const ativo = q.codigos[q.cidade] ?? "";
    const aceso =
      EUROPEUS.has(ativo) && q.fase === "pouso" && q.msFase < FLASH_MS
        ? 1 - q.msFase / FLASH_MS
        : 0;
    (flash3d.material as LineMaterial).opacity = 0.7 * aceso;
    flash3d.visible = aceso > 0.004;

    desenhaCometa(q, cena3d, cometa3d);
    desenhaMarcas(q, marcas3d, cena3d.marcas);

    /* AS MATRIZES, ATUALIZADAS À MÃO — e só então os pinos.

       O `useFrame` roda ANTES do `gl.render`, e é o `render` que normalmente
       recompõe `matrixWorld` e `matrixWorldInverse`. Posicionar os pinos sem
       isto seria usar a matriz do quadro ANTERIOR: o atraso de 16,7 ms que a
       etapa 1 evitou ao trocar `invalidate()` por `advance()`, reintroduzido
       pela porta dos fundos. Duas composições de 4×4 por quadro. */
    g.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    posicionaPinos(q, camera, g);

    q.chamadas = estado.gl.info.render.calls;
    q.pontos = estado.gl.info.render.points;
    q.geometrias = estado.gl.info.memory.geometries;
    q.texturas = estado.gl.info.memory.textures;
    /* As matrizes DE VERDADE, para a conferência pino×esfera (ver `cena.ts`). */
    if (!q.espia3d) q.espia3d = { camera, grupo: g };

    /* O CROSSFADE começa no SEGUNDO quadro: no primeiro o `render` do r3f ainda
       não aconteceu (este callback roda antes dele), e acender a opacidade de
       um canvas que não desenhou nada seria um piscar de preto sobre o planeta
       2D. */
    quadros.current += 1;
    if (quadros.current === 2) aoDesenhar();
  });

  if (!cena3d.geoTerra) return null;

  return (
    <group ref={grupo}>
      {/* A ESFERA, com a atmosfera (etapa 2).

          Ela faz DUAS coisas, e a ordem importa: escreve PROFUNDIDADE — é o que
          esconde o hemisfério de trás, os pontos dele, os arcos dele e o cometa
          quando ele passa por lá — e pinta o fresnel da atmosfera, que vai a
          ZERO no meio do disco. Esse zero é o que mantém o oceano, o halo e a
          MARCA D'ÁGUA (CSS, pintados pelo servidor, debaixo deste canvas)
          aparecendo inteiros pelo canal alfa.

          `transparent: false` de propósito: materiais opacos desenham ANTES dos
          transparentes e com `NoBlending`, ou seja o fragmento substitui o que
          está no buffer. É exatamente o que esta esfera quer — ela é a primeira
          coisa do quadro, e o alfa que ela escreve é o da atmosfera. */}
      <mesh ref={esferaNo}>
        <sphereGeometry
          args={
            leve
              ? [RAIO_ESFERA, ESFERA_SEG_LEVE[0], ESFERA_SEG_LEVE[1]]
              : [RAIO_ESFERA, ESFERA_SEG[0], ESFERA_SEG[1]]
          }
        />
        <shaderMaterial
          vertexShader={atmosferaVert}
          fragmentShader={atmosferaFrag}
          uniforms={cena3d.uAtm}
          defines={cena3d.defines}
        />
      </mesh>

      {/* A TERRA FIRME: 5.458 vértices, um `drawcall`.

          `depthWrite: false` e `depthTest: true`: os pontos são TESTADOS contra
          a esfera (é assim que o lado de trás desaparece) mas não escrevem
          profundidade entre si — dois pontos quase coincidentes somam alfa em
          vez de um recortar o outro, que é o que o `fill` do 2D faz. */}
      <points ref={terra} geometry={cena3d.geoTerra}>
        <shaderMaterial
          vertexShader={pontosVert}
          fragmentShader={pontosFrag}
          transparent
          depthWrite={false}
          uniforms={cena3d.uTerra}
        />
      </points>

      {/* OS ARCOS DA REDE (etapa 3), e o flash da chegada à Europa. */}
      <primitive ref={redeNo} object={cena3d.linhaRede} />
      <primitive ref={nucleoNo} object={cena3d.linhaNucleo} />
      <primitive ref={flashNo} object={cena3d.linhaFlash} />

      {/* O ANEL DE ALVO E O PULSO (etapa 4): dois sprites, um `drawcall`.

          Depois dos pontos e dos arcos, antes do cometa: eles são do CHÃO, e o
          cometa passa por cima deles. `depthTest` ligado, como todo o resto —
          um anel na cidade que está do outro lado da bola não aparece. */}
      <points ref={marcasNo} geometry={cena3d.gMarcas} frustumCulled={false}>
        <shaderMaterial
          vertexShader={marcasVert}
          fragmentShader={marcasFrag}
          transparent
          depthWrite={false}
          uniforms={cena3d.uMarcas}
        />
      </points>

      {/* O COMETA (etapa 3): cabeça, rastro e partículas num `Points` só.

          Mistura ADITIVA, e é a única da cena: um rastro luminoso é luz SOMADA
          ao que está atrás, não tinta sobreposta — é por isso que ele brilha
          mais onde os sprites se sobrepõem, logo atrás da cabeça. */}
      <points ref={cometaNo} geometry={cena3d.gCometa} frustumCulled={false}>
        <shaderMaterial
          vertexShader={cometaVert}
          fragmentShader={cometaFrag}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          uniforms={cena3d.uCometa}
        />
      </points>
    </group>
  );
}

/** As duas pernas da cidade da vez, para o flash da chegada à Europa. */
function montaFlash(
  q: Cena,
  cena3d: { gFlash: LineSegmentsGeometry; pts: Float32Array; n: number },
  no: LineSegments2,
) {
  const code = q.codigos[q.cidade] ?? "";
  if (!EUROPEUS.has(code)) return;
  const n = cena3d.n;
  const saida = new Float32Array((n - 1) * 2 * 6);
  let k = 0;
  for (let p = 0; p < REDE_PERNAS.length && k < 2; p += 1) {
    if (!REDE_PERNAS[p].includes(code)) continue;
    saida.set(emSegmentos(cena3d.pts, p * n, n), k * (n - 1) * 6);
    k += 1;
  }
  cena3d.gFlash.setPositions(saida);
  no.geometry = cena3d.gFlash;
}

/**
 * O COMETA do quadro: a cabeça na posição da bolinha, o rastro atrás dela e as
 * partículas em volta.
 *
 * Tudo sai do ARCO que o estado compartilhado publica (23 pontos já elevados,
 * remontados pelo 2D uma vez por perna): aqui só se interpola entre dois
 * vértices dele. Nenhum `slerp` por quadro, nenhuma alocação.
 */
function desenhaCometa(
  q: Cena,
  cena3d: {
    gCometa: BufferGeometry;
    posCometa: Float32Array;
    pesoCometa: Float32Array;
    semente: Float32Array;
  },
  no: Points,
) {
  const pos = cena3d.posCometa;
  const peso = cena3d.pesoCometa;
  const geo = no.geometry;

  const noVoo = q.fase === "voo";

  /* A LUZ NO CHÃO (etapa 4), no vértice 0, e ela é desenhada SEMPRE — o que
     muda é o alfa. Ela não segue o cometa: fica na cidade em que se pousou,
     acende enquanto a câmera está parada ali e apaga quando ela parte. */
  const cidade = alvo(q.codigos[q.cidade] ?? "");
  pos[0] = cidade[0];
  pos[1] = cidade[1];
  pos[2] = cidade[2];
  peso[0] = LUZ_RAIO;
  peso[1] =
    LUZ_ALFA *
    (noVoo
      ? Math.max(0, 1 - q.msFase / LUZ_CAI_MS)
      : Math.min(1, q.msFase / LUZ_SOBE_MS)) *
    (q.mergulhou ? 1 : 0);
  peso[2] = 0;

  /* Sem perna montada (antes do primeiro voo), ou com o rastro já apagado: o
     cometa inteiro sai com alfa zero e o fragmento o descarta. A luz no chão
     continua, e é por isso que isto deixou de ser um `drawRange` curto. */
  const vivo = q.temRastro && (noVoo || q.msFase < RASTRO_SOME_MS);
  if (!vivo) {
    for (let i = COMETA_LUZ; i < COMETA_N; i += 1) peso[i * 3 + 1] = 0;
    geo.setDrawRange(0, COMETA_N);
    (geo.getAttribute("position") as BufferAttribute).needsUpdate = true;
    (geo.getAttribute("aPeso") as BufferAttribute).needsUpdate = true;
    return;
  }

  const cabeca = noVoo ? q.u : 1;
  const vida = noVoo ? 1 : Math.max(0, 1 - q.msFase / RASTRO_SOME_MS);

  /* Um ponto do arco, por interpolação linear entre dois vértices da
     polilinha. A 23 pontos o erro contra o grande círculo é meio pixel. */
  const emU = (u: number, saida: Float32Array, off: number) => {
    const f = Math.max(0, Math.min(1, u)) * (ARCO_PASSOS - 1);
    const i0 = Math.min(ARCO_PASSOS - 1, f | 0);
    const i1 = Math.min(ARCO_PASSOS - 1, i0 + 1);
    const w = f - i0;
    saida[off] = q.arco[i0 * 3] + (q.arco[i1 * 3] - q.arco[i0 * 3]) * w;
    saida[off + 1] =
      q.arco[i0 * 3 + 1] + (q.arco[i1 * 3 + 1] - q.arco[i0 * 3 + 1]) * w;
    saida[off + 2] =
      q.arco[i0 * 3 + 2] + (q.arco[i1 * 3 + 2] - q.arco[i0 * 3 + 2]) * w;
  };

  /* A CABEÇA, EM DOIS SPRITES — o halo e o núcleo.

     É a mesma leitura das Marginais no mapa noturno que o dono aprovou
     (`public/images/sp-noite.webp`): um corpo largo e quente por fora, um fio
     CREME por dentro. Aqui, com mistura aditiva, isso é literalmente uma soma:
     um sprite grande no laranja do rastro a alfa baixo, e em cima dele um
     sprite pequeno no creme da marca a alfa cheio. O resultado satura no meio
     e esfria para a borda, que é como uma luz de verdade se comporta — e é o
     que a ÚNICA bolinha chapada do 2D não tinha jeito de fazer. */
  const halo = COMETA_LUZ * 3;
  const nucleo = (COMETA_LUZ + 1) * 3;
  emU(cabeca, pos, halo);
  peso[halo] = COMETA_RAIO;
  peso[halo + 1] = 0.5 * vida;
  peso[halo + 2] = 0.15;
  pos[nucleo] = pos[halo];
  pos[nucleo + 1] = pos[halo + 1];
  pos[nucleo + 2] = pos[halo + 2];
  peso[nucleo] = COMETA_RAIO * 0.42;
  peso[nucleo + 1] = vida;
  peso[nucleo + 2] = 1;

  /* O RASTRO: 63 pontos sobre o terço de perna atrás da cabeça, com raio e
     alfa caindo até zero. A curva do alfa é quadrática porque a soma dos
     sprites já é linear — com queda linear a cauda ficaria chapada. */
  for (let s = 0; s < COMETA_RASTRO; s += 1) {
    const k = (s + 1) / COMETA_RASTRO;
    const u = cabeca - k * COMETA_COMPRIMENTO;
    const i = (COMETA_LUZ + COMETA_CABECA + s) * 3;
    if (u < 0) {
      peso[i + 1] = 0;
      continue;
    }
    emU(u, pos, i);
    const cai = 1 - k;
    peso[i] = RASTRO_RAIO * (0.45 + 0.55 * cai);
    peso[i + 1] = 0.85 * cai * cai * vida;
    peso[i + 2] = cai * cai;
  }

  /* AS PARTÍCULAS: 32 faíscas com vida curta, sorteadas uma vez e presas ao
     arco por uma fase própria. Elas nascem perto da cabeça, caem para trás e
     somem — e o deslocamento é um empurrão em três eixos, o bastante para não
     virarem uma segunda linha em cima da primeira. */
  /* METADE DAS FAÍSCAS NO CELULAR (etapa 6). As que sobram não somem de vez:
     elas saem com alfa zero e o fragmento as descarta, o que custa um vértice
     e nenhum fragmento — mais barato que mexer no `drawRange` e perder os
     vértices do rastro, que vêm depois delas na ordem. */
  const faiscas = q.leve ? COMETA_PARTICULAS >> 1 : COMETA_PARTICULAS;
  for (let s = 0; s < COMETA_PARTICULAS; s += 1) {
    const i = (COMETA_LUZ + COMETA_CABECA + COMETA_RASTRO + s) * 3;
    if (s >= faiscas) {
      peso[i + 1] = 0;
      continue;
    }
    /* `fase` percorre 0→1 várias vezes ao longo da perna: cada faísca tem o
       seu próprio relógio, deslocado pela semente. */
    const fase = (cabeca * 6 + cena3d.semente[s * 3]) % 1;
    const u = cabeca - fase * COMETA_COMPRIMENTO * 1.3;
    if (u < 0 || fase > 0.9) {
      peso[i + 1] = 0;
      continue;
    }
    emU(u, pos, i);
    const espalha = fase * 0.012;
    pos[i] += cena3d.semente[s * 3 + 1] * espalha;
    pos[i + 1] += cena3d.semente[s * 3 + 2] * espalha;
    pos[i + 2] += (cena3d.semente[s * 3] - 0.5) * espalha;
    const cai = 1 - fase / 0.9;
    peso[i] = 1.6 * cai;
    peso[i + 1] = 0.72 * cai * cai * vida;
    peso[i + 2] = 0.3;
  }

  geo.setDrawRange(0, COMETA_N);
  (geo.getAttribute("position") as BufferAttribute).needsUpdate = true;
  (geo.getAttribute("aPeso") as BufferAttribute).needsUpdate = true;
}

/* --------------------------------------------------------------------------
   ETAPA 4 — OS PINOS E OS RÓTULOS, POSICIONADOS PELA CENA

   Pedido do dono, 17/10: "os pinos e rótulos continuam DOM (legibilidade e
   PT/EN exigem isso), mas passam a ser posicionados PELA CENA 3D: projete o
   ponto da superfície pela câmera 3D e escreva o `transform` no mesmo
   `requestAnimationFrame` em que entrega o quadro — um relógio, zero
   descolamento."

   É o que esta função faz, e a diferença com o que havia antes é sutil e
   importante. O canvas 2D projetava os pinos com a SUA conta (as quatro linhas
   de seno e cosseno do laço) e a esfera 3D era desenhada com a matriz da
   câmera. As duas concordavam — medimos 0,13 px de desvio máximo em 1.400
   amostras —, mas eram DUAS CONTAS. Agora é uma: o mesmo `matrixWorld` do grupo
   e a mesma `projectionMatrix` que acabaram de desenhar os 5.458 pontos põem o
   alfinete no lugar. Não há mais como divergirem, porque não há mais duas.

   AS MATRIZES SÃO ATUALIZADAS À MÃO AQUI, e é por isso que o desvio é zero e
   não "um quadro": o `useFrame` roda ANTES do `gl.render`, e é o `render` que
   normalmente atualiza `matrixWorld` e `matrixWorldInverse`. Sem o
   `updateMatrixWorld` abaixo, os pinos seriam posicionados pela matriz do
   quadro ANTERIOR — exatamente o atraso de 16,7 ms que a etapa 1 evitou ao
   trocar `invalidate()` por `advance()`. Duas composições de 4×4 por quadro é o
   preço, e ele é ridículo perto do que compra.
   -------------------------------------------------------------------------- */

/** Vetor de trabalho da projeção: um só, reusado — zero alocação por quadro. */
const PROJ = new Vector3();

/**
 * A PROFUNDIDADE DO PINO (etapa 4): o mesmo fator de volume dos pontos de
 * terra, `0,62 + 0,38·z₂`.
 *
 * Vale 1 no meio da bola e 0,62 no limbo, e multiplica o TAMANHO do ponto (por
 * `--pino-vol`, em CSS) e a OPACIDADE do alfinete. Antes da etapa 4 o pino era
 * chapado: do mesmo tamanho no centro e na beira, num planeta cujos pontos já
 * encolhiam. Era o único objeto da cena que não participava do volume.
 */
function volume(z2: number) {
  return 0.62 + 0.38 * z2;
}

function posicionaPinos(q: Cena, camera: OrthographicCamera, grupo: Group) {
  const pinos = q.pinos;
  /* ABAIXO DE 1024 NÃO HÁ PINO: os `CountryTag` existem no DOM mas o nó que os
     embrulha é `hidden lg:block`, e sete caixas de texto não cabem em 370 px
     (quem nomeia o país da vez lá é a `StageStatus`). Escrever `transform` em
     nós dentro de um `display: none` é trabalho que nunca vira pixel. */
  if (q.leve || !pinos.length || !q.lado) return;
  const lado = q.lado;
  const R = lado / 2;
  const MG = grupo.matrixWorld;
  const atual = q.cidade;
  const noPouso = q.fase === "pouso";

  for (let j = 0; j < pinos.length; j += 1) {
    const el = pinos[j];
    if (!el) continue;
    const base = alvo(q.codigos[j] ?? "");
    PROJ.set(base[0], base[1], base[2]).applyMatrix4(MG);
    /* `z₂` é a componente z em espaço de MUNDO, e numa cena em que a câmera
       está em +Z sem rotação isso é exatamente o cosseno do ângulo ao centro
       do disco — o mesmo `z₂` do canvas 2D. Lido ANTES de projetar, porque a
       projeção o troca pela profundidade normalizada. */
    const z2 = PROJ.z;
    PROJ.project(camera);
    const px = ((PROJ.x + 1) / 2) * lado;
    const py = ((1 - PROJ.y) / 2) * lado;

    /* O PINO SOME NO LIMBO, e some por opacidade, nunca por `hidden` binário:
       com o giro livre todos cruzam o limbo o tempo todo, e cortar o nó de uma
       vez faria o rótulo PISCAR na borda do disco, sete vezes por volta. */
    const borda = (z2 - 0.05) / 0.25;
    const visivel = z2 <= 0 ? 0 : borda >= 1 ? 1 : borda <= 0 ? 0 : borda;

    /* A VIGIA VALE PARA O DOM TAMBÉM: o canvas corta o que sai do círculo, o
       HTML não é cortado por nada, e no zoom os pinos longe do centro saem do
       disco. E a régua da coluna de texto tira quem está longe do meio — é ela
       que impede um rótulo de 240px de cruzar a borda esquerda do `<h1>`. */
    const rad = Math.hypot(px - R, py - R) / R;
    const naVigia =
      rad >= VIGIA_FORA
        ? 0
        : rad <= VIGIA_DENTRO
          ? 1
          : (VIGIA_FORA - rad) / (VIGIA_FORA - VIGIA_DENTRO);
    const chegou =
      rad <= CHEGOU_DENTRO
        ? 1
        : rad >= CHEGOU_FORA
          ? 0
          : (CHEGOU_FORA - rad) / (CHEGOU_FORA - CHEGOU_DENTRO);

    const foco = q.focos[j] ?? 0;
    const vol = volume(z2);
    const efetiva =
      Math.min(visivel, naVigia) *
      chegou *
      (q.rotulos + (1 - q.rotulos) * foco) *
      /* A queda de volume entra NA OPACIDADE junto com o tamanho: no limbo o
         pino não é só menor, é mais fraco — é esse par que o olho lê como
         curvatura, e é o mesmo par que os 5.458 pontos de terra usam. */
      vol;

    el.hidden = efetiva <= 0.004;
    el.style.opacity = efetiva >= 0.999 ? "" : efetiva.toFixed(3);
    el.style.transform = `translate3d(${(px - q.repousoX[j]).toFixed(1)}px, ${(py - q.repousoY[j]).toFixed(1)}px, 0)`;
    /* `--pino-vol` é lido só pelo PONTO (ver `.hero-ponto`, em `hero.css`): o
       rótulo não escala, porque um texto que encolhe perto do limbo é um texto
       que se lê pior. Arredondado a três casas para não invalidar estilo por
       um milésimo que ninguém vê. */
    el.style.setProperty("--pino-vol", vol.toFixed(3));

    /* O DESTAQUE do rótulo da cidade em que se pousou, escrito só na VIRADA:
       tocar o `classList` 60 vezes por segundo paga invalidação de estilo de
       graça. */
    const destaque = noPouso && j === atual;
    if (q.destacado[j] !== (destaque ? 1 : 0)) {
      q.destacado[j] = destaque ? 1 : 0;
      el.classList.toggle("hero-pino--foco", destaque);
    }

    /* A posição projetada volta para o estado compartilhado: é dela que saem o
       anel de alvo e o pulso, logo abaixo, e é ela que a medição no navegador
       compara com a esfera. */
    q.telaPinos[j * 3] = px;
    q.telaPinos[j * 3 + 1] = py;
    q.telaPinos[j * 3 + 2] = z2;
  }
}

/* --------------------------------------------------------------------------
   ETAPA 4 — O ANEL DE ALVO E O PULSO, E A LUZ NO CHÃO

   O anel de alvo é o que o Maps põe no ponto que você escolheu: aqui ele marca
   a cidade que a câmera está afirmando, e passa de pino em pino junto com o
   foco. O pulso é o anel que nasce no ponto e se abre uma vez, em 600 ms, na
   chegada. Os dois eram traçados no canvas 2D; com os pinos posicionados pela
   cena, eles vieram junto — ficar para trás significaria o anel desenhado pela
   projeção antiga em volta de um pino posto pela nova.

   DOIS SPRITES, UM `drawcall`. Um anel não cabe no shader de disco do cometa
   (ele é oco), então este `Points` tem fragmento próprio: a distância ao centro
   do sprite contra um raio, com a espessura em px de TELA — um fio de 1,5 px é
   um fio de 1,5 px perto ou longe, que é a escala de fios da página inteira.

   POR QUE NÃO DOM: um anel em CSS cresce por `transform: scale`, e escalar um
   nó com borda engrossa a BORDA junto — um fio de 2 px vira 12 px no fim do
   pulso. Fazer a borda ficar fina pediria animar `width`/`height`, ou seja
   layout 60 vezes por segundo. No sprite a espessura é uma conta no fragmento,
   independente do raio.

   A LUZ NO CHÃO ("um disco emissivo discreto na superfície sob o pino que
   pousou") não precisou de objeto novo: ela é mais UM vértice do `Points` do
   cometa, que já tem o fragmento de disco macio e a mistura aditiva. Emissiva
   de verdade, portanto — soma luz ao que está atrás, como o rastro.
   -------------------------------------------------------------------------- */

/** Espessura do fio dos dois anéis, em px de CSS. */
const ANEL_FIO = 1.4;
/**
 * O teto de `gl_PointSize` do driver, lido uma vez no `onCreated` do canvas.
 * Num objeto porque ele é descoberto DEPOIS de os uniformes serem criados — e
 * o `useFrame` o copia para o uniforme no primeiro quadro.
 */
const TETO_SPRITE = { valor: 64 };
/** Folga entre o raio do anel e a aresta do sprite, em px de CSS. */
const ANEL_FOLGA = 3;
/** Raio e alfa máximos do pulso. */
const PULSO_RAIO = 26;
const PULSO_ALFA = 0.5;

const marcasVert = /* glsl */ `
  attribute vec3 aMarca;    /* raio em px de CSS, alfa, (reservado) */
  uniform float uDpr;
  uniform float uFio;
  uniform float uFolga;
  uniform float uTeto;      /* o maior gl_PointSize que esta GPU aceita */
  varying float vAnel;
  varying float vMeia;
  varying float vAA;
  varying float vAlfa;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float sprite = min((aMarca.x + uFolga) * 2.0 * uDpr, uTeto);
    gl_PointSize = sprite;
    /* O raio do anel em unidades do sprite. Se a GPU tiver cortado o tamanho
       (uTeto), isto passa de 0,5 e o anel cai FORA do sprite: ele some, em vez
       de aparecer no raio errado. Some é o defeito honesto. */
    vAnel = (aMarca.x * uDpr) / max(sprite, 1.0);
    vMeia = (uFio * 0.5 * uDpr) / max(sprite, 1.0);
    vAA = 1.0 / max(sprite, 1.0);
    vAlfa = aMarca.y;
  }
`;

const marcasFrag = /* glsl */ `
  uniform vec3 uCor;
  varying float vAnel;
  varying float vMeia;
  varying float vAA;
  varying float vAlfa;
  void main() {
    float d = abs(length(gl_PointCoord - 0.5) - vAnel);
    float m = 1.0 - smoothstep(vMeia - vAA, vMeia + vAA, d);
    float a = vAlfa * m;
    if (a <= 0.003) discard;
    vec3 c = linearToOutputTexel(vec4(uCor, 1.0)).rgb;
    gl_FragColor = vec4(c, a);
  }
`;

/**
 * Os dois anéis do quadro: o alvo e o pulso, na cidade da vez.
 *
 * Posição: o vetor de base da capital, na SUPERFÍCIE (raio 1) — os anéis são
 * do chão, não do ar; quem voa é o cometa. Fora do pouso eles têm alfa zero e
 * o fragmento os descarta.
 */
function desenhaMarcas(q: Cena, no: Points, marcas: Float32Array) {
  const geo = no.geometry;
  const base = alvo(q.codigos[q.cidade] ?? "");
  const pos = geo.getAttribute("position") as BufferAttribute;
  for (let v = 0; v < 2; v += 1) {
    pos.array[v * 3] = base[0];
    pos.array[v * 3 + 1] = base[1];
    pos.array[v * 3 + 2] = base[2];
  }

  /* O ANEL DE ALVO: nasce com 4 px, CRESCE com a escala e assenta em 22 px de
     tela. É por ele que se LÊ a chegada, e ele acompanha o foco — passa de
     pino em pino num cruza-fade, sem corte. */
  const foco = q.focos[q.cidade] ?? 0;
  marcas[0] = 4 + (ZOOM_ANEL - 4) * q.revela;
  marcas[1] =
    0.3 * foco * Math.min(1, q.revela * 2.5) * (q.revela > 0.002 ? 1 : 0);

  /* O PULSO: uma volta por chegada, com saída rápida e chegada mansa — a mesma
     leitura do resto do palco. `mergulhou` é o que impede o pulso de disparar
     durante o mergulho de entrada: ali a câmera está descendo, não chegando. */
  const pulso =
    q.mergulhou && q.fase === "pouso" && q.msFase < PULSO_MS
      ? q.msFase / PULSO_MS
      : -1;
  if (pulso < 0) {
    marcas[3] = 4;
    marcas[4] = 0;
  } else {
    const e = 1 - (1 - pulso) * (1 - pulso) * (1 - pulso);
    marcas[3] = 4 + PULSO_RAIO * e;
    marcas[4] = PULSO_ALFA * (1 - pulso);
  }

  pos.needsUpdate = true;
  (geo.getAttribute("aMarca") as BufferAttribute).needsUpdate = true;
}

/**
 * O CANVAS do planeta 3D.
 *
 * Entra por `next/dynamic` com `ssr: false` (ver `HeroGlobe`), e só depois do
 * LCP. Nasce com `opacity: 0` em cima do canvas 2D, no MESMO enquadramento — e
 * é isso que torna o crossfade de 600 ms invisível: não há transição de câmera
 * nenhuma, os dois desenham o mesmo quadro, e no fim o 2D para de pintar o que
 * o 3D passou a desenhar.
 */
export default function HeroGlobe3D({ leve = false }: { leve?: boolean }) {
  const [vivo, setVivo] = useState(false);

  /* O 2D só larga a terra quando o 3D já está CHEIO. Durante os 600 ms os dois
     pintam — e podem, porque pintam a mesma geometria no mesmo pixel: o que se
     vê é um ponto ficando mais nítido, não dois planetas. */
  useEffect(() => {
    if (!vivo) return;
    const t = window.setTimeout(() => {
      cena().pronto = true;
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [vivo]);

  return (
    <Canvas
      className={vivo ? "globe-tres globe-tres--vivo" : "globe-tres"}
      /* `position`, `inset` e `pointerEvents` TÊM de ser inline: o r3f escreve
         `position: relative` e `pointerEvents: auto` no estilo do seu próprio
         div, e estilo inline vence classe. Sem o `none` este canvas cobriria a
         seção inteira e roubaria o clique dos botões do hero. */
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      /* ORTOGRÁFICA, com frustum ±1 e `manual` ligado pelo próprio r3f (ele
         detecta `left`/`right` nas props e para de reescrever o frustum a cada
         resize). A câmera em +Z a 3 unidades olhando a origem: numa ortográfica
         a distância não muda tamanho nenhum, ela só tem de deixar a esfera
         inteira entre `near` e `far` (2,0 a 4,0 contra 0,1 e 10). */
      orthographic
      camera={{
        left: -1,
        right: 1,
        top: 1,
        bottom: -1,
        near: 0.1,
        far: 10,
        position: [0, 0, 3],
      }}
      /* `demand`, e NINGUÉM chama `invalidate()`: quem desenha é o laço do
         `HeroGlobe`, por `entrega()` (ver `cena.ts`), no mesmo quadro em que
         ele desenhou o 2D. Aba oculta e hero fora da tela param aquele laço, e
         aqui não resta um `requestAnimationFrame` agendado. */
      frameloop="demand"
      /* O teto de 1,5 é o mesmo do canvas 2D: é onde 5.458 pontos param de
         ficar mais nítidos e só ficam mais caros. */
      dpr={leve ? 1 : [1, 1.5]}
      /* `flat` = `NoToneMapping`. O padrão do r3f é ACES filmic, uma curva de
         cinema que lavaria o `#ff7700` da marca para um laranja pastel. A
         paleta desta página é escolhida em sRGB e tem de sair em sRGB. */
      flat
      gl={{
        /* MSAA DESLIGADO: desde a etapa 2 a única aresta da cena — a borda de
           cada ponto — é resolvida por um `smoothstep` no fragment, e as linhas
           da rede são `LineSegments2`, que já se suavizam sozinhas. O resolve
           de um framebuffer de ~1 M de amostras por quadro deixou de comprar
           alguma coisa. */
        antialias: false,
        /* Transparente: debaixo deste canvas estão o oceano, o halo, o fio de
           atmosfera e a marca d'água, todos CSS pintados pelo servidor. */
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        /* O TETO DO SPRITE desta GPU, perguntado ao driver uma vez.
           `ALIASED_POINT_SIZE_RANGE` devolve [mínimo, máximo] em px de
           DISPOSITIVO: o padrão WebGL só garante 1, e um `gl_PointSize` acima
           do teto é CORTADO sem aviso — o anel do pulso apareceria no raio
           errado em vez de crescer. Com o número na mão, o shader prefere
           sumir a mentir (ver `marcasVert`). */
        const faixa = gl.getContext().getParameter(
          WebGLRenderingContext.ALIASED_POINT_SIZE_RANGE,
        ) as Float32Array | null;
        if (faixa && faixa.length > 1) TETO_SPRITE.valor = faixa[1];
      }}
    >
      <Planeta aoDesenhar={() => setVivo(true)} leve={leve} />
    </Canvas>
  );
}

