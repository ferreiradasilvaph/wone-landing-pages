"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { CountryTag } from "./CountryTag";
import {
  GLOBE_COAST,
  GLOBE_COUNT,
  GLOBE_DELTAS,
  GLOBE_EU_COUNT,
  GLOBE_EU_DELTAS,
  GLOBE_EU_SAMPLES,
} from "./globeDots";
import {
  amostra,
  baseVector,
  CAPITAIS,
  CENTRA,
  GESTO,
  naEuropa,
  GLOBE_STEP,
  noise,
  REPOUSO,
} from "./globeMath";

/* --------------------------------------------------------------------------
   O GLOBO DO PALCO

   Pedido do dono de 14/10: no lugar do mini mapa pontilhado, "um globo
   terrestre criado a partir da linguagem do globo da demo de 4 países, mais
   atraente". O que se copiou da demo (`src/components/demos/GlobeScene.tsx`) é
   a LINGUAGEM — pontos só em terra firme, oceano escuro que esconde o outro
   lado, queda de brilho e de tamanho até o limbo, costa mais clara, fio de
   atmosfera, grade no limite do visível. O que NÃO se copiou é a técnica: aqui
   é `<canvas>` 2D e projeção ortográfica à mão, sem WebGL e sem `three`. O
   hero é a primeira dobra, e o `<h1>` ao lado é o elemento de LCP da página:
   um contexto WebGL e 500 kB de three no caminho crítico estão fora de questão.

   O QUE É CANVAS E O QUE É CSS

   A régua é esta: o que GIRA é canvas, o que não gira é CSS.

   Oceano, halo, limbo e fio de atmosfera são CSS (`.globe-sea`, `.globe-halo`,
   `.globe-limbo`, `.globe-air`, em `src/app/hero.css`): custam zero por quadro
   e, mais importante, estão pintados no HTML do servidor — o planeta existe
   antes de o JavaScript rodar, e os pontos apenas pousam nele. Pagar o halo e
   o limbo em dois gradientes radiais POR QUADRO seria comprar movimento que
   eles não têm: nenhum dos dois depende do ângulo.
   A trama do mar, ao contrário, é canvas — ela gira, e é dela que vem a
   sensação de bola em vez de disco recortado.
   O canvas nasce vazio e transparente. Nenhum `opacity-0`, nenhuma entrada
   animada: regra dura do hero.

   O CUSTO

   Os 5.102 pontos de `globeDots.ts` são montados UMA vez em `Float32Array`
   (~0,4 ms, dentro de efeito) e redesenhados a 30 fps. O desenho não faz 2.000
   chamadas de `fill`: os pontos caem em 10 baldes (6 níveis de terra laranja +
   1 de costa + 3 dos quatro países em creme), e cada balde é um `beginPath` com
   N arcos e UM `fill`. No celular o globo fica atrás do aparelho, não tem pino nem rótulo e
   nada visível muda com o país ativo — então ele é pintado UMA vez e nunca
   mais, zero `requestAnimationFrame`.
   -------------------------------------------------------------------------- */

const TAU = Math.PI * 2;
const LARANJA = "#ff7700";

/* --------------------------------------------------------------------------
   A PALETA: UM PLANETA DE WONE

   Pedido do dono de 14/10: "deixe o globo terrestre com a cara da Wone (...)
   deixe claro que a plataforma possui dominação global no seu nicho". A cara é
   a INVERSÃO da paleta anterior: a terra firme inteira — todo continente, não
   só os quatro países — é pintada no laranja da marca, e o creme, que antes era
   o chão, passa a ser o destaque dos quatro países onde a Wone cobra. Nenhum
   dado novo entra na tela: quem diz onde a Wone opera continuam sendo os quatro
   pinos e os quatro chips, que vêm de `payments.table.countries`. A dominação
   é o que a imagem AFIRMA, não um número inventado.

   A rampa da terra vai do braseiro (#8A3F0A, lado da sombra) ao laranja cheio
   da marca (#FF7700, lado do sol) em seis passos. Quem escolhe o passo é o
   mesmo alfa de antes — e isso não é economia de código, é o efeito: o alfa já
   é `0,06 + 0,28·luz` caindo até o limbo, então o ponto escuro é escuro E
   braseiro, o ponto aceso é opaco E laranja, e os dois somem juntos na borda.
   -------------------------------------------------------------------------- */

/** Braseiro → laranja da marca, em seis passos de luz. */
const TERRA = [
  "#8a3f0a",
  "#a14a08",
  "#b95506",
  "#d06104",
  "#e86c02",
  "#ff7700",
];
/** A costa, só no lado iluminado: laranja claro. */
const COSTA = "#ffb070";
/** Os quatro países: creme quente na borda, creme puro no núcleo. */
const PAIS_BORDA = "#ffe2b8";
const PAIS_NUCLEO = "#ffffe3";

/**
 * A guarda do laço, em ms. 27 e não 33: num monitor de 60 Hz os quadros chegam
 * de 16,7 em 16,7 ms, então 27 deixa passar o segundo (33,3) e dá os 30 fps
 * pedidos; com 33 o segundo quadro chegaria CEDO por 0,3 ms, seria descartado,
 * e o laço cairia para 20 fps. Numa tela de 120 Hz continua dando 30; numa de
 * 30 Hz, os 30 que o aparelho tem.
 */
const PASSO_MS = 27;

/**
 * Os dois países do outro lado do Atlântico, por código de moeda. A rede e o
 * anel do pino os tratam diferente desde 15/10: o dono pediu para a Europa
 * aparecer quando "um ponto liga no outro".
 */
const EUROPEUS = new Set(["EUR", "GBP"]);
/** Quanto dura o laranja cheio na perna que chega à Europa, em ms. */
const FLASH_MS = 1000;

/**
 * O COMETA e o PULSO (pedido do dono, 15/10: "quando um país acende, um cometa
 * curto percorre o arco" e "anel de pulso no pino ativo").
 *
 * Os dois leem o MESMO carimbo de hora do flash da rede (`acendeuEm`), e por
 * isso não têm como discordar sobre quando o país acendeu. Os dois também só
 * existem com o laço de pé: fora de `xl`, ou com qualquer freio puxado
 * (pausado, movimento reduzido, aba oculta, fora da tela), o globo é
 * redesenhado UMA vez por troca e uma animação de 1,4 s num quadro só seria um
 * piscar aleatório — que é exatamente o que o portão de movimento proíbe.
 */
const COMETA_MS = 1400;
const PULSO_MS = 600;
/** Quadros de cauda do cometa, e o quanto cada um fica para trás na perna. */
const COMETA_CAUDA = 4;
const COMETA_PASSO = 0.028;

/** Raio angular, em radianos, do núcleo e da borda do tingimento (500/1.100 km). */
const NUCLEO = 500 / 6371;
const BORDA = 1100 / 6371;

/* --------------------------------------------------------------------------
   O MERGULHO — O CICLO DE CINCO BATIDAS (pedido do dono, 17/10)

   "o giro deve acompanhar a bolinha que interage no globo (...) a cada 3 países
   quero que dê um efeito visual de zoom. um zoom que acompanha mais 2 passagens
   da bolinha por outros países que ela vá percorrer. depois do 2 país que ela
   passar, volte ao zoom original. (...) respeite os detalhes de um zoom real
   que o google maps usa para os smartphones."

   O relógio do hero troca de país a cada 3 s; cinco trocas são um CICLO:

     batida 1 e 2 — enquadramento normal, a varredura de 0 a +16° de sempre;
     batida 3     — MERGULHA: a escala sobe a 1,8× ancorada no pino do país da
                    vez, e o giro deixa de GESTICULAR e passa a CENTRAR;
     batida 4 e 5 — SEGUE: a escala fica, e o planeta desliza de pino em pino
                    conforme o relógio troca de país;
     depois da 5  — VOLTA: a escala desfaz e a varredura retoma.

   São 15 s por ciclo e 5 batidas contra 7 países: os números são primos entre
   si, então o mergulho cai num país DIFERENTE a cada volta — em 35 s de tela
   ninguém vê o mesmo enquadramento duas vezes. Isso é de graça e é o que faz o
   efeito não virar rotina.

   O DISCO NÃO MUDA DE TAMANHO. NUNCA.

   É a frase que resume o desenho, e é o pedido do dono em 17/10: "faça o zoom
   se aplicar dentro do globo. contorne todo o globo com o zoom". O globo é uma
   VIGIA — um círculo de raio `g.raio` centrado em `(R, R)`, do tamanho que
   sempre teve — e o mergulho acontece atrás do vidro. Nenhum pixel do planeta
   aparece fora dessa circunferência em nenhum instante do ciclo.

   Isso tem três consequências mecânicas, e as três estão no código:
    · o recorte é CIRCULAR e fica FORA da matriz do zoom (`ctx.save()`, caminho
      do círculo fixo, `clip()`, só então a matriz). Dentro dela o recorte
      ampliaria junto e deixaria de ser vigia;
    · a CIRCUNFERÊNCIA é redesenhada por cima do recorte, em coordenadas da
      caixa: um corte seco deixa serrilha onde o terreno ampliado encosta na
      borda, e o fio de 1,5px no laranja de `.globe-air` a devolve limpa;
    · os PINOS são DOM e o canvas não os corta: eles desvanecem por opacidade
      antes de cruzar a borda, pela distância ao centro contra o raio.

   O QUE O GOOGLE MAPS FAZ, E QUE ESTÁ AQUI

   · PRIMEIRO O PAN, DEPOIS A ESCALA. O Maps nunca gira e amplia ao mesmo
     tempo: ele leva a câmera até o ponto e só então desce. Aqui é igual, e por
     uma razão medível — se o planeta ainda estiver viajando quando a escala
     cresce, o pino ANDA sob o dedo, e a âncora deixa de valer. São 1.300 ms de
     viagem e 900 ms de descida, 2,2 s dentro de uma batida de 3 s.
   · ÂNCORA. A escala acontece em torno do PINO, não do centro da caixa. Escalar
     por Z em torno de `a` é `p' = a + Z·(p − a)`, ou seja uma matriz de escala
     Z com translação `c = a − Z·a`. Como a âncora É o pino, a conta devolve
     `p' = p` para ele: o ponto focado fica matematicamente PARADO, não
     aproximadamente parado. O mesmo par (escala, translação) vai para o
     `translate3d` de cada pino — uma conta, duas camadas, e é isso que impede
     os pinos de descolarem do planeta.
   · ESCALA EXPONENCIAL. O zoom do Maps é potência de 2, não soma: interpola-se
     o LOGARITMO da escala. Entre 1× e 1,8×, `2^lerp(log2 1, log2 1,8, t)` é
     `1,8^t` — a forma fechada, uma exponenciação por quadro. É isso que faz a
     velocidade parecer constante ao olho: cada fração de segundo multiplica a
     escala pelo mesmo fator, em vez de somar o mesmo tanto.
   · EASING ASSIMÉTRICO. Entrar é mais rápido que sair. 900 ms na ida com
     `cubic-bezier(.22,.61,.36,1)` (ataque forte, chegada mansa — a curva de
     "se aproximar de algo") e 1.200 ms na volta com `cubic-bezier(.4,0,.2,1)`,
     que sai do lugar devagar e desacelera no fim: o Maps solta o zoom, não o
     arranca. Na volta a ORDEM também se inverte — a escala solta primeiro e o
     enquadramento desfaz 500 ms depois, que é como se recua de um lugar.
     Nada de `linear` e nada de salto: toda curva parte de ONDE o valor está.
   · APROXIMAR REVELA. Ampliar uma foto deixa tudo maior; aproximar um mapa
     mostra mais. Daí os dois corretores de espessura (ver `fio` e `grao`, no
     laço) e o dpr que sobe no mergulho.
   · A DERIVA CONTINUA. No zoom o planeta não congela: a varredura segue, com
     16% da amplitude (±1,3° em vez de ±8°). 16 e não 28 porque é medida: a
     promessa da âncora é o pino PARADO durante a descida, e ±2,2° davam 3,4px
     de caminhada nos 900 ms da escala — acima do teto de 2px. A ±1,3° são
     1,9px, e ainda são 13px de excursão a 1,8×: o planeta respira.

   O LIMITE DE 1,8× é a nuvem, não o gosto: os 5.102 pontos têm um passo médio
   de ~1,4° de arco, e a partir de ~2× o olho começa a ler a espiral de
   Fibonacci em vez da terra firme. A 1,8× o grão ainda lê como grão.
   -------------------------------------------------------------------------- */

/** Batidas por ciclo: 2 normais, 1 de mergulho, 2 de deslize. */
const CICLO = 5;
/** Escala do mergulho. Ver o limite da nuvem, acima. */
const ZOOM_MAX = 1.8;
/**
 * A VIAGEM até o país da vez, em ms. Uma por batida, e ela TERMINA: é curva de
 * tempo e não perseguição exponencial, de propósito. Uma perseguição nunca
 * chega — com a constante de 0,55 s que o enquadramento pediria, ainda sobram
 * 9% do caminho quando a escala começa a crescer, e 9% de uma viagem de 300px
 * são 27px de pino andando sob o dedo. Com uma curva de 1.300 ms o giro está
 * EXATAMENTE no alvo quando a descida começa, e assentou 1,7 s antes da batida
 * seguinte.
 */
const PAN_MS = 1300;
/** Ida e volta da escala, em ms: o Maps entra rápido e sai macio. */
const ZOOM_ENTRA_MS = 900;
const ZOOM_SAI_MS = 1200;
/** Na volta, quanto o enquadramento espera antes de desfazer. */
const ZOOM_SAI_ESPERA_MS = 500;
/** Quanto da varredura sobrevive no mergulho: 16% de 8° = ±1,3°. */
const ZOOM_DERIVA = 0.16;
/** Raio assentado do anel de alvo no pino focado, em px de tela. */
const ZOOM_ANEL = 22;

