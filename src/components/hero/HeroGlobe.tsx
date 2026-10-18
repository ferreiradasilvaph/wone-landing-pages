"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type RefObject } from "react";

import {
  cena,
  CHEGOU_DENTRO,
  CHEGOU_FORA,
  COSTA,
  entrega,
  PAIS_BORDA,
  PAIS_NUCLEO,
  PULSO_MS,
  TERRA,
  temWebGL,
  VIGIA_DENTRO,
  VIGIA_FORA,
  ZOOM_ANEL,
  type Nuvem,
} from "./cena";
import { CountryTag } from "./CountryTag";
import {
  DURACAO_SP_MS,
  enquadraSP,
  mergulhoSP,
  visibilidades,
  ZOOM_CIDADE,
} from "./mergulhoSP";
import {
  GLOBE_COAST,
  GLOBE_COUNT,
  GLOBE_DELTAS,
  GLOBE_EU_COUNT,
  GLOBE_EU_DELTAS,
  GLOBE_EU_SAMPLES,
} from "./globeDots";
import {
  alvo,
  amostra,
  baseVector,
  CAPITAIS,
  centraliza,
  EUROPEUS,
  naEuropa,
  GLOBE_STEP,
  LAT0,
  LON0,
  noise,
  rede,
  REDE_PASSOS,
  REDE_PERNAS,
  REDE_SOBE,
  REPOUSO,
} from "./globeMath";
import {
  ATRASO,
  distancia,
  duracaoDe,
  interpola,
  mergulho,
  perna,
  POUSO_MS,
  suave,
  vista,
  VISTA_DETALHE,
  voo,
  ZOOM_DETALHE,
  type Estado,
  type Ponto,
} from "./voo";

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
   (~0,4 ms, dentro de efeito) e redesenhados a 60 fps desde o voo de 17/10 (o
   acelerador de 30 saiu: ver `PASSO_MS`). O desenho não faz 2.000
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

   OS CINCO NÚMEROS DA PALETA MUDARAM DE ARQUIVO em 17/10, com a etapa 1 do
   globo 3D: eles moram em `cena.ts`, que é o contrato entre os dois pintores do
   planeta. Não é zelo — é que uma divergência de cor entre os dois canvas
   apareceria como um SALTO no instante do crossfade, e dois arquivos escrevendo
   `#ff7700` de cabeça são dois lugares para o próximo ajuste esquecer um.
   -------------------------------------------------------------------------- */

/**
 * A guarda da ONDA DE ENTRADA fora do laço, em ms. 27 e não 33: num monitor de
 * 60 Hz os quadros chegam de 16,7 em 16,7 ms, então 27 deixa passar o segundo
 * (33,3) e dá 30 fps; com 33 o segundo quadro chegaria CEDO por 0,3 ms, seria
 * descartado, e o laço cairia para 20 fps.
 *
 * ELA NÃO VALE MAIS PARA O LAÇO DO VOO (17/10, pedido do dono: "60fps").
 * Acelerador num voo é jitter: a bolinha e a câmera leem um relógio contínuo, e
 * entregar 30 amostras por segundo de um movimento de 2,6 s faz a borda dos
 * pontos pisar em meio pixel a cada quadro. Aqui sobrou só para o caminho SEM
 * voo (celular, movimento reduzido, freio puxado), onde o único movimento é a
 * onda de 1,1 s e 30 fps é o que ela merece de bateria.
 */
const PASSO_MS = 27;

/** Quanto dura o laranja cheio na perna que chega à Europa, em ms. */
const FLASH_MS = 1000;

/**
 * A BOLINHA, O RASTRO E O PULSO.
 *
 * Os três leem o MESMO relógio do voo (`relogio.ms`, o tempo desde o pouso), e
 * por isso não têm como discordar sobre onde a bolinha está nem sobre quando a
 * cidade acendeu. Os três só existem com o laço de pé: fora de `lg`, ou com
 * qualquer freio puxado (movimento reduzido, aba oculta, hero fora da tela), o
 * globo é redesenhado UMA vez por troca, e uma animação de 2,6 s num quadro só
 * seria um piscar aleatório — que é exatamente o que o portão de movimento
 * proíbe.
 */
/**
 * Quantos pontos tem a cauda da bolinha e o quanto cada um fica para trás, em
 * fração da perna.
 *
 * A cauda é CURTA de propósito: quem conta a história do trajeto agora é o
 * RASTRO (o arco desenhado atrás dela), e uma cauda longa em cima do rastro
 * engrossaria a linha em vez de dar velocidade. 2% da perna por ponto são 1,7°
 * de arco na perna mais longa e 0,13° na mais curta — a bolinha vira cometa só
 * quando há viagem para isso, o que é exatamente a leitura certa.
 */
const BOLA_CAUDA = 4;
const BOLA_PASSO = 0.02;
/**
 * O RASTRO: quantos segmentos no arco e quanto tempo ele leva para apagar
 * depois do pouso.
 *
 * 24 segmentos dão a curva lisa num disco de R 317 sem virar polilinha visível
 * (a perna mais longa tem 85°, logo 3,6° por segmento: a flecha do arco é
 * 0,05% do raio, meio pixel). 1 s de desvanecer é o pedido — "o rastro segue
 * atrás da bolinha e some aos poucos depois" —, e ele cabe inteiro na primeira
 * metade do pouso de 1,8 s: quando a câmera parte para a próxima cidade, o
 * rastro da perna anterior já saiu de cena.
 */
const RASTRO_PASSOS = 24;
const RASTRO_SOME_MS = 1000;
/** Alfa do rastro no voo. O mesmo peso das pernas acesas da rede. */
const RASTRO_ALFA = 0.5;

/** Raio angular, em radianos, do núcleo e da borda do tingimento (500/1.100 km). */
const NUCLEO = 500 / 6371;
const BORDA = 1100 / 6371;

/* --------------------------------------------------------------------------
   A CÂMERA QUE ACOMPANHA A BOLINHA (pedido do dono, 17/10)

   "No hero, o globo tem a câmera desacoplada da bolinha que viaja entre as
   cidades (...) Quero uma câmera que ACOMPANHA a bolinha, tipo 'voo' do Google
   Earth."

   O QUE SAIU DAQUI. Até esta manhã havia um CICLO DE CINCO BATIDAS: duas
   batidas de enquadramento normal, uma de mergulho a 1,8× e duas de deslize,
   com o pan de 1.300 ms começando 300 ms DEPOIS de a bolinha ter corrido o
   arco — e a bolinha corria uma perna do anel geográfico da rede, que não é a
   fila das cidades (elas discordavam em cinco das sete trocas, e era disso que
   vinham os "cortes"). Três relógios, dois caminhos. O ciclo inteiro saiu; o que
   ficou foi a INFRAESTRUTURA dele, que estava certa e continua valendo palavra
   por palavra (a vigia circular fixa, a borda redesenhada por cima, o limbo na
   mesma matriz, os pinos com a mesma conta, os dois corretores de espessura, o
   dpr maior no zoom, os rótulos que apagam pela vigia).

   O ZOOM DE POUSO É CALIBRÁVEL numa linha: `ZOOM_DETALHE`, em `voo.ts`. Ele
   nasceu em 1,8× (herdado do mergulho) e caiu para 1,35× no mesmo dia, a
   pedido do dono — "diminua o zoom nas transações onde o ponto passa". Tudo o
   que depende de escala neste arquivo é relativo a ele.

   O MODELO ESTÁ EM `voo.ts`, e é PURO: ele diz em que fase o voo está
   (`pouso`/`voo`), onde a bolinha está (`bola`), o que a câmera centraliza
   (`camera` — a mesma interpolação de grande círculo, 4% atrás dela), qual a
   escala (`zoom`, pela curva de van Wijk) e quanto dura a perna. Este arquivo
   só DESENHA o que aquele diz, e é por isso que giro e zoom não têm como
   discordar: eles saem da mesma conta.

   O DISCO NÃO MUDA DE TAMANHO. NUNCA.

   É a frase que resume o desenho, e é o pedido do dono em 17/10: "faça o zoom
   se aplicar dentro do globo. contorne todo o globo com o zoom". O globo é uma
   VIGIA — um círculo de raio `g.raio` centrado em `(R, R)`, do tamanho que
   sempre teve — e o voo acontece atrás do vidro. Nenhum pixel do planeta
   aparece fora dessa circunferência em nenhum instante.

   Isso tem três consequências mecânicas, e as três estão no código:
    · o recorte é CIRCULAR e fica FORA da matriz do zoom (`ctx.save()`, caminho
      do círculo fixo, `clip()`, só então a matriz). Dentro dela o recorte
      ampliaria junto e deixaria de ser vigia;
    · a CIRCUNFERÊNCIA é redesenhada por cima do recorte, em coordenadas da
      caixa: um corte seco deixa serrilha onde o terreno ampliado encosta na
      borda, e o fio de 1,5px no laranja de `.globe-air` a devolve limpa;
    · os PINOS são DOM e o canvas não os corta: eles desvanecem por opacidade
      antes de cruzar a borda, pela distância ao centro contra o raio.

   A ÂNCORA DO ZOOM É O CENTRO DA CAIXA, e isto é simplificação de verdade, não
   economia: a câmera já CENTRALIZA o ponto de interesse, então escalar em torno
   do meio do disco deixa esse ponto matematicamente parado. O mergulho antigo
   precisava ancorar no pino porque o giro dele chegava DEPOIS; aqui não há
   "depois".

   APROXIMAR REVELA. Ampliar uma foto deixa tudo maior; aproximar um mapa
   mostra mais. Daí os dois corretores de espessura (ver `fio` e `grao`, no
   laço), a malha de 15° que nasce no zoom, a segunda trama de mar e o dpr mais
   alto. É o que separa ZOOM de AMPLIAÇÃO.
   -------------------------------------------------------------------------- */

/**
 * A ESPERA DA ENTRADA, em ms: o voo só começa depois dela.
 *
 * 2,2 s é a rampa de entrada que já existia — o tempo em que o título, o lead e
 * os botões sobem, e em que o globo tem de ficar EXATAMENTE no enquadramento
 * em que o servidor o pintou (o `<h1>` ao lado é o LCP da página; um salto de
 * câmera em cima dele é o tipo de coisa que o portão do hero proíbe). Durante
 * esses 2,2 s a câmera está no centro da projeção e a escala é 1: o primeiro
 * quadro do laço cai sobre o quadro do servidor, pixel a pixel.
 */
const ESPERA_MS = 2200;

/**
 * O ANEL DE ALVO no pino da cidade da vez, em px de tela. É o que o Maps põe no
 * ponto escolhido; aqui ele marca o POUSO, e cresce com a escala.
 */

/**
 * O PESO DO CURSOR depois que a câmera passou a seguir a bolinha: 40% do gesto
 * que ele tinha.
 *
 * O cursor move o planeta desde 16/10 ("deixe o globo interativo, ao passar o
 * cursor por cima deve se mexer") e continua movendo — mas agora o planeta
 * está sempre aproximado, e no zoom cada grau de guinada vale mais pixel. A
 * 40% o empurrão máximo é 2,2° de guinada e 1,2° de inclinação, que no detalhe
 * de 1,35× deslocam a bolinha 5% do raio do disco: o globo responde à mão sem
 * tirar do meio o ponto que o voo está afirmando.
 */
const CURSOR_PESO = 0.4;

/**
 * O TETO DE dt, em ms. Um quadro que chega depois disto (uma pausa do
 * compositor, um garbage collect, a aba voltando) não pode empurrar o voo:
 * 100 ms é mais que o dobro de um quadro de 24 fps e menos que um décimo da
 * perna mais curta. Sem este teto, voltar de um congelamento de 2 s avançaria o
 * voo até a cidade seguinte num quadro — ou seja um corte, que é o defeito que
 * este trabalho inteiro foi feito para apagar.
 */
const DT_TETO = 100;


/* --------------------------------------------------------------------------
   OS OUTROS SEIS RÓTULOS: APAGAM NO VOO, VOLTAM NO POUSO

   É o pedido ao pé da letra — "os outros rótulos apagam durante o voo e
   reaparecem só no pouso se couberem na vigia" —, e é também a correção de um
   defeito medido: no zoom de detalhe os pinos se afastam uns dos outros por
   35% da distância que já tinham, e seis rótulos soltos num planeta que viaja
   atravessam o disco e vão parar em cima da coluna de texto (a 1512 de janela o
   `<h1>` começa em x 841; com o desvanecer amarrado à escala, o rótulo mais a
   leste chegou a x 932 — 91px dentro do texto).

   A sequência: 300 ms para SAIR, no começo do voo — eles saem enquanto a
   câmera ainda está acelerando, que é quando o deslocamento deles ainda é
   pequeno; e, no pouso, 300 ms de espera (o pulso do pino abre primeiro,
   sozinho) e 500 ms para VOLTAR, com a câmera já parada. Ficam cheios por ~1 s
   antes de o voo seguinte começar.

   Quem decide se um rótulo CABE não é o tempo, é a geometria: a vigia
   (`VIGIA_*`) tira quem saiu do disco e a régua da coluna de texto
   (`CHEGOU_*`) tira quem está longe do meio. Ver os dois comentários abaixo.
   -------------------------------------------------------------------------- */
const ROTULO_SAI_MS = 300;
const ROTULO_VOLTA_MS = 500;
/** Quanto a volta dos rótulos espera depois do pouso: o pulso do pino vai sozinho. */
const ROTULO_ESPERA_MS = 300;

/**
 * A VIGIA, para os pinos: a faixa de raio em que o rótulo desvanece, em fração
 * de R. É a MESMA faixa do limbo que já existia — a rampa de `z2` de 0,05 a
 * 0,30 é esta mesma, escrita em cosseno em vez de raio (`rad = √(1 − z2²)`), e
 * por isso em repouso nada muda. O que ela acrescenta é valer no espaço JÁ
 * ESCALADO: com o zoom de pouso, o pino longe da cidade da vez sai do disco, e
 * um rótulo pendurado no vazio ao lado do planeta é pior que nenhum.
 */

/* --------------------------------------------------------------------------
   A RÉGUA DA COLUNA DE TEXTO: UM RÓTULO SÓ EXISTE PERTO DO MEIO

   É a guarda GEOMÉTRICA — a única que não depende de tempo — e desde 17/10 ela
   vale para TODOS os sete rótulos, não só para o da cidade focada. A razão é a
   mesma de antes, agora permanente: a câmera está sempre aproximada, e no zoom
   de detalhe cada 1% do raio vale mais pixel. Um rótulo a meio caminho da borda
   abre 240px de caixa de texto e vai parar dentro da coluna do `<h1>`.

   A opacidade é função do raio: cheia até 34% de R do centro, zero a partir de
   52%.

   Os dois números são medidos, e quem os fixa é o rótulo MAIS LARGO dos sete:
   "Transferência CVU / CBU · $ 38.000", 239px, abrindo para a direita. Com o
   pino a 34% de R (caixa de 665, R 332), a borda direita dele cai em x 798
   contra os 841 do `<h1>` — 43px de folga. A 52% ela chegaria a 858, e é por
   isso que lá a opacidade já é zero.

   Três coisas vêm de graça com ela:
    · o rótulo da cidade em que se pousou está no MEIO (rad ~0), logo sempre
      cheio — a chegada nunca é penalizada;
    · o rótulo da cidade de onde se partiu apaga por DISTÂNCIA assim que o voo
      começa, antes de poder viajar para cima do texto;
    · no pouso, "reaparecem só se couberem" deixa de ser promessa e passa a ser
      conta: quem está longe do meio não acende.
   -------------------------------------------------------------------------- */


/** O piso do alfinete quando o rótulo se retira. Ver `PISO_PONTO` no 3D. */
const PISO_PONTO_2D = 0.38;

/**
 * O RAIO DE CLIQUE de um país, em px da caixa do globo.
 *
 * 30 e não os 6 px do desenho do ponto: o planeta está sempre em movimento, e
 * perseguir um alvo de 6 px que anda é o tipo de interação que ninguém tenta
 * duas vezes. 30 px é o dobro do mínimo que as diretrizes de toque pedem para o
 * RAIO, e ainda assim menor que a metade da distância entre os dois pinos mais
 * próximos da tela (Bogotá e Quito ficam a 27 px um do outro em repouso, mas no
 * zoom de pouso de 1,35× isso vira 37) — então nunca há dúvida sobre qual país
 * foi escolhido: o mais perto ganha, e o empate não existe.
 */
const RAIO_CLIQUE = 30;

/**
 * A DURAÇÃO MÍNIMA de um desvio, em ms.
 *
 * A régua do tour (`duracaoDe`) dá 1.200 ms de base mais 500 a cada 30° de
 * arco, e ela foi escrita para pernas entre capitais, que nunca são curtas. Um
 * desvio pode ser curtíssimo: clicar em Quito com a câmera já quase em cima
 * dela são 2° de arco — 1.233 ms pela régua, mas caminho nenhum, e o olho lê um
 * pisca. 900 ms é o piso em que um movimento de câmera ainda se lê como
 * movimento.
 */