/* --------------------------------------------------------------------------
   OS SEIS RÓTULOS QUE SAEM DE CENA — E A ORDEM DO MERGULHO

   Eles saem PRIMEIRO, antes de o planeta se mover, e voltam POR ÚLTIMO, depois
   de ele estar de volta. A ordem não é estética, é a correção de dois defeitos
   medidos a 1512 de janela, onde o `<h1>` começa em x 841:

    · com o desvanecer amarrado à ESCALA, na volta os rótulos reacendiam com o
      planeta ainda a 1,23× e o mais a leste chegava a x 932 — 91px dentro da
      coluna de texto;
    · com ele amarrado ao começo da VIAGEM mas durando 700 ms, o rótulo de
      Lisboa chegou a x 866 com 15% de opacidade enquanto o planeta viajava
      para centralizar a Cidade do México: a viagem é de 1.300 ms e abre 57° de
      guinada, e 350 ms dela já deslocam o rótulo mais do que a folga.

   Daí a sequência inteira do mergulho, em 2.500 ms dentro de uma batida de
   3.000:  300 ms de rótulos saindo  →  1.300 ms de viagem  →  900 ms de
   escala. Com o planeta PARADO nos primeiros 300 ms, o deslocamento extra dos
   rótulos é zero por construção, e não por ajuste de número.
   Na volta: 1.200 ms de escala soltando → o enquadramento desfaz a partir dos
   500 ms → e os rótulos só reacendem aos 1.700 ms, quando tudo já voltou.
   -------------------------------------------------------------------------- */
const ROTULO_SAI_MS = 300;
const ROTULO_VOLTA_MS = 600;
/** Quanto a volta dos rótulos espera: aqui a escala E o enquadramento já voltaram. */
const ROTULO_ESPERA_MS = 1700;

/**
 * A VIGIA, para os pinos: a faixa de raio em que o rótulo desvanece, em fração
 * de R. É a MESMA faixa do limbo que já existia — a rampa de `z2` de 0,05 a
 * 0,30 é esta mesma, escrita em cosseno em vez de raio (`rad = √(1 − z2²)`), e
 * por isso em repouso nada muda. O que ela acrescenta é valer no espaço JÁ
 * ESCALADO: no mergulho o pino fora do foco sai do disco, e um rótulo
 * pendurado no vazio ao lado do planeta é pior que nenhum.
 */
const VIGIA_DENTRO = 0.954;
const VIGIA_FORA = 0.999;

/* --------------------------------------------------------------------------
   NO MERGULHO, O RÓTULO SÓ ACENDE QUANDO O PINO CHEGA AO MEIO

   É a terceira — e última — correção do mesmo defeito, e a única que é
   GEOMÉTRICA em vez de temporal. Com o desvanecer amarrado só ao tempo, na
   troca de país a 1,8× o rótulo do país que ENTRAVA subia de opacidade
   enquanto o pino dele ainda estava na periferia e o planeta vinha buscá-lo:
   medido, o rótulo de Lisboa acendeu a 13% com a borda direita em x 865, 24px
   dentro da coluna de texto.

   A regra que resolve é a do próprio enquadramento: no mergulho o rótulo
   pertence ao pino que o zoom está afirmando, e esse pino está no MEIO. Então a
   opacidade também é função do raio — cheia a até 34% de R do centro, zero a
   partir de 52%.

   Os dois números são medidos, e quem os fixa é o rótulo MAIS LARGO dos sete:
   "Transferência CVU / CBU · $ 38.000", 239px, abrindo para a direita. Com o
   pino a 34% de R (caixa de 665, R 332), a borda direita dele cai em x 798
   contra os 841 do `<h1>` — 43px de folga. A 52% ela chegaria a 858, e é por
   isso que lá a opacidade já é zero.

   De graça, isto também resolve o rótulo que SAI: ele se afasta do centro, o
   fator cai, e ele apaga por distância antes de poder viajar.
   -------------------------------------------------------------------------- */
const CHEGOU_DENTRO = 0.34;
const CHEGOU_FORA = 0.52;

/** O fio da circunferência, igual ao de `.globe-air` (globals.css). */
const BORDA_ALFA = 0.22;
const BORDA_FIO = 1.5;

/* --------------------------------------------------------------------------
   A ONDA DE ENTRADA (pedido do dono, 15/10)

   "Os pontos acendem numa onda de BAIXO PARA CIMA e depois voltam ao brilho
   normal." É uma linha horizontal — o front — que sobe do pé do planeta (y =
   2R, a base da caixa) até o topo (y = 0) em 1,1 s, na MESMA curva da
   coreografia do CSS. Abaixo dela o planeta já está pronto, no brilho de
   sempre; acima dela ainda não existe nada; e na faixa logo abaixo do front os
   pontos valem 1,8× de alfa — é a crista, o que faz a onda ser onda e não uma
   cortina subindo.

   Quem a arma é a classe `wone-entrando` do `<html>`, a mesma do CSS: com
   movimento reduzido ela não existe e o globo nasce no primeiro quadro completo,
   como antes. No celular também não há onda — lá o globo é textura a 40% atrás
   do aparelho, desenhado UMA vez, e 33 quadros de canvas na janela em que o
   `<h1>` está pintando é o tipo de gasto que o LCP mobile cobra.

   O reinício pela logo chega por `wone:entrada` (ver `SiteHeader`).
   -------------------------------------------------------------------------- */

/** Duração da travessia do front, em ms. Fecha com a escada do CSS (~1,2 s). */
const ONDA_MS = 1100;
/** Altura da crista, em fração do diâmetro. */
const ONDA_BANDA = 0.12;
/** Quanto a crista multiplica o alfa de cada balde. */
const ONDA_BRILHO = 1.8;

/**
 * `cubic-bezier(0.2, 0.7, 0.2, 1)` resolvida em JavaScript — a MESMA curva que
 * `--ent-ease` dá ao título, ao lead e ao aparelho em `globals.css`. Sem isto a
 * onda do canvas subiria numa curva e o texto em outra, e os dois movimentos
 * acontecem na mesma tela ao mesmo tempo.
 *
 * Quatro passos de Newton sobre x(t) e uma avaliação de y(t): são ~20 flops uma
 * vez por quadro (não por ponto), contra uma tabela pré-calculada que custaria
 * memória para a mesma resposta.
 */
function curva(p: number) {
  return cubica(p, 0.2, 0.7, 0.2, 1);
}

/**
 * `cubic-bezier(x1, y1, x2, y2)` resolvida em JavaScript, genérica.
 *
 * Era a conta de `curva()` com os quatro números inlinados; virou função
 * própria quando o mergulho de 17/10 passou a precisar de outras DUAS curvas (a
 * ida e a volta do zoom, deliberadamente diferentes). Três beziers com o mesmo
 * solver é uma verdade escrita uma vez; três solvers copiados seriam três
 * lugares para o próximo ajuste esquecer um.
 *
 * Quatro passos de Newton sobre x(t) e uma avaliação de y(t) — ~20 flops, uma
 * vez por quadro por curva, não por ponto. A derivada é a de
 * `x(t) = 3u²t·x1 + 3ut²·x2 + t³`, escrita na forma de Bernstein para não
 * precisar expandir o polinômio.
 */
function cubica(p: number, x1: number, y1: number, x2: number, y2: number) {
  let t = p;
  for (let i = 0; i < 4; i += 1) {
    const u = 1 - t;
    const x = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
    const dx = 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (dx < 1e-5) break;
    t -= (x - p) / dx;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  }
  const u = 1 - t;
  return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
}

/**
 * Diferença de ângulo pelo CAMINHO CURTO, em (−π, π].
 *
 * Com os alvos de hoje — as sete capitais caem entre −22,7° e +61,9° de
 * centralização — ela nunca muda nada: nenhuma diferença chega perto de 180°.
 * Ela existe pelo dia em que um país novo entrar do outro lado do meridiano de
 * origem: sem isto, a viagem de 350° seria preferida à de 10°, e o planeta
 * daria a volta pelo lado errado na frente de quem está lendo.
 */
function curto(d: number) {
  return d - TAU * Math.round(d / TAU);
}

/**
 * Alfa e cor de cada balde: 6 níveis de terra (braseiro → laranja), 1 de costa
 * e 3 dos países em creme. São dez `fill` por quadro, não um por ponto.
 *
 * O laranja pede mais alfa que o creme pedia para a mesma presença: a 0,42 o
 * creme sobre o preto dá um cinza de luminância ~0,42, e o #FF7700 dá ~0,25.
 * Os países sobem até 0,86 porque é deles que o olho precisa sair com a
 * informação.
 *
 * A RAMPA DA TERRA SUBIU EM 17/10, a pedido do dono ("clarear mais o globo, em
 * específico os continentes"): de 0,05–0,52 para 0,09–0,70. O degrau entre os
 * níveis cresceu junto (era ~0,094, agora ~0,12), e isso é de propósito — com o
 * planeta mais aceso, um degrau pequeno demais empastaria o relevo que a luz
 * de cima-à-esquerda desenha. O PISO subiu quase o dobro porque é ele que
 * decide se a terra no lado escuro EXISTE: a 0,05 o continente sumia antes do
 * limbo e a silhueta do planeta se desfazia.
 *
 * O mar, a costa e os países NÃO mudaram: o pedido era dos continentes, e
 * subir o resto junto só devolveria o mesmo contraste de antes, mais claro. */
const ALFA = [0.09, 0.21, 0.33, 0.45, 0.57, 0.7, 0.56, 0.26, 0.5, 0.86];
const COR = [...TERRA, COSTA, PAIS_BORDA, PAIS_BORDA, PAIS_NUCLEO];
/** Quantos baldes o laço percorre. */
const BALDES = ALFA.length;

type Nuvem = {
  /** Vetores na base da projeção, prontos para girar. */
  bx: Float32Array;
  by: Float32Array;
  bz: Float32Array;
  /** Raio base do ponto (fleck + costa), antes do fator de luz. */
  rb: Float32Array;
  /** Parcela de alfa que a costa acrescenta. */
  ac: Float32Array;
  /** Força do tingimento, 0 fora dos quatro países. */
  tingimento: Float32Array;
  /** Índice do país tingido, ou 255 (nenhum). Só vale com `tingimento > 0`. */
  pais: Uint8Array;
};

/**
 * Monta a nuvem a partir dos deltas de `globeDots.ts`.
 *
 * Os deltas são os índices dos candidatos da espiral que caíram em terra; para
 * cada um se refaz lat/lon (`amostra`), a rotação de base (`baseVector`) e as
 * duas constantes do desenho. O tingimento dos quatro países também sai daqui,
 * uma vez — não por quadro.
 */
function monta(codes: string[]): Nuvem {
  /* Os pontos da espiral principal MAIS os da espiral europeia, numa nuvem
     so: o laco de desenho nao sabe de onde cada ponto veio, e nao precisa. */
  const n = GLOBE_COUNT + GLOBE_EU_COUNT;
  const nuvem: Nuvem = {
    bx: new Float32Array(n),
    by: new Float32Array(n),
    bz: new Float32Array(n),
    rb: new Float32Array(n),
    ac: new Float32Array(n),
    tingimento: new Float32Array(n),
    pais: new Uint8Array(n),
  };
  /* 255 e "nenhum pais", e nao 0: desde que a Europa inteira ganhou tingimento
     permanente, um ponto tingido PODE nao pertencer a capital nenhuma — e com
     o zero padrao a Franca inteira acenderia junto com o Brasil, que e o indice
     0 da lista. */
  nuvem.pais.fill(255);

  const alvos = codes.map((code) => {
    const lugar = CAPITAIS[code] ?? { lat: 0, lon: 0 };
    return baseVector(lugar.lat, lugar.lon);
  });

  const deltas = atob(GLOBE_DELTAS);
  const costas = atob(GLOBE_COAST);
  let indice = -1;
  let acumulado = 0;
  let k = 0;

  for (let p = 0; p < deltas.length; p += 1) {
    const byte = deltas.charCodeAt(p);
    /* 255 é escape: soma e continua (o maior vão do Pacífico tem 678). */
    if (byte === 255) {
      acumulado += 255;
      continue;
    }
    indice += acumulado + byte;
    acumulado = 0;
    if (k >= n) break;

    const { lat, lon } = amostra(indice);
    const [x, y, z] = baseVector(lat, lon);
    nuvem.bx[k] = x;
    nuvem.by[k] = y;
    nuvem.bz[k] = z;

    const costa = (costas.charCodeAt(k >> 3) >> (7 - (k & 7))) & 1;
    const fleck = noise(indice + 0.25);
    nuvem.rb[k] = 1.15 * (0.86 + 0.3 * fleck + 0.18 * costa);
    nuvem.ac[k] = 0.12 * costa;

    tinge(nuvem, k, x, y, z, alvos, naEuropa(lat, lon));
    k += 1;
  }

  /* A SEGUNDA ESPIRAL, só da Europa: os mesmos passos, com o número de
     candidatos dela. Entram no fim da nuvem, e o laço de desenho os trata como
     todos os outros — o que os distingue é o tingimento, logo abaixo. Sem
     bitmap de costa aqui: o litoral europeu já sai claro pelo tingimento, e um
     segundo bitmap custaria mais bytes do que o efeito vale. */
  const deltasEu = atob(GLOBE_EU_DELTAS);
  let indiceEu = -1;
  acumulado = 0;

  for (let p = 0; p < deltasEu.length; p += 1) {
    const byte = deltasEu.charCodeAt(p);
    if (byte === 255) {
      acumulado += 255;
      continue;
    }
    indiceEu += acumulado + byte;
    acumulado = 0;
    if (k >= n) break;

    const { lat, lon } = amostra(indiceEu, GLOBE_EU_SAMPLES);
    const [x, y, z] = baseVector(lat, lon);
    nuvem.bx[k] = x;
    nuvem.by[k] = y;
    nuvem.bz[k] = z;
    nuvem.rb[k] = 1.15 * (0.86 + 0.3 * noise(indiceEu + 0.25));
    nuvem.ac[k] = 0;
    tinge(nuvem, k, x, y, z, alvos, true);
    k += 1;
  }

  return nuvem;
}

/**
 * O tingimento de um ponto: creme no lugar do laranja da terra.
 *
 * Duas origens, e a mais forte vence:
 *
 *  - as CAPITAIS, como sempre: 1 dentro de 500 km, caindo por smoothstep até 0
 *    em 1.100 km (o produto escalar já é o cosseno da distância angular). O
 *    ponto guarda de qual das sete ele é, e o país da vez ganha meio passo a
 *    mais de brilho no laço de desenho;
 *  - a EUROPA inteira, desde 15/10: 0,78 fixo em toda a janela do continente,
 *    sem raio e sem queda. É o pedido do dono — "melhore a visibilidade dos
 *    países do continente europeu" —, e um halo em volta de Lisboa e de
 *    Londres não resolveria: o que precisa aparecer é o CONTINENTE, com Espanha,
 *    França, Itália e Alemanha dentro. 0,78 cai no balde do creme quente
 *    (#FFE2B8, alfa 0,5 contra os 0,33 médios da terra laranja) e os pontos
 *    ganham os mesmos 18% de raio dos países acesos.
 */
function tinge(
  nuvem: Nuvem,
  k: number,
  x: number,
  y: number,
  z: number,
  alvos: [number, number, number][],
  europa: boolean,
) {
  if (europa) nuvem.tingimento[k] = 0.78;

  for (let j = 0; j < alvos.length; j += 1) {
    const d = x * alvos[j][0] + y * alvos[j][1] + z * alvos[j][2];
    if (d < Math.cos(BORDA)) continue;
    const ang = Math.acos(Math.min(1, d));
    const u = 1 - Math.min(1, Math.max(0, (ang - NUCLEO) / (BORDA - NUCLEO)));
    const t = u * u * (3 - 2 * u);
    if (t > nuvem.tingimento[k]) {
      nuvem.tingimento[k] = t;
      nuvem.pais[k] = j;
    }
  }
}

type Geometria = {
  /** Lado da caixa, em px de CSS (o globo é quadrado: lado = 2R). */
  lado: number;
  raio: number;
  /**
   * Densidade de pixels do canvas. Era local de `mede()`, e subiu para cá
   * quando o mergulho passou a reescrever a matriz do contexto A CADA QUADRO:
   * a escala do zoom MULTIPLICA a do dpr, e as duas têm de sair do mesmo lugar
   * ou o planeta desenharia no dobro do tamanho num monitor retina.
   */
  dpr: number;
  /** Deslocamento da caixa dentro do palco, para o arco. */
  esquerda: number;
  topo: number;
  /** 1 no desktop, 2 no celular (metade da nuvem). */
  salto: number;
  /** Multiplicador global de alfa: 0,40 no celular, onde o globo é textura. */
  ganho: number;
  /** Posição de repouso de cada pino, em px da caixa. */
  repouso: { x: number; y: number }[];
};