const DESVIO_MINIMO_MS = 900;

/**
 * Em que fração do desvio a obliquidade do mergulho volta a zero.
 *
 * 0,40, e é a mesma ideia da fase `sobe` do `mergulhoSP` (lá são 70% de uma
 * fase bem mais curta): endireitar ANTES de afastar é o que se lê como
 * "levantar voo". Afastar com a cidade ainda tombada mostra o limbo da esfera
 * entrando pelo topo do quadro, que é o defeito que a nota de `INCLINACAO_MAX`
 * já descrevia.
 */
const DESVIO_ENDIREITA = 0.4;

/**
 * Quanto tempo o desvio dá a cada "nat" de esforço (arco + escala), em ms.
 *
 * 300, e o número vem da fase `sobe` do mergulho em São Paulo, que o dono
 * aprovou: 9,24 nats em 2,4 s são 260 ms por nat. Com a folga de 300, a subida
 * mais cara que existe — da torre a 9.200 até uma capital do outro lado do
 * Atlântico — leva 2,7 s em vez dos 2,6 s de uma perna comum, e a escala anda a
 * 3,4 nats por segundo em vez de 15.
 */
const DESVIO_MS_POR_NAT = 300;

/**
 * O MERGULHO (ver `cena.mergulho`): a faixa de zoom em que o PLANETA CRESCE
 * e as camadas CSS dele se apagam.
 *
 * Esta rampa já mandou também no texto e na viagem do disco, e era esse o
 * defeito que o dono apontou em 17/10: presos à escala, os três aconteciam no
 * meio da descida, misturados com ela. Agora o texto e a viagem são de TEMPO
 * (a fase `chegada` de `linhaSP`) e esta rampa ficou só com o que de fato
 * depende da escala.
 *
 * Os dois números saem de duas leituras:
 *
 *   · 60 é DEPOIS de os rótulos terem ido embora. Eles morrem com
 *     `mapa > 0,5` (zoom ~29, veja `veuSP` em `HeroGlobe3D`), e os pontos de
 *     terra em 14. Começar a rampa em 60 garante que nada tipográfico está na
 *     tela quando a caixa do planeta muda de tamanho — se estivesse, o texto
 *     do rótulo mudaria de corpo junto, que é o erro clássico de escalar uma
 *     cena inteira por transform.
 *   · 600 é logo acima de `ZOOM_CIDADE` (405), onde a mancha urbana já encheu
 *     o disco. O crescimento termina no mesmo instante em que a cidade passa
 *     a ser o assunto, e não um segundo depois.
 *
 * A travessia 60→600 leva ~1,1 s dentro de `mergulha` (que é logarítmica no
 * tempo), e a mesma faixa ao contrário leva ~0,8 s na `sobe`.
 */
const CINE_Z0 = 60;
const CINE_Z1 = 600;
const LN_CINE_0 = Math.log(CINE_Z0);
const LN_CINE_1 = Math.log(CINE_Z1);
/** Abaixo disto o sinal está desligado para valer (classe fora, estilo fora). */
const CINE_PISO = 0.002;

/**
 * A TAXA MÁXIMA de `cena.cine`, em unidades por ms: 1 em 600 ms.
 *
 * Subindo ela nunca morde — a rampa da fase `chegada` leva 1,1 s e o pico
 * da `suave` dá 1 em 733 ms. Ela existe para o DESVIO: um clique no meio da
 * torre põe o alvo em zero no mesmo quadro, e sem limite o planeta saltaria
 * de volta para a coluna da esquerda enquanto a câmera parte. Com ela, a
 * volta leva no máximo 0,6 s e o passo a 60 fps fica em 0,028 — bem abaixo
 * do degrau de 0,1 que o olho pega.
 */
const CINE_TAXA = 1 / 600;

/* --------------------------------------------------------------------------
   O GIRO LIVRE: os quatro números do gesto

   A inclinação é presa em ±35° porque acima disso o polo entra no disco e a
   projeção ortográfica deixa de mostrar um planeta — mostra uma tampa. É o
   mesmo limite que qualquer globo manipulável usa, e aqui ele também protege o
   enquadramento do voo, que continua contando por baixo.

   A INÉRCIA é curta de propósito: `e^(−4t)` tira 98% da velocidade em um
   segundo. O gesto tem de responder e acabar — um planeta que continua rodando
   sozinho depois do dedo é um planeta que roubou o voo.

   A MOLA DE VOLTA tem constante de 0,8 s, e ela é o "levemente" do pedido: o
   deslocamento livre sempre volta a zero, então o enquadramento que o voo está
   afirmando nunca se perde. O visitante empurra, o planeta responde, e o palco
   retoma a sua história.

   O EMPURRÃO do clique seco leva o ponto clicado 25% do caminho até o meio.
   Mais do que isso e um clique distraído tira a cidade do foco; menos e o
   clique não se lê como resposta.
   -------------------------------------------------------------------------- */
const LIVRE_PITCH_MAX = (35 * Math.PI) / 180;
const LIVRE_INERCIA_MS = 250;
const LIVRE_MOLA_MS = 800;
const EMPURRAO = 0.25;
const CLIQUE_SECO_PX = 6;
const CLIQUE_SECO_MS = 300;

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
    /* O `fleck` é guardado desde 17/10 porque a cena 3D o lê para a COR e para
       o ALFA de cada ponto (ver `HeroGlobe3D`). Aqui ele continua entrando
       dissolvido em `rb`; recuperá-lo de lá seria desfazer uma conta de três
       termos, e a semente dele — o índice da espiral — não sobrevive à
       montagem. 20 kB numa nuvem de 180. */
    fleck: new Float32Array(n),
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
    nuvem.fleck[k] = fleck;

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
    nuvem.fleck[k] = noise(indiceEu + 0.25);
    nuvem.rb[k] = 1.15 * (0.86 + 0.3 * nuvem.fleck[k]);
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

/* --------------------------------------------------------------------------
   O PLANETA 3D, E O PORTÃO QUE O DEIXA ENTRAR (etapa 1, pedido do dono 17/10)

   `next/dynamic` com `ssr: false` — e isso é só metade do trabalho. O que
   `dynamic` garante é que o código não entra no HTML do servidor nem no bundle
   da primeira dobra; o que ele NÃO garante é QUANDO baixar, porque ele só adia
   o download até o componente RENDERIZAR. Então o portão é o render, e ele tem
   quatro trancas, todas medidas na entrega:

    1. `lg` para cima. Abaixo de 1024 o globo é um quadro parado atrás do texto,
       sem pino e sem rótulo, e um contexto WebGL ali seria bateria gasta num
       planeta que já se leu. O celular é a etapa 6.
    2. WebGL de pé (`temWebGL`, uma vez). Sem ele o portão nunca abre e o 2D
       fica — o fallback do pedido, sem uma linha de código própria.
    3. O laço rodando (`running`): hero na tela, aba visível e SEM movimento
       reduzido. Com a preferência ligada não há voo, logo não há quem chame
       `entrega()`, logo o canvas 3D nasceria preto e ficaria — então ele
       simplesmente não nasce. "Globo parado, sem voo" continua sendo o canvas
       2D de hoje.
    4. DEPOIS DO LCP. O elemento de LCP desta página é o `span.globe-mark` — a
       marca d'água dentro do globo, medida hoje em 0,92 s no desktop —, e nada
       aqui pode atrasá-la nem movê-la. São três esperas em série: o evento
       `load` da janela, um `requestIdleCallback` (com teto de 1,5 s, que é
       também o fallback para quem não o tem) e o fim da ENTRADA do hero (os
       2,2 s de `ESPERA_MS`).

   A entrada é medida no relógio do PRÓPRIO globo (`relogio.entrada`), não em
   `performance.now()`: ele é um acumulador que para com os freios, então uma
   aba em segundo plano não "gasta" a entrada sem ninguém ver — exatamente como
   o voo. Daí a espera ser um `setTimeout` curto repetido em vez de um prazo
   calculado: o fim da entrada não é um instante do relógio de parede.
   -------------------------------------------------------------------------- */
const HeroGlobe3D = dynamic(() => import("./HeroGlobe3D"), { ssr: false });

/** De quanto em quanto se olha o relógio da entrada, em ms. */
const PORTAO_PASSO = 100;

/* --------------------------------------------------------------------------
   A PARADA MAIS LONGA DO TOUR: SÃO PAULO

   Pedido do dono, 17/10: "quando a bolinha parar no brasil, aumente o zoom e
   mostre como se fosse imagens de satélite reais detalhando a cidade de são
   paulo, essa pausa da bolinha vai ser a mais longa dentre os outros países".

   São 11,2 s contra 1,8 s das outras seis, e o modelo de tempo disso vive em
   `mergulhoSP.ts` — puro, sem DOM e sem three, como o `voo.ts` ao lado. Aqui só
   se LÊ: a cada quadro da parada em São Paulo este laço chama `mergulhoSP(ms)`
   com o tempo decorrido dentro do pouso e publica o resultado no contrato.

   QUEM NÃO MERGULHA: o canvas 2D. Ele é o placeholder, o fallback sem WebGL e o
   caminho do movimento reduzido, e não tem cidade nenhuma para mostrar — a
   textura noturna e os prédios são geometria 3D. Então, nos 11,2 s, ele fica no
   enquadramento de pouso (1,35×) e espera. É por isso que a escala do mergulho
   mora em `cena.sp.zoom` e não sobrescreve `cena.escala`.

   SÃO PAULO É O ÍNDICE 0 porque a lista é `payments.table.countries` e o Brasil
   abre a fila — mas a comparação abaixo é pelo CÓDIGO, não pelo índice: a ordem
   é do dicionário, e um dia ela pode mudar sem que ninguém se lembre daqui.
   -------------------------------------------------------------------------- */
const CIDADE_MERGULHO = "BRL";

/**
 * QUANTO O PORTÃO ESPERA O LCP ASSENTAR, em ms, e o TETO dessa espera.
 *
 * "Só depois do LCP" era aproximado por um relógio: `load` + um instante de
 * ócio + a entrada do hero. No desktop isso basta de sobra (o LCP de lá é 0,7 s
 * e a entrada sozinha já leva 2,2 s). NO CELULAR NÃO BASTAVA, e o número
 * mostrou: com a etapa 6 montando a cena 3D lá, a montagem caía por volta de
 * 2,2 s — ANTES do LCP de 3,4 s — e o custo de avaliar o chunk do three entrava
 * inteiro na janela de bloqueio. O TBT mobile pulou de 101 ms para 464 ms e a
 * nota do Lighthouse caiu de 91 para 80.
 *
 * Então o portão passou a PERGUNTAR, em vez de supor: um `PerformanceObserver`
 * de `largest-contentful-paint` com `buffered`, e a espera acaba quando passa
 * 1 s sem entrada nova — o LCP é o ÚLTIMO candidato, então "parou de mudar" é a
 * única definição de "já aconteceu" que existe antes da interação.
 *
 * O teto de 5 s é o seguro: num navegador sem a API (ou numa página que nunca
 * emita o evento) a espera acabaria nunca, e um globo que não monta é pior que
 * um globo que monta tarde.
 */
const LCP_CALMA = 1000;
const LCP_TETO = 5000;

/* --------------------------------------------------------------------------
   A QUINTA TRANCA, E ELA SÓ EXISTE NO CELULAR: UM GESTO.

   Medido em 17/10, com a etapa 6: montar a cena 3D no celular custou 357 ms de
   TBT (de 101 para 458) e 12 pontos de Lighthouse mobile (de 91 para 79). O
   custo NÃO é o desenho — o quadro de lá mede 0,18 ms, bem dentro dos 6 ms que
   o pedido admite. É AVALIAR O CHUNK: 238 kB de `three` mais
   `@react-three/fiber` levam ~350 ms de parse e execução num processador quatro
   vezes mais lento, e isso é uma tarefa longa aconteça ela quando acontecer.
   Adiar não resolve, e isso também foi medido: o TBT soma as tarefas longas até
   o TTI, e o TTI é empurrado PELA PRÓPRIA tarefa — quanto mais tarde ela cai,
   mais tarde o TTI, e ela continua dentro da janela.

   O que resolve é não pagar por quem não está olhando. E, no celular, essa
   pessoa existe de verdade: lá o globo não é o fundo da primeira dobra, é um
   BLOCO EM FLUXO depois dos botões — quem chega lê o título, lê o lead, toca
   em "Lista de espera" e vai embora sem nunca ter mandado o planeta girar. Um
   contexto WebGL e 238 kB de JavaScript para um globo que ninguém está vendo é
   exatamente a bateria que o pedido manda proteger ("confira que a bateria não
   é castigada").

   Então, abaixo de 1024, o portão espera um GESTO: a primeira rolagem, o
   primeiro toque, a primeira tecla. Quem desce até o planeta o recebe dentro de
   um quadro; quem não desce nunca paga por ele. No desktop não há tranca
   nenhuma a mais — lá o globo É a primeira dobra, e quem abre a página já está
   olhando para ele.

   Efeito colateral honesto, e é por ele que esta tranca não é um truque de
   métrica: uma rodada sintética que não rola a página também é um visitante
   que não está vendo o globo. A regra é a mesma para os dois.
   -------------------------------------------------------------------------- */
const GESTOS = ["scroll", "pointerdown", "touchstart", "keydown"] as const;

type Geometria = {
  /** Lado da caixa, em px de CSS (o globo é quadrado: lado = 2R). */
  lado: number;
  raio: number;
  /**
   * Densidade de pixels do canvas. Era local de `mede()`, e subiu para cá
   * quando o zoom passou a reescrever a matriz do contexto A CADA QUADRO: a
   * escala MULTIPLICA a do dpr, e as duas têm de sair do mesmo lugar ou o
   * planeta desenharia no dobro do tamanho num monitor retina.
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
  onCidade,
  onVoo,
  simulacao,
  alvoRef,
}: {
  /** Na ordem de `payments.table.countries` — sete desde 15/10. */
  pins: { code: string; city: string; chip: string }[];
  activeIndex: number;
  /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
  animated: boolean;
  /** Os freios do relógio do `Hero`, já combinados. */
  running: boolean;
  /**
   * O VOO É O RELÓGIO (pedido do dono, 17/10): a perna de Londres a São Paulo
   * leva 2,6 s e a de Bogotá a Quito 1,3 s, então quem avança a fila é o FIM DO
   * POUSO e não um `setInterval` de 3 s. O globo avisa, o `Hero` espelha — ele
   * continua sendo o dono de `activeIndex` para o DOM (status, chips, resumo
   * para leitor de tela), e é por isso que nada aqui precisou mudar de lugar.
   * Sem este aviso (celular, movimento reduzido) o relógio de 3 s do `Hero`
   * continua mandando, como sempre.
   */
  onCidade?: (indice: number) => void;
  /**
   * O globo passou a voar (ou parou). O `Hero` cala o relógio de 3 s dele
   * enquanto isto for `true` — desde a etapa 6 o voo existe também no celular,
   * e lá ele só começa quando a cena 3D monta, bem depois do LCP.
   */
  onVoo?: (voando: boolean) => void;
  /**
   * O texto "SIMULAÇÃO" (`ui.simulation`), para o rótulo que acompanha a torre
   * da Wone no fundo do mergulho. Vem de fora porque o dicionário é do `Hero` —
   * e porque nenhum texto novo entrou em `pt.ts`/`en.ts` para isto: a página já
   * rotula a ficção do palco com esta mesma palavra, em cima do ticket.
   */
  simulacao?: string;
  /** O nó em que o arco termina: o ticket do palco (ver `HeroTicket`). */
  alvoRef?: RefObject<HTMLElement | null>;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  /**
   * As duas peças de CSS que o zoom mexe: o limbo, que ESCALA com o planeta
   * (ele é o sombreado da esfera, e sombreado parado sobre terra que corre é o
   * defeito clássico de um zoom de imagem), e a marca da Wone, que DISSOLVE (um
   * logotipo de 83% do diâmetro cortado pela vigia seria um borrão).
   * As duas continuam pintadas pelo servidor e continuam custando zero por
   * quadro enquanto a escala é 1 — os 2,2 s da entrada: o laço só escreve nelas
   * depois disso.
   */
  const limbo = useRef<HTMLSpanElement>(null);
  /** O rótulo de ficção da torre, no fundo do mergulho (ver `simulacao`). */
  const rotuloSP = useRef<HTMLSpanElement>(null);
  const marca = useRef<HTMLSpanElement>(null);
  const alfinetes = useRef<(HTMLSpanElement | null)[]>([]);
  const nuvem = useRef<Nuvem | null>(null);
  const geo = useRef<Geometria | null>(null);
  /**
   * O estado de câmera do último quadro — guinada, inclinação e ESCALA.
   *
   * A escala entrou aqui em 17/10 junto com o voo, e não é zelo: quando um
   * freio é puxado (aba oculta, hero fora da tela) o efeito se remonta e
   * desenha UM quadro parado. Sem a escala guardada, esse quadro sairia a 1×
   * com a câmera apontada para uma cidade — ou seja o planeta inteiro
   * descentralizado, que é pior que qualquer coisa que o voo possa fazer.
   */
  const angulo = useRef({ yaw: 0, pitch: 0, escala: 1 });
  const ativo = useRef(activeIndex);
  /**
   * O RELÓGIO DO VOO, e ele é a única fonte de tempo do laço.
   *
   * `ms` é o tempo desde o POUSO na cidade da vez, e é um ACUMULADOR de quadros
   * (`ms += dt`), nunca `performance.now() − carimbo`. A diferença é o pedido:
   * "os quatro freios continuam parando tudo, e ao voltar o voo retoma de onde
   * estava". Com relógio de parede, voltar de 30 s em outra aba cairia três
   * cidades adiante — um corte, que é o defeito que este trabalho apaga.
   *
   * `entrada` é o mesmo acumulador para a ENTRADA (a espera de 2,2 s mais o
   * mergulho até a primeira cidade), e `mergulhou` diz que ela acabou. Eles
   * sobrevivem à remontagem do efeito: só o que o voo já andou é que conta.
   */
  const relogio = useRef({ ms: 0, entrada: 0, mergulhou: false });
  /**
   * O aviso de troca de cidade para o `Hero`, num `ref`: o laço precisa dele
   * por quadro, e uma função nova a cada render do `Hero` remontaria o efeito
   * de desenho — ou seja, reiniciaria o voo — a cada troca de país.
   */
  /**
   * O VISITANTE ESCOLHEU UM PAÍS NO GLOBO (pedido do dono, 17/10).
   *
   * "Quero agora que cada país seja clicável, no globo, e quando clicar no
   * ponto de São Paulo continue o efeito."
   *
   * O que o clique faz é POR O RELÓGIO DO VOO no pouso daquela cidade — e nada
   * mais. Não há um segundo caminho de câmera, não há animação própria, não há
   * estado novo: a cidade escolhida vira a cidade da vez e o ciclo de sempre
   * (pouso → voo → pouso) recomeça dali. É a mesma regra que vale desde 17/10,
   * quando a bolinha e a câmera passaram a sair do mesmo modelo — um dono do
   * tempo, e o clique só mexe no ponteiro dele.
   *
   * E É ISSO QUE FAZ O PEDIDO DE SÃO PAULO FUNCIONAR SOZINHO: a parada de lá
   * dura `DURACAO_SP_MS` e o mergulho é função do tempo DENTRO dela, então
   * zerar o relógio no índice do Brasil é, literalmente, "continuar o efeito".
   * Clicar em São Paulo durante o próprio mergulho o reinicia do alto; clicar
   * vindo de outro país faz a câmera pousar lá e descer.
   *
   * Num `ref` como o resto: ele é lido pelo JSX a cada render, e uma função
   * nova por render remontaria o efeito de desenho — ou seja, reiniciaria o voo
   * — a cada troca de país.
   */
  /**
   * O DESVIO: a perna de voo que um clique abre, de onde a câmera ESTÁ até a
   * cidade escolhida.
   *
   * Pedido do dono, 17/10: "a transição no click deve ser suave". Antes disto o
   * clique era um corte — `ativo = indice; ms = 0` e a câmera aparecia no pouso
   * da cidade nova. Agora ele é uma PERNA como as outras sete: mesmo
   * grande-círculo, mesma curva de van Wijk, mesmo atraso de câmera, mesmo
   * cometa. A única diferença é que ela não começa numa capital — começa onde
   * quer que a câmera estivesse, inclusive em cima da torre de São Paulo a
   * 9.200 de escala.
   *
   * Num `ref` de COMPONENTE e não numa variável do efeito: o efeito de desenho
   * se refaz quando um freio é puxado (aba oculta, hero fora da tela), e um
   * desvio pela metade não pode morrer porque alguém trocou de aba — ele
   * PAUSA, como o relógio do voo ao lado, e retoma de onde estava.
   */
  const desvio = useRef<{
    de: Ponto;
    para: Ponto;
    indice: number;
    /** A largura de vista de ONDE se partiu — o w₀ da curva de van Wijk. */
    w0: number;
    /** Obliquidade e órbita do mergulho no instante do clique, para desfazer. */
    incl0: number;
    orb0: number;
    ms: number;
    duracao: number;
    /** O rastro desta perna já foi montado? */
    montado: boolean;
  } | null>(null);

  /**
   * O ÚLTIMO QUADRO, guardado para o clique poder partir de onde a câmera está.
   *
   * O clique acontece FORA do laço (é um `pointerdown`), e naquele instante não
   * há `cam` nem `esc` na mão de ninguém — eles são variáveis locais de um
   * quadro que já terminou. Sem isto o desvio teria de partir da capital em que
   * o voo estava, e não do ponto do céu onde o espectador está olhando: no meio
   * de uma perna seriam até 42° de salto, e em cima da torre de São Paulo, um
   * corte de 9.200 para 1,35 de escala.
   *
   * `escVista` é a escala que o espectador VÊ — no mergulho de São Paulo é a da
   * caixa `sp`, não a do voo, que lá fica parada em 1,35 para o canvas 2D.
   */
  const ultimoQuadro = useRef<{
    cam: Ponto;
    escVista: number;
    incl: number;
    orb: number;
  }>({ cam: { lat: LAT0, lon: LON0 }, escVista: 1, incl: 0, orb: 0 });

  const escolher = useRef<(indice: number) => void>(() => {});

  /* O MODO CINEMA: a seção (onde a variável CSS mora) e o último valor escrito,
     para não mandar o navegador recalcular estilo num quadro em que o número
     não mudou o bastante para virar pixel. */
  const secaoCine = useRef<HTMLElement | null>(null);
  const cineAnt = useRef(-1);
  const mergAnt = useRef(-1);
  /** O valor corrente de `cena.cine`, que persegue o palco com taxa limitada. */
  const cineAtual = useRef(0);

  const avisar = useRef(onCidade);
  useEffect(() => {
    avisar.current = onCidade;
  }, [onCidade]);

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

  /**
   * O PORTÃO DO PLANETA 3D (ver o comentário de `HeroGlobe3D`, acima).
   *
   * Uma vez aberto, fica aberto: um `running` que oscila (a aba indo e
   * voltando) não pode destruir e recriar o contexto WebGL — perder o contexto
   * é perder os buffers, e recriá-los a cada troca de aba é o gasto que todo
   * este arquivo foi escrito para não ter. Quem para o 3D numa aba oculta é o
   * laço, que simplesmente deixa de entregar quadros.
   */
  const [tres, setTres] = useState(false);

  useEffect(() => {
    if (tres || modo === "parado" || !running) return;

    const marcos = cena().marcos;
    let vivo = true;
    let idle = 0;
    let timer = 0;
    let soltaGesto: (() => void) | null = null;

    /* A terceira espera: o fim da ENTRADA do hero.

       DOIS RELÓGIOS, E A ESCOLHA É DE VIDA OU MORTE — literalmente, porque com
       o errado o portão nunca abre. De `lg` para cima vale o acumulador do
       PRÓPRIO globo (`relogio.entrada`), que só anda com o laço de pé: é o que
       impede uma aba em segundo plano de "gastar" a entrada sem ninguém ver.
       Abaixo de 1024, até a etapa 6, NÃO HAVIA LAÇO — e desde a etapa 6 o laço
       de lá só começa quando a cena 3D monta. Esperar o acumulador ali seria
       esperar uma coisa que só acontece depois do que se está esperando: um
       impasse, e foi exatamente o que a primeira versão desta etapa produziu
       (medido: o portão nunca abriu a 390×844).

       No celular, então, o relógio é o de parede desde a navegação — e ele é
       honesto ali, porque a entrada de lá é animação de CSS pura, que corre no
       mesmo relógio de parede e não para com nada. */
    const entradaAcabou = () =>
      modo === "laco"
        ? relogio.current.entrada >= ESPERA_MS
        : performance.now() >= ESPERA_MS;

    const esperaEntrada = () => {
      if (!vivo) return;
      if (entradaAcabou()) {
        marcos.entrada = performance.now();
        setTres(true);
        return;
      }
      timer = window.setTimeout(esperaEntrada, PORTAO_PASSO);
    };

    /* A espera do LCP. Ver `LCP_CALMA`: a janela de bloqueio do Lighthouse
       mobile é o que está em jogo, e ela acaba com o LCP. */
    const esperaLcp = (segue: () => void) => {
      if (typeof PerformanceObserver === "undefined") {
        segue();
        return;
      }
      const inicio = performance.now();
      let ultimo = 0;
      let obs: PerformanceObserver | null = null;
      try {
        obs = new PerformanceObserver((lista) => {
          ultimo = performance.now();
          for (const e of lista.getEntries()) marcos.lcp = Math.round(e.startTime);
        });
        obs.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        segue();
        return;
      }
      const olha = () => {
        if (!vivo) {
          obs?.disconnect();
          return;
        }
        const agora = performance.now();
        if (
          (ultimo > 0 && agora - ultimo > LCP_CALMA) ||
          agora - inicio > LCP_TETO
        ) {
          obs?.disconnect();
          marcos.lcpPronto = Math.round(agora);
          segue();
          return;
        }
        timer = window.setTimeout(olha, PORTAO_PASSO);
      };
      olha();
    };

    /* A quinta tranca (ver `GESTOS`): só no celular, e só uma vez. */
    const esperaGesto = (segue: () => void) => {
      if (modo !== "celular") {
        segue();
        return;
      }
      const noGesto = () => {
        soltaGesto?.();
        soltaGesto = null;
        if (!vivo) return;
        marcos.gesto = Math.round(performance.now());
        segue();
      };
      for (const g of GESTOS) {
        window.addEventListener(g, noGesto, { passive: true, once: true });
      }
      soltaGesto = () => {
        for (const g of GESTOS) window.removeEventListener(g, noGesto);
      };
    };

    const noOcioso = () => {
      if (!vivo) return;
      marcos.idle = performance.now();
      /* O TESTE DE WEBGL ACONTECE AQUI, E SÓ AQUI (etapa 6).
         Criar um contexto de prova custa de 1 a 15 ms em alguns Androids — o
         driver inicializa a GPU na primeira chamada —, e até a etapa 6 ele era
         feito na MONTAGEM do efeito, ou seja em qualquer rolagem que trouxesse
         o hero de volta. Agora ele roda dentro do `requestIdleCallback`, com o
         `load` já disparado: o navegador escolhe o instante, e o resultado fica
         memorizado para sempre (ver `temWebGL`). */
      if (!temWebGL()) return;
      esperaLcp(() => esperaGesto(esperaEntrada));
    };

    /* A segunda: um instante de ócio depois do `load`. O teto de 1,5 s existe
       porque `requestIdleCallback` sem prazo pode nunca chegar numa aba
       ocupada — e é o mesmo 1,5 s que serve de fallback onde a API não existe
       (Safari até a 17). */
    const noLoad = () => {
      if (!vivo) return;
      marcos.load = performance.now();
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(noOcioso, { timeout: 1500 });
      } else {
        timer = window.setTimeout(noOcioso, 1500);
      }
    };

    /* A primeira: o `load` da janela. Se a página já carregou (uma navegação
       de cliente, ou um portão que reabriu), ele não vai disparar de novo. */
    if (document.readyState === "complete") noLoad();
    else window.addEventListener("load", noLoad, { once: true });

    return () => {
      vivo = false;
      soltaGesto?.();
      window.removeEventListener("load", noLoad);
      if (idle && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idle);
      }
      window.clearTimeout(timer);
    };
  }, [tres, modo, running]);

  /**
   * A VOLTA PARA O 2D, por largura: abaixo de `lg` o 3D sai de cena (ele é a
   * etapa 6) e o canvas 2D reassume o planeta no mesmo quadro — `pronto` é
   * zerado pelo desmonte do `HeroGlobe3D`.
   *
   * DERIVADO, e não um segundo estado: o portão (`tres`) é uma coisa que
   * aconteceu uma vez e não se desfaz; a largura é outra, e muda com o arrastar
   * do canto da janela. Guardar o produto das duas num `useState` seria um
   * terceiro número para discordar dos outros dois.
   */
  const mostra3d = tres && modo !== "parado";

  /**
   * A VERSÃO LEVE, abaixo de 1024 (etapa 6).
   *
   * Pedido do dono: "no celular, versão mais leve (menos pontos, sem
   * pós-processamento) mantendo o mesmo visual". É um booleano só, e tudo o que
   * ele decide está do outro lado, em `HeroGlobe3D`: metade dos pontos, `dpr`
   * 1, atmosfera mais barata, arcos sem o fio creme por dentro e metade das
   * faíscas do cometa. A `key` força a cena a se refazer se a largura cruzar o
   * degrau — uma geometria de metade dos pontos não vira a de todos por
   * mudança de prop.
   */
  const leve = modo === "celular";

  /**
   * O GLOBO VOA NESTE QUADRO?
   *
   * Até a etapa 6 isto era `modo === "laco" && running`: abaixo de 1024 o globo
   * era um quadro parado, e quem trocava de país era o relógio de 3 s do
   * `Hero`. Com a cena 3D montando também no celular, o voo passa a existir lá
   * — mas SÓ depois de ela montar, que é depois do LCP. Antes disso o celular é
   * exatamente o que sempre foi, e é por isso que o LCP e o CLS de lá não se
   * mexem: nada muda no caminho crítico.
   */
  const voa = running && (modo === "laco" || mostra3d);

  /* O `Hero` precisa saber disto para calar o relógio de 3 s dele: dois donos
     do tempo é o defeito que o modelo de voo foi escrito para apagar. */
  const avisaVoo = useRef(onVoo);
  useEffect(() => {
    avisaVoo.current = onVoo;
  }, [onVoo]);
  useEffect(() => {
    avisaVoo.current?.(voa);
  }, [voa]);

  /* O país da vez vai para um `ref`: o laço lê a cada quadro sem se refazer.
     NO LAÇO quem escreve este `ref` é o próprio voo, no instante do pouso, e
     o `activeIndex` que volta do `Hero` é o espelho — a comparação abaixo o
     absorve sem mexer no relógio. Fora do laço (celular, movimento reduzido) é
     o `Hero` que manda, e aqui é onde a troca dele entra. */
  useEffect(() => {
    if (ativo.current === activeIndex) return;
    ativo.current = activeIndex;
    /* Uma troca vinda de fora é um recomeço de ciclo: o pouso da cidade nova
       começa agora. No laço isto nunca roda (o voo já havia escrito o `ref`
       antes de avisar), e fora dele o relógio do voo não é lido por ninguém. */
    relogio.current.ms = 0;
  }, [activeIndex]);

  /**
   * Fora do laço, o efeito de desenho precisa se refazer na troca de país —
   * é o único jeito de o tingimento novo entrar, e custa um quadro a cada 5 s.
   * Dentro do laço a chave é constante: quem lê o país é o `ref` acima.
   */
  const trocaParada = voa ? "" : String(activeIndex);

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

    /* O ESTADO COMPARTILHADO com a cena 3D (ver `cena.ts`). A nuvem é publicada
       aqui, no único lugar que a monta: o 3D a LÊ, nunca a refaz — quem decide
       se um ponto é terra, costa ou país é o gerador, e uma segunda peneira
       seria uma segunda geografia. */
    /** Celular: nuvem pela metade, dpr 1, sem pino. */
    const celular = modo === "celular";

    const palco = cena();
    palco.nuvem = dados;
    palco.codigos = lista;
    palco.leve = celular;
    palco.rotuloSP = rotuloSP.current;
    /**
     * O laço está de pé? É a condição do movimento que depende de TEMPO — o
     * voo, o rastro, a bolinha e o pulso do pino. Fora dela o globo é um quadro
     * parado, e o que não pode animar não anima: nada de meia volta congelada
     * na tela quando o dono aperta "pausar".
     */
    const emLaco = voa;

    /* ----------------------------------------------------------------- o voo
       O ESTADO DO QUADRO, em variáveis do laço e não em `ref`: ele é
       inteiramente um fato de DESENHO, e o que o lê é só o desenho. O que
       precisa sobreviver à remontagem do efeito — o tempo que o voo já andou e
       a câmera do último quadro — mora em `relogio` e `angulo`, lá em cima.

       `escala` é a escala do quadro (1 = o enquadramento do servidor, 1,8 = o
       detalhe da cidade) e `ancX/ancY` a translação que a ancora no CENTRO da
       caixa: escalar por Z em torno de `a` é `p' = a + Z·(p − a)`, ou seja uma
       matriz de escala Z com translação `a·(1 − Z)`. Como a câmera já
       centraliza o ponto de interesse, `a` é o meio do disco — e o MESMO par
       (escala, translação) vai para o `translate3d` de cada pino e do limbo.
       Uma conta, três camadas: é isso que impede os pinos de descolarem do
       planeta.

       `revela` é "quanto do detalhe está aplicado", de 0 a 1: é ele que acende
       a malha de 15°, a segunda trama de mar e o fio da borda, e que dissolve a
       marca da Wone. Deriva da escala, não de um relógio próprio. */
    let escala = 1;
    let ancX = 0;
    let ancY = 0;
    let revela = 0;
    /**
     * O 2D ainda pinta o planeta? `false` depois do crossfade do globo 3D (ver
     * `cena.ts`). Mora aqui, no escopo do efeito, e não dentro de `desenha`,
     * porque `malha()` também o lê — e nenhum dos dois pode decidir isso por si.
     */
    let planeta2d = true;
    /**
     * QUANTO DO PLANETA 2D AINDA APARECE — e por que esta variável existe.
     *
     * Defeito que o dono viu em produção, 17/10: "tire o tracejado laranja no
     * último zoom, o que aparece a maquete da cidade". As linhas eram a GRADE
     * DE MERIDIANOS do canvas 2D.
     *
     * A cadeia é esta: durante a parada de São Paulo o canvas 2D fica em 1,35×
     * (ele não tem cidade para mostrar), e continua pintando a grade e a trama
     * do mar — eu as havia deixado de propósito, porque não estão em etapa
     * nenhuma do plano e compunham por baixo dos pontos 3D. Só que no fundo do
     * mergulho o canvas 3D é quase todo TRANSPARENTE: entre um prédio e outro
     * se vê o que está embaixo, e o que está embaixo é um meridiano do planeta
     * em escala de planeta — um traço reto de 600 px cruzando uma maquete de
     * 1,4 km.
     *
     * Então a grade e a trama desvanecem pela MESMA rampa das visibilidades da
     * cidade (`1 − sp.mapa`): quando o chão de São Paulo chega, o planeta que
     * sobrava por baixo já saiu. Não é um corte — é a mesma curva, lida ao
     * contrário, e por isso a subida as devolve no mesmo zoom em que a descida
     * as levou.
     */
    let veu2d = 1;
    /** 1 = os sete rótulos; 0 = só o da cidade da vez. Ver `ROTULO_SAI_MS`. */
    let rotulos = 1;
    /** A fase e o relógio do voo no quadro, lidos pelo desenho. */
    let fase: Estado["fase"] = "pouso";
    let msFase = 0;
    /** Onde a bolinha está, em `u` da perna — e se há rastro para desenhar. */
    let uBola = 0;
    let temRastro = false;
    let bolaBase: [number, number, number] = [0, 0, 1];
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
     *   · `grao` = Z^−0,4 engrossa o ponto por MENOS que a escala: a 1,35× o
     *     grão cresce 1,13 enquanto o espaçamento cresce 1,35, então os vãos
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
     * Foco suavizado de cada pino: 1 na cidade da vez, 0 nas outras. É ele que
     * faz a chegada ser uma passagem e não um corte — o rótulo da cidade de
     * onde se partiu desvanece enquanto o da nova acende, os dois no mesmo
     * gesto.
     */
    const focos = new Float32Array(lista.length);
    focos[ativo.current] = 1;
    /* O MESMO array vai para a cena 3D, que desde a etapa 4 é quem posiciona
       os pinos: não é uma cópia, é o mesmo buffer — o laço escreve, o 3D lê, e
       não há um segundo foco para discordar do primeiro. */
    palco.focos = focos;
    /** Último valor de destaque escrito no DOM, por pino. 2 = ainda não sei. */
    const destacado = new Uint8Array(lista.length).fill(2);
    /* O mesmo buffer vai para a cena 3D: os dois caminhos escrevem a classe
       `hero-pino--foco`, e um memorizador por caminho acabaria com um deles
       achando que já escreveu o que o outro desfez. */
    palco.destacado = destacado;

    /**
     * AS CIDADES, em lat/lon e na ORDEM DA FILA — é o que o modelo de voo pede,
     * e é a mesma ordem de `payments.table.countries` que os pinos e os chips
     * já usam. A ordem é intocável (pedido do dono); o anel geográfico da rede
     * desenhada continua sendo outra coisa, decoração, e a bolinha deixou de
     * usá-lo.
     */
    const cidades: Ponto[] = lista.map(
      (code) => CAPITAIS[code] ?? { lat: 0, lon: 0 },
    );
    /** O centro da projeção: o enquadramento do servidor, de onde a entrada parte. */
    const centroProj: Ponto = { lat: LAT0, lon: LON0 };
    /** Duração do mergulho de entrada, pela MESMA régua das pernas (47,7° → 2,0 s). */
    const mergulhoMs = duracaoDe(distancia(centroProj, cidades[0] ?? centroProj));

    /**
     * O RASTRO, montado UMA vez por perna: os 25 pontos do grande círculo já na
     * base da projeção, prontos para girar. Não se refaz slerp por quadro — o
     * arco é o mesmo durante os 2,6 s da perna, e o que muda é só até onde ele
     * é traçado.
     *
     * `rastroDe` é a cidade de onde o arco sai, e é o que diz quando remontar.
     * Durante o POUSO o buffer ainda guarda a perna que ACABOU de chegar — é
     * ele que desvanece por 1 s —, e isso é de propósito: um buffer só, sem
     * cópia, porque a perna seguinte só precisa dele quando o voo começa.
     */
    const rastro = new Float32Array((RASTRO_PASSOS + 1) * 3);
    let rastroDe = -1;


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
     * A DENSIDADE DE PIXELS, decidida UMA VEZ e nunca por quadro.
     *
     * 1,5 de teto: é o ponto em que 5.102 pontos param de ficar mais nítidos e
     * só ficam mais caros.
     *
     * O SUPERSAMPLING DE 1,4× SAIU, e saiu MEDIDO. Ele entrou ontem para o
     * mergulho de 1,8×, onde os fios ficavam com 0,56px de CSS (`fio` = 1/Z) e
     * lavavam; hoje o pouso é a 1,35× e o fio tem 0,74px de CSS — 0,92px de
     * dispositivo no monitor desta máquina. O custo dele, ao contrário, dobrou
     * de importância: o laço passou de 30 para 60 fps, e a área rasterizada por
     * segundo com ele era 1,96× maior. No banco de medição (1440×900, dpr 1, o
     * mesmo servidor de desenvolvimento) o laço entrega 78 quadros por segundo
     * sem ele e 47 com ele — ou seja, ele sozinho comia a diferença entre
     * cumprir e não cumprir os 60 fps que o dono pediu.
     *
     * POR QUE NÃO ACOMPANHA O ZOOM: mexer em `canvas.width` ZERA o bitmap e
     * realoca a textura. Com o mergulho de ontem isso acontecia duas vezes por
     * ciclo de 15 s; com o voo, a escala muda a CADA QUADRO, e um dpr função
     * dela seria uma realocação por quadro — o caminho mais caro que existe num
     * canvas 2D. Então é um número por montagem do laço.
     */
    const dpr = celular ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    function mede() {
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
      /* As mesmas posições de repouso vão para o contrato: desde a etapa 4 é a
         cena 3D que escreve o `transform` dos pinos, e ela precisa saber de
         ONDE o deslocamento parte. Recalculá-las lá seria ler as mesmas
         porcentagens duas vezes — e perder a chance de errar junto quando a
         caixa mudar de tamanho. */
      palco.repousoX = Float32Array.from(geo.current.repouso, (p) => p.x);
      palco.repousoY = Float32Array.from(geo.current.repouso, (p) => p.y);
      if (palco.telaPinos.length !== lista.length * 3) {
        palco.telaPinos = new Float32Array(lista.length * 3);
      }
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
        ctx!.globalAlpha = (forte ? 0.09 : 0.06) * forca * g.ganho * veu2d;
        ctx!.strokeStyle = LARANJA;
        /* `fio` mantém a grade em 1px DE TELA dentro do zoom: ver o
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
         INTERMEDIÁRIOS de 15°, que não existiam. Eles entram pelo `revela`, então
         nascem invisíveis e nunca piscam; a 1,8× a malha tem o dobro da
         resolução que tinha, no mesmo laranja e na mesma espessura de tela.
         Dez linhas a mais, e elas acompanham a escala: cheias no pouso, quase
         apagadas no meio de uma perna longa. */
      if (revela > 0.01) {
        for (let m = -2; m <= 3; m += 1) meridiano(-72 + m * 30 + 15, revela);
        for (const lat of [15, -15, 45, -45]) paralelo(lat, false, revela);
      }
    }

    /**
     * A REDE: as sete pernas que ligam as capitais onde a Wone cobra.
     *
     * É DECORAÇÃO, e desde 17/10 é só isso. A bolinha corria uma perna dela, e
     * era daí que vinham os cortes: o anel é GEOGRÁFICO (México → Colômbia →
     * Equador → Brasil → Argentina → Portugal → Reino Unido → México) e não
     * coincide com a fila das cidades em 3 das 7 trocas. Agora a bolinha segue o
     * modelo de voo e a rede continua onde sempre esteve, fina, dizendo que os
     * sete estão ligados.
     *
     * Cada perna é o grande-círculo entre duas capitais, erguido 3,5% do raio no
     * meio do caminho e nada nas pontas, o que a solta do chão sem desgrudar do
     * pino. Os pontos já nascem na base da projeção (`rede()`, uma vez); aqui só
     * se gira, projeta e traça — um `stroke` para as sete.
     *
     * O RASTRO e a BOLINHA do voo são desenhados no fim desta função, por cima
     * dela: é aqui que mora a conta de projetar um vetor da base, e repeti-la em
     * outro lugar seria o segundo lugar para ela divergir.
     */
    function malha(cy: number, sy: number, cp: number, sp: number) {
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
           · até 1,0 — as pernas da cidade da vez, quando ela é Lisboa ou
             Londres, no primeiro segundo do POUSO, em laranja cheio e 1,5px.
         O flash só existe no modo de laço: abaixo disso o globo é redesenhado
         uma vez por troca de cidade, e uma animação de 1 s num quadro só seria
         um piscar aleatório. */
      const ativoCode = lista[ativo.current] ?? "";
      const europeuAtivo = EUROPEUS.has(ativoCode);
      const flash =
        europeuAtivo &&
        emLaco &&
        fase === "pouso" &&
        msFase < FLASH_MS
          ? 1 - msFase / FLASH_MS
          : 0;
      const naPerna = (perna: [string, string]) =>
        perna[0] === ativoCode || perna[1] === ativoCode;
      const tocaEuropa = (perna: [string, string]) =>
        EUROPEUS.has(perna[0]) || EUROPEUS.has(perna[1]);
      const acesa = (perna: [string, string]) =>
        flash > 0 && europeuAtivo && naPerna(perna);

      /* A REDE E O COMETA SUBIRAM PARA O 3D na etapa 3: lá as sete pernas são
         linhas de verdade, erguidas da superfície, e a bolinha tem rastro
         luminoso e faíscas. Quando a cena 3D está no comando, tudo daqui para
         baixo nesta função é trabalho repetido — e repetido RENTE AO CHÃO, que
         é justamente o que a etapa 3 saiu do chão para corrigir. */
      if (!planeta2d) return;

      traca((perna) => !tocaEuropa(perna) && !acesa(perna), 0.14);
      traca((perna) => tocaEuropa(perna) && !acesa(perna), 0.3);
      if (flash > 0) traca(acesa, 0.3 + 0.7 * flash, 1.5);

      if (!emLaco) return;

      /* ------------------------------------------------- o rastro e a bolinha

         O RASTRO é o arco da cidade de onde se partiu até a bolinha: ele fica
         ATRÁS dela e some em 1 s depois do pouso. Só `globalAlpha` — nenhum
         gradiente, nenhuma segunda camada: é um `stroke` de uma polilinha que
         já está montada em `rastro` (ver `RASTRO_PASSOS`), traçada até onde a
         bolinha chegou.

         O ÚLTIMO PONTO É A BOLINHA, e não o vértice mais próximo dela: assim a
         ponta do rastro e a cabeça do cometa são o mesmo pixel em qualquer
         instante, em vez de se descolarem por até 1/24 da perna. */
      if (temRastro) {
        const ate = fase === "voo" ? uBola : 1;
        const vida =
          fase === "voo"
            ? 1
            : Math.max(0, 1 - msFase / RASTRO_SOME_MS);
        if (vida > 0.004) {
          const f = ate * RASTRO_PASSOS;
          const inteiros = Math.min(RASTRO_PASSOS, f | 0);
          ctx!.beginPath();
          let caneta = false;
          for (let s = 0; s <= inteiros; s += 1) {
            const p = projeta(rastro[s * 3], rastro[s * 3 + 1], rastro[s * 3 + 2]);
            if (p.z2 <= 0) {
              caneta = false;
              continue;
            }
            if (caneta) ctx!.lineTo(p.sx, p.sv);
            else ctx!.moveTo(p.sx, p.sv);
            caneta = true;
          }
          const cabeca = projeta(bolaBase[0], bolaBase[1], bolaBase[2]);
          if (caneta && cabeca.z2 > 0) ctx!.lineTo(cabeca.sx, cabeca.sv);
          ctx!.globalAlpha = RASTRO_ALFA * vida * g.ganho;
          ctx!.strokeStyle = COSTA;
          /* Em px de TELA: o rastro é do gesto, não do terreno, e não engrossa
             porque a câmera chegou perto. */
          ctx!.lineWidth = 1.25 * fio;
          ctx!.stroke();
        }
      }

      /* A BOLINHA. A cabeça está na coordenada que o MODELO deu (`bola`), e
         atrás dela vêm três pontos a 2% da perna cada, interpolados na
         polilinha do rastro — quatro `fill` de um arco, o custo de quatro
         pontos da nuvem que tem 5.102.
         Os raios são em px de tela (`fio`): uma bolinha de 2,7px é uma bolinha
         de 2,7px no detalhe de 1,35× e no mínimo de 1,11×. */
      for (let q = 0; q < BOLA_CAUDA; q += 1) {
        let p: { sx: number; sv: number; z2: number };
        if (q === 0) {
          p = projeta(bolaBase[0], bolaBase[1], bolaBase[2]);
        } else {
          if (!temRastro && fase === "voo") break;
          const u = uBola - q * BOLA_PASSO;
          if (u < 0) break;
          const f = u * RASTRO_PASSOS;
          const s0 = Math.min(RASTRO_PASSOS, f | 0);
          const s1 = Math.min(RASTRO_PASSOS, s0 + 1);
          const w = f - s0;
          p = projeta(
            rastro[s0 * 3] + (rastro[s1 * 3] - rastro[s0 * 3]) * w,
            rastro[s0 * 3 + 1] + (rastro[s1 * 3 + 1] - rastro[s0 * 3 + 1]) * w,
            rastro[s0 * 3 + 2] + (rastro[s1 * 3 + 2] - rastro[s0 * 3 + 2]) * w,
          );
        }
        if (p.z2 <= 0) continue;
        const cauda = 1 - q / BOLA_CAUDA;
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sv, (1.1 + 1.6 * cauda) * cauda * fio, 0, TAU);
        ctx!.globalAlpha = Math.min(1, 0.95 * cauda * cauda) * g.ganho;
        /* Creme na cabeça, como o pino: é o mesmo gesto chegando. */
        ctx!.fillStyle = q === 0 ? PAIS_NUCLEO : COSTA;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
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
        ctx!.globalAlpha = alfa * g.ganho * veu2d;
        ctx!.fillStyle = LARANJA;
        ctx!.fill();
      };

      /* 0,07 e não 0,10: a 0,10 a trama disputava com os continentes, que são
         do MESMO laranja — o mar lia como terra rala. Ela tem de estar lá
         quando se procura e sumir quando se lê o mapa. */
      tece(mar(), MAR_PONTOS, 0.07);

      /* A SEGUNDA TRAMA, que entra com o zoom. A 1,35× os 900 pontos do mar se
         espalham por 1,82 vez a área e o oceano fica RALO — aproximar estava
         tirando textura em vez de dar, que é o oposto do que um mapa faz. A
         espiral fina
         tem 1.800 pontos próprios (não é um adensamento da primeira: são dois
         sorteios de Fibonacci independentes, o mesmo truque da segunda nuvem da
         Europa) e entra pelo `revela`, nascendo invisível. A 1,8× o mar volta a
         ter a densidade de tela que tem em repouso. */
      if (revela > 0.01) tece(marFino(), MAR_FINO_PONTOS, 0.07 * revela);
    }

    /**
     * UM QUADRO: a câmera (guinada, inclinação) e a ESCALA que o voo pediu.
     *
     * A escala entra como parâmetro e não por variável de fora porque o quadro
     * PARADO (ResizeObserver, freio puxado) também precisa dela: ele desenha o
     * último estado de câmera, e um quadro a 1× com a câmera apontada para uma
     * cidade seria o planeta descentralizado — pior que qualquer coisa que o voo
     * possa fazer.
     */
    function desenha(yaw: number, pitch: number, esc = 1) {
      const g = geo.current!;
      const R = g.raio;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const atual = ativo.current;

      /* O 3D ASSUMIU O PLANETA? Então o 2D para de pintar OS 5.458 PONTOS DE
         TERRA (etapa 1) e, desde a etapa 3, também A REDE, O RASTRO e A
         BOLINHA. A mesma imagem desenhada duas vezes é o dobro do custo e, nos
         600 ms do crossfade, um engrossamento de cada traço.

         O QUE FICA, e fica de propósito: a GRADE e a TRAMA DO MAR — elas não
         estão em etapa nenhuma do plano, custam 16 `stroke` e um `fill`, e
         compõem por baixo dos pontos 3D exatamente como sempre fizeram (o
         canvas 2D está debaixo do 3D, e lá a esfera só escreve cor onde a
         atmosfera acende). E o ANEL DE ALVO e o PULSO do pino, que são da
         câmera e não do terreno, junto com os PINOS e os RÓTULOS, que são DOM
         (etapa 4 só muda quem os posiciona). */
      planeta2d = !palco.pronto;
      /* O planeta 2D cede lugar à cidade (ver `veu2d`). */
      veu2d = palco.sp.ativo ? 1 - palco.sp.mapa : 1;

      /* -------------------------------------------------- a matriz do zoom

         A ÂNCORA É O CENTRO DA CAIXA. A conta é a de sempre — escalar por Z em
         torno de `a` é `p' = Z·p + (a − Z·a)`, logo a matriz do contexto é a
         escala do dpr multiplicada por Z com a translação `a·(1 − Z)` —, e o
         MESMO par (`escala`, `ancX/ancY`) vai para o `translate3d` dos pinos e
         do limbo, no fim desta função. Uma conta, três camadas: é isso que
         impede os pinos de descolarem do planeta.

         Até ontem `a` era o PINO da vez, porque o giro chegava depois da escala
         e era preciso prometer que o pino ficaria parado durante a descida.
         Agora a câmera já centraliza o ponto de interesse: o meio do disco É o
         ponto focado, e ancorar nele é a mesma promessa escrita em duas linhas
         em vez de dez.

         A translação é arredondada a 0,1px de CSS: é a mesma régua do
         `translate3d` dos pinos (e é por isso que as duas camadas não podem
         arredondar diferente), e segura o tremor de subpixel que uma matriz
         recalculada 60 vezes por segundo produziria na borda dos pontos. */
      if (esc > 1.0005) {
        escala = esc;
        ancX = Math.round(R * (1 - escala) * 10) / 10;
        ancY = ancX;
        fio = 1 / escala;
        grao = Math.pow(escala, -0.4);
        revela = Math.min(1, (escala - 1) / (ZOOM_DETALHE - 1));
      } else {
        escala = 1;
        ancX = 0;
        ancY = 0;
        fio = 1;
        grao = 1;
        revela = 0;
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
         voo o terreno chega AMPLIADO até a aresta da caixa — e chega SEMPRE,
         porque a câmera nunca volta a 1× depois da entrada —, e sem a vigia o
         planeta leria como um recorte quadrado em vez de uma esfera. */
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

      /* Zerado, nem se desenha: no fundo do mergulho seriam 16 `stroke` e 2.700
         arcos para somar nada. */
      if (veu2d > 0.004) {
        sob(() => grade(cy, sy, cp, sp));
        sob(() => trama(cy, sy, cp, sp));
      }

      let n = 0;
      let usados = 0;

      /* Com o 3D no comando a varredura não acontece: `total` é zero, `n` fica
         zero e o laço dos baldes, logo abaixo, roda as suas dez voltas vazias
         sem um `beginPath`. É um `if` escrito como limite em vez de como
         desvio — o corpo do laço continua sendo o único lugar que sabe projetar
         um ponto da nuvem, e não há caminho alternativo para ele divergir. */
      const total = planeta2d ? GLOBE_COUNT + GLOBE_EU_COUNT : 0;

      for (let i = 0; i < total; i += g.salto) {
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
           não um expoente — a 5.102 pontos a 60 fps, a diferença é medida. */
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
          /* `grao` é 1 enquanto a escala é 1: um multiplicador por ponto, e é o que
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
      sob(() => malha(cy, sy, cp, sp));
      ctx!.globalAlpha = 1;

      /* Os pinos: `transform` com o DESLOCAMENTO a partir da posição de
         repouso que o servidor escreveu em `left/top`. Em t = 0 ele é (0,0),
         então nada salta quando o laço assume. Composto, sem layout.

         DESDE A ETAPA 4 ISTO É O CAMINHO DE TRÁS. Com a cena 3D de pé, quem
         posiciona os pinos é ela — com a matriz da câmera, no mesmo quadro, e
         com a queda de volume que este bloco nunca teve (ver `HeroGlobe3D`).
         O que sobra aqui vale para o que não tem 3D: o fallback sem WebGL, o
         movimento reduzido e os primeiros 600 ms do crossfade. Os dois
         caminhos escrevem os MESMOS números — é a mesma projeção —, e é por
         isso que a troca entre eles não tem um quadro de salto. */
      if (!celular && planeta2d) {
        /* O PULSO do pino da vez (pedido do dono, 15/10): um anel que nasce no
           ponto e se abre em 600 ms, UMA vez por troca. Só raio e alfa — nem
           cor, nem deslocamento, nem escala de nó nenhum. Ele é desenhado aqui,
           no canvas, e não em CSS como o anel do `CountryTag`, por um motivo de
           verdade: no canvas ele nasce na coordenada PROJETADA do país, que
           continua andando com o balanço do planeta; o anel de CSS mora no
           alfinete e por isso só pode pulsar onde o alfinete já está.
           O `hero-ping` do `CountryTag` segue existindo abaixo de 1280, onde
           não há laço para animar isto. */
        const pulso =
          emLaco && fase === "pouso" && relogio.current.mergulhou && msFase < PULSO_MS
            ? msFase / PULSO_MS
            : -1;

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
          /* O px/py do pino no planeta, antes do zoom — e depois dele, que é a
             MESMA conta da matriz do canvas (`a·(1−Z) + Z·p`, com `a` no centro
             da caixa). Uma conta, duas camadas: é só por isso que os pinos não
             descolam do planeta. */
          const px = R + x1 * R;
          const py2 = R - y2 * R;
          const pxz = ancX + escala * px;
          const pyz = ancY + escala * py2;

          /* A VIGIA VALE PARA O DOM TAMBÉM. O canvas corta o que sai do
             círculo; o HTML não é cortado por nada, e no zoom os pinos longe do
             centro saem do disco — ficariam pendurados no vazio ao lado do
             planeta, ou, pior, em cima da coluna de texto. Então o rótulo
             desvanece pela distância ao centro contra o raio, na mesma faixa
             curta do limbo. Em repouso esta rampa coincide com a de `z2` (é a
             mesma, em raio em vez de cosseno) e por isso nada muda. */
          /* A posição na tela também é publicada por este caminho: é dela que
             o clique de "cada país é clicável" mede a distância, e sem WebGL
             ela não chegaria de lugar nenhum. */
          palco.telaPinos[j * 3] = pxz;
          palco.telaPinos[j * 3 + 1] = pyz;
          palco.telaPinos[j * 3 + 2] = z2;

          const rad = Math.sqrt((pxz - R) * (pxz - R) + (pyz - R) * (pyz - R)) / R;
          const naVigia =
            rad >= VIGIA_FORA
              ? 0
              : rad <= VIGIA_DENTRO
                ? 1
                : (VIGIA_FORA - rad) / (VIGIA_FORA - VIGIA_DENTRO);

          /* OS SETE RÓTULOS NÃO CABEM NUM PLANETA APROXIMADO: no detalhe de
             1,35× os pinos se afastam do centro por 35% da distância que já
             tinham. No VOO fica só o da cidade de onde se partiu (`focos`), e
             ele apaga por distância conforme se afasta do meio; no POUSO voltam
             os que CABEM — a vigia tira quem saiu do disco e a régua da coluna
             de texto tira quem está longe do centro.
             `focos[j]` é o que faz a chegada ser um cruza-fade entre o rótulo
             que sai e o que entra, em vez de um corte. */
          const chegou =
            rad <= CHEGOU_DENTRO
              ? 1
              : rad >= CHEGOU_FORA
                ? 0
                : (CHEGOU_FORA - rad) / (CHEGOU_FORA - CHEGOU_DENTRO);
          /* As MESMAS duas opacidades da cena 3D (ver `PISO_PONTO` lá): o
             ponto fica, o rótulo é que se retira. Os dois caminhos têm de
             escrever o mesmo número, ou a troca entre eles seria um salto. */
          const texto = chegou * (rotulos + (1 - rotulos) * focos[j]);
          const efetiva =
            Math.min(visivel, naVigia) * Math.max(chegou, PISO_PONTO_2D);
          el.hidden = efetiva <= 0.004;
          el.style.opacity = efetiva >= 0.999 ? "" : efetiva.toFixed(3);
          el.style.setProperty(
            "--rotulo-op",
            (efetiva > 0.001 ? Math.min(1, texto / efetiva) : 0).toFixed(3),
          );
          el.style.transform = `translate3d(${(pxz - g.repouso[j].x).toFixed(1)}px, ${(pyz - g.repouso[j].y).toFixed(1)}px, 0)`;

          /* O DESTAQUE do rótulo da cidade em que se pousou: bandeira + cidade
             + método · preço, as identidades reais que a página já tem. É uma
             classe no alfinete e o CSS cuida do resto (`.hero-pino--foco`, em
             `hero.css`) — assim o rótulo aparece até nas janelas em que os sete
             não cabem, porque ali ele está sozinho. Escrita só na VIRADA, nunca
             por quadro: tocar o `classList` 60 vezes por segundo paga
             invalidação de estilo de graça.
             O gatilho é a FASE: no pouso a cidade da vez é o assunto da tela e
             ganha o rótulo cheio; no voo ninguém é, e ele volta ao tamanho de
             sempre antes de a câmera partir. */
          const destaque = fase === "pouso" && j === atual ? 1 : 0;
          if (destacado[j] !== destaque) {
            destacado[j] = destaque;
            el.classList.toggle("hero-pino--foco", destaque === 1);
          }

          if (z2 <= 0) continue;

          /* O ANEL DE ALVO: nasce com 4px, CRESCE com a escala e ASSENTA em
             22px de tela. É o que o Maps põe no ponto que você escolheu, e aqui
             ele marca a cidade que a câmera está afirmando — ele passa de pino
             em pino junto com o `focos`, e é por ele que se LÊ a chegada.
             Raio e espessura em px de TELA (daí o `fio`): o alvo é da câmera,
             não do planeta, e não cresce junto com o terreno. */
          if (revela > 0.002 && focos[j] > 0.01) {
            ctx!.beginPath();
            ctx!.arc(px, py2, (4 + (ZOOM_ANEL - 4) * revela) * fio, 0, TAU);
            ctx!.globalAlpha =
              0.3 * focos[j] * Math.min(1, revela * 2.5) * g.ganho;
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
         O alfa sobe com a ESCALA e não é constante, e isso é regra dura do
         hero: enquanto a escala é 1 — os 2,2 s da entrada — o fio do CSS está
         sozinho, e somar outro igual dobraria a borda para 39% e o primeiro
         quadro deixaria de cair sobre o que o servidor pintou. Basta a escala
         passar de 1,08× para ele estar cheio — e ela passa ainda no mergulho de
         entrada, e só volta para perto de 1 no meio das pernas mais longas, que
         é quando o limbo volta a aparecer e a borda pode ceder de novo ao fio
         do CSS. */
      ctx!.restore();
      /* O RAIO DA BORDA, e não o do disco: o contorno é traçado no MEIO da
         espessura, logo em `R − BORDA_FIO/2`. E essa subtração é o único raio
         de `arc` em todo o arquivo que pode ficar NEGATIVO — era ela que punha
         no console, uma vez por quadro desenhado,
         `IndexSizeError: The radius provided (-0.25) is negative`.

         A conta fica negativa quando a CAIXA É DEGENERADA, e ela existe: o
         lado vem de `box.clientWidth` em `mede()`, o `clientWidth` é inteiro, e
         `--globo` é `min(44vw, 100svh − 140px)` (`min(42vw, 100svh − 324px)`
         entre 1024 e 1399) — uma janela muito baixa resolve a fórmula para 0 ou
         1px. Com lado 1, R vale 0,5 e o raio da borda é −0,25 — o número que
         apareceu no console; com lado 0, R é 0 e o raio é −0,75. Reproduzido a
         1100×324, onde a caixa mede 0 e a chamada ia com −0,75; o −0,25 é a
         MESMA conta com a caixa em 1px, que é o que uma janela de altura
         fracionária (zoom de 125%, por exemplo) resolve.

         O remédio é a CONDIÇÃO, não um `Math.max(0, …)` cego, e a diferença não
         é de estilo: um raio preso em zero desenharia um ponto de 1,5px de fio
         no canto superior esquerdo do disco, que é uma sujeira a mais e não a
         ausência de uma borda. Um disco menor que o próprio fio NÃO TEM
         circunferência para traçar — é isso que a linha abaixo diz, e é por
         isso que ela mede o raio da borda e não o da caixa.

         Os outros seis `arc` do arquivo são seguros por construção, e por isso
         nenhum deles ganha guarda: os dois do planeta e o da trama são produtos
         de fatores não negativos (`rb`, `vol`, `grao`, `lit` preso em [0,1]); o
         da cauda é `(1,1 + 1,6·c)·c·fio` com `c` em (0,1]; os dois do pino são
         `4 + k·x` com `x` ≥ 0 (`revela` preso em [0,1] e `pulso` já filtrado
         acima); e o do recorte é o próprio R, que não é negativo nunca. */
      const rBorda = R - BORDA_FIO / 2;
      if (escala > 1.0005 && rBorda > 0) {
        ctx!.beginPath();
        ctx!.arc(R, R, rBorda, 0, TAU);
        /* A circunferência fica — ela é a BORDA do disco, e a maquete também
           precisa de uma —, mas cede metade do peso para a cidade: sobre o mapa
           noturno o fio a 22% competia com as avenidas. */
        ctx!.globalAlpha =
          BORDA_ALFA *
          Math.min(1, (escala - 1) * 12) *
          g.ganho *
          (0.5 + 0.5 * veu2d);
        ctx!.strokeStyle = LARANJA;
        ctx!.lineWidth = BORDA_FIO;
        ctx!.stroke();
        ctx!.globalAlpha = 1;
      }

      /* O LIMBO ACOMPANHA O PLANETA. Ele é o escurecimento dos últimos 6% do
         raio — o que faz o disco ler como bola — e vive em CSS porque não
         girava. Com o zoom ele ESCALA: precisa estar no mesmo espaço dos
         pontos, ou o sombreado fica parado enquanto a terra corre por baixo,
         que é o defeito clássico de um zoom de imagem. Recebe a MESMA matriz do
         canvas, no compositor, de graça — e a partir de ~1,1× o seu aro escuro
         sai de quadro, cortado pela vigia (`.globe-vigia`, em `hero.css`), que é
         o que acontece no Maps quando se aproxima.
         A MARCA da Wone não escala: ela é o fundo do planeta inteiro, e
         aproximada seria um borrão de 83% do diâmetro cortado pela vigia. Em vez
         de crescer, ela sai de cena com a escala — fica visível na entrada e no
         meio das pernas longas, que é quando o planeta está inteiro na tela.
         Nos dois casos é `transform`/`opacity`: nenhum quadro passa por layout. */
      if (limbo.current) {
        limbo.current.style.transform =
          escala === 1
            ? ""
            : `translate3d(${ancX.toFixed(1)}px, ${ancY.toFixed(1)}px, 0) scale(${escala.toFixed(4)})`;
      }
      if (marca.current) {
        /* 0,06 é o alfa que o CSS dá à marca: o inline tem de MULTIPLICAR esse
           número, não substituí-lo — escrever `1 − revela` cru acenderia um
           logotipo chapado no meio do planeta. String vazia devolve o controle
           ao CSS, que é o estado de repouso. */
        marca.current.style.opacity =
          revela > 0.0005 ? (0.06 * (1 - revela)).toFixed(4) : "";
      }

      angulo.current = { yaw, pitch, escala };

      /* ----------------------------------------- o quadro para a cena 3D

         PUBLICAR É A ÚLTIMA COISA que o desenho do 2D faz, e é de propósito:
         neste ponto `yaw`, `pitch` e `escala` são os números que acabaram de
         pintar a terra, posicionar os pinos e escalar o limbo. O 3D lê ESTES —
         não um estado paralelo, não um estado derivado. É o que faz a câmera
         ortográfica de lá cair no mesmo pixel da projeção de cá, e é por isso
         que os pinos DOM continuam colados na esfera sem uma linha de
         recálculo (ver a derivação em `cena.ts`).

         Escrita de campo em objeto que já existe: zero alocação por quadro.
         Quem MANDA DESENHAR é o laço, não esta função — `umQuadro()` também
         passa por aqui, e um quadro parado não pode gastar um render do 3D. */
      palco.yaw = yaw;
      palco.pitch = pitch;
      palco.escala = escala;
      palco.lado = g.lado;
      palco.raio = R;
      palco.fase = fase;
      palco.cidade = atual;
      palco.u = uBola;
      palco.entrada = relogio.current.entrada;
      palco.msFase = msFase;
      palco.temRastro = temRastro;
      palco.rotulos = rotulos;
      palco.revela = revela;
      palco.mergulhou = relogio.current.mergulhou;

      /* O ESPIÃO: o estado do quadro em `window.__globo`, para a medição no
         navegador poder provar as três conferências do pedido sem olhar
         fotografia — a bolinha dentro do disco, a ausência de salto entre
         amostras e o zoom que abre mais nas viagens longas. Duas leituras de
         `performance.now` por quadro e nenhuma alocação: os campos são escritos
         num objeto que já existe. */
      const olho = medidor();
      olho.escala = escala;
      olho.fase = fase;
      olho.cidade = atual;
      olho.u = uBola;
      olho.raio = R;
      olho.yaw = yaw;
      olho.pitch = pitch;
      const vb = projetaBola(cy, sy, cp, sp, R);
      olho.bolaX = vb.x;
      olho.bolaY = vb.y;
      olho.bolaVisivel = vb.z > 0;
    }

    /**
     * Quanto dura o pouso na cidade `i`. São Paulo é a exceção do tour.
     *
     * NO CANVAS 2D A PARADA DURA O MESMO, e isso é de propósito: o relógio do
     * voo é um só, e a cidade da vez tem de trocar no mesmo instante nos dois
     * caminhos. O que muda é o que se VÊ durante ela — no 3D, a cidade; no 2D,
     * o planeta parado no enquadramento de pouso.
     */
    function pousoDe(i: number) {
      return lista[i] === CIDADE_MERGULHO ? DURACAO_SP_MS : POUSO_MS;
    }

    /**
     * Calcula o mergulho e o publica no contrato.
     *
     * NO CELULAR ELE É MAIS CURTO E MAIS RASO (etapa 6 levada a sério): a
     * câmera para em `ZOOM_CIDADE` em vez de ir aos 14.000 da torre, e os prédios
     * não sobem. 3.769 prédios são 62 mil triângulos e 4,4 MB de buffer — é
     * mais do que um aparelho de entrada deve segurar por um momento de 2 s, e
     * a 405 de escala o disco tem 49,7 m/px, onde um prédio comum mede 0,6 px e
     * a placa da marca, 0,9: nada do que foi cortado era visível ali. O que
     * sobra — a cidade inteira vista do alto, com o mapa noturno de verdade —
     * é a parte que cabe na tela de um celular.
     *
     * As visibilidades são recalculadas a partir da escala JÁ limitada, e não
     * copiadas do estado: é o que mantém as camadas coerentes com o que a
     * câmera está realmente mostrando (ver `visibilidades()`).
     */
    function mergulha(voando: Estado) {
      const sp = palco.sp;
      /* DUAS CONDIÇÕES, e a segunda custou um defeito medido: a cidade tem de
         ser São Paulo E o voo tem de estar no POUSO. Sem a segunda, `de`
         continua sendo São Paulo durante a perna inteira até a Cidade do
         México — `msPouso` fica preso em 11.200, `mergulhoSP` devolve "fim", e
         a cena 3D ficaria cravada no enquadre de São Paulo enquanto o canvas
         2D voa para o México. O planeta congelava por 2,3 s em cima de uma
         cidade que a câmera já tinha deixado. */
      if (lista[voando.de] !== CIDADE_MERGULHO || voando.fase !== "pouso") {
        sp.ativo = false;
        return;
      }
      const e = mergulhoSP(voando.msPouso);
      const zoom = celular ? Math.min(e.zoom, ZOOM_CIDADE) : e.zoom;
      const v = celular ? visibilidades(zoom) : e;
      const q = enquadraSP(e);
      sp.ativo = true;
      sp.fase = e.fase;
      sp.zoom = zoom;
      sp.inclinacao = e.inclinacao;
      sp.orbita = e.orbita;
      /* O deslocamento livre vale TAMBÉM no mergulho: a câmera da cidade é o
         centro mais o gesto. A translação de `enquadraSP` continua valendo —
         ela põe a torre no meio do disco, e o gesto a desloca de lá, que é o
         que o visitante pediu ao arrastar. */
      sp.pitch = q.pitch + livrePitch;
      sp.yaw = q.yaw + livreYaw;
      sp.x = q.x;
      sp.y = q.y;
      sp.pontos = v.pontos;
      sp.mapa = v.mapa;
      /* No celular os prédios (e, com eles, a torre e a marca) não existem. */
      sp.predios = celular ? 0 : v.predios;
      sp.logo = celular ? 0 : v.logo;
      sp.detalhe = celular ? 0 : v.detalhe;
      /* O PALCO da linha do tempo, que é o alvo do modo cinema. No celular
         não há cinema: lá o globo é um bloco em fluxo depois dos botões e
         não existe coluna ao lado para liberar. */
      sp.palco = celular ? 0 : e.palco;
    }

    /** A bolinha em px da CAIXA, já com a matriz do zoom: é o que a medição lê. */
    function projetaBola(
      cy: number,
      sy: number,
      cp: number,
      sp: number,
      R: number,
    ) {
      const x1 = cy * bolaBase[0] + sy * bolaBase[2];
      const z1 = -sy * bolaBase[0] + cy * bolaBase[2];
      const y2 = cp * bolaBase[1] - sp * z1;
      const z2 = sp * bolaBase[1] + cp * z1;
      return {
        x: ancX + escala * (R + x1 * R),
        y: ancY + escala * (R - y2 * R),
        z: z2,
      };
    }

    /**
     * O ENQUADRE, para um alvo QUALQUER — o irmão geral do `enquadraSP`.
     *
     * Aquele serve à torre, que é um ponto fixo; este serve ao ponto que a
     * câmera está centralizando AGORA, que no desvio anda a cada quadro. A
     * conta é a mesma, e a razão de ela existir é a mesma: o grupo da esfera
     * gira em torno do CENTRO DA TERRA, então inclinar leva o alvo para longe
     * do meio do disco (3.376 km a 32°), e a translação o traz de volta.
     *
     * Com `inclinacao = 0` e `orbita = 0` ele devolve exatamente o que
     * `centraliza()` já devolvia, e x = y = 0: fora do mergulho nada muda.
     */
    function enquadra(alvoP: Ponto, inclinacao: number, orbita: number) {
      const base = centraliza(alvoP.lat, alvoP.lon);
      const pitch = base.pitch - inclinacao;
      const yaw = base.yaw + orbita;
      const [x, y, z] = baseVector(alvoP.lat, alvoP.lon);
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const x1 = cy * x + sy * z;
      const z1 = -sy * x + cy * z;
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const y2 = cp * y - sp * z1;
      return { pitch, yaw, x: -x1, y: -y2 };
    }

    /** Monta o rastro (plano para o 2D, erguido para o cometa) de uma perna. */
    function montaRastro(de: Ponto, para: Ponto) {
      for (let k = 0; k <= RASTRO_PASSOS; k += 1) {
        const u = k / RASTRO_PASSOS;
        const q = interpola(de, para, u);
        const v = baseVector(q.lat, q.lon);
        rastro[k * 3] = v[0];
        rastro[k * 3 + 1] = v[1];
        rastro[k * 3 + 2] = v[2];
        const sobe = 1 + REDE_SOBE * Math.sin(Math.PI * u);
        palco.arco[k * 3] = v[0] * sobe;
        palco.arco[k * 3 + 1] = v[1] * sobe;
        palco.arco[k * 3 + 2] = v[2] * sobe;
      }
    }

    /**
     * O CLIQUE NUM PAÍS ABRE UM DESVIO (pedido do dono, 17/10: "a transição no
     * click deve ser suave").
     *
     * Ele NÃO põe a câmera no pouso da cidade — ele abre uma PERNA DE VOO de
     * onde a câmera está até lá, pela mesma `perna()` de `voo.ts` que as sete
     * do tour usam: mesmo grande-círculo, mesma curva de van Wijk, mesmo atraso
     * de câmera, mesmo cometa correndo à frente. No fim dela o relógio normal
     * assume e a cidade pousa como qualquer outra — com pulso, rótulo cheio e,
     * em São Paulo, o mergulho depois dos 1,8 s.
     *
     * O w₀ é a largura de vista de ONDE SE PARTE, e é ele que faz a curva de van
     * Wijk se comportar: partindo do pouso (1,35×) ela abre e fecha como uma
     * perna qualquer; partindo da torre de São Paulo (9.200×) ela SOBE — a
     * mesma curva, lida com outra ponta, sem um `if` de caso especial.
     *
     * O piso de 900 ms existe para o clique num país vizinho (Bogotá a Quito
     * são 6,6° de arco, 1.308 ms pela régua do tour, mas o desvio pode começar
     * de muito mais perto) não virar um pisca.
     */
    escolher.current = (indice: number) => {
      if (indice < 0 || indice >= lista.length) return;
      const r = relogio.current;
      /* Já estamos lá, parados? Então não há o que fazer — reabrir um desvio de
         duração zero seria um tranco no lugar de uma transição. */
      if (
        indice === ativo.current &&
        !desvio.current &&
        r.mergulhou &&
        palco.fase === "pouso" &&
        !palco.sp.ativo
      ) {
        return;
      }
      const u = ultimoQuadro.current;
      const de = u.cam;
      const para = cidades[indice] ?? de;
      const w0 = vista(u.escVista);
      /* A DURAÇÃO CONTA O ESFORÇO INTEIRO, não só o arco.

         A régua do tour (`duracaoDe`) mede DISTÂNCIA, e ela basta para pernas
         entre capitais, que começam e terminam no mesmo zoom. Um desvio pode
         começar em cima da torre de São Paulo: ali são 1,49 rad de arco E 8,94
         nats de escala para subir, e dar a esse movimento os 2,6 s de uma perna
         comum faz a escala andar 15 nats por segundo — medido em 0,28 nat entre
         dois quadros vizinhos, um tranco visível.

         O esforço é a hipotenusa dos dois (é a mesma ideia do `w_max` da curva
         de van Wijk, que também é uma hipotenusa), e a cadência é a da fase
         `sobe` do mergulho, que o dono já aprovou: 9,24 nats em 2,4 s, ou seja
         260 ms por nat. Com folga, 300. */
      const arcoDesvio = distancia(de, para);
      const esforco = Math.hypot(arcoDesvio, Math.log(VISTA_DETALHE / w0));
      desvio.current = {
        de,
        para,
        indice,
        w0,
        incl0: u.incl,
        orb0: u.orb,
        ms: 0,
        duracao: Math.max(
          DESVIO_MINIMO_MS,
          duracaoDe(arcoDesvio),
          esforco * DESVIO_MS_POR_NAT,
        ),
        montado: false,
      };
      /* Se o clique chegar antes de a entrada acabar, ela é dada por encerrada:
         o visitante pediu uma cidade, e fazê-lo esperar o mergulho de abertura
         seria ignorar o pedido. */
      r.mergulhou = true;
    };
    palco.escolher = escolher.current;

    mede();
    const umQuadro = () =>
      desenha(angulo.current.yaw, angulo.current.pitch, angulo.current.escala);

    const observador =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            mede();
            if (!voa) {
              umQuadro();
              /* COM O FREIO PUXADO o 3D está congelado no último quadro que
                 desenhou — e um `resize` apaga o buffer dele (o r3f redimensiona
                 o canvas, e redimensionar um canvas o zera). Só aqui, então, um
                 quadro 3D é entregue fora do laço: é o quadro que redesenha o
                 planeta no tamanho novo. A regra "zero quadros com a aba oculta"
                 continua inteira — ninguém redimensiona uma janela que não está
                 vendo. */
              if (palco.pronto) entrega(performance.now());
            }
          });
    observador?.observe(box);

    /* Fora do `lg`, ou com qualquer um dos freios do relógio puxado (movimento
       reduzido, aba oculta, hero fora da tela): UM quadro no estado em que o
       globo está, e para. Nada reagenda.
       É AQUI QUE MORA O "SEM VOO" do `prefers-reduced-motion`: sem laço não há
       bolinha, não há câmera e não há zoom — o globo fica no enquadramento do
       servidor e a troca de cidade, que continua sendo o relógio de 3 s do
       `Hero`, é um fade de opacidade do rótulo e do pino (CSS do `CountryTag`).
       O celular (<1024) cai no mesmo caminho, por largura. */
    if (!voa) {
      /* Sem laço, o globo fica na orientação de REPOUSO: é a que o servidor
         pintou e a que põe cada pino exatamente onde o `left/top` dele manda.
         (Com o laço de pé e um freio puxado, ao contrário, ele congela onde
         está — voltar ao repouso seria um salto.) */
      if (!voa) angulo.current = { yaw: 0, pitch: 0, escala: 1 };
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
    let ultimo = -1;

    /* O CURSOR MOVE O PLANETA (pedido do dono, 16/10: "deixe o globo interativo,
       ao passar o cursor por cima deve se mexer").

       Ele SOMA à câmera do voo, com 40% do gesto que tinha (ver `CURSOR_PESO`):
       agora o planeta está sempre aproximado, e no zoom cada grau de guinada
       vale mais pixel. O empurrão máximo é 2,2° de guinada e 1,2° de
       inclinação, que no detalhe de 1,8× deslocam a bolinha 7% do raio do disco
       — o globo responde à mão sem tirar do meio o ponto que o voo está
       afirmando, e sem comer a folga medida até a coluna de texto.

       A suavização exponencial de 0,28 s continua nos dois sentidos, então nada
       salta nem na entrada do cursor nem na saída.

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
      /* O cursor avisa o que o clique vai fazer ali. Barato: sete distâncias e
         uma comparação de raio. */
      const emCima = arrastando ? -1 : perto(ev);
      if (arrastando) marcaCursor(0);
      else if (emCima >= 0) marcaCursor(2);
      else marcaCursor(noDisco(ev) ? 1 : -1);

      /* O PAÍS SOB O PONTEIRO vai para o contrato, e a cena 3D acende os
         pontos dele (ver `uHover`). Mesma régua, mesma função: o convite
         para clicar é desenhado exatamente onde o clique funciona. */
      palco.hover = emCima;

      /* O PARALLAX CONGELA ENQUANTO SE ARRASTA. Dois gestos disputando a
         mesma câmera dão um planeta que escorrega da mão: o arrasto diz
         para onde girar e o parallax, lendo o mesmo ponteiro, puxa junto.
         Quem está segurando manda sozinho. */
      if (arrastando) return;
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
      /* O realce do país sai junto com o ponteiro: um país aceso sem ninguém
         em cima dele é uma promessa de clique que não existe mais. */
      palco.hover = -1;
    };
    /* ----------------------------------------------- O PAÍS CLICÁVEL

       Pedido do dono, 17/10: "quero agora que cada país seja clicável, no
       globo, e quando clicar no ponto de São Paulo continue o efeito".

       A escuta fica na SEÇÃO e o alvo é calculado, não apontado — e isso não é
       atalho, é a única forma que funciona aqui. O alfinete é um nó DOM de
       tamanho zero dentro de uma camada `pointer-events: none` que o navegador
       pinta ANTES da coluna de texto; medido em 17/10, um alvo de 36 px posto
       no alfinete nunca recebia o clique, porque a primeira linha do título
       (`.hero-linha`) cobre aquele ponto da tela. Devolver o ponteiro ao globo
       o tiraria dos botões do hero, que é exatamente o que a camada existe para
       evitar.

       Então: a cena já PUBLICA onde cada pino caiu na tela (`cena.telaPinos`,
       escrito pela matriz da câmera a cada quadro). O clique mede a distância
       até cada um deles e escolhe o mais perto, se estiver dentro de
       `RAIO_CLIQUE` e se aquele pino estiver visível. Nenhum nó novo, nenhuma
       camada nova, e funciona para os sete.

       O CURSOR acompanha: `pointermove` já roda aqui para o empurrão do planeta,
       e marcar a seção com `cursor: pointer` quando o ponteiro está em cima de
       um país é o que avisa que ali há o que clicar. É uma escrita de estilo só
       quando o estado MUDA, nunca por quadro.

       Um clique em cima de um link ou botão nunca chega aqui: o `closest` o
       devolve a quem é dele. */
    const perto = (ev: PointerEvent) => {
      const b = caixa.current?.getBoundingClientRect();
      const g = geo.current;
      const tela = palco.telaPinos;
      if (!b || !g || !tela.length) return -1;
      const x = ev.clientX - b.left;
      const y = ev.clientY - b.top;
      let melhor = -1;
      let menor = RAIO_CLIQUE * RAIO_CLIQUE;
      for (let j = 0; j < lista.length; j += 1) {
        const el = alfinetes.current[j];
        if (!el || el.hidden) continue;
        const dx = tela[j * 3] - x;
        const dy = tela[j * 3 + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < menor) {
          menor = d;
          melhor = j;
        }
      }
      return melhor;
    };

    /* TRÊS CURSORES, e é com eles que o globo conta que é manipulável: `pointer`
       em cima de um país (ali o clique escolhe), `grab` no resto do disco (ali
       o clique gira), `grabbing` enquanto o dedo está em cima. Fora do disco,
       nenhum — o cursor é da seção inteira, e o texto ao lado não pode herdar
       mão de arrastar.
       Escrito só na MUDANÇA: tocar o `style` 60 vezes por segundo paga
       invalidação de graça. */
    let cursorEstado = -1;
    const marcaCursor = (estado: number) => {
      if (estado === cursorEstado || !secao) return;
      cursorEstado = estado;
      (secao as HTMLElement).style.cursor =
        estado === 2 ? "pointer" : estado === 1 ? "grab" : estado === 0 ? "grabbing" : "";
    };

    /* ------------------------------------------- O GLOBO INTEIRO SE GIRA

       Pedido do dono, 17/10: "o globo como um todo deve ser clicável e, ao
       clicar em qualquer lugar do globo, girá-lo conforme o sentido do clique —
       girá-lo levemente, mas livre".

       O gesto é um DESLOCAMENTO DE CÂMERA somado por cima do que o voo manda:
       `livreYaw` e `livrePitch`. O voo nunca para — ele continua contando, e o
       planeta aparece deslocado. É isso que faz o gesto ser "leve": o visitante
       empurra, o planeta responde, e o enquadramento volta sozinho para onde o
       voo o quer.

       A CONTA É A PROJEÇÃO ORTOGRÁFICA INVERTIDA. Um ponto da superfície cai em
       `R + Z·R·x₁`, então um deslocamento de Δx px pede `Δyaw = Δx / (R·Z)`. É
       dividir pela escala EFETIVA que faz um dedo de 100 px girar o mesmo tanto
       de TELA no planeta inteiro (1,35×) e em cima da torre de São Paulo
       (9.200×) — sem isso, o mesmo gesto que no globo é um empurrão seria, na
       maquete, quatro mil larguras de tela.

       QUEM GANHA O CLIQUE. Dentro do disco e a ≤ 30 px de um pino, é país (o
       desvio, acima). Dentro do disco e longe de todos, é gesto. Fora do disco,
       nada — a camada do palco cobre a seção inteira e não pode roubar o clique
       de quem está em cima do texto.
       ------------------------------------------------------------------- */
    let livreYaw = 0;
    let livrePitch = 0;
    let velYaw = 0;
    let velPitch = 0;
    let arrastando = false;
    let arrastouPx = 0;
    let tDown = 0;
    let xUlt = 0;
    let yUlt = 0;
    let ponteiroId = -1;

    /** Onde o ponteiro caiu, em px da caixa do globo, e se está no disco. */
    /* O DISCO, COM OU SEM CINEMA.

       Fora do cinema o disco É a caixa do globo, e o centro dela é (R, R)
       — foi assim que esta função nasceu. No cinema ele cresce e anda para
       o meio da janela, e aí a caixa deixa de ser a régua: quem manda é o
       trio cineLado/cineX/cineY que a cena 3D publica. Sem isto, arrastar
       na metade nova do disco não pegaria — o ponteiro estaria fora da
       caixa pequena e o gesto simplesmente não começaria. */
    const noDisco = (ev: PointerEvent) => {
      const b = caixa.current?.getBoundingClientRect();
      if (!b) return null;
      const cine = palco.cineLado > 0;
      const R = cine ? palco.cineLado / 2 : b.width / 2;
      const cx = cine ? palco.cineX : b.width / 2;
      const cy = cine ? palco.cineY : b.height / 2;
      const x = ev.clientX - b.left;
      const y = ev.clientY - b.top;
      const dx = x - cx;
      const dy = y - cy;
      return dx * dx + dy * dy <= R * R ? { x, y, R, cx, cy } : null;
    };

    /** A escala que o espectador VÊ: no mergulho é a da caixa `sp`. */
    const escalaVista = () =>
      palco.sp.ativo ? palco.sp.zoom : Math.max(1, angulo.current.escala);

    const aoPressionar = (ev: PointerEvent) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      const alvoDom = ev.target as HTMLElement | null;
      if (alvoDom?.closest("a,button,input,textarea,select,label")) return;
      const d = noDisco(ev);
      if (!d) return;

      /* País tem prioridade: um pino debaixo do dedo é uma escolha, não um
         empurrão. */
      const j = perto(ev);
      if (j >= 0) {
        escolher.current(j);
        return;
      }

      arrastando = true;
      arrastouPx = 0;
      tDown = performance.now();
      xUlt = ev.clientX;
      yUlt = ev.clientY;
      velYaw = 0;
      velPitch = 0;
      ponteiroId = ev.pointerId;
      /* A captura segue o dedo para fora da seção: soltar o botão em cima do
         cabeçalho não pode deixar o planeta preso no último deslocamento. */
      try {
        (secao as HTMLElement)?.setPointerCapture(ev.pointerId);
      } catch {
        /* Navegador sem captura de ponteiro: o `pointerup` na seção basta. */
      }
      marcaCursor(0);
    };

    const aoArrastar = (ev: PointerEvent) => {
      if (!arrastando || ev.pointerId !== ponteiroId) return;
      const b = caixa.current?.getBoundingClientRect();
      if (!b) return;
      /* O RAIO APARENTE, não o da caixa: no cinema o disco cresce ~21%, e
         com o raio antigo o mesmo gesto giraria 21% a mais de superfície
         por pixel — o planeta ficaria mais escorregadio justamente no
         momento em que está maior e mais perto. A conta de Δyaw = Δx/(R·Z)
         continua idêntica; o que muda é de onde vem o R. */
      const R = palco.cineLado > 0 ? palco.cineLado / 2 : b.width / 2;
      const Z = escalaVista();
      const dx = ev.clientX - xUlt;
      /* NO TOQUE SÓ O HORIZONTAL GIRA: o vertical é rolagem de página, e
         sequestrá-lo seria prender o visitante no hero. É a mesma regra das
         placas de Prêmios. */
      const dy = ev.pointerType === "mouse" ? ev.clientY - yUlt : 0;
      xUlt = ev.clientX;
      yUlt = ev.clientY;
      arrastouPx += Math.abs(dx) + Math.abs(dy);

      const passoYaw = dx / (R * Z);
      const passoPitch = dy / (R * Z);
      livreYaw += passoYaw;
      livrePitch = Math.max(
        -LIVRE_PITCH_MAX,
        Math.min(LIVRE_PITCH_MAX, livrePitch + passoPitch),
      );
      /* A velocidade do ÚLTIMO movimento é o que vira inércia ao soltar. Em
         radianos por ms, a unidade do laço. */
      const dt = Math.max(1, performance.now() - tDown);
      velYaw = passoYaw / Math.min(32, dt);
      velPitch = passoPitch / Math.min(32, dt);
      tDown = performance.now();
    };

    const aoSoltar = (ev: PointerEvent) => {
      if (!arrastando || ev.pointerId !== ponteiroId) return;
      arrastando = false;
      ponteiroId = -1;
      try {
        (secao as HTMLElement)?.releasePointerCapture(ev.pointerId);
      } catch {
        /* idem */
      }

      /* CLIQUE SECO = EMPURRÃO "conforme o sentido do clique": o ponto da
         superfície debaixo do dedo anda um quarto do caminho até o meio do
         disco. Clicar à direita traz a direita para o centro, um pouco — e a
         mola, logo abaixo, devolve o enquadramento ao voo. */
      const seco =
        arrastouPx < CLIQUE_SECO_PX &&
        performance.now() - tDown < CLIQUE_SECO_MS;
      if (seco) {
        const d = noDisco(ev);
        if (d) {
          const Z = escalaVista();
          livreYaw += (-EMPURRAO * (d.x - d.cx)) / (d.R * Z);
          livrePitch = Math.max(
            -LIVRE_PITCH_MAX,
            Math.min(
              LIVRE_PITCH_MAX,
              livrePitch + (EMPURRAO * (d.cy - d.y)) / (d.R * Z),
            ),
          );
        }
      }

      /* O CURSOR VOLTA NO SOLTAR, e não no próximo movimento. Medido: soltando
         o botão sem mexer o ponteiro, a mão fechada continuava desenhada até o
         usuário arrastar o mouse de novo — porque só o pointermove reavaliava
         o estado. Quem solta já não está mais segurando. */
      if (perto(ev) >= 0) marcaCursor(2);
      else marcaCursor(noDisco(ev) ? 1 : -1);
    };

    secao?.addEventListener("pointermove", moveu, { passive: true });
    secao?.addEventListener("pointermove", aoArrastar, { passive: true });
    secao?.addEventListener("pointerleave", saiu);
    secao?.addEventListener("pointerdown", aoPressionar);
    secao?.addEventListener("pointerup", aoSoltar);
    secao?.addEventListener("pointercancel", aoSoltar);

    const quadro = (t: number) => {
      raf = requestAnimationFrame(quadro);
      /* SEM ACELERADOR: 60 fps, como o dono pediu. O `dt` é em ms (a unidade do
         modelo de voo) e vem preso em `DT_TETO` — ver o comentário dele. */
      const dt = ultimo < 0 ? 0 : Math.min(DT_TETO, t - ultimo);
      ultimo = t;

      /* -------------------------------------------------------------- o voo

         O RELÓGIO. `dt` é somado num acumulador, e é esse acumulador que o
         modelo lê. Nada aqui consulta `performance.now()`: é o que faz os
         freios PARAREM o voo em vez de o adiantarem, e é o que faz a retomada
         ser de onde se estava (ver `relogio`).

         A ENTRADA, em dois tempos. Primeiro a espera de 2,2 s — a rampa que já
         existia —, em que a câmera fica no centro da projeção e a escala em 1:
         o primeiro quadro do laço cai EXATAMENTE sobre o quadro do servidor,
         que é regra dura do hero (o `<h1>` ao lado é o LCP da página). Depois o
         MERGULHO até o pouso na primeira cidade, pela mesma curva de van Wijk
         das pernas. É a única vez em que o voo começa de um estado que não é um
         pouso, e por isso é a única que tem código próprio — 10 linhas.

         DEPOIS DA ENTRADA é sempre o mesmo ciclo: pouso → voo → pouso. Quem
         avança a fila é o FIM do ciclo, nunca um relógio de fora; o resto do ms
         que sobrou do quadro é CARREGADO para o pouso seguinte (`ms -= ciclo`),
         e é por isso que a cadência não escorrega em telas de 120 Hz. */
      const r = relogio.current;
      let cam: Ponto;
      let esc: number;
      const d = desvio.current;

      if (d) {
        /* ------------------------------------------------- O DESVIO DO CLIQUE

           Uma perna de voo como as sete do tour, só que de onde a câmera estava
           até a cidade escolhida. Ver `escolher.current`, acima. */
        d.ms += dt;
        const tt = Math.min(1, d.ms / d.duracao);
        const q = perna(d.de, d.para, d.w0, VISTA_DETALHE, tt, ATRASO);
        cam = q.camera;
        fase = "voo";
        msFase = d.ms;
        uBola = q.u;

        /* A ESCALA EM DOIS CANAIS, exatamente como no mergulho de São Paulo: o
           que passa de `ZOOM_DETALHE` vai para a caixa `sp` (que é quem a cena
           3D lê) e o canvas 2D fica em 1,35×. É o que impede o 2D de tentar
           ampliar 5.458 pontos de Fibonacci por 9.200 quando o desvio começa em
           cima da torre — e é o mesmo mecanismo, não um segundo. */
        /* A ESCALA DO DESVIO fica na curva de van Wijk.

           Eu tentei trocá-la por uma interpolação logarítmica da escala, como
           a da fase sobe do mergulho: de 8.566x para 1,35x são 8,7 nats, e num
           primeiro olhar a hipérbole de van Wijk me pareceu concentrar demais
           o movimento. Medi as duas pela taxa no tempo de ANIMAÇÃO (o headless
           prende o relógio no teto de 100 ms por quadro, então um passo de lá
           vale seis daqui): van Wijk dá pico de 3,03 nats/s, o logaritmo
           suavizado dá 4,42. Van Wijk ganha, e tinha de ganhar — é exatamente
           o problema que ela resolve: minimizar a velocidade PERCEBIDA ao
           longo do caminho, não só distribuir a escala por igual. */
        const alto = q.zoom > ZOOM_DETALHE + 1e-3;
        esc = alto ? ZOOM_DETALHE : q.zoom;

        /* A CIDADE SE DESFAZ NO CAMINHO, não some.

           As visibilidades saem da ESCALA (nunca do tempo), então subir é a
           descida ao contrário e as camadas se apagam na ordem em que
           apareceram. A obliquidade e a órbita, que o mergulho tinha deixado em
           32° e ±5°, voltam a zero nos primeiros 40% do desvio: endireitar
           primeiro e afastar depois é a mesma leitura de "levantar voo" que a
           fase `sobe` do mergulho já usa. */
        const sp = palco.sp;
        if (alto) {
          const v = visibilidades(q.zoom);
          const k = 1 - suave(Math.min(1, tt / DESVIO_ENDIREITA));
          const incl = d.incl0 * k;
          const orb = d.orb0 * k;
          const en = enquadra(cam, incl, orb);
          sp.ativo = true;
          sp.fase = "desvio";
          sp.zoom = q.zoom;
          sp.inclinacao = incl;
          sp.orbita = orb;
          sp.pitch = en.pitch + livrePitch;
          sp.yaw = en.yaw + livreYaw;
          sp.x = en.x;
          sp.y = en.y;
          sp.pontos = v.pontos;
          sp.mapa = v.mapa;
          sp.predios = celular ? 0 : v.predios;
          sp.logo = celular ? 0 : v.logo;
          sp.detalhe = celular ? 0 : v.detalhe;
        } else {
          sp.ativo = false;
        }

        /* O rastro da perna do desvio, montado UMA vez. */
        if (!d.montado) {
          d.montado = true;
          temRastro = true;
          rastroDe = -1;
          montaRastro(d.de, d.para);
        }
        const vd = baseVector(q.bola.lat, q.bola.lon);
        bolaBase = vd;
        const sobeD = 1 + REDE_SOBE * Math.sin(Math.PI * q.u);
        palco.bola[0] = vd[0] * sobeD;
        palco.bola[1] = vd[1] * sobeD;
        palco.bola[2] = vd[2] * sobeD;
        palco.de = ativo.current;
        palco.para = d.indice;

        /* CHEGOU: daqui em diante é o pouso normal — pulso, rótulo cheio e, em
           São Paulo, o mergulho depois dos 1,8 s. O relógio do tour recomeça do
           zero naquela cidade, e o desvio deixa de existir. */
        if (tt >= 1) {
          ativo.current = d.indice;
          r.ms = 0;
          desvio.current = null;
          rastroDe = -1;
          avisar.current?.(d.indice);
        }
      } else if (!r.mergulhou) {
        /* A ENTRADA NÃO MERGULHA: o mergulho em São Paulo só existe depois de a
           câmera ter pousado lá pela primeira vez. Desligar a caixa aqui é o
           que impede um estado velho de sobreviver a uma remontagem do efeito
           no meio da parada. */
        palco.sp.ativo = false;
        r.entrada += dt;
        if (r.entrada <= ESPERA_MS) {
          cam = centroProj;
          esc = 1;
          fase = "pouso";
          /* UM POUSO ANTIGO, e o número é o que diz isso: 10 s de pouso deixam
             os sete rótulos ACESOS (é o estado que o servidor pintou) e o pulso
             do pino e o flash da Europa apagados, que é a regra do hero para a
             entrada — nada pisca antes de o voo começar. */
          msFase = 1e4;
          uBola = 0;
          bolaBase = alvo(lista[ativo.current] ?? "");
        } else {
          const m = mergulho(
            centroProj,
            cidades[ativo.current] ?? centroProj,
            r.entrada - ESPERA_MS,
            mergulhoMs,
          );
          cam = m.camera;
          esc = m.zoom;
          fase = "pouso";
          /* O relógio do pouso só começa a contar quando o mergulho acaba: é
             assim que o pulso do pino, o rótulo cheio e o flash da Europa
             disparam na CHEGADA em São Paulo, e não durante a descida. Até lá
             vale o mesmo "pouso antigo" da espera: os rótulos que ainda caibam
             na vigia continuam acesos, e quem sai do disco apaga por GEOMETRIA
             enquanto a câmera desce — nenhum deles pisca. */
          msFase = 1e4;
          uBola = 0;
          bolaBase = alvo(lista[ativo.current] ?? "");
          if (m.pronto) {
            r.mergulhou = true;
            r.ms = 0;
          }
        }
      } else {
        r.ms += dt;
        let e = voo(cidades, ativo.current, r.ms, pousoDe(ativo.current));
        if (r.ms >= e.ciclo) {
          r.ms -= e.ciclo;
          ativo.current = e.para;
          /* O `Hero` é o espelho: ele guarda `activeIndex` para o DOM (status,
             chips, resumo do leitor de tela) e o devolve no render seguinte, que
             o efeito de cima absorve sem tocar no relógio. Escrever o `ref`
             AQUI, e não esperar o render, é o que garante que o quadro seguinte
             já desenhe a cidade nova — um quadro de discordância entre o
             desenho e o rótulo seria visível a 1,8×. */
          avisar.current?.(e.para);
          e = voo(cidades, ativo.current, r.ms, pousoDe(ativo.current));
        }
        cam = e.camera;
        esc = e.zoom;
        fase = e.fase;
        msFase = e.fase === "pouso" ? e.msPouso : r.ms - e.pouso;
        uBola = e.u;

        /* O MERGULHO EM SÃO PAULO. `e.msPouso` é o tempo dentro da parada, que é
           exatamente o relógio que `mergulhoSP` pede. Fora de São Paulo a caixa
           fica desligada e nada nela é lido. */
        mergulha(e);

        /* O RASTRO é remontado UMA vez por perna, no primeiro quadro do voo: os
           25 pontos do grande círculo, já na base da projeção. Durante o pouso
           o buffer guarda a perna que ACABOU de chegar — é ela que desvanece. */
        if (e.fase === "voo" && rastroDe !== e.de) {
          rastroDe = e.de;
          temRastro = true;
          for (let s = 0; s <= RASTRO_PASSOS; s += 1) {
            const t = s / RASTRO_PASSOS;
            const p = interpola(cidades[e.de], cidades[e.para], t);
            const v = baseVector(p.lat, p.lon);
            rastro[s * 3] = v[0];
            rastro[s * 3 + 1] = v[1];
            rastro[s * 3 + 2] = v[2];
            /* A MESMA perna, ERGUIDA, para a cena 3D (etapa 3): `REDE_SOBE` no
               meio do caminho e zero nas pontas, que é a elevação das pernas da
               rede. O cometa viaja POR CIMA do planeta, dentro do próprio arco,
               em vez de raspar o chão como fazia no 2D — é o "com volume" do
               pedido, e é a única coisa que muda de LUGAR na migração.
               Escrito no mesmo laço porque é a mesma interpolação: um `slerp`,
               dois buffers. */
            const sobe = 1 + REDE_SOBE * Math.sin(Math.PI * t);
            palco.arco[s * 3] = v[0] * sobe;
            palco.arco[s * 3 + 1] = v[1] * sobe;
            palco.arco[s * 3 + 2] = v[2] * sobe;
          }
        }
        const vb = baseVector(e.bola.lat, e.bola.lon);
        bolaBase = vb;
        /* A bolinha, erguida como o arco em que ela viaja. */
        const sobeBola = 1 + REDE_SOBE * Math.sin(Math.PI * e.u);
        palco.bola[0] = vb[0] * sobeBola;
        palco.bola[1] = vb[1] * sobeBola;
        palco.bola[2] = vb[2] * sobeBola;
        palco.de = e.de;
        palco.para = e.para;
      }

      /* O ÚLTIMO QUADRO, para o clique poder partir de onde a câmera está (ver
         `ultimoQuadro`). Guardado DEPOIS de tudo decidido, e incluindo a escala
         que o espectador vê — que no mergulho é a da caixa `sp`, não a do voo. */
      palco.livreYaw = livreYaw;
      palco.livrePitch = livrePitch;

      const uq = ultimoQuadro.current;
      uq.cam = cam;
      uq.escVista = palco.sp.ativo ? palco.sp.zoom : esc;
      uq.incl = palco.sp.ativo ? palco.sp.inclinacao : 0;
      uq.orb = palco.sp.ativo ? palco.sp.orbita : 0;

      /* ----------------------------------------- O CINEMA E O MERGULHO

         DOIS SINAIS, DOIS DONOS (ver `cena.cine` e `cena.mergulho`).

         `cine` é TEMPO: ele persegue o palco da linha do tempo de São Paulo,
         que sobe na fase `chegada` com o zoom parado e desce na `despedida`
         com o zoom já de volta. Ele manda no texto e na viagem do disco.

         `mergulho` é ESCALA: a mesma rampa de zoom de antes, entre 60 e 600.
         Ele manda no crescimento do disco e no apagamento das camadas CSS do
         planeta.

         Separá-los é o pedido do dono de 17/10 traduzido em código: primeiro
         a página cede o espaço (cine), depois a câmera desce (mergulho). Com
         um sinal só, as duas coisas aconteciam no mesmo intervalo e nenhuma
         se lia. */
      const alvoCine = palco.leve ? 0 : palco.sp.ativo ? palco.sp.palco : 0;
      const passo = CINE_TAXA * dt;
      const cine =
        alvoCine > cineAtual.current
          ? Math.min(alvoCine, cineAtual.current + passo)
          : Math.max(alvoCine, cineAtual.current - passo);
      cineAtual.current = cine;
      palco.cine = cine;

      /* 'merg' e nao 'mergulho': ja existe uma funcao com esse nome neste
         escopo (a que escreve a caixa sp por quadro), e sombrea-la deixaria o
         laco chamando um numero. */
      const merg = palco.leve
        ? 0
        : suave((Math.log(uq.escVista) - LN_CINE_0) / (LN_CINE_1 - LN_CINE_0));
      palco.mergulho = merg;

      if (
        Math.abs(cine - cineAnt.current) > 0.003 ||
        Math.abs(merg - mergAnt.current) > 0.003 ||
        (cine === 0 && cineAnt.current !== 0) ||
        (merg === 0 && mergAnt.current !== 0)
      ) {
        cineAnt.current = cine;
        mergAnt.current = merg;
        if (!secaoCine.current) {
          secaoCine.current = caixa.current?.closest("section") ?? null;
        }
        const sec = secaoCine.current;
        if (sec) {
          if (cine > CINE_PISO) {
            sec.style.setProperty("--cine", cine.toFixed(3));
            /* Acima de zero a camada do texto já é promovida: a opacidade
               dele muda a cada quadro por ~1 s, e sem a promoção cada
               quadro repintaria o <h1>, o lead e os botões. */
            sec.classList.add("hero-cena--cine");
            /* A CLASSE É UM DEGRAU, a variável é a rampa. A classe só existe
               para tirar o ponteiro do bloco apagado: um texto em opacidade
               0,02 ainda recebe clique, e um botão invisível que engole o
               arrasto do planeta é pior do que nenhum botão. */
            sec.classList.toggle("hero-cena--cinema", cine > 0.5);
          } else {
            sec.style.removeProperty("--cine");
            sec.classList.remove("hero-cena--cine");
            sec.classList.remove("hero-cena--cinema");
          }
          if (merg > CINE_PISO) {
            sec.style.setProperty("--mergulho", merg.toFixed(3));
          } else {
            sec.style.removeProperty("--mergulho");
          }
        }
      }
      /* OS RÓTULOS: saem no começo do voo, voltam depois do pouso. `suave` é o
         smoothstep de sempre, para a opacidade não ter canto nas pontas. */
      const rp =
        fase === "voo"
          ? 1 - Math.min(1, msFase / ROTULO_SAI_MS)
          : Math.min(
              1,
              Math.max(0, (msFase - ROTULO_ESPERA_MS) / ROTULO_VOLTA_MS),
            );
      rotulos = rp * rp * (3 - 2 * rp);

      /* O GESTO, por quadro: inércia curta e mola de volta a zero.

         As duas acontecem JUNTAS, e não em sequência: somadas, o que se vê é um
         planeta que continua um instante na direção do empurrão e volta — que é
         exatamente o gesto de um globo de mesa. Em sequência seria um
         deslizamento seguido de um retorno, duas coisas, e o olho veria a
         emenda. Com o dedo em cima nada disto roda: ali quem manda é o dedo. */
      if (!arrastando) {
        livreYaw += velYaw * dt;
        livrePitch += velPitch * dt;
        const amortece = Math.exp(-dt / LIVRE_INERCIA_MS);
        velYaw *= amortece;
        velPitch *= amortece;
        const volta = 1 - Math.exp(-dt / LIVRE_MOLA_MS);
        livreYaw -= livreYaw * volta;
        livrePitch -= livrePitch * volta;
        if (Math.abs(livreYaw) < 1e-6) livreYaw = 0;
        if (Math.abs(livrePitch) < 1e-6) livrePitch = 0;
      }

      /* O RELÓGIO DA CENA (ver `cena.tempo`): o sol, o cintilar das luzes e
         a deriva das nuvens correm por ele, e não pelo voo. */
      palco.tempo += dt / 1000;

      /* O cursor, com a mesma suavização de sempre (~0,28 s). `dt` está em ms
         aqui, daí o divisor de 280. */
      const kc = 1 - Math.exp(-dt / 280);
      curYaw += (alvoYaw - curYaw) * kc;
      curPitch += (alvoPitch - curPitch) * kc;
      forca += (alvoForca - forca) * kc;

      /* O foco de cada pino, perseguido: quem está na cidade da vez vai para 1,
         as outras para 0. É só opacidade e alfa de anel — aqui a perseguição
         serve, porque nada depende de ela ter CHEGADO. Sete contas por quadro.
         SOBE MANSO E DESCE RÁPIDO (0,40 s contra 0,12 s), e a assimetria é
         correção de defeito medida: com uma constante só, o rótulo da cidade de
         onde se PARTIU continuava visível enquanto a câmera já viajava, e a
         1,8× ele corria para a borda — a 1512 de janela a borda direita dele
         chegou a 874px contra os 841 do `<h1>`. O que chega está no centro e
         tem tempo; o que saiu não tem mais trabalho nenhum. */
      for (let j = 0; j < focos.length; j += 1) {
        const alvoF = j === ativo.current ? 1 : 0;
        focos[j] +=
          (alvoF - focos[j]) *
          (1 - Math.exp(-dt / (alvoF > focos[j] ? 400 : 120)));
      }

      /* A CÂMERA: os dois ângulos que centralizam o ponto do voo, mais o
         empurrão do cursor. `centraliza` é a conta da projeção (ver
         `globeMath`), e no centro dela devolve (0, 0) — o ângulo do servidor. */
      const base = centraliza(cam.lat, cam.lon);
      const agora = performance.now();
      /* O DESLOCAMENTO LIVRE entra aqui, somado ao que o voo manda e ao
         empurrão do cursor. Três fontes, uma câmera — e os pinos, que a cena 3D
         projeta pela mesma matriz, acompanham sem uma linha a mais. */
      desenha(
        base.yaw + curYaw * forca * CURSOR_PESO + livreYaw,
        base.pitch + curPitch * forca * CURSOR_PESO + livrePitch,
        esc,
      );
      const olho = medidor();
      const custo = performance.now() - agora;
      olho.quadros += 1;
      olho.soma += custo;
      olho.media = olho.soma / olho.quadros;
      if (custo > olho.pior) olho.pior = custo;
      olho.dt = dt;

      /* O QUADRO ENTREGUE À CENA 3D, no MESMO `requestAnimationFrame`. Não é
         `invalidate()`: aquele agenda um quadro próprio e o 3D sairia 16,7 ms
         atrasado, o que no pico de velocidade são 5,4 px de descolamento entre
         o pino DOM e a esfera — ver `entrega()` em `cena.ts`. Sem cena montada
         é uma comparação com `null` e nada mais. */
      entrega(t);
    };

    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      observador?.disconnect();
      secao?.removeEventListener("pointermove", moveu);
      secao?.removeEventListener("pointermove", aoArrastar);
      secao?.removeEventListener("pointerleave", saiu);
      secao?.removeEventListener("pointerdown", aoPressionar);
      secao?.removeEventListener("pointerup", aoSoltar);
      secao?.removeEventListener("pointercancel", aoSoltar);
      marcaCursor(-1);
    };
  }, [codes, running, modo, voa, trocaParada, entrada]);

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

        {/* O PLANETA EM 3D, etapa 1 (pedido do dono, 17/10).

            LOGO DEPOIS do canvas 2D, e isto é a pilha de camadas do globo lida
            de baixo para cima: halo, oceano, atmosfera, MARCA D'ÁGUA, pontos.
            O 3D entra no mesmo degrau dos pontos — em cima da marca, debaixo do
            limbo —, porque é a terra firme que ele substitui, e nada mais.
            Para isso a esfera-base dele escreve só PROFUNDIDADE e nenhuma cor:
            uma esfera opaca aqui apagaria a marca d'água, que é o elemento de
            LCP da página (ver `HeroGlobe3D`).

            Antes do portão abrir este nó não existe e o chunk não é baixado —
            `next/dynamic` adia o download até o componente RENDERIZAR. */}
        {mostra3d ? (
          <HeroGlobe3D key={leve ? "leve" : "cheio"} leve={leve} />
        ) : null}

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

        {/* O RÓTULO DE FICÇÃO DA TORRE, no fundo do mergulho em São Paulo.

            A cidade embaixo é geometria REAL (contornos do OpenStreetMap, mapa
            noturno de verdade); a torre com a marca da Wone na fachada NÃO é —
            é ilustração. Esta página rotula toda ficção onde ela acontece: o
            ticket do palco já diz "SIMULAÇÃO" em cima dos valores, e a torre
            ganha a mesma palavra ao lado dela, no instante em que a marca
            acende. Nenhum texto novo entrou no dicionário: é `ui.simulation`.

            DOM e não textura, pela razão de sempre — um leitor de tela lê, o
            seletor de idioma troca, e o texto não depende da resolução em que o
            prédio foi desenhado.

            A posição é CRAVADA no centro da caixa mais um deslocamento, e isso
            não é preguiça: `enquadraSP` existe justamente para manter a TORRE no
            meio do disco durante a contemplação (é a translação que devolve o
            alvo ao centro depois de inclinar). O meio do disco É a base da
            torre, em qualquer quadro da contemplação, e os 76 px à direita e
            44 px acima põem o rótulo encostado no topo dela — a torre mede 88
            px de altura e 40 de fachada no fundo do mergulho. */}
        <span
          ref={rotuloSP}
          aria-hidden
          hidden
          className="hero-rotulo-sp"
        >
          {simulacao}
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
                  /* A MESMA lista vai para a cena 3D: desde a etapa 4 é ela
                     quem escreve o `transform` destes nós, com a matriz da
                     câmera e no mesmo quadro. */
                  cena().pinos = alfinetes.current;
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
 * é desenhada enquanto `revela > 0`.
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