export function HeroGlobe({
  pins,
  activeIndex,
  animated,
  running,
  alvoRef,
}: {
  /** Na ordem de `payments.table.countries` — sete desde 15/10. */
  pins: { code: string; city: string; chip: string }[];
  activeIndex: number;
  /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
  animated: boolean;
  /** Os quatro freios do relógio do `Hero`, já combinados. */
  running: boolean;
  /** O nó em que o arco termina: o ticket do palco (ver `HeroTicket`). */
  alvoRef?: RefObject<HTMLElement | null>;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  /**
   * As duas peças de CSS que o mergulho mexe: o limbo, que ESCALA com o planeta
   * (ele é o sombreado da esfera, e sombreado parado sobre terra que corre é o
   * defeito clássico de um zoom de imagem), e a marca da Wone, que DISSOLVE (um
   * logotipo de 83% do diâmetro cortado pela vigia seria um borrão).
   * As duas continuam pintadas pelo servidor e continuam custando zero por
   * quadro fora do mergulho: o laço só escreve nelas quando `zoom > 0`.
   */
  const limbo = useRef<HTMLSpanElement>(null);
  const marca = useRef<HTMLSpanElement>(null);
  const alfinetes = useRef<(HTMLSpanElement | null)[]>([]);
  const nuvem = useRef<Nuvem | null>(null);
  const geo = useRef<Geometria | null>(null);
  /** Ângulos do último quadro: o arco congela a posição do pino na ativação. */
  const angulo = useRef({ yaw: 0, pitch: 0 });
  const ativo = useRef(activeIndex);
  /**
   * Instante em que o país da vez acendeu: é o relógio do flash da rede, do
   * cometa e do pulso do pino.
   *
   * Nasce em −1e9, e não em 0 ou em `performance.now()`: com 0 a conta
   * `now - acendeuEm` daria o tempo de vida da PÁGINA, que numa carga rápida
   * cabe dentro dos 600 ms do pulso — e o pino piscaria na entrada, que é
   * justamente o que a regra do hero proíbe. Com −1e9 nada dispara antes da
   * primeira troca de verdade.
   */
  const acendeuEm = useRef(-1e9);
  /**
   * Quantas vezes o relógio do hero já trocou de país. É o CONTADOR DE BATIDAS
   * do ciclo de cinco (ver `CICLO`), e ele vive aqui e não no `Hero` de
   * propósito: o `Hero` já expõe o país da vez (`activeIndex`), e o número de
   * trocas é derivável dele sem uma segunda fonte de verdade — contá-lo lá
   * significaria duas peças guardando o mesmo fato, que é como elas divergem.
   *
   * Nasce em 0, que vale "nenhuma troca ainda": na primeira tela o ciclo não
   * começou, e nada pode mergulhar antes de o relógio andar.
   */
  const batidas = useRef(0);

  /** O arco do pino até o aparelho. `null` até o relógio trocar de país. */
  const [arco, setArco] = useState<{ code: string; d: string } | null>(null);
  const primeiraVolta = useRef(true);

  /**
   * A onda de entrada: `ondaT0` é o instante em que o front saiu do pé do
   * planeta (`null` = não há onda, brilho normal), e `ondaPendente` é o que
   * garante que ela seja armada UMA vez por entrada — o efeito de desenho se
   * refaz a cada troca de país e a cada mudança de largura, e nenhuma dessas
   * coisas é uma entrada.
   */
  const ondaT0 = useRef<number | null>(null);
  const ondaPendente = useRef(true);
  /** Sobe a cada `wone:entrada` só para refazer o efeito de desenho. */
  const [entrada, setEntrada] = useState(0);

  /* O reinício pela logo (ver `SiteHeader`): a classe do `<html>` já voltou, as
     animações de CSS já recomeçaram, e o globo refaz a onda. O relógio do hero
     NÃO reinicia — o país da vez continua de onde estava. */
  useEffect(() => {
    const refaz = () => {
      ondaPendente.current = true;
      setEntrada((n) => n + 1);
    };
    document.addEventListener("wone:entrada", refaz);
    return () => document.removeEventListener("wone:entrada", refaz);
  }, []);

  /**
   * Dois modos, por largura: o celular e o laço.
   *
   * Havia um terceiro — `parado`, entre 1024 e 1279 —, e ele existia por causa
   * de um objeto que já não está no hero. O globo dividia a primeira dobra com
   * um telefone de 300px; a 1024 o corredor entre a moldura dele e a borda da
   * janela tinha 223px, e a excursão do balanço mais o recuo punha o pino do
   * México ATRÁS do aparelho. O telefone saiu do hero em 15/10 (pedido da
   * diretoria), o corredor passou a ser a tela inteira, e congelar o planeta
   * naquela faixa virou uma regra sem motivo — justamente a faixa do tablet,
   * onde o dono pediu que ele girasse como em todo lugar (16/10).
   *
   * De `lg` para cima, então, o laço roda. Abaixo disso continua o modo
   * `celular`: lá o globo é um bloco em fluxo depois dos botões, e o que
   * importa é não gastar bateria desenhando um planeta que já se leu.
   */
  const [modo, setModo] = useState<"celular" | "parado" | "laco">("parado");

  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const sync = () => setModo(lg.matches ? "laco" : "celular");
    sync();
    lg.addEventListener("change", sync);
    return () => {
      lg.removeEventListener("change", sync);
    };
  }, []);

  /* O país da vez vai para um `ref`: o laço lê a cada quadro sem se refazer.
     O carimbo de hora vai junto, e é o relógio do flash da rede: a perna que
     chega a Lisboa ou a Londres acende em laranja cheio por 1 s a partir daqui. */
  useEffect(() => {
    /* A comparação não é zelo: na montagem (e na remontagem dupla do modo
       estrito, em desenvolvimento) o país não mudou — ele apenas começou a
       existir. Carimbar a hora ali acenderia cometa e pulso na primeira tela. */
    if (ativo.current === activeIndex) return;
    ativo.current = activeIndex;
    acendeuEm.current = performance.now();
    /* A batida conta TROCAS, não renders: é o mesmo evento que acende o cometa,
       e por isso o ciclo do mergulho nunca pode discordar de onde a bolinha
       está. */
    batidas.current += 1;
  }, [activeIndex]);

  /**
   * Fora do laço, o efeito de desenho precisa se refazer na troca de país —
   * é o único jeito de o tingimento novo entrar, e custa um quadro a cada 5 s.
   * Dentro do laço a chave é constante: quem lê o país é o `ref` acima.
   */
  const trocaParada = modo === "laco" ? "" : String(activeIndex);

  /* Listas de trabalho do desenho, alocadas uma vez: posição, raio e balde de
     cada ponto visível. Reusar é o que mantém o laço sem lixo para coletar. */
  const buffers = useRef({
    x: new Float32Array(GLOBE_COUNT + GLOBE_EU_COUNT),
    y: new Float32Array(GLOBE_COUNT + GLOBE_EU_COUNT),
    r: new Float32Array(GLOBE_COUNT + GLOBE_EU_COUNT),
    b: new Uint8Array(GLOBE_COUNT + GLOBE_EU_COUNT),
  });

  const codes = pins.map((pin) => pin.code).join(",");

  useEffect(() => {
    const box = caixa.current;
    const canvas = tela.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lista = codes.split(",");
    if (!nuvem.current) nuvem.current = monta(lista);
    const dados = nuvem.current;
    const trab = buffers.current;

    /** Celular: nuvem pela metade, dpr 1, sem pino e sem laço. */
    const celular = modo === "celular";
    /**
     * O laço está de pé? É a condição do movimento que depende de TEMPO — o
     * flash da rede, o cometa e o pulso do pino. Fora dela o globo é um quadro
     * parado, e o que não pode animar não anima: nada de meia volta congelada
     * na tela quando o dono aperta "pausar".
     */
    const emLaco = modo === "laco" && running;

    /* --------------------------------------------------------------- o zoom
       O ESTADO DO MERGULHO, em variáveis do laço e não em `ref`: ele é
       inteiramente um fato de ANIMAÇÃO, e o que o lê é só o desenho.

       Eles nascem em 0 a cada montagem do laço, e isso é escolha: quando um dos
       freios do relógio é puxado no meio de um mergulho (aba oculta, hero fora
       da tela, "pausar"), o globo volta a desenhar o quadro PARADO, que é o do
       enquadramento normal — o mesmo em que o servidor o pintou. Ninguém vê o
       salto, porque os três freios acontecem fora da vista; e quando o relógio
       volta, o ciclo retoma de onde o contador de batidas está.

       SÃO DOIS NÚMEROS, e separá-los é o que faz o pan vir antes da escala:
         · `enquadra` — o ENQUADRAMENTO, 0 = gesto discreto, 1 = país centrado.
           Manda no alvo do giro e na amplitude da varredura;
         · `zoom` — a ESCALA, 0 = 1×, 1 = 1,8×. Manda na matriz do canvas, nos
           corretores de espessura, no dpr e no anel de alvo.
       Na ida o primeiro sobe e, quando termina, o segundo começa; na volta o
       segundo desce e o primeiro o segue 500 ms depois. Nenhum `if` entre os
       regimes em lugar nenhum: tudo o que o mergulho muda é função de um
       destes dois fatores. */
    let zoom = 0;
    let enquadra = 0;
    /** Para onde as curvas vão (0 ou 1), quando viraram e de onde partiram. */
    let zoomQuer = 0;
    let zoomT0 = -1e9;
    let zoomDe = 0;
    let enqDe = 0;
    /** Escala do quadro e a translação que a ancora no pino (ver `desenha`). */
    let escala = 1;
    let ancX = 0;
    let ancY = 0;
    /**
     * A viagem do giro: de onde ela partiu, quando, e para qual país. Uma nova
     * começa a cada troca de país e a cada virada de regime — sempre do valor
     * em que o giro ESTÁ, que é o que garante que nada salte.
     */
    let panT0 = -1e9;
    let panDeYaw = 0;
    let panDePitch = 0;
    let panCode = "";
    let panQuer = 0;
    /** 1 = os sete rótulos; 0 = só o do país focado. Ver `ROTULO_SAI_MS`. */
    let rotulos = 1;
    /**
     * Dois corretores de espessura, e eles são o que separa ZOOM de AMPLIAÇÃO.
     *
     * Escalar o contexto por 1,8 engrossa tudo por 1,8: os fios da grade viram
     * traços de 1,8px e o grão da terra firme cresce junto com o espaçamento
     * dele — o planeta ficaria do mesmo jeito, só maior, que é o que um zoom de
     * IMAGEM faz. O zoom de um mapa faz o contrário: aproximar REVELA.
     *   · `fio` = 1/Z devolve os fios à espessura de 1px de tela. A página tem
     *     uma escala de fios (hairlines), e ela não muda porque a câmera chegou
     *     perto;
     *   · `grao` = Z^−0,4 engrossa o ponto por MENOS que a escala: a 1,8× o
     *     grão cresce 1,27 enquanto o espaçamento cresce 1,8, então os vãos
     *     entre os pontos ABREM e a nuvem passa a ler como nuvem — a costa fica
     *     nítida e a terra ganha textura em vez de empastar.
     *     O expoente era 0,5 (a raiz) na primeira versão, e a captura do pico
     *     do zoom mostrou que era demais: com o grão a 0,745 do tamanho e o
     *     espaçamento a 1,8, a terra firme ficava RALA em vez de aberta. A 0,4 o
     *     ponto é 9% maior e os vãos continuam abertos.
     */
    let fio = 1;
    let grao = 1;
    /**
     * Foco suavizado de cada pino: 1 no país da vez, 0 nos outros, perseguido
     * com a mesma constante de tempo do giro. É ele que faz o DESLIZE de pino
     * em pino das batidas 4 e 5 ser uma passagem e não um corte — o rótulo que
     * perde o foco desvanece enquanto o novo acende, os dois no mesmo gesto.
     */
    const focos = new Float32Array(lista.length);
    focos[ativo.current] = 1;
    /** Último valor de destaque escrito no DOM, por pino. 2 = ainda não sei. */
    const destacado = new Uint8Array(lista.length).fill(2);

    /* Arma a onda — uma vez por entrada, e só onde ela cabe.
       Quem diz se é celular aqui é o `matchMedia`, e NÃO o `modo`: `modo` nasce
       "parado" nos dois lados (ele só pode olhar a largura dentro de um efeito,
       ou o HTML do servidor divergiria do primeiro render), então no primeiro
       desenho de um celular ele ainda diz "parado". Medido a 412×915: a onda
       acendia no celular, que é justamente onde ela não deve existir — 33
       quadros de canvas disputando a pintura do `<h1>`, que é o LCP de lá. */
    if (ondaPendente.current) {
      ondaPendente.current = false;
      ondaT0.current =
        window.matchMedia("(min-width: 1024px)").matches &&
        document.documentElement.classList.contains("wone-entrando")
          ? performance.now()
          : null;
    }

    /** 0 → 1 enquanto o front sobe; 1 (acabou) quando não há onda. */
    const progresso = () =>
      ondaT0.current === null
        ? 1
        : Math.min(1, (performance.now() - ondaT0.current) / ONDA_MS);

    /**
     * O TETO DE DENSIDADE DE PIXELS, e ele SOBE NO MERGULHO.
     *
     * Em repouso são os 1,5 de sempre: é o ponto em que 5.102 pontos a 30 fps
     * param de ficar mais nítidos e só ficam mais caros.
     * No mergulho o quadro é peça de vitrine e a conta muda: os fios passam a
     * ser desenhados com `1/Z` de espessura (ver `fio`), ou seja 0,56px de CSS
     * a 1,8× — que a 1,5 de dpr dão 0,83px de DISPOSITIVO, abaixo de um pixel,
     * onde a grade vira um cinza lavado em vez de um fio. 1,4× de supersampling
     * sobre o nativo (teto 2) devolve-os a ~1,1px de dispositivo e recupera a
     * borda dos pontos junto.
     *
     * O custo é real — a área rasterizada cresce 1,96× — e por isso ele é
     * pago SÓ no mergulho, e medido: ver o `pior` do medidor.
     */
    const dprDe = (z: number) => {
      if (celular) return 1;
      const nativo = window.devicePixelRatio || 1;
      return z > 0.02 ? Math.min(nativo * 1.4, 2) : Math.min(nativo, 1.5);
    };

    function mede(dpr = dprDe(zoom)) {
      const lado = box!.clientWidth;
      canvas!.width = Math.round(lado * dpr);
      canvas!.height = Math.round(lado * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      geo.current = {
        lado,
        raio: lado / 2,
        dpr,
        esquerda: box!.offsetLeft,
        topo: box!.offsetTop,
        salto: celular ? 2 : 1,
        /* 0,85 no celular, e eram 0,4: lá o globo era TEXTURA atrás do
           telefone, e precisava apagar para o chat ficar legível por cima. Com
           o aparelho fora do hero (15/10) ele passou a ser a figura da seção —
           um planeta a 40% de alfa, sozinho num bloco de 420px, lia como
           imagem meio carregada. Continua um degrau abaixo do desktop porque
           ali ele desenha metade dos pontos (`salto: 2`), e o mesmo alfa com
           metade da densidade ficaria mais ralo, não mais claro. */
        ganho: celular ? 0.85 : 1,
        repouso: lista.map((code) => {
          const p = REPOUSO[code];
          return {
            x: (parseFloat(p?.left ?? "50") / 100) * lado,
            y: (parseFloat(p?.top ?? "50") / 100) * lado,
          };
        }),
      };
    }

    /** Equador, dois paralelos e seis meridianos, no limite do visível. */
    function grade(cy: number, sy: number, cp: number, sp: number) {
      const g = geo.current!;
      const R = g.raio;

      const linha = (
        pontos: [number, number][],
        forte: boolean,
        forca = 1,
      ) => {
        ctx!.beginPath();
        let caneta = false;
        for (const [lat, lon] of pontos) {
          const [x, y, z] = baseVector(lat, lon);
          const x1 = cy * x + sy * z;
          const z1 = -sy * x + cy * z;
          const y2 = cp * y - sp * z1;
          const z2 = sp * y + cp * z1;
          if (z2 <= 0) {
            caneta = false;
            continue;
          }
          const sx = R + x1 * R;
          const sv = R - y2 * R;
          if (caneta) ctx!.lineTo(sx, sv);
          else ctx!.moveTo(sx, sv);
          caneta = true;
        }
        ctx!.globalAlpha = (forte ? 0.09 : 0.06) * forca * g.ganho;
        ctx!.strokeStyle = LARANJA;
        /* `fio` mantém a grade em 1px DE TELA dentro do mergulho: ver o
           comentário dos dois corretores de espessura, acima. */
        ctx!.lineWidth = fio;
        ctx!.stroke();
      };

      const meridiano = (lon: number, forca: number) => {
        const pontos: [number, number][] = [];
        for (let s = 0; s <= 48; s += 1)
          pontos.push([-80 + (160 * s) / 48, lon]);
        linha(pontos, false, forca);
      };
      const paralelo = (lat: number, forte: boolean, forca: number) => {
        const pontos: [number, number][] = [];
        for (let s = 0; s <= 48; s += 1)
          pontos.push([lat, -72 - 90 + (180 * s) / 48]);
        linha(pontos, forte, forca);
      };

      for (let m = -2; m <= 3; m += 1) meridiano(-72 + m * 30, 1);
      for (const lat of [0, 30, -30]) paralelo(lat, lat === 0, 1);

      /* APROXIMAR TEM DE REVELAR, e a grade é onde isso se lê primeiro: é o
         que todo mapa faz quando se chega perto — os fios de 30° ganham
         INTERMEDIÁRIOS de 15°, que não existiam. Eles entram pelo `zoom`, então
         nascem invisíveis e nunca piscam; a 1,8× a malha tem o dobro da
         resolução que tinha, no mesmo laranja e na mesma espessura de tela.
         Dez linhas a mais, e só enquanto o mergulho está de pé. */
      if (zoom > 0.01) {
        for (let m = -2; m <= 3; m += 1) meridiano(-72 + m * 30 + 15, zoom);
        for (const lat of [15, -15, 45, -45]) paralelo(lat, false, zoom);
      }
    }

    /**
     * A REDE: as quatro pernas que ligam as capitais onde a Wone cobra.
     *
     * É ESTÁTICA — quem viaja é o arco do pino até o aparelho, e dois
     * movimentos no mesmo gesto brigariam. Cada perna é o grande-círculo entre
     * duas capitais, erguido 3,5% do raio no meio do caminho e nada nas pontas,
     * o que a solta do chão sem desgrudar do pino. Os pontos já nascem na base
     * da projeção (`rede()`, uma vez); aqui só se gira, projeta e traça — um
     * `stroke` para as quatro.
     */
    function malha(
      cy: number,
      sy: number,
      cp: number,
      sp: number,
      desde: number,
    ) {
      const g = geo.current!;
      const R = g.raio;
      const pts = rede();
      const n = REDE_PASSOS + 1;

      /** Gira e projeta um vetor da base. `z2 <= 0` é o outro lado da bola. */
      const projeta = (x: number, y: number, z: number) => {
        const x1 = cy * x + sy * z;
        const z1 = -sy * x + cy * z;
        const y2 = cp * y - sp * z1;
        const z2 = sp * y + cp * z1;
        return { sx: R + x1 * R, sv: R - y2 * R, z2 };
      };

      /** Traça as pernas que passam no filtro, numa cor e num alfa só. */
      const traca = (
        passa: (perna: [string, string], p: number) => boolean,
        alfa: number,
        largura = 1,
      ) => {
        let desenhou = false;
        ctx!.beginPath();
        for (let p = 0; p < REDE_PERNAS.length; p += 1) {
          if (!passa(REDE_PERNAS[p], p)) continue;
          desenhou = true;
          let caneta = false;
          for (let s = 0; s < n; s += 1) {
            const i = (p * n + s) * 3;
            const x = pts[i];
            const y = pts[i + 1];
            const z = pts[i + 2];
            const x1 = cy * x + sy * z;
            const z1 = -sy * x + cy * z;
            const y2 = cp * y - sp * z1;
            const z2 = sp * y + cp * z1;
            if (z2 <= 0) {
              caneta = false;
              continue;
            }
            const sx = R + x1 * R;
            const sv = R - y2 * R;
            if (caneta) ctx!.lineTo(sx, sv);
            else ctx!.moveTo(sx, sv);
            caneta = true;
          }
        }
        if (!desenhou) return;
        ctx!.globalAlpha = Math.min(1, alfa) * g.ganho;
        ctx!.strokeStyle = LARANJA;
        ctx!.lineWidth = largura * fio;
        ctx!.stroke();
      };

      /* TRÊS FORÇAS, e é o pedido do dono de 15/10: "quando um ponto ligar no
         outro, mostre mais os países do continente europeu". A perna que chega
         à Europa precisa ser vista para o olho ir até lá.
           · 0,14 — as pernas das Américas, como sempre;
           · 0,30 — as que tocam Lisboa ou Londres, sempre;
           · até 1,0 — a perna do país ATIVO, quando ele é Portugal ou Reino
             Unido, por 1 s depois da troca, em laranja cheio e 1,5px.
         O flash só existe no modo de laço (xl para cima): abaixo disso o globo
         é redesenhado uma vez por troca de país, e uma animação de 1 s num
         quadro só seria um piscar aleatório. */
      const ativoCode = lista[ativo.current] ?? "";
      const europeuAtivo = EUROPEUS.has(ativoCode);
      const flash =
        europeuAtivo && emLaco && desde < FLASH_MS ? 1 - desde / FLASH_MS : 0;
      const naPerna = (perna: [string, string]) =>
        perna[0] === ativoCode || perna[1] === ativoCode;
      const tocaEuropa = (perna: [string, string]) =>
        EUROPEUS.has(perna[0]) || EUROPEUS.has(perna[1]);
      const acesa = (perna: [string, string]) =>
        flash > 0 && europeuAtivo && naPerna(perna);

      traca((perna) => !tocaEuropa(perna) && !acesa(perna), 0.14);
      traca((perna) => tocaEuropa(perna) && !acesa(perna), 0.3);
      if (flash > 0) traca(acesa, 0.3 + 0.7 * flash, 1.5);

      /* O COMETA. A perna é a que SAI do país da vez — e cada um dos sete
         aparece exatamente uma vez como origem no anel, então a escolha é
         determinística: um país, um destino, sem sorteio.
         A cabeça anda de ponta a ponta em 1,4 s, e atrás dela vêm três pontos
         nas posições de 1, 2 e 3 quadros antes (0,028 da perna cada, que é o
         que a cabeça anda num quadro de 30 fps). São quatro `fill` de um arco:
         o custo é o mesmo de quatro pontos da nuvem, que tem 5.102.
         A interpolação é LINEAR entre dois pontos vizinhos da polilinha que já
         está montada — não se refaz grande-círculo nenhum por quadro. */
      if (!emLaco || desde >= COMETA_MS) return;
      const perna = REDE_PERNAS.findIndex(([de]) => de === ativoCode);
      if (perna < 0) return;

      const avanco = desde / COMETA_MS;
      /* Some no fim do trajeto em vez de apagar de repente. */
      const vida = 1 - avanco * avanco;
      for (let q = 0; q < COMETA_CAUDA; q += 1) {
        const u = avanco - q * COMETA_PASSO;
        if (u < 0) continue;
        const f = u * REDE_PASSOS;
        const s0 = Math.min(REDE_PASSOS, f | 0);
        const s1 = Math.min(REDE_PASSOS, s0 + 1);
        const w = f - s0;
        const i0 = (perna * n + s0) * 3;
        const i1 = (perna * n + s1) * 3;
        const p = projeta(
          pts[i0] + (pts[i1] - pts[i0]) * w,
          pts[i0 + 1] + (pts[i1 + 1] - pts[i0 + 1]) * w,
          pts[i0 + 2] + (pts[i1 + 2] - pts[i0 + 2]) * w,
        );
        if (p.z2 <= 0) continue;
        const cauda = 1 - q / COMETA_CAUDA;
        ctx!.beginPath();
        /* A bolinha engrossa pela RAIZ da escala, como o grão da terra: no
           mergulho ela continua sendo um cometa, e não uma bola de gude. */
        ctx!.arc(p.sx, p.sv, (0.9 + 1.5 * cauda) * cauda * grao, 0, TAU);
        ctx!.globalAlpha = Math.min(1, 0.95 * cauda * cauda * vida) * g.ganho;
        /* Creme na cabeça, como o pino: é o mesmo gesto chegando. */
        ctx!.fillStyle = q === 0 ? PAIS_NUCLEO : COSTA;
        ctx!.fill();
      }
    }

    /**
     * A TRAMA DO MAR: a espiral esparsa de `mar()`, girada e projetada como os
     * outros pontos, num `fill` só. Sem balde e sem cor própria — o que cai
     * para o limbo é o RAIO, pelo mesmo fator de volume da terra firme (o
     * desenho de um ponto de 1,2px a 0,6px perde três quartos da área, e a
     * suavização faz o resto do trabalho de alfa).
     */
    function trama(cy: number, sy: number, cp: number, sp: number) {
      const g = geo.current!;
      const R = g.raio;

      /** Uma espiral de mar, girada e projetada, num `fill` só. */
      const tece = (pts: Float32Array, total: number, alfa: number) => {
        ctx!.beginPath();
        for (let i = 0; i < total; i += g.salto) {
          const x = pts[i * 3];
          const y = pts[i * 3 + 1];
          const z = pts[i * 3 + 2];
          const x1 = cy * x + sy * z;
          const z1 = -sy * x + cy * z;
          const y2 = cp * y - sp * z1;
          const z2 = sp * y + cp * z1;
          if (z2 <= 0.06) continue;
          const r = 1.15 * (0.52 + 0.48 * z2) * grao;
          const sx = R + x1 * R;
          const sv = R - y2 * R;
          ctx!.moveTo(sx + r, sv);
          ctx!.arc(sx, sv, r, 0, TAU);
        }
        ctx!.globalAlpha = alfa * g.ganho;
        ctx!.fillStyle = LARANJA;
        ctx!.fill();
      };

      /* 0,07 e não 0,10: a 0,10 a trama disputava com os continentes, que são
         do MESMO laranja — o mar lia como terra rala. Ela tem de estar lá
         quando se procura e sumir quando se lê o mapa. */
      tece(mar(), MAR_PONTOS, 0.07);

      /* A SEGUNDA TRAMA, só no mergulho. A 1,8× os 900 pontos do mar se espalham
         por 3,24 vezes a área e o oceano fica VAZIO — aproximar estava tirando
         textura em vez de dar, que é o oposto do que um mapa faz. A espiral fina
         tem 1.800 pontos próprios (não é um adensamento da primeira: são dois
         sorteios de Fibonacci independentes, o mesmo truque da segunda nuvem da
         Europa) e entra pelo `zoom`, nascendo invisível. A 1,8× o mar volta a
         ter a densidade de tela que tem em repouso. */
      if (zoom > 0.01) tece(marFino(), MAR_FINO_PONTOS, 0.07 * zoom);
    }

    function desenha(yaw: number, pitch: number) {
      /* `let` e não `const`: a troca de dpf do mergulho, logo abaixo, chama
         `mede()`, que reconstrói `geo.current` — ler o objeto velho daria o dpr
         antigo na matriz do contexto. */
      let g = geo.current!;
      const R = g.raio;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const atual = ativo.current;

      /* ----------------------------------------------- a matriz do mergulho

         A ÂNCORA é o pino do país da vez, PROJETADO neste quadro e ANTES da
         escala — um ponto, dez flops. Ele tem de ser recalculado a cada quadro
         porque o planeta continua girando por baixo: ancorar numa coordenada
         congelada faria o pino escorregar sob o dedo, que é exatamente o
         defeito que o zoom do Maps não tem.

         A conta é a do pedido: escalar por Z em torno de `a` é
         `p' = Z·p + (a − Z·a)`. Então a matriz do contexto é a escala do dpr
         multiplicada por Z, com a translação `a·(1 − Z)` — e o MESMO par
         (`escala`, `ancX/ancY`) vai para o `translate3d` dos pinos, no fim desta
         função. Uma conta, duas camadas: é isso que impede os pinos de
         descolarem do planeta.

         A escala é `ZOOM_MAX^zoom`, que é a forma fechada de
         `2^lerp(log2 1, log2 ZOOM_MAX, zoom)` — a interpolação do LOGARITMO
         que o pedido pede, numa exponenciação só.

         A translação é arredondada a 0,1px de CSS: é a mesma régua do
         `translate3d` dos pinos (e é por isso que as duas camadas não podem
         arredondar diferente), e segura o tremor de subpixel que uma matriz
         recalculada 30 vezes por segundo produziria na borda dos pontos. */
      if (zoom > 0.0005) {
        const [fx, fy, fz] = alvo(lista[atual] ?? "");
        const fx1 = cy * fx + sy * fz;
        const fz1 = -sy * fx + cy * fz;
        const fy2 = cp * fy - sp * fz1;
        escala = Math.pow(ZOOM_MAX, zoom);
        const ax = R + fx1 * R;
        const ay = R - fy2 * R;
        ancX = Math.round(ax * (1 - escala) * 10) / 10;
        ancY = Math.round(ay * (1 - escala) * 10) / 10;
        fio = 1 / escala;
        grao = Math.pow(escala, -0.4);
      } else {
        escala = 1;
        ancX = 0;
        ancY = 0;
        fio = 1;
        grao = 1;
      }

      /* O dpr acompanha o mergulho, e a troca acontece AQUI — antes do
         `clearRect`, porque mexer em `canvas.width` zera o bitmap: no meio do
         desenho isso apagaria metade do quadro. São duas trocas por ciclo de
         15 s, nos instantes em que a escala sai de 1 e volta a 1. */
      const querDpr = dprDe(zoom);
      if (Math.abs(querDpr - g.dpr) > 0.01) {
        mede(querDpr);
        g = geo.current!;
      }

      /* A ONDA: o front em px da caixa (lado = 2R), do pé ao topo. A grade e a
         rede obedecem à mesma régua, por recorte — é um `clip` retangular por
         quadro, mais barato que decidir ponto a ponto onde elas entram, e o
         resultado é o mesmo: nada existe acima do front. */
      const p = progresso();
      const ondando = p < 1;
      const front = ondando ? (1 - curva(p)) * g.lado : 0;
      const crista = ONDA_BANDA * g.lado;

      /** Recorta tudo acima do front enquanto a onda sobe. */
      const sob = (pinta: () => void) => {
        if (!ondando) {
          pinta();
          return;
        }
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(0, front, g.lado, g.lado - front);
        ctx!.clip();
        pinta();
        ctx!.restore();
      };

      const desde = performance.now() - acendeuEm.current;

      /* ------------------------------------------------------------- a vigia

         Limpa na régua do dpr (a caixa inteira) e só DEPOIS recorta e amplia:
         com a matriz do zoom de pé, `clearRect(0,0,lado,lado)` deixaria de
         cobrir o canvas e sobrariam rastros nos cantos.

         O RECORTE É CIRCULAR E VEM ANTES DA MATRIZ. O `clip()` guarda a região
         no espaço do DISPOSITIVO, então a matriz aplicada depois amplia o que
         se pinta mas não a vigia — que é precisamente o pedido: o disco não
         muda de tamanho, o conteúdo dentro dele é que cresce. Se o recorte
         viesse depois, ele escalaria junto e deixaria de recortar.

         Antes de 17/10 o canvas era um quadrado sem recorte, e isso funcionava
         porque a queda de alfa no limbo apagava os pontos antes da borda. Com o
         mergulho o terreno chega AMPLIADO até a aresta da caixa, e sem a vigia
         o planeta lia como um recorte quadrado em vez de uma esfera. */
      ctx!.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx!.clearRect(0, 0, g.lado, g.lado);
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(R, R, R, 0, TAU);
      ctx!.clip();
      if (escala !== 1) {
        ctx!.setTransform(
          g.dpr * escala,
          0,
          0,
          g.dpr * escala,
          g.dpr * ancX,
          g.dpr * ancY,
        );
      }

      sob(() => grade(cy, sy, cp, sp));
      sob(() => trama(cy, sy, cp, sp));

      let n = 0;
      let usados = 0;

      for (let i = 0; i < GLOBE_COUNT + GLOBE_EU_COUNT; i += g.salto) {
        const x = dados.bx[i];
        const y = dados.by[i];
        const z = dados.bz[i];
        const x1 = cy * x + sy * z;
        const z1 = -sy * x + cy * z;
        const y2 = cp * y - sp * z1;
        const z2 = sp * y + cp * z1;
        if (z2 <= 0.02) continue;

        let lit = (-0.55 * x1 + 0.62 * y2 + 0.56 * z2) * 0.55 + 0.45;
        lit = lit < 0 ? 0 : lit > 1 ? 1 : lit;

        /* VOLUME (pedido do dono, 15/10). `z2` É o cosseno do ângulo ao centro
           do disco — o ponto é unitário —, então este fator vale 1 no meio da
           bola e 0,62 no limbo, e multiplica ALFA e RAIO. É o que separa uma
           esfera de um adesivo: no limbo os pontos se amontoam pelo
           encurtamento da projeção, e sem a queda eles ficariam MAIS densos do
           que o centro, não menos.
           O 0,62 de piso (e não 0,55) é compensação medida: o fator médio sobre
           o disco é 0,87, então ele tira ~13% de brilho do planeta inteiro — a
           rampa de alfa logo abaixo devolve esses 13% no termo da luz. */
        const vol = 0.62 + 0.38 * z2;
        /* REALCE DE ESTÚDIO: no quadrante que a luz de cima-à-esquerda pega, o
           ponto sobe um degrau de brilho e ganha raio. É um `if` por ponto, e
           não um expoente — a 5.102 pontos a 30 fps, a diferença é medida. */
        const realce = lit > 0.74 ? (lit - 0.74) * 1.4 : 0;

        const t = dados.tingimento[i];
        let balde: number;
        if (t > 0.02) {
          /* Os sete países: creme, e o da vez com meio passo a mais. A queda
             até o limbo é mais branda aqui (0,75–1,0 contra 0,62–1,0): são
             eles que carregam a informação da tela, e a Europa inteira, que
             mora a 0,85 de `z2`, não pode perder o degrau que o dono pediu. */
          const s = t * (dados.pais[i] === atual ? 1.6 : 1) * (0.75 + 0.25 * z2);
          balde = 7 + (s >= 1.2 ? 2 : s >= 0.6 ? 1 : 0);
        } else {
          /* Queda do alfa até o limbo: é o que evita a linha dura na borda. */
          const u = z2 >= 0.18 ? 1 : z2 / 0.18;
          const alfa =
            (0.06 + 0.32 * lit + 0.1 * realce + dados.ac[i]) *
            (u * u * (3 - 2 * u)) *
            vol;
          balde = (alfa * 13.04) | 0;
          if (balde > 5) balde = 5;
          /* A costa só vira laranja claro onde há luz: um fio claro no lado da
             sombra desenharia um litoral que o sol não está mostrando. */
          if (dados.ac[i] > 0 && balde >= 4) balde = 6;
        }

        const py = R - y2 * R;
        if (ondando) {
          /* Acima do front o ponto ainda não acendeu — e some inteiro, não pela
             metade: é a diferença entre uma onda e uma cortina recortando
             pontos no meio. Na crista ele vale 1,8× (balde + BALDES). */
          if (py < front) continue;
          if (py < front + crista) balde += BALDES;
        }

        trab.x[n] = R + x1 * R;
        trab.y[n] = py;
        /* Os países ganham 18% de raio além do alfa: é o que faz os sete
           acesos ficarem legíveis contra uma terra que agora é toda laranja.
           O `vol` entra também aqui: o ponto do limbo não é só mais fraco, é
           MENOR — e é esse par que dá a curvatura. */
        trab.r[n] =
          dados.rb[i] *
          (0.72 + 0.4 * lit + 0.12 * realce) *
          vol *
          (balde % BALDES >= 7 ? 1.18 : 1) *
          /* `grao` é 1 fora do mergulho: um multiplicador por ponto, e é o que
             faz a aproximação REVELAR a nuvem em vez de só ampliá-la. */
          grao;
        trab.b[n] = balde;
        usados |= 1 << balde;
        n += 1;
      }

      /* Um `beginPath` + um `fill` por balde: dez chamadas de pintura por
         quadro, não uma por ponto. */
      /* Dez baldes fora da onda; vinte enquanto ela sobe — os dez de cima são
         os MESMOS dez com o alfa da crista, e por isso a onda não acrescenta
         cor nenhuma ao planeta, só luz. Quase todos ficam vazios em cada
         quadro, e o `usados` os pula sem custo. */
      const topo = ondando ? BALDES * 2 : BALDES;
      for (let b = 0; b < topo; b += 1) {
        if (!(usados & (1 << b))) continue;
        ctx!.beginPath();
        for (let k = 0; k < n; k += 1) {
          if (trab.b[k] !== b) continue;
          const r = trab.r[k];
          ctx!.moveTo(trab.x[k] + r, trab.y[k]);
          ctx!.arc(trab.x[k], trab.y[k], r, 0, TAU);
        }
        const base = b % BALDES;
        const alfa = ALFA[base] * g.ganho * (b >= BALDES ? ONDA_BRILHO : 1);
        ctx!.globalAlpha = alfa > 1 ? 1 : alfa;
        ctx!.fillStyle = COR[base];
        ctx!.fill();
      }

      /* A rede POR CIMA da terra: embaixo de 5.102 pontos de laranja ela
         desaparece, e ligar as quatro capitais é o que a imagem tem a dizer. */
      sob(() => malha(cy, sy, cp, sp, desde));
      ctx!.globalAlpha = 1;

      /* Os pinos: `transform` com o DESLOCAMENTO a partir da posição de
         repouso que o servidor escreveu em `left/top`. Em t = 0 ele é (0,0),
         então nada salta quando o laço assume. Composto, sem layout. */
      if (!celular) {
        /* O PULSO do pino da vez (pedido do dono, 15/10): um anel que nasce no
           ponto e se abre em 600 ms, UMA vez por troca. Só raio e alfa — nem
           cor, nem deslocamento, nem escala de nó nenhum. Ele é desenhado aqui,
           no canvas, e não em CSS como o anel do `CountryTag`, por um motivo de
           verdade: no canvas ele nasce na coordenada PROJETADA do país, que
           continua andando com o balanço do planeta; o anel de CSS mora no
           alfinete e por isso só pode pulsar onde o alfinete já está.
           O `hero-ping` do `CountryTag` segue existindo abaixo de 1280, onde
           não há laço para animar isto. */
        const pulso = emLaco && desde < PULSO_MS ? desde / PULSO_MS : -1;

        for (let j = 0; j < g.repouso.length; j += 1) {
          const el = alfinetes.current[j];
          if (!el) continue;
          const [x, y, z] = alvo(lista[j]);
          const x1 = cy * x + sy * z;
          const z1 = -sy * x + cy * z;
          const y2 = cp * y - sp * z1;
          const z2 = sp * y + cp * z1;
          /* O pino SOME NO LIMBO, e some por opacidade, nao por `hidden`.

             Com a oscilacao de antes nenhum pino chegava a virar a esquina, e
             um `hidden` binario nunca aparecia em cena. Com o giro livre (16/10)
             todos cruzam o limbo o tempo todo, e cortar o no de uma vez faria o
             rotulo PISCAR na borda do disco - a cada volta, sete vezes.
             A rampa de 0,05 a 0,30 de `z2` e a largura do limbo: o pino entra e
             sai desvanecendo, como um ponto que dobra o horizonte. Abaixo de
             0,05 ele sai do fluxo de vez, para nao pagar layout do outro lado
             da bola. */
          const borda = (z2 - 0.05) / 0.25;
          const visivel = z2 <= 0 ? 0 : borda >= 1 ? 1 : borda <= 0 ? 0 : borda;
          /* O px/py do pino no planeta, antes do mergulho — e depois dele, que
             é a MESMA conta da matriz do canvas (`a·(1−Z) + Z·p`). Uma conta,
             duas camadas: é só por isso que os pinos não descolam do planeta.
             Para o pino FOCADO, `a` é ele mesmo, então a conta devolve `p` e ele
             fica parado na tela — a promessa da âncora, exata e não aproximada. */
          const px = R + x1 * R;
          const py2 = R - y2 * R;
          const pxz = ancX + escala * px;
          const pyz = ancY + escala * py2;

          /* A VIGIA VALE PARA O DOM TAMBÉM. O canvas corta o que sai do
             círculo; o HTML não é cortado por nada, e no mergulho os pinos fora
             do foco saem do disco — ficariam pendurados no vazio ao lado do
             planeta, ou, pior, em cima da coluna de texto. Então o rótulo
             desvanece pela distância ao centro contra o raio, na mesma faixa
             curta do limbo. Em repouso esta rampa coincide com a de `z2` (é a
             mesma, em raio em vez de cosseno) e por isso nada muda. */
          const rad = Math.sqrt((pxz - R) * (pxz - R) + (pyz - R) * (pyz - R)) / R;
          const naVigia =
            rad >= VIGIA_FORA
              ? 0
              : rad <= VIGIA_DENTRO
                ? 1
                : (VIGIA_FORA - rad) / (VIGIA_FORA - VIGIA_DENTRO);

          /* OS SETE RÓTULOS NÃO CABEM NUM PLANETA APROXIMADO: a 1,8× os pinos
             se afastam da âncora por 80% da distância que já tinham. O mergulho
             apaga os outros seis e deixa o do país focado, que é o único que o
             enquadramento está afirmando — e a troca acontece com o planeta
             ainda em 1×, durante a viagem (ver `ROTULO_SAI_MS`).
             `focos[j]` faz a travessia das batidas 4 e 5 ser um cruza-fade
             entre o rótulo que sai e o que entra, em vez de um corte. */
          /* O rótulo do país focado só acende quando o pino CHEGA ao meio (ver
             `CHEGOU_DENTRO`). O fator entra misturado pelo enquadramento, para
             em repouso valer 1 e não mexer em nada. */
          const chegou =
            rad <= CHEGOU_DENTRO
              ? 1
              : rad >= CHEGOU_FORA
                ? 0
                : (CHEGOU_FORA - rad) / (CHEGOU_FORA - CHEGOU_DENTRO);
          const peso = focos[j] * (1 - enquadra + enquadra * chegou);
          const efetiva =
            Math.min(visivel, naVigia) * (rotulos + (1 - rotulos) * peso);
          el.hidden = efetiva <= 0.004;
          el.style.opacity = efetiva >= 0.999 ? "" : efetiva.toFixed(3);
          el.style.transform = `translate3d(${(pxz - g.repouso[j].x).toFixed(1)}px, ${(pyz - g.repouso[j].y).toFixed(1)}px, 0)`;

          /* O DESTAQUE do rótulo focado: bandeira + cidade + método · preço, as
             identidades reais que a página já tem. É uma classe no alfinete e o
             CSS cuida do resto (`.hero-pino--foco`, em `hero.css`) — assim o
             rótulo aparece até nas janelas em que os sete não cabem, porque ali
             ele está sozinho. Escrita só na VIRADA, nunca por quadro: tocar o
             `classList` 30 vezes por segundo paga invalidação de estilo de
             graça. O gatilho é `rotulos`, e não a escala: o destaque entra
             exatamente quando os outros seis passam da metade do desvanecer,
             que é o instante em que o rótulo focado fica sozinho na tela. */
          const destaque = rotulos < 0.5 && j === atual ? 1 : 0;
          if (destacado[j] !== destaque) {
            destacado[j] = destaque;
            el.classList.toggle("hero-pino--foco", destaque === 1);
          }

          if (z2 <= 0) continue;

          /* O ANEL DE ALVO do mergulho: nasce com 4px, CRESCE junto com a
             escala e ASSENTA em 22px de tela — uma vez por mergulho, sem
             piscar. É o que o Maps põe no ponto que você escolheu, e aqui ele
             faz um segundo trabalho: nas batidas 4 e 5 ele passa de pino em
             pino com o `focos`, e é por ele que se LÊ o deslize.
             Raio e espessura em px de TELA (daí o `fio`): o alvo é da câmera,
             não do planeta, e não cresce junto com o terreno. */
          if (zoom > 0.002 && focos[j] > 0.01) {
            ctx!.beginPath();
            ctx!.arc(px, py2, (4 + (ZOOM_ANEL - 4) * zoom) * fio, 0, TAU);
            ctx!.globalAlpha =
              0.3 * focos[j] * Math.min(1, zoom * 2.5) * g.ganho;
            ctx!.strokeStyle = LARANJA;
            ctx!.lineWidth = 1.25 * fio;
            ctx!.stroke();
            ctx!.globalAlpha = 1;
          }

          if (pulso < 0 || j !== atual) continue;
          /* Saída rápida e chegada mansa, a mesma leitura do resto do palco.
             O raio também é de tela: um pulso de 26px é um pulso de 26px, perto
             ou longe. */
          const e = 1 - (1 - pulso) * (1 - pulso) * (1 - pulso);
          ctx!.beginPath();
          ctx!.arc(px, py2, (4 + 26 * e) * fio, 0, TAU);
          ctx!.globalAlpha = 0.5 * (1 - pulso) * g.ganho;
          ctx!.strokeStyle = LARANJA;
          ctx!.lineWidth = 1.5 * fio;
          ctx!.stroke();
          ctx!.globalAlpha = 1;
        }
      }

      /* ------------------------------------------- fecha a vigia e contorna

         O `restore()` devolve a matriz do dpr e solta o recorte: tudo o que vem
         abaixo é desenhado em coordenadas da CAIXA, não do zoom.

         "CONTORNE TODO O GLOBO COM O ZOOM" (dono, 17/10). Com o terreno
         ampliado encostando no corte, um `clip()` seco deixa serrilha na
         circunferência — o recorte tem borda de um pixel e os pontos chegam
         nela por dentro. O fio de 1,5px no laranja a 22% é o MESMO de
         `.globe-air` (globals.css), que já desenha esta circunferência no HTML
         do servidor; aqui ele é repintado POR CIMA, centrado em R − 0,75 para
         cobrir exatamente a faixa do corte.
         O alfa sobe com o zoom em vez de ser constante, e isso é regra dura do
         hero: em repouso o fio do CSS está sozinho — somar outro igual dobraria
         a borda para 39% e o primeiro quadro deixaria de cair sobre o que o
         servidor pintou. A 1/3 do mergulho ele já está cheio. */
      ctx!.restore();
      if (zoom > 0.0005) {
        ctx!.beginPath();
        ctx!.arc(R, R, R - BORDA_FIO / 2, 0, TAU);
        ctx!.globalAlpha = BORDA_ALFA * Math.min(1, zoom * 3) * g.ganho;
        ctx!.strokeStyle = LARANJA;
        ctx!.lineWidth = BORDA_FIO;
        ctx!.stroke();
        ctx!.globalAlpha = 1;
      }

      /* O LIMBO ACOMPANHA O PLANETA. Ele é o escurecimento dos últimos 6% do
         raio — o que faz o disco ler como bola — e vive em CSS porque não
         girava. Agora ele ESCALA: dentro do mergulho precisa estar no mesmo
         espaço dos pontos, ou o sombreado fica parado enquanto a terra corre
         por baixo, que é o defeito clássico de um zoom de imagem. Recebe a
         MESMA matriz do canvas, no compositor, de graça — e a 1,8× o seu aro
         escuro simplesmente sai de quadro, cortado pela vigia (`.globe-vigia`,
         em `hero.css`), que é o que acontece no Maps quando se aproxima.
         A MARCA da Wone não escala: ela é o fundo em repouso, e a 1,8× um
         logotipo de 83% do diâmetro cortado pela vigia seria um borrão. Em vez
         de crescer, ela sai de cena — dissolve com o mergulho e volta com ele.
         Nos dois casos é `transform`/`opacity`: nenhum quadro passa por layout. */
      if (limbo.current) {
        limbo.current.style.transform =
          escala === 1
            ? ""
            : `translate3d(${ancX.toFixed(1)}px, ${ancY.toFixed(1)}px, 0) scale(${escala.toFixed(4)})`;
      }
      if (marca.current) {
        /* 0,06 é o alfa que o CSS dá à marca: o inline tem de MULTIPLICAR esse
           número, não substituí-lo — escrever `1 − zoom` cru acenderia um
           logotipo chapado no meio do planeta. String vazia devolve o controle
           ao CSS, que é o estado de repouso. */
        marca.current.style.opacity =
          zoom > 0.0005 ? (0.06 * (1 - zoom)).toFixed(4) : "";
      }

      angulo.current = { yaw, pitch };
    }

    mede();
    const umQuadro = () => desenha(angulo.current.yaw, angulo.current.pitch);

    const observador =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            mede();
            if (modo !== "laco" || !running) umQuadro();
          });
    observador?.observe(box);

    /* Fora do `xl`, ou com qualquer um dos quatro freios do relógio puxado
       (pausado, movimento reduzido, aba oculta, fora da tela): UM quadro na
       orientação em que o globo está, e para. Nada reagenda. */
    if (modo !== "laco" || !running) {
      /* Sem laço, o globo fica na orientação de REPOUSO: é a que o servidor
         pintou e a que põe cada pino exatamente onde o `left/top` dele manda.
         (Com o laço de pé e um freio puxado, ao contrário, ele congela onde
         está — voltar ao repouso seria um salto.) */
      if (modo !== "laco") angulo.current = { yaw: 0, pitch: 0 };
      umQuadro();
      if (progresso() >= 1) return () => observador?.disconnect();

      /* A exceção, e ela tem fim: a onda de entrada precisa de quadros. Este
         laço vive os 1,1 s dela e morre — o último quadro é o planeta inteiro
         no brilho normal, que é o estado em que ele ficaria de todo modo. */
      let rafOnda = 0;
      let ultimoOnda = -1;
      const quadroOnda = (t: number) => {
        if (progresso() >= 1) {
          umQuadro();
          return;
        }
        rafOnda = requestAnimationFrame(quadroOnda);
        if (ultimoOnda >= 0 && t - ultimoOnda < PASSO_MS) return;
        ultimoOnda = t;
        umQuadro();
      };
      rafOnda = requestAnimationFrame(quadroOnda);
      return () => {
        cancelAnimationFrame(rafOnda);
        observador?.disconnect();
      };
    }

    let raf = 0;
    let t0 = 0;
    let ultimo = -1;
    /* O ENQUADRAMENTO acumulado: o gesto/centralização do país da vez, sem a
       varredura e sem o cursor, que entram por fora. Nasce em ZERO e não no
       ângulo do quadro anterior — a rampa de entrada (`entrada2`) multiplica
       este termo junto com a varredura, e é isso que faz o primeiro quadro do
       laço cair exatamente sobre o ângulo em que o servidor pintou o globo. */
    let recYaw = 0;
    let recPitch = 0;

    /* Uma volta em 180 s, e um meridiano sorteado por sessão.
       O sorteio é uma vez por montagem do laço — recarregar a página dá outro.
       O ângulo é ACUMULADO e não "seg × velocidade": integrar a velocidade é o
       que deixa a rampa de entrada mexer no ritmo sem criar salto no ângulo. */
    /* A JANELA DO GIRO, em radianos (veja o comentário do laço). O giro varre
       de 0 a +16° de guinada: é a faixa em que os SETE países marcados ficam
       todos na face visível da bola. */
    const GIRO_CENTRO = (8 * Math.PI) / 180;
    const GIRO_AMPL = (8 * Math.PI) / 180;
    const GIRO_PERIODO = 38;
    const faseSessao = Math.random() * TAU;

    /* O CURSOR MOVE O PLANETA (pedido do dono, 16/10: "deixe o globo interativo,
       ao passar o cursor por cima deve se mexer").

       Ele NÃO SOMA ao balanço, ele o ASSUME — e isso é medida, não gosto. A
       folga entre o extremo direito do que o globo desenha e a coluna de texto
       é de 42px a 1400 (44 a 1440, 68 a 1920), COM o balanço de 9° já rodando.
       Somar mais graus comeria essa folga e os rótulos encostariam no título.
       Então, conforme a força do cursor sobe, a amplitude do balanço cai a 40%:
       o pior caso continua dentro do envelope já medido — 9 × 0,4 + 5,5 = 9,1°
       contra os 9° de antes.

       E lê melhor assim: o planeta larga a respiração própria e passa a seguir
       a mão, que é o que "interativo" quer dizer. Ao sair, a força volta a zero
       e o balanço retoma — nos dois sentidos com a mesma suavização exponencial
       do recuo, então nada salta.

       A escuta fica na SEÇÃO e não no globo porque a camada do palco é
       "pointer-events-none": o globo não recebe ponteiro, e nem deve — ele está
       por baixo do texto e dos botões, e capturá-lo roubaria o clique deles.

       Só `mouse`: em toque, um `pointermove` é um arrasto de rolagem, e girar o
       planeta a cada deslize seria movimento que ninguém pediu. */
    const CURSOR_YAW = 0.096;
    const CURSOR_PITCH = 0.052;
    let alvoYaw = 0;
    let alvoPitch = 0;
    let alvoForca = 0;
    let curYaw = 0;
    let curPitch = 0;
    let forca = 0;

    const secao = caixa.current?.closest("section") ?? null;
    const moveu = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const box = caixa.current?.getBoundingClientRect();
      if (!box) return;
      /* Posição do cursor em relação ao CENTRO do disco, normalizada pelo raio
         e presa em −1..1: fora do disco o efeito satura em vez de crescer. */
      const nx = (ev.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const ny = (ev.clientY - (box.top + box.height / 2)) / (box.height / 2);
      alvoYaw = Math.max(-1, Math.min(1, nx)) * CURSOR_YAW;
      alvoPitch = Math.max(-1, Math.min(1, ny)) * CURSOR_PITCH;
      alvoForca = 1;
    };
    const saiu = () => {
      alvoForca = 0;
    };
    secao?.addEventListener("pointermove", moveu, { passive: true });
    secao?.addEventListener("pointerleave", saiu);

    const quadro = (t: number) => {
      raf = requestAnimationFrame(quadro);
      if (ultimo >= 0 && t - ultimo < PASSO_MS) return;
      const dt = ultimo < 0 ? 0 : Math.min(0.1, (t - ultimo) / 1000);
      ultimo = t;
      if (!t0) t0 = t;
      const seg = (t - t0) / 1000;

      /* O GIRO (pedido do dono, 16/10: "o globo no hero, deixe ele girando
         levemente").

         Era um balanço de 1,5° de guinada em 20 s — 0,47°/s no pico, abaixo do
         que o olho lê como movimento: o planeta parecia parado e só os pinos
         trocavam de cor. Agora são 6° em 28 s, o que dá 1,35°/s no pico, três
         vezes o de antes. A 1,35°/s um ponto de terra atravessa o seu próprio
         diâmetro em pouco mais de um segundo: é giro, e não respiração.

         POR QUE NÃO UMA VOLTA INTEIRA. A primeira dobra promete "7 países,
         moeda local" e cumpre isso mostrando OS SETE pinos com cidade e preço
         ao mesmo tempo. Numa rotação contínua, metade deles estaria sempre do
         outro lado da bola (`z2 <= 0`) e as etiquetas sumiriam em rodízio — a
         imagem perderia justamente o que ela afirma. Então o giro é uma
         oscilação lenta e larga: em qualquer janela de poucos segundos lê-se um
         planeta girando, e nenhum pino chega a virar a esquina.

         A AMPLITUDE TEM UM TETO MEDIDO — e ele é mais alto do que parecia. O
         corredor entre a borda do disco e a coluna de texto tem 49px a 1440, mas
         não é ele que manda: os rótulos dos pinos abrem para a ESQUERDA, então
         o que chega mais perto do texto é o pino mais a leste, e ele para em
         x 486 contra os 666 do h1. Amostrado a cada 800ms por 16s, o extremo
         direito de tudo o que o globo desenha ficou em 486 e o esquerdo em 63:
         180px de folga de um lado, 63 do outro. Nove graus cabem com sobra.

         Os dois senos partem de ZERO, e isso não é detalhe: é o que faz o
         primeiro quadro do laço cair exatamente sobre o que o servidor pintou,
         sem um salto na entrada. A inclinação fica em 1,5° e com período primo
         em relação ao da guinada (46 s contra 28), para os dois não voltarem
         juntos ao mesmo ponto e o movimento nunca parecer um pêndulo. */
      /* O GIRO, PRESO À JANELA DOS PAÍSES MARCADOS (pedido do dono, 17/10:
         "deixe o foco da rotação apenas nos países que estão destacados no
         globo").

         Até hoje de manhã o planeta dava a VOLTA INTEIRA, uma em 180 s. O
         movimento estava certo e o enquadramento, errado: dois terços de cada
         volta mostravam Pacífico, Ásia e África, onde a Wone não marca nada —
         o globo passava a maior parte do tempo provando o contrário do que a
         seção afirma.

         ONDE OS SETE MORAM. Com o centro de projeção em λ₀ = −32°, as sete
         capitais caem entre −67,1° (Cidade do México) e +31,9° (Londres) de
         longitude RELATIVA: um arco de 99°, que é quase toda a face visível de
         uma vez. Essa é a razão de o repouso já ser um bom enquadramento — ele
         foi escolhido assim — e é também o que limita o giro dos dois lados:

          - para OESTE (guinada negativa) não há folga nenhuma. A Cidade do
            México já desenha a 6,6% da largura da caixa, encostada no limbo;
            qualquer grau a menos a leva para o outro lado da bola;
          - para LESTE há cerca de 38° antes de Londres (+31,9°) chegar aos 70°
            em que um pino deixa de se ler. Fica-se em 16, com folga dobrada.

         Daí a varredura de 0 a +16°, e não uma oscilação em torno do repouso:
         ela corre só para o lado que tem país, e o lado que não tem fica de
         fora. No meio do curso a Cidade do México ganha 16° de margem contra o
         limbo — ou seja, o enquadramento MELHORA no miolo do ciclo.

         A VELOCIDADE é "levemente": 16° em 38 s de ida e volta dão 1,3°/s no
         pico, a mesma ordem da volta inteira (2°/s) e do balanço que havia
         antes dela (1,35°/s). O que muda não é o ritmo, é para onde ele aponta.

         A FASE DA SESSÃO continua, e continua fazendo o que fazia: duas pessoas
         não veem a mesma tela. O que ela sorteia agora não é um meridiano
         qualquer, é o PONTO DO CICLO em que a varredura começa — quem chega
         pode pegar o planeta na ida, na volta ou numa das pontas. A amplitude é
         a mesma para todos; só o instante muda.

         Ela NÃO entra de uma vez, e isso não é enfeite: o servidor pinta o
         globo no ângulo zero, e aplicar um ângulo sorteado no primeiro quadro
         do cliente seria um salto visível bem em cima do elemento de LCP. A
         rampa de 2,2 s — o tempo da entrada — multiplica a varredura inteira,
         então o planeta parte do ângulo do servidor e abre o curso. O primeiro
         quadro do laço cai exatamente sobre o que o servidor pintou, que é a
         regra que já valia aqui.

         A inclinação continua oscilando: o eixo de um planeta não gira, cabeceia
         — e 2° de cabeceio em 43 s mantém o movimento de parecer um carrossel. */
      const rampa = Math.min(1, seg / 2.2);
      const entrada2 = rampa * rampa * (3 - 2 * rampa);

      /* ------------------------------------------- o ciclo de cinco batidas

         `fase` é a batida dentro do ciclo, 0 a 4 (ver `CICLO`): 0 e 1 são o
         enquadramento normal, 2 é o mergulho, 3 e 4 são o deslize. −1 é "o
         relógio ainda não andou", na primeira tela.

         A RAMPA DE ENTRADA TEM PRIORIDADE, e isto é regra dura do hero: o
         primeiro quadro do laço cai exatamente sobre o que o servidor pintou, e
         nada pode disparar durante os 2,2 s em que a varredura está abrindo.
         Na prática o primeiro mergulho só poderia acontecer na terceira troca,
         aos 9,6 s — mas o laço se remonta quando um freio do relógio é solto
         (voltar para a aba, rolar o hero de volta à tela), e ali `seg` recomeça
         do zero com o contador de batidas já adiantado. Sem esta guarda o globo
         mergulharia no mesmo instante em que a varredura está saindo do ângulo
         do servidor, e os dois movimentos se somariam num salto. */
      const fase = batidas.current === 0 ? -1 : (batidas.current - 1) % CICLO;
      const quer = fase >= 2 && seg > 2.2 ? 1 : 0;

      /* AS DUAS CURVAS, baseadas em TEMPO e não em perseguição exponencial: é o
         único jeito de a ida e a volta terem FORMAS diferentes (o que o pedido
         pede) e de a viagem TERMINAR (o que a âncora exige). Elas partem sempre
         do valor em que as coisas estão (`zoomDe`, `enqDe`), então uma virada no
         meio do caminho continua de onde estava — nunca de 0 nem de 1. */
      if (quer !== zoomQuer) {
        zoomQuer = quer;
        zoomT0 = t;
        zoomDe = zoom;
        enqDe = enquadra;
      }
      /** Rampa 0→1 presa em [0,1], com atraso opcional. */
      const ramp = (ms: number, dur: number) =>
        ms <= 0 ? 0 : ms >= dur ? 1 : ms / dur;

      if (zoomQuer) {
        /* IDA, em três tempos: os rótulos saem (300 ms, planeta parado), depois
           a viagem (1.300 ms), e só quando ela acaba a escala (900 ms). Ataque
           forte e chegada mansa nas duas curvas, que é a curva de se aproximar
           de algo. */
        enquadra =
          enqDe +
          (1 - enqDe) *
            cubica(ramp(t - zoomT0 - ROTULO_SAI_MS, PAN_MS), 0.22, 0.61, 0.36, 1);
        zoom =
          zoomDe +
          (1 - zoomDe) *
            cubica(
              ramp(t - zoomT0 - ROTULO_SAI_MS - PAN_MS, ZOOM_ENTRA_MS),
              0.22,
              0.61,
              0.36,
              1,
            );
      } else {
        /* VOLTA, na ordem inversa: a escala SOLTA primeiro (1.200 ms, curva que
           sai do lugar devagar e desacelera — o Maps solta o zoom, não o
           arranca) e o enquadramento desfaz 500 ms depois. Nos primeiros 500 ms
           o pino continua parado enquanto o planeta encolhe: é a âncora valendo
           também na saída. */
        zoom =
          zoomDe * (1 - cubica(ramp(t - zoomT0, ZOOM_SAI_MS), 0.4, 0, 0.2, 1));
        enquadra =
          enqDe *
          (1 -
            cubica(
              ramp(t - zoomT0 - ZOOM_SAI_ESPERA_MS, ZOOM_SAI_MS),
              0.4,
              0,
              0.2,
              1,
            ));
      }

      /* Os seis rótulos saem DURANTE a viagem (escala ainda 1) e voltam DEPOIS
         que ela assenta: ver `ROTULO_SAI_MS`. `suave` é o smoothstep de sempre,
         para a opacidade não ter canto nas pontas. */
      const rp = zoomQuer
        ? 1 - ramp(t - zoomT0, ROTULO_SAI_MS)
        : ramp(t - zoomT0 - ROTULO_ESPERA_MS, ROTULO_VOLTA_MS);
      rotulos = rp * rp * (3 - 2 * rp);

      /* A VARREDURA EM DUAS FORÇAS, misturadas pelo ENQUADRAMENTO (e não pela
         escala — ela é framing, e precisa estar pronta antes de a escala
         crescer):
           · fora do mergulho, a de sempre — 0 a +16° de guinada;
           · dentro dele, SÓ A OSCILAÇÃO, com 16% da amplitude e média ZERO.
         A média zero não é detalhe: é ela que deixa o alvo de centralização
         valer como está, sem compensar deslocamento nenhum. O planeta continua
         derivando ±1,3° em torno do país focado — "o zoom real não congela o
         mapa" — e o pino respira em volta do centro em vez de ficar cravado. */
      const onda = (TAU * seg) / GIRO_PERIODO + faseSessao;
      const varredura =
        (GIRO_CENTRO + GIRO_AMPL * Math.sin(onda)) * (1 - enquadra) +
        GIRO_AMPL * ZOOM_DERIVA * Math.sin(onda) * enquadra;
      const balancoYaw = varredura * entrada2;
      const balancoPitch =
        0.0349 *
        Math.sin((TAU * seg) / 43) *
        (1 - (1 - ZOOM_DERIVA) * enquadra);

      /* O cursor assume o balanco: mesma suavizacao do recuo (~1,2 s). */
      const kc = 1 - Math.exp(-dt / 0.28);
      curYaw += (alvoYaw - curYaw) * kc;
      curPitch += (alvoPitch - curPitch) * kc;
      forca += (alvoForca - forca) * kc;
      const recuaBalanco = 1 - 0.6 * forca;

      /* O GIRO ACOMPANHA A BOLINHA — EM TODA BATIDA (pedido do dono, 17/10,
         repetido duas vezes no mesmo dia).

         O cometa sai do país da vez; o planeta parte para esse país junto com
         ele. A cada batida começa uma VIAGEM: do ângulo em que o giro está até
         o alvo do país novo, em 1.300 ms de curva. O que muda com o mergulho
         não é SE o planeta vai, é QUANTO:
           · GESTO (`globeMath.GESTO`) — 34% da centralização, limitado a
             −3°/+8° de guinada: um aceno na direção certa, que é o que cabe no
             enquadramento dos sete países;
           · CENTRO (`globeMath.CENTRA`) — os ângulos exatos que põem a capital
             no meio do disco.
         O alvo é a mistura dos dois pelo `enquadra`, então não há `if` entre os
         regimes: fora do mergulho o planeta acena, dentro dele centra, e no
         meio está no meio.

         POR QUE UMA CURVA DE TEMPO E NÃO A PERSEGUIÇÃO EXPONENCIAL DE ANTES:
         porque uma perseguição nunca chega. Com a constante de 0,55 s que o
         enquadramento pediria, ainda sobram 9% do caminho quando a escala
         começa — e 9% de uma viagem de 300px são 27px de pino andando sob o
         dedo, com a âncora prometendo o contrário. A curva chega, e chega 1,7 s
         antes da batida seguinte: nada de arrasto permanente.

         O CAMINHO CURTO: a diferença de ângulo é normalizada para (−π, π]. Com
         os alvos de hoje (todos dentro de ±62°) ela nunca é usada de fato, mas
         é o que impede o planeta de dar a volta pelo lado errado no dia em que
         um país novo cruzar o meridiano de origem. */
      const code = lista[ativo.current] ?? "";
      const gesto = GESTO[code] ?? { yaw: 0, pitch: 0 };
      const centro = CENTRA[code] ?? { yaw: 0, pitch: 0 };
      const alvoY = gesto.yaw + (centro.yaw - gesto.yaw) * enquadra;
      const alvoP = gesto.pitch + (centro.pitch - gesto.pitch) * enquadra;

      if (panCode !== code || panQuer !== zoomQuer) {
        panCode = code;
        panQuer = zoomQuer;
        panT0 = t;
        panDeYaw = recYaw;
        panDePitch = recPitch;
      }
      const pp = cubica(ramp(t - panT0, PAN_MS), 0.22, 0.61, 0.36, 1);
      recYaw = panDeYaw + curto(alvoY - panDeYaw) * pp;
      recPitch = panDePitch + (alvoP - panDePitch) * pp;

      /* O foco de cada pino, perseguido: quem está no país da vez vai para 1, os
         outros para 0. É só opacidade e alfa de anel — aqui a perseguição serve,
         porque nada depende de ela ter CHEGADO. Sete contas por quadro.
         SOBE MANSO E DESCE RÁPIDO (0,45 s contra 0,13 s), e a assimetria é
         correção de defeito medida: com uma constante só, na troca de país
         dentro do mergulho o rótulo que SAÍA continuava visível enquanto o
         planeta viajava, e a 1,8× ele corria para a borda — a 1512 de janela a
         borda direita dele chegou a 874px contra os 841 do `<h1>`. O que entra
         ainda está a caminho do centro e tem tempo; o que saiu não tem mais
         trabalho nenhum, e cada décimo em que ele fica é um rótulo atravessando
         o disco. */
      /* E a QUEDA encurta com o enquadramento: 0,45 s em repouso, 0,06 s no
         mergulho. Medido: com 0,13 s fixos, a troca de país a 1,8× ainda deixava
         o rótulo que saía chegar a x 853 com 12% de opacidade — ele percorre 26%
         de uma viagem de 57° antes de apagar. A 0,06 s ele sai em três quadros,
         com 9% da viagem andada, e fecha em ~824 contra os 841 do `<h1>`.
         Três quadros de opacidade descendo não são um corte: são um rótulo que
         deixou de ser o assunto. */
      const quedaTau = 0.45 - 0.39 * enquadra;
      for (let j = 0; j < focos.length; j += 1) {
        const alvoF = j === ativo.current ? 1 : 0;
        focos[j] +=
          (alvoF - focos[j]) *
          (1 - Math.exp(-dt / (alvoF > focos[j] ? 0.45 : quedaTau)));
      }

      /* O cursor também recua no mergulho (40% da força): ele continua movendo
         o planeta — "deixe o globo interativo" segue valendo —, mas não a ponto
         de empurrar para fora do quadro o pino que o zoom está afirmando. */
      const amortece = 1 - 0.6 * enquadra;

      /* `entrada2` multiplica o enquadramento junto com a varredura: os dois
         são o giro, e os dois têm de abrir a partir do ângulo do servidor. */
      const agora = performance.now();
      desenha(
        balancoYaw * recuaBalanco + curYaw * forca * amortece + recYaw * entrada2,
        balancoPitch * recuaBalanco +
          curPitch * forca * amortece +
          recPitch * entrada2,
      );
      medidor(performance.now() - agora, zoom, escala, fase);
    };

    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      observador?.disconnect();
      secao?.removeEventListener("pointermove", moveu);
      secao?.removeEventListener("pointerleave", saiu);
    };
  }, [codes, running, modo, trocaParada, entrada]);

  /**
   * O arco do pino ativo até o aparelho, na troca de país.
   *
   * A posição do pino é CONGELADA na ativação (o globo continua balançando
   * embaixo): o arco é um gesto de 1 s, não um fio preso. Nasce `null` e só
   * aparece a partir da primeira troca — na primeira tela nada anima.
   */
  useEffect(() => {
    if (primeiraVolta.current) {
      primeiraVolta.current = false;
      return;
    }
    const box = caixa.current;
    const g = geo.current;
    if (!box || !g) return;

    const { yaw, pitch } = angulo.current;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const [x, y, z] = alvo(pins[activeIndex]?.code ?? "");
    const x1 = cy * x + sy * z;
    const z1 = -sy * x + cy * z;
    const y2 = cp * y - sp * z1;

    const R = g.raio;
    const px = g.esquerda + R + x1 * R;
    const py = g.topo + R - y2 * R;
    /* O destino é o TICKET, e ele é MEDIDO, não deduzido: o card muda de canto
       entre o celular e o desktop, e a camada do palco muda de tamanho junto —
       repetir essa geometria aqui seria duas verdades sobre onde o fio termina.
       O ponto de chegada é o meio da borda de cima do card, que é a aresta
       voltada para o planeta. Sem o nó (primeiro render, ou `alvo` vazio), cai
       no pé da camada, que é onde o ticket mora. */
    const camada = box.parentElement;
    const base = camada?.getBoundingClientRect();
    /* Sem o ticket (o dono o retirou em 15/10) nao ha destino: o pino acende
       com o anel e o arco nao e desenhado. */
    const destino = alvoRef?.current?.getBoundingClientRect();
    if (!destino) {
      setArco(null);
      return;
    }
    const tx =
      destino && base ? destino.left - base.left + destino.width / 2 : (camada?.clientWidth ?? 600) / 2;
    const ty = destino && base ? destino.top - base.top : (camada?.clientHeight ?? 600) - 120;
    const qx = (px + tx) / 2;
    const qy = (py + ty) / 2 - 70;

    setArco({
      code: pins[activeIndex]?.code ?? "",
      d: `M${px.toFixed(1)} ${py.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`,
    });
  }, [activeIndex, pins, alvoRef]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* A CAIXA DO GLOBO: tamanho CRAVADO por degrau, sempre absoluta — CLS
          zero por construção, porque nada aqui participa do fluxo.

          A GEOMETRIA SAIU DAQUI em 15/10 e foi para `.hero-globo`, em
          `src/app/hero.css`. Dois motivos, nenhum deles estético:
            · o lado do globo era quatro números espalhados (altura, largura e,
              agora, a trilha da grade da cena e o recuo do texto) e precisava
              ser UM: é a variável `--globo`, declarada na seção;
            · o Tailwind emite as variantes arbitrárias ANTES das nomeadas, e
              `lg:` vencia `min-[1400px]:` na mesma classe (medido: o disco não
              saía do lugar). Fora das camadas do Tailwind esse empate não
              existe.
          Desde 15/10 o disco ENCOSTA na borda esquerda do conteúdo em vez de
          sangrar para fora dela: com o texto no meio da cena, sangrar deixou de
          ter função. No celular a caixa fica centrada no bloco de 420px que vem
          depois dos botões — lá não há pino nem rótulo (sete caixas de texto
          não cabem em 370px), e quem nomeia o país é a `StageStatus`. */}
      <div ref={caixa} className="hero-globo">
        {/* Halo, oceano e atmosfera: CSS, pintados no servidor. É o que faz o
            planeta existir antes de o JavaScript montar a nuvem — e é também
            onde o custo deles é ZERO por quadro, que é o que permite ter os
            três sem tocar nos 30 fps do laço. O halo vem primeiro porque mora
            para FORA do disco (`inset: -28px`); o oceano o cobre no miolo. */}
        <span className="globe-halo block" />
        <span className="globe-sea absolute inset-0 block" />
        <span className="globe-air absolute inset-0 block" />

        {/* A MARCA ao fundo do planeta: o ícone da Wone, 46% do diâmetro, creme
            a 6%, ENTRE o oceano e os pontos — pintada pelo servidor, como o
            oceano. É o que termina de dar a cara: o planeta é da Wone, e isso
            se lê antes de qualquer rótulo.
            É MÁSCARA, não `<img>`: o PNG da marca é laranja chapado, e
            `filter: brightness(0) invert(1)` devolvia um branco frio que, a 6%
            sobre o preto, ficava CINZA ao lado de uma terra toda laranja. A
            máscara usa só o alfa do arquivo e pinta o creme da marca por baixo
            — a cor é exata e não depende de conta de filtro. O arquivo é o
            MESMO que o cabeçalho já pede na primeira dobra, então o navegador
            não faz pedido novo. A caixa é absoluta e tem proporção cravada:
            CLS 0. */}
        <span
          ref={marca}
          className="globe-mark absolute top-1/2 left-1/2 block aspect-[642/400] w-[46%] -translate-x-1/2 -translate-y-1/2"
        />

        {/* A terra firme. Vazio e transparente até o primeiro quadro. */}
        <canvas ref={tela} className="absolute inset-0 h-full w-full" />

        {/* O LIMBO POR DENTRO: os últimos 6% do raio escurecem até 35% de
            preto. Vem DEPOIS do canvas de propósito — é dos pontos que ele
            precisa tirar peso, e é isso que faz o disco virar bola. Continua
            CSS e continua custando zero por quadro fora do mergulho: ele não
            gira, só ESCALA — e escalar é uma linha de `transform` no
            compositor, não um gradiente radial redesenhado 30 vezes por
            segundo.
            A VIGIA em volta dele é o que torna isso possível: a 1,8× o aro
            escuro do limbo cai fora do disco, e sem o recorte ele pintaria um
            anel preto por cima da coluna de texto. É o mesmo círculo fixo que
            corta o canvas, agora em CSS — uma vigia, dois materiais. */}
        <span className="globe-vigia">
          <span ref={limbo} className="globe-limbo block" />
        </span>

        {/* Os pinos. Abaixo de `lg` não existem (globo atrás do aparelho).
            Na entrada eles aparecem DEPOIS da onda (700 ms), e só em
            opacidade: mover um pino seria mentir sobre o lugar dele no planeta,
            e mostrá-lo antes da onda seria pendurá-lo no vazio. */}
        <div className="ent-surge absolute inset-0 hidden [--ent-atraso:380ms] lg:block">
          {pins.map((pin, index) => {
            const p = REPOUSO[pin.code];
            if (!p) return null;
            return (
              <CountryTag
                key={pin.code}
                code={pin.code}
                city={pin.city}
                chip={pin.chip}
                left={p.left}
                top={p.top}
                side={p.side}
                nudge={p.nudge}
                sempre={EUROPEUS.has(pin.code)}
                active={index === activeIndex}
                animated={animated}
                pinRef={(el) => {
                  alfinetes.current[index] = el;
                }}
              />
            );
          })}
        </div>
      </div>

      {/* O arco do país ativo até o aparelho. Montar é animar (`key`), e com
          movimento reduzido ou pausado ele é pintado estático. Só a partir de
          `xl`, onde há corredor entre o globo e o telefone. */}
      <svg className="absolute inset-0 hidden h-full w-full xl:block">
        {arco ? (
          <path
            key={arco.code}
            className={animated && running ? "globe-arc" : undefined}
            d={arco.d}
            pathLength="1"
            fill="none"
            stroke={LARANJA}
            strokeWidth="1.5"
            strokeOpacity="0.55"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </div>
  );
}

/** Vetor de base da capital, memorizado por código (quatro entradas). */
const ALVOS = new Map<string, [number, number, number]>();
function alvo(code: string): [number, number, number] {
  let v = ALVOS.get(code);
  if (!v) {
    const lugar = CAPITAIS[code] ?? { lat: 0, lon: 0 };
    v = baseVector(lugar.lat, lugar.lon);
    ALVOS.set(code, v);
  }
  return v;
}

/* ----------------------------------------------------------- a trama do mar */

/**
 * A TRAMA DO MAR (pedido do dono, 15/10: "uma trama de pontos de mar muito
 * fraca, para o disco ler inteiro e não só os continentes").
 *
 * É a MESMA espiral de Fibonacci da terra firme — `amostra()`, a função que o
 * gerador e o cliente já compartilham —, só que com 900 candidatos em vez de
 * 26 mil e sem máscara nenhuma: ela cobre a esfera inteira, oceano e
 * continente. Os pontos que caem em terra ficam debaixo dos 5.102 pontos
 * laranja, que são muito mais fortes, e somem.
 *
 * POR QUE NO CANVAS, e não em CSS como o halo e o limbo: a trama GIRA. Ela é a
 * única das três coisas novas do planeta que depende do ângulo — é dela que
 * vem a sensação de bola girando no meio do oceano vazio. Custa 900 pontos a
 * mais por quadro (+0,4 ms sobre 2,2), e eles entram num `fill` só.
 */