/**
/**
 * O ESPIÃO do laço, em `window.__globo`: o custo por quadro e o ESTADO do voo,
 * para a medição no navegador poder provar o que o pedido manda conferir — a
 * bolinha dentro do disco em todas as amostras, a ausência de salto entre duas
 * amostras consecutivas, e o zoom abrindo mais nas viagens longas.
 *
 * É um objeto ÚNICO, criado na primeira chamada e mutado depois: o laço escreve
 * nos campos dele e não aloca nada por quadro. Nada é impresso no console.
 */
type Espiao = {
  /** Custo do desenho: quantos quadros, soma, média e PIOR, em ms. */
  quadros: number;
  soma: number;
  media: number;
  pior: number;
  /** Passo médio da nuvem, em graus: é o teto do zoom (ver `ZOOM_DETALHE`). */
  passo: number;
  /** O último `dt` do laço, em ms: 16,7 é o quadro de 60 Hz. */
  dt: number;
  /** O estado do voo no último quadro. */
  escala: number;
  fase: string;
  cidade: number;
  u: number;
  /** A bolinha em px da caixa (já com a matriz do zoom) e o raio da vigia. */
  bolaX: number;
  bolaY: number;
  bolaVisivel: boolean;
  raio: number;
  /** A câmera, em radianos. */
  yaw: number;
  pitch: number;
};

function medidor(): Espiao {
  const w = window as typeof window & { __globo?: Espiao };
  return (w.__globo ??= {
    quadros: 0,
    soma: 0,
    media: 0,
    pior: 0,
    passo: GLOBE_STEP,
    dt: 0,
    escala: 1,
    fase: "",
    cidade: 0,
    u: 0,
    bolaX: 0,
    bolaY: 0,
    bolaVisivel: false,
    raio: 0,
    yaw: 0,
    pitch: 0,
  });
}