const MAR_PONTOS = 900;

/**
 * A SEGUNDA TRAMA, a do mergulho: 1.800 pontos próprios, numa espiral INDEPENDENTE
 * da primeira (o mesmo truque da segunda nuvem da Europa — dois sorteios de
 * Fibonacci se sobrepõem sem se alinhar, e o resultado lê como uma trama só,
 * mais densa).
 *
 * Ela existe porque a 1,8× os 900 pontos do mar se espalham por 3,24 vezes a
 * área e o oceano fica vazio: APROXIMAR ESTAVA TIRANDO TEXTURA. Com 2.700
 * pontos no total o mar volta a ter, na tela, a densidade que tem em repouso.
 * Só é montada quando o primeiro mergulho pede (`marFino()` é preguiçoso), e só
 * é desenhada enquanto `zoom > 0`.
 */
const MAR_FINO_PONTOS = 1800;

let MAR: Float32Array | null = null;
let MAR_FINO: Float32Array | null = null;

/** Monta uma espiral de mar na base da projeção. */
function tecelagem(total: number): Float32Array {
  const out = new Float32Array(total * 3);
  for (let i = 0; i < total; i += 1) {
    const { lat, lon } = amostra(i, total);
    const [x, y, z] = baseVector(lat, lon);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

function mar(): Float32Array {
  return (MAR ??= tecelagem(MAR_PONTOS));
}

function marFino(): Float32Array {
  return (MAR_FINO ??= tecelagem(MAR_FINO_PONTOS));
}

/* ------------------------------------------------------------------ a rede */

/**
 * As sete pernas da rede, em anel: México → Colômbia → Equador → Brasil →
 * Argentina → Portugal → Reino Unido → México. São os MESMOS sete países dos
 * pinos — a rede não acrescenta mercado nenhum, ela mostra que os sete estão
 * ligados.
 *
 * A ordem do anel é geográfica, não a da tabela: assim nenhuma perna cruza o
 * disco de lado a lado, e a volta se lê como um circuito. A perna que fecha o
 * anel (Londres → Cidade do México) é a única que atravessa o Atlântico por
 * cima, e é ela que diz, sem palavra, que a Europa entrou.
 */
const REDE_PERNAS: [string, string][] = [
  ["MXN", "COP"],
  ["COP", "USD"],
  ["USD", "BRL"],
  ["BRL", "ARS"],
  ["ARS", "EUR"],
  ["EUR", "GBP"],
  ["GBP", "MXN"],
];

/** Pontos por perna. 22 dá a curva lisa a R 300 sem virar polilinha visível. */
const REDE_PASSOS = 22;

let REDE: Float32Array | null = null;

/**
 * Os pontos das quatro pernas na base da projeção, montados UMA vez (4×23
 * vetores): interpolação esférica entre as duas capitais — o grande-círculo,
 * não a reta da tela — com uma elevação de 3,5% do raio no meio do caminho e
 * zero nas pontas, que é o que ergue a perna do chão sem desgrudá-la do pino.
 */
function rede(): Float32Array {
  if (REDE) return REDE;
  const n = REDE_PASSOS + 1;
  const out = new Float32Array(REDE_PERNAS.length * n * 3);
  let k = 0;
  for (const [de, para] of REDE_PERNAS) {
    const a = alvo(de);
    const b = alvo(para);
    const d = Math.min(
      1,
      Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
    );
    const omega = Math.acos(d);
    const so = Math.sin(omega);
    for (let s = 0; s < n; s += 1) {
      const t = s / REDE_PASSOS;
      const wa = so < 1e-6 ? 1 - t : Math.sin((1 - t) * omega) / so;
      const wb = so < 1e-6 ? t : Math.sin(t * omega) / so;
      const sobe = 1 + 0.035 * Math.sin(Math.PI * t);
      out[k] = (a[0] * wa + b[0] * wb) * sobe;
      out[k + 1] = (a[1] * wa + b[1] * wb) * sobe;
      out[k + 2] = (a[2] * wa + b[2] * wb) * sobe;
      k += 3;
    }
  }
  REDE = out;
  return out;
}

/**
 * Média móvel do custo de desenho, exposta em `window.__globo` para a medição
 * no navegador (custo por quadro e contagem de quadros, que é como se prova que
 * os quatro freios param o laço). Duas leituras de `performance.now` por
 * quadro; nada é impresso no console.
 */
function medidor(ms: number, zoom: number, escala: number, fase: number) {
  const w = window as typeof window & {
    __globo?: {
      quadros: number;
      soma: number;
      media: number;
      pior: number;
      passo: number;
      zoom: number;
      escala: number;
      fase: number;
    };
  };
  const m = (w.__globo ??= {
    quadros: 0,
    soma: 0,
    media: 0,
    pior: 0,
    passo: GLOBE_STEP,
    zoom: 0,
    escala: 1,
    fase: -1,
  });
  m.quadros += 1;
  m.soma += ms;
  m.media = m.soma / m.quadros;
  /* O PIOR QUADRO, e não só a média: o orçamento do hero é por quadro (teto de
     ~4 ms), e uma média de 2 ms esconde um pico de 8 — que é justamente o que
     um mergulho poderia trazer, já que a escala muda o que o canvas rasteriza.
     Três números a mais num objeto que já existia; zero custo por quadro. */
  if (ms > m.pior) m.pior = ms;
  /* O estado do mergulho, para a medição no navegador poder provar a ORDEM do
     ciclo sem olhar fotografia: `fase` é a batida (0–4), `zoom` o fator e
     `escala` o que o contexto está aplicando. */
  m.zoom = zoom;
  m.escala = escala;
  m.fase = fase;
}
