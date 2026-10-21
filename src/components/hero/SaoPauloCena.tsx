"use client";

/**
 * SÃO PAULO VISTA DE CIMA — a cena que acontece quando a bolinha pousa no
 * Brasil e a câmera mergulha.
 *
 * Ela monta DENTRO do grupo da esfera do `HeroGlobe3D` (o grupo que gira em
 * guinada e inclinação); não tem câmera, não tem luz e não tem relógio. Quem
 * manda no tempo é `mergulhoSP.ts`, que devolve as visibilidades que este
 * componente recebe como props — todas derivadas da ESCALA, inclusive a
 * `fachada`, que é a do retrato de perto. Fora do mergulho, `mapa = 0` e a cena
 * inteira devolve `null`: zero draw call, zero custo.
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
 * O CUSTO: CINCO draw calls (chão, as PAREDES dos vizinhos, os TELHADOS
 * deles, a torre, a marca) — SEIS só enquanto a troca do recorte de detalhe
 * dura, porque fora dela o nó nem é criado —, seis materiais (o sexto é o do
 * recorte, que só nasce no desktop, onde `querDetalhe` é verdade), QUATRO
 * texturas (o mapa de 22 km, o recorte de 4 km, a marca e o ladrilho de
 * janelas, que não é um arquivo: nasce num canvas aqui dentro), zero luz,
 * zero sombra, zero pós-processamento, e 0,2 ms de CPU por quadro (0,5 no
 * percentil 95; 5,7 no primeiro quadro, que é a subida dos buffers para a
 * GPU). Os 4.423 contornos viram DUAS geometrias, construídas uma vez no
 * `useMemo` e devolvidas ao driver no `dispose`.
 *
 * A QUARTA CHAMADA VIROU DUAS EM 18/10, e quem a partiu foi o LADRILHO DE
 * JANELAS dos vizinhos (ver o bloco `TILE_*` e `constroiTexturaJanelas`): as
 * paredes passaram a ter `uv` e um material com textura, e os telhados não
 * podem ter nem um nem outro — um telhado amostrando o ladrilho ganharia
 * janelas deitadas, e um `uv` no telhado seria um atributo pago por 23.437
 * triângulos para não ser lido. Separar as duas famílias em duas geometrias
 * custa exatamente UMA chamada: nem um triângulo a mais, nem um byte a mais
 * de buffer, nem um milissegundo a mais de construção.
 *
 * OS TEMPOS SÃO MEDIDOS NO NAVEGADOR; OS TRIÂNGULOS SÃO CONTADOS DAQUI.
 * A diferença importa: um tempo só existe depois de rodar, mas uma contagem
 * de triângulos sai da própria geometria, emissor por emissor, e é a única
 * forma de a conta não envelhecer sozinha no dia em que alguém acrescentar um
 * andar — foi exatamente o que aconteceu com os "62.638" que esta linha dizia
 * até 18/10, um número medido ANTES de as paredes dos vizinhos ganharem
 * fatias (17/10) e nunca refeito depois. O quadro mais cheio, contado:
 *
 *     paredes     56.632   23.173 faces em 1 ou 2 fatias, COM `uv`
 *     telhados    23.437   as tampas, o fio e as peças de 21/10 (ver abaixo)
 *     torre       15.794   ver `constroiTorre`
 *     chão           640   o disco de 22 km
 *     recorte        640   o disco de 4 km, só enquanto a troca dura
 *     marca            6   três quads
 *     ─────────────────
 *     TOTAL       97.149   (96.509 fora da faixa de troca do recorte)
 *
 * O LADO LISO, PEÇA POR PEÇA (21/10, o requinte da cidade — e a ÚNICA
 * família que cresceu desde 18/10; as paredes não ganharam um triângulo):
 *
 *     telhados           15.633   3.770 tampas, uma por prédio
 *     fio do parapeito    3.132   os 245 prédios acima de 60 m
 *     vitrines              732   366 lojas de térreo em 180 prédios
 *     muretas             2.064   79 terraços, 6 triângulos por aresta
 *     casas de máquinas     690   69 caixas de 4,5 × 3,5 × 2,8 m
 *     caixas d'água         858   39 octógonos sobre elas
 *     helipontos            184   4 discos com o "H" e as luzes
 *     balizas               144   8 mastros com a luz de obstáculo
 *     ──────────────────────────
 *     LISO               23.437
 *
 * COMO ESTES NÚMEROS FORAM CONTADOS, que é o que impede o acidente dos
 * "62.638": não no navegador e não à mão. Um script leu o `spPredios.json`,
 * reimplementou `preparaAneis` inteira (os mesmos cortes de área, de borda e
 * de altura, o mesmo `sorteio`) e os porteiros das oito peças, e somou os
 * triângulos de cada emissor. A PROVA de que a réplica é fiel são dois
 * números que já estavam neste cabeçalho e que ele reproduz exatamente:
 * 56.632 de parede e 15.633 + 3.132 = 18.765 do liso de 18/10. Um terceiro
 * confere o porteiro novo: dos 346 prédios do raio de detalhe, 142 são
 * convexos — o mesmo número que o planejamento mediu por fora.
 *
 * Os 75.397 dos vizinhos de 17/10 eram os MESMOS de 18/10, repartidos:
 * 56.632 de parede texturizada e 18.765 de superfície lisa. O fio do parapeito (os
 * 1,2 m mais claros no alto dos 245 prédios acima de 60 m) atravessou para o
 * lado liso junto com os telhados, e não por economia: ele é a aresta de
 * concreto do topo, e uma fiada de janelas picotando-o o transformaria numa
 * linha tracejada — que é o oposto do que ele existe para fazer.
 *
 * O QUE O RETRATO DE PERTO ACRESCENTOU (18/10, a fase `fachada`): ZERO draw
 * calls, ZERO materiais, ZERO texturas e +14.642 triângulos — a torre vai de
 * 1.152 para 15.794, e o quadro mais cheio de 77.835 para 92.477. Nada disto
 * é um objeto novo: tudo entra na mesma geometria da torre, no mesmo
 * `MeshBasicMaterial` com cor de vértice, e por isso o que o navegador tem de
 * conferir é só que `gl.info.render.calls` não se mexeu.
 *
 * De onde vêm os 14.642, um por um:
 *
 *     14.432   as JANELAS POR VÃO dos três fustes — a face deixou de ser duas
 *              tiras por andar (960 triângulos no total) e virou uma grade de
 *              peitoril, montante e vão (15.392)
 *        128   o aro de luz no piso (64 setores)
 *         36   os dois mastros com as balizas
 *         30   as três caixas técnicas dos terraços
 *          8   a cinta de luz da coroa
 *          4   a vitrine do saguão (um quad por fachada)
 *          4   a caixa de luz do letreiro (idem)
 *
 * Ou seja: tudo o que se NOTA no retrato — a coroa acesa, as balizas no alto,
 * a entrada iluminada, o letreiro com fundo — custa 82 triângulos, 0,57% da
 * grade de janelas, que é a peça que ninguém aponta e sem a qual nenhuma das
 * outras parece estar num prédio.
 *
 * E O QUE OS VIZINHOS GANHARAM (18/10, a mesma fase): ZERO triângulos. As
 * janelas deles não são geometria — são um ladrilho de 512×512 desenhado num
 * canvas no cliente e repetido a cada 25,6 m de fachada. A diferença de
 * método contra a torre é a diferença de PAPEL: a torre é o assunto do
 * retrato, tem 451 px de altura ali e precisa aguentar o olho parado em cima
 * dela, então ela ganhou grade de verdade; os vizinhos são o contexto, a
 * mediana deles tem 15 px, e a mesma grade neles custaria 2,6 milhões de
 * triângulos para desenhar o que um texel de 5 cm desenha igual — por 1,4 MB
 * de VRAM e uma única chamada a mais, que é a dos telhados.
 *
 * E O QUE ELES GANHARAM EM 21/10 ("melhore os detalhes da cidade, no último
 * zoom — capriche, dê toques de requinte"): ZERO draw calls, ZERO materiais,
 * ZERO texturas, ZERO luzes e +4.672 triângulos, TODOS na geometria lisa que
 * já existia. É o mesmo método da tarefa da torre, uma escala depois: nada é
 * um objeto novo, nada é chaveado por prop, nada é um nível de detalhe por
 * escala — as peças estão sempre no buffer e o que o zoom decide é só se o
 * olho as alcança.
 *
 * O CORTE DE CUSTO NÃO FOI NO DETALHE, FOI NO ALCANCE. Seis das oito peças só
 * nascem dentro do `RAIO_DETALHE` de 420 m, que é o que a fase `fachada`
 * enquadra: são 346 prédios dos 3.770, ou 9% da cidade levando 94% dos
 * triângulos novos. As duas que valem para o disco inteiro — o tom de
 * material por prédio e o acabamento do telhado — custam exatamente nada:
 * elas são misturas de cor em vértices que já estavam lá.
 *
 * Por que 97 mil triângulos num hero não assusta: eles são opacos, não
 * indexados, sem luz, com UMA textura entre todos e desenhados em cinco
 * chamadas. O gargalo desta cena nunca foi o vértice — é o número de
 * chamadas e o preenchimento de tela, e os dois continuam onde estavam.
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
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  RepeatWrapping,
  ShapeUtils,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";

import { baseVector } from "./globeMath";
import { SP_CENTRO, SP_MAPA } from "./spMapa";
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
 * O RECORTE DE DETALHE: 4 km nos mesmos 2048 px, centrado na torre.
 *
 * O disco dele tem 2.000 m de raio (a maior circunferência que cabe no
 * quadrado da textura) e é CHEIO até 1.400, desvanecendo até a borda. Os
 * 1.400 não são estética: a 13.248/Z metros por pixel, o disco de 633 px
 * mostra 1.398 m de raio em Z = 3.000, que é onde a troca termina. Ou seja,
 * a partir do instante em que o recorte está inteiro no ar, a faixa que
 * desvanece já não cabe no quadro — e a emenda não tem onde aparecer.
 */
const LADO_CENTRO = SP_CENTRO.larguraKm * 1000;
const RAIO_CENTRO = LADO_CENTRO / 2;
const CHEIO_CENTRO = 0.7;

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
 * O RAIO DO REQUINTE — até onde as peças de telhado nascem (21/10).
 *
 * Pedido do dono: "melhore os detalhes da cidade, no último zoom, no globo —
 * capriche, dê toques de requinte". O último zoom é a fase `fachada`, e ela
 * tem um quadro muito mais apertado que o resto do mergulho: a 0,59 m/px, com
 * a câmera a 55° olhando do sul e o alvo a 130 m de altura, o disco de 375 m
 * cobre ±250 m em x e ±320 m em y no chão. Fora disso não há quadro.
 *
 * 420 m de centroide à torre é essa caixa com folga para a diagonal e para o
 * prédio alto que entra no quadro pelo topo. Dentro dela há 346 prédios dos
 * 3.770 — 9% da cidade levando 100% do custo das peças novas, que é a mesma
 * economia do recorte de detalhe do chão: resolução onde o olho está.
 *
 * E ele é um CORTE DURO, sem rampa de desvanecimento, porque as peças não
 * desaparecem — elas ficam pequenas. Um prédio a 500 m da torre tem o
 * parapeito abaixo de meio pixel em TODA fase do mergulho (na contemplação de
 * 9.200 um pixel vale 2,19 m), de modo que o que está fora do raio não é
 * "menos detalhado": é invisível por aritmética. Uma rampa aqui só pagaria
 * triângulos para esconder uma emenda que não existe.
 */
const RAIO_DETALHE = 420;

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
 *
 * O QUE A FASE `fachada` ACRESCENTOU A ESTE CORTE (18/10). Nenhum metro do
 * corte acima mudou — o que mudou foi a RESOLUÇÃO com que ele é desenhado,
 * porque a 0,59 m/px cabem peças que a 2,19 m/px não existiam:
 *
 *     z   0,3 –   4,8   a vitrine do saguão, nas duas fachadas
 *     z        0,2      o aro de luz no piso (raio 44 a 47 m)
 *    em cada andar      peitoril de 1,0 m, vãos de ~3,2 m, montantes de 0,3
 *     z 108 e 180       três caixas técnicas nos terraços dos recuos
 *     z 276 – 277,2     a cinta de luz da coroa
 *     z 284 – 301       dois mastros de 16 m com as balizas vermelhas
 *
 * Todas nascem na MESMA geometria e no mesmo draw call, e nenhuma é chaveada
 * pela prop `fachada`: elas estão sempre no buffer, e o que a escala decide é
 * só se o olho as alcança. O único metro novo é no alto: o remate continua em
 * 284 m, e a PONTA do mastro com a baliza chega a 301 — 17 m de antena acima
 * do parapeito, que é o que todo arranha-céu real tem e esta torre não tinha.
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
 * A marca: 30 m de largura na fachada (o fuste C tem 42) e 28 m no terraço (o
 * remate tem 36). As duas na proporção 642×400 do logo-icon.png.
 *
 * ELAS CRESCERAM EM 18/10 — 22 → 30 e 24 → 28 — e quem as empurrou foi a fase
 * `fachada`. A 22 m a placa tinha 37 px no fim do mergulho antigo e lia como
 * um ADESIVO numa parede grande; no retrato de perto um pixel vale 0,59 m e
 * ela passa a ter 51 px de largura por 32 de altura, tamanho em que o olho
 * cobra proporção. O pedido do dono fala em "logo da wone bem estilizado", e o
 * que um letreiro de topo de prédio tem de verdade é LARGURA: num edifício
 * real ele ocupa dois terços da fachada, não um terço. 30 m em 42 são 71%.
 *
 * O limite de cima é a MOLDURA, não a placa: ela vai a `lw + 1,5` = 16,5 m de
 * meia-largura, e o fuste C tem 21 — sobram 4,5 m de cada lado antes da fita
 * da aresta, que começa em 20,15. Um passo a mais (34 m de placa) e a moldura
 * encostaria nela.
 *
 * No TERRAÇO o limite é outro: a placa deitada tem de caber nos 36 m do remate
 * SEM encostar nos mastros das balizas, que ficam em y = +12. Com 28 m ela vai
 * de −14 a +14 em x e de −8,7 a +8,7 em y; os mastros ficam 3,3 m ao norte
 * dela, que é a folga que o pedido de "nada atravessando a placa" exige.
 */
const LOGO_LARGURA = 30;
const LOGO_ALTURA = (LOGO_LARGURA * 400) / 642;
const LOGO_TELHADO = 28;
const LOGO_TELHADO_H = (LOGO_TELHADO * 400) / 642;
/**
 * A altura do centro da placa na fachada. A fachada vai de 15 a 240 m; o terço
 * de cima é 165–240 e o meio dele é 202.
 *
 * 206 põe o conjunto inteiro dentro do fuste C (180–240): a placa de 18,7 m de
 * altura ocupa 196,7–215,3, a moldura 195,2–216,8 e a faixa de luz desce a
 * 192. Sobram 12 m de folga embaixo (até o recuo) e 23 m em cima (até a
 * coroa) — e é essa folga de cima que impede o letreiro de brigar com a cinta
 * de luz da coroa, que é a outra fonte de luz alta da torre.
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

/**
 * E ESCURECE MAIS 45% NO RETRATO DA TORRE (fase `fachada`, 18/10).
 *
 * É a mesma decisão do `CHAO_NO_FUNDO`, tomada uma escala adiante e com o sinal
 * trocado. A conta: o recorte de detalhe tem 1,95 m por texel, e a 9.200 a
 * câmera está em 2,19 m/px — 0,89 texel por pixel, ou seja NÍTIDO. Em 34.000
 * ela está em 0,59 m/px: são 3,3 px por texel, e um filamento de luz de rua
 * ampliado 3,3× deixa de ser filamento e vira um QUADRADO de cor. O chão, que
 * na maquete era a fonte de luz do quadro, no retrato é a única peça que não
 * tem resolução para a distância.
 *
 * 45% e não 100%: apagar o chão de todo deixaria o prédio flutuando no preto, e
 * o que faz o retrato parecer real é justamente a cidade embaixo dele. Com os
 * dois sinais cheios o chão fica a 48% (0,88 do `CHAO_NO_FUNDO` vezes 0,55
 * daqui): as avenidas continuam legíveis como traçado e ainda alimentam o
 * bloom, só param de competir com a fachada. Quem carrega o quadro aqui são os
 * prédios — que ganham janela por vão nas tarefas F e V — e os postes das ruas
 * da tarefa L, que nascem desta MESMA textura e trocam os filamentos borrados
 * por lâmpadas de verdade.
 *
 * MULTIPLICA o `CHAO_NO_FUNDO` em vez de somar-se a ele: os dois sinais sobem
 * em escalas diferentes (`logo` entre 5.000 e 9.000, `fachada` entre 12.000 e
 * 26.000), e um produto de fatores nunca sai de [0,1] nem precisa de limite —
 * a soma dos dois descontos (0,57) precisaria, e numa terceira camada
 * passaria de 1 e viraria opacidade negativa.
 */
const CHAO_NA_FACHADA = 0.45;

/**
 * O TETO DAS VIAS NA MAQUETE — o número que apaga o "tracejado laranja".
 *
 * Pedido do dono, 17/10: "no último zoom, na cidade de São Paulo — o zoom que
 * mostra a maquete da cidade — têm duas linhas tracejadas em laranja que se
 * cruzam. Preciso que, nesse zoom da maquete, esse tracejado suma."
 *
 * O QUE É O TRACEJADO: as vias `expressa` da textura noturna, que são laranja
 * da marca com NÚCLEO CREME (ver `VIA_ESTILO_CENTRO` em `scripts/gera-sp.mjs`).
 * Compostas sobre o preto, elas chegam a 0,956 de sRGB no núcleo — branco, na
 * prática — e os prédios da maquete, por cima, cortam essa fita em pedaços: é
 * daí que sai a leitura de "tracejado". Ver `LIMIAR.avenidas` em `mergulhoSP`
 * para QUANDO isto acontece; aqui está QUANTO.
 *
 * O CORTE É UM TETO, NÃO UMA MULTIPLICAÇÃO — e a diferença é de gama. A
 * textura é sRGB e o `diffuseColor` do fragmento já está em LINEAR: multiplicar
 * o linear por 0,18, que é o reflexo de quem pensa em sRGB, devolve o núcleo
 * em 0,34 de sRGB, ou seja ainda uma linha acesa. Um TETO resolve os dois
 * lados de uma vez: tudo o que já está abaixo dele passa INTACTO (as quadras,
 * os telhados, o parque, a água, os halos fracos — o chão escuro em volta não
 * muda de tom nem um degrau), e tudo o que passa dele desce na mesma razão nos
 * três canais, ou seja perde brilho SEM perder a cor. A avenida continua sendo
 * uma faixa laranja desenhada entre os prédios; ela só para de ser lâmpada.
 *
 * 0,030 EM LINEAR = 0,190 em sRGB. A escada, medida na paleta do gerador:
 *
 *   quadras e telhados   0,007–0,0075 linear   (0,080–0,082 sRGB)  ← intactos
 *   TETO                 0,030                 (0,190)
 *   halo largo da via    0,042                 (0,227)             ← mal encosta
 *   núcleo laranja       0,527                 (0,753)             ← 17× abaixo
 *   núcleo creme         0,902                 (0,956)             ← 30× abaixo
 *
 * Fica 2,3× mais claro que a quadra (em sRGB), que é o bastante para o traçado
 * da avenida continuar legível por baixo da maquete, e a luminância da faixa
 * cai para 0,026 — abaixo do `BLOOM_LIMIAR` de 0,12 do `HeroGlobePos`, de modo
 * que ela também deixa de sangrar luz no pós-processamento. Era o bloom que
 * engrossava o tracejado para além dos seus 2 px.
 */
const VIA_TETO = 0.03;

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

/** Copia um terno, para quando uma cor pronta tem de seguir dois caminhos. */
function copia(saida: Tom, a: Tom) {
  saida[0] = a[0];
  saida[1] = a[1];
  saida[2] = a[2];
  return saida;
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

/** O caminho de volta: linear para sRGB. Só o `tinge` daqui precisa dele. */
function canalSRGB(c: number) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** A luminância ITU-R BT.709 de um terno em LINEAR — a régua do bloom. */
function luminancia(linear: Tom) {
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * TINGE UMA COR SEM CLAREÁ-LA — mistura de matiz com a luminância TRAVADA.
 *
 * Ela existe por uma medição, e a medição é esta: misturar 12% de pastilha
 * bege (`#6a5a48`) na parede com o `mistura` comum levanta a luminância média
 * da cidade de 0,02328 para 0,02609, ou +12,1% — acima da tolerância de 10%
 * que o bloco `TILE_*` fixou para a conta de V3, e o suficiente para a
 * CONTEMPLAÇÃO (que é uma escala inteira antes de o tom se enxergar) mudar de
 * brilho por causa de um detalhe que só existe no retrato de perto.
 *
 * A razão é aritmética e vale a pena entender, porque ela reaparece em toda
 * mistura deste arquivo: a face de sombra da cidade é `#07070b`, que tem 0,0022
 * de luminância linear, e a pastilha tem 0,108 — quarenta e nove vezes mais.
 * Doze por cento de uma cor quarenta e nove vezes mais clara não é um ajuste
 * de matiz: é mais que DOBRAR a face escura. O olho não percebe isso como
 * "bege", percebe como "a sombra levantou".
 *
 * O que esta função faz, então, é separar as duas coisas que uma mistura de
 * cores junta: ela interpola o MATIZ em sRGB como sempre e devolve a
 * LUMINÂNCIA ao valor que a cor tinha antes, reescalando os três canais em
 * LINEAR (que é o único espaço onde um fator de escala é um fator de brilho).
 * A conversão de ida e volta é o preço, e ela é paga duas vezes por PRÉDIO —
 * nos dois extremos da paleta dele —, não por face: 7.540 chamadas na
 * construção inteira, contra as 23.173 faces que as consomem.
 *
 * O reescalonamento é sempre para BAIXO (o alvo é mais claro que a base nos
 * dois tons que entram aqui), de modo que nenhum canal estoura; o `min` está
 * lá pelo dia em que alguém tingir uma parede com uma cor mais escura.
 *
 * O RESULTADO, medido do mesmo jeito que o problema: com esta função a
 * luminância média das paredes vai de 0,02328 para 0,02327 — razão 0,9999,
 * ou seja a cidade mudou de MATIZ em 2.262 dos 3.770 prédios e não mudou de
 * brilho em um milésimo. Era isso que o plano queria dizer com "as misturas
 * são de luminância quase neutra"; o que ele não tinha era a conta.
 */
function tinge(saida: Tom, base: Tom, alvo: Tom, t: number) {
  const antes: Tom = [0, 0, 0];
  const depois: Tom = [0, 0, 0];
  const lumBase = luminancia(paraLinear(antes, base));
  mistura(saida, base, alvo, t);
  const lumMix = luminancia(paraLinear(depois, saida));
  if (lumMix <= 1e-9) return saida;
  const k = lumBase / lumMix;
  saida[0] = canalSRGB(Math.min(1, depois[0] * k));
  saida[1] = canalSRGB(Math.min(1, depois[1] * k));
  saida[2] = canalSRGB(Math.min(1, depois[2] * k));
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

/* OS DOIS TONS DE MATERIAL DA CIDADE (21/10) — o que faz 3.770 prédios
   pararem de ser o mesmo prédio repetido.

   Até aqui toda parede saía da MESMA interpolação entre `PAREDE_SOMBRA` e
   `PAREDE_LUZ`: dois prédios vizinhos com a mesma altura e a mesma orientação
   tinham, vértice a vértice, exatamente a mesma cor. Numa maquete de 15 px por
   prédio isso não aparece; no retrato de perto, onde se veem dez fachadas
   lado a lado, aparece — e lê como material plástico, porque é o único lugar
   de uma cidade real em que não há variação nenhuma.

   São os dois materiais que São Paulo tem fora do concreto cinza: a PASTILHA
   e o tijolo dos anos 70 (`#6a5a48`, bege-terra) e o VIDRO azulado das torres
   de escritório (`#3a4a6a`). Nenhum dos dois entra cheio: eles são misturados
   a 12% na cor da parede (20% nas cortinas de vidro), e essa dose é escolhida
   pela conta de luminância, não pelo gosto — os dois foram puxados para perto
   da luminância do `PAREDE_LUZ` justamente para que a cidade mude de MATIZ sem
   mudar de brilho médio, que é a conta que o bloco `TILE_*` tem de manter
   dentro de 10%. */
const PAREDE_QUENTE = tom("#6a5a48");
const PAREDE_FRIO = tom("#3a4a6a");

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
 * A BALIZA — a única cor deste arquivo que NÃO está no `globals.css`, e ela
 * está aqui por norma, não por gosto.
 *
 * Todo arranha-céu acima de 150 m carrega luz de obstáculo vermelha no ponto
 * mais alto (a OACI chama de "baixa intensidade tipo A"; no Brasil é a ICA
 * 100-18). É um dos dois ou três sinais que o olho usa para ler "isto é um
 * edifício alto de verdade" numa silhueta noturna — junto com a coroa
 * iluminada e o letreiro —, e sem ela o remate laranja da torre fica sendo a
 * coisa mais alta do quadro, o que lê como ornamento e não como prédio.
 *
 * #ff2a2a e não o `LARANJA` da marca: a baliza é o único ponto da cena que
 * pode discordar da paleta, porque na vida real ela discorda do prédio. Em
 * luminância ela dá 0,30 em sRGB e 0,21 em linear — ACIMA do `BLOOM_LIMIAR`
 * de 0,12 do `HeroGlobePos`, de modo que o pós-processamento a transforma num
 * ponto com halo, que é exatamente o que uma luz de obstáculo é vista de
 * longe. É a peça mais barata da tarefa F (20 triângulos nas duas) e a que
 * mais diz "noite" no alto do quadro.
 */
const BALIZA = tom("#ff2a2a");

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

/**
 * O que se sabe de um contorno antes de ele virar triângulo.
 *
 * OS CINCO CAMPOS DE BAIXO (`cx`…`angMaior`) NASCERAM EM 21/10, com as peças
 * de telhado do retrato de perto, e todos respondem à mesma pergunta: "cabe
 * alguma coisa em cima deste prédio?". Eles moram AQUI, e não na função que
 * constrói a geometria, por uma razão de custo: `preparaAneis` já percorre os
 * 23.173 vértices da cidade uma vez para achar a área e o sentido do anel, e
 * pendurar mais quatro contas nesse mesmo passeio é de graça — refazê-las lá
 * na frente seria um segundo passeio pelos mesmos vértices, por prédio.
 *
 * `convexo` e `rInscrito` são o PORTEIRO das peças. Uma caixa d'água posta no
 * centroide de um prédio em L sai pendurada no vazio do L, e a 0,59 m/px do
 * retrato isso não é um detalhe: é um erro visível. Com `convexo` o telhado
 * vira uma garantia de que o miolo é mesmo telhado, e com `rInscrito` a peça
 * pergunta "há X metros de laje em volta do centro?" antes de aparecer. É o
 * mesmo contrato para a mureta, a casa de máquinas, o heliponto e a baliza —
 * e é por isso que nenhum deles precisa conhecer a forma do anel.
 */
type AnelPronto = {
  /** x0,y0,x1,y1… em metros (x leste, y norte), sentido anti-horário. */
  readonly pts: Float64Array;
  readonly n: number;
  readonly altura: number;
  readonly semente: number;
  /** A distância do centroide à torre, em metros — a régua das janelas. */
  readonly dist: number;
  /** O centroide (a média dos vértices), no mesmo referencial dos `pts`. */
  readonly cx: number;
  readonly cy: number;
  /** Todos os cantos giram para o mesmo lado? */
  readonly convexo: boolean;
  /** A menor distância do centroide às arestas — 0 se ele cai FORA do anel. */
  readonly rInscrito: number;
  /** O ângulo da aresta mais longa, em radianos: a "frente" do prédio. */
  readonly angMaior: number;
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

    /**
     * A FORMA DO ANEL, num passeio só: o canto mais fechado, a maior aresta e
     * o raio inscrito no centroide.
     *
     * `convexo` sai do produto vetorial em cada canto. Num anel anti-horário
     * todos eles são positivos quando a forma é convexa, e o primeiro negativo
     * denuncia um L, um U ou um pátio. A tolerância de −0,05 m² é para os
     * cantos QUASE retos do cadastro: um vértice que desvia meio centímetro de
     * uma reta de dez metros dá −0,02 m² de produto, e reprovar o prédio por
     * isso tiraria a mureta de metade das quadras da Paulista por causa de
     * ruído de digitalização.
     *
     * `rInscrito` é a menor distância COM SINAL do centroide às retas das
     * arestas. O sinal resolve duas coisas de uma vez: num anel anti-horário
     * ele é positivo quando o centroide está do lado de dentro da aresta, de
     * modo que uma distância negativa (ou zero) significa "o centroide caiu
     * fora do polígono" e o campo vira 0 — que é o valor que reprova toda
     * peça. Num convexo com o centroide dentro, a distância à RETA é a mesma
     * que à aresta, e é exatamente o raio do disco que cabe em volta do
     * centro: a régua que a casa de máquinas e o heliponto pedem.
     *
     * `angMaior` é a direção da fachada mais comprida. Toda peça retangular
     * de telhado se alinha a ela, e não ao norte: num prédio torto na quadra,
     * uma casa de máquinas alinhada ao eixo do mundo fica visivelmente de
     * esguelha com o parapeito, e é o tipo de erro que o olho pega antes de
     * saber o que está vendo.
     */
    let convexo = true;
    let maiorAresta = 0;
    let angMaior = 0;
    let rInscrito = Infinity;
    for (let k = 0; k < n; k++) {
      const j = (k + n - 1) % n;
      const m = (k + 1) % n;
      const ax = pts[j * 2];
      const ay = pts[j * 2 + 1];
      const bx = pts[k * 2];
      const by = pts[k * 2 + 1];
      const nx = pts[m * 2];
      const ny = pts[m * 2 + 1];

      // o giro do canto em b, entre a aresta que chega e a que sai
      const giro = (bx - ax) * (ny - by) - (by - ay) * (nx - bx);
      if (giro < -0.05) convexo = false;

      // a aresta que SAI de b, que é a que esta volta mede
      const dx = nx - bx;
      const dy = ny - by;
      const comp = Math.hypot(dx, dy);
      if (comp > maiorAresta) {
        maiorAresta = comp;
        angMaior = Math.atan2(dy, dx);
      }
      if (comp < 0.05) continue; // vértice repetido: não diz nada da forma
      const lado = (dx * (cy - by) - dy * (cx - bx)) / comp;
      if (lado <= 0) rInscrito = 0;
      else if (lado < rInscrito) rInscrito = lado;
    }
    if (!Number.isFinite(rInscrito)) rInscrito = 0;

    aneis.push({
      pts,
      n,
      altura,
      semente: i,
      dist: Math.hypot(cx, cy),
      cx,
      cy,
      convexo,
      rInscrito,
      angMaior,
    });
  }

  return aneis;
}

/* --------------------------------------------------------------------------
   O LADRILHO DE JANELAS DOS VIZINHOS
   -------------------------------------------------------------------------- */

/**
 * AS JANELAS DOS VIZINHOS SÃO UMA TEXTURA, E A DA TORRE É GEOMETRIA — e a
 * diferença não é preguiça, é papel.
 *
 * A torre é o assunto do retrato: a 0,59 m/px ela enche 72% do disco, o olho
 * para em cima dela e cada vão precisa aguentar ser olhado de frente. Por
 * isso ela ganhou uma grade de verdade na tarefa F, 14,4 mil triângulos de
 * peitoril, montante e vão. Os vizinhos são o CONTEXTO: no retrato a torre
 * tem 451 px de altura e a MEDIANA deles tem 15 (o percentil 90 tem 75, e o
 * mais alto do OSM, com 105,8 m, chega a 147). E o método da torre não é
 * transportável para cá: ela gasta 0,334 triângulo por metro quadrado de
 * fachada, os vizinhos têm 7,84 milhões de m² de parede, e a conta dá 2,6
 * MILHÕES de triângulos — 35 vezes a cidade inteira de hoje — para desenhar
 * o que um texel de 5 cm desenha igual.
 *
 * O LADRILHO: 512×512 px para 25,6 m de fachada (20 px por metro, 5 cm por
 * texel), oito por oito células de 3,2 m — o mesmo módulo de fachada da
 * torre, pela mesma razão: 3,2 m é o que faz uma janela ter tamanho de
 * janela. Cada célula tem as três peças de sempre:
 *
 *     peitoril   1,0 m na base (20 px), a viga de borda, em CONCRETO
 *     montante   0,3 m (6 px, meio em cada lado da célula, que o `Repeat`
 *                emenda), a junta escura entre dois vãos
 *     vidro      2,9 × 2,2 m, aceso em 22% das células e escuro no resto
 *
 * Em área isso dá 31,25% de peitoril, 6,45% de montante e 62,30% de vidro —
 * e 14 das 64 células saem acesas (21,9%), que é o sorteio caindo onde o
 * número nominal manda.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * O CONTRATO DE COR, QUE É A PARTE DELICADA.
 *
 * A textura MULTIPLICA a cor de vértice (`diffuseColor = color · vColor ·
 * texel`, em linear), e uma multiplicação por um número ≤ 1 só sabe
 * ESCURECER. Se o concreto do ladrilho fosse branco, a parede ficaria
 * idêntica à de hoje e as janelas acesas sairiam mais ESCURAS que ela — o
 * âmbar `JANELA` (#ffb070) tem 0,53 de luminância linear, e 0,53 × a parede
 * é menos que a parede. Uma janela acesa que escurece a fachada é o oposto
 * de uma janela acesa.
 *
 * A saída é dar ao ladrilho a FAIXA INTEIRA de 0 a 1 e devolver o brilho na
 * outra ponta: o concreto fica em #5a5a5a, o vidro aceso chega a 1,0 no
 * vermelho, e o material inteiro é multiplicado por `1 / TILE_MEDIA` — o
 * inverso da luminância média do próprio ladrilho, que é 0,0965, ou seja um
 * ganho de 10,37×. A conta fecha por construção: média do ladrilho × ganho =
 * 1, e a parede volta a valer, em média, exatamente o que valia.
 *
 * Esse ganho mora na COR DO MATERIAL (`material-color-*` da malha das
 * paredes) e não nas cores de vértice, e isso é deliberado: o buffer de cor
 * continua guardando a mesma coisa que guardava em 17/10 — a luz da face, a
 * oclusão do pé, a aresta de cima, a densidade de janelas que cai com a
 * distância da torre —, legível e comparável vértice a vértice com o que
 * havia antes. E se o canvas 2D faltar (`getContext` devolvendo nulo), o
 * material fica sem mapa, o ganho fica em 1 e a cidade sai exatamente como
 * saía antes desta tarefa, sem janelas e sem um pixel estourado.
 *
 * O QUE O LADRILHO FAZ COM CADA PEÇA, depois do ganho (× a parede de hoje):
 *
 *     peitoril / montante   1,06× e 0,24×  — a viga lê como a parede lia; a
 *                           junta é a sombra que corta a fita de luz
 *     vidro apagado         0,22 / 0,31 / 0,83 em R/G/B — vidro de noite é
 *                           AZUL, porque o que ele reflete é o céu
 *     janela cheia          5,54× em luminância, e 0,23 em linear sobre a
 *                           face iluminada: acima do `BLOOM_LIMIAR` de 0,12
 *                           do `HeroGlobePos`, ou seja ela sangra
 *
 * A CONTA DE V3 — "a cidade não pode clarear em média". Medida sobre as
 * 7,84 milhões de m² de parede que a cidade tem, somando triângulo a
 * triângulo a cor de vértice que este arquivo escreve:
 *
 *     hoje              0,02328 de luminância linear   (sRGB 0,179/0,157/0,196)
 *     com o ladrilho    0,02360                        (sRGB 0,205/0,150/0,194)
 *     razão             1,0139  →  +1,4%
 *
 * +1,4% contra os 10% de tolerância: não há o que compensar. O que mudou de
 * verdade não foi o brilho, foi o MATIZ — o vermelho médio sobe 15% e o
 * azul cai 1% —, e isso é o que 22% de janelas âmbar fazem com uma parede.
 * O azul da cidade sobreviveu porque o vidro apagado do ladrilho é azul: com
 * um vidro cinza neutro no lugar dele a conta dava 0,210/0,151/0,161, ou
 * seja 18% de azul a menos, e a maquete perdia o tom de chumbo que a reforma
 * de 17/10 escolheu a dedo.
 *
 * E A MISTURA DE ÂMBAR NA COR DE VÉRTICE CONTINUA ONDE ESTAVA (os 38% em
 * `corTopo`, logo abaixo). Tirá-la seria o reflexo natural — "as janelas
 * agora vêm da textura" —, e a conta diz que seria um erro: sem ela a mesma
 * medição dá 0,01697, ou seja a cidade escureceria 27%. As duas coisas não
 * são a mesma: o ladrilho desenha QUAIS janelas estão acesas, e o âmbar do
 * vértice diz QUANTAS — é ele que carrega o gradiente que acende a Paulista
 * e apaga a franja, e no retrato ele passa a tingir também as janelas do
 * prédio, que é o que um edifício com muitos andares acesos faz mesmo.
 * ──────────────────────────────────────────────────────────────────────────
 */
const TILE_CELULAS = 8;
/** O módulo de fachada, em metros — o mesmo `VAO_ALVO` da torre. */
const TILE_VAO = 3.2;
/** O lado do ladrilho em metros: é o que entra em `texture.repeat`. */
const TILE_METROS = TILE_CELULAS * TILE_VAO;
/** 512 px para 25,6 m = 20 px por metro, ou 5 cm por texel. */
const TILE_PX = 512;
const TILE_PEITORIL = 1.0;
const TILE_MONTANTE = 0.3;
/** A fração de células acesas. 22% nominais, 14 de 64 na prática. */
const TILE_ACESAS = 0.22;

/* As três cores do ladrilho. Elas NÃO são cores da cidade: são os fatores
   pelos quais a cor da parede é multiplicada, escritos como sRGB porque é
   assim que um canvas 2D fala e porque o resto do arquivo mistura em sRGB.
   O `#5a5a5a` do concreto é o que, depois do ganho de 10,37×, devolve o
   peitoril ao tom que a parede inteira tinha em 17/10 (1,06×). */
const TILE_CONCRETO = tom("#5a5a5a");
const TILE_JUNTA = tom("#2a2a2a");
const TILE_VIDRO = tom("#283050");

/** O vidro de uma célula: azul-noite, ou aceso em âmbar. */
function vidroDaCelula(ix: number, iy: number, saida: Tom) {
  /* Os primos (211, 5003) espalham as chaves de células vizinhas pelo hash,
     como os 1021 e 61 dos vãos da torre. Não é superstição: com o índice
     corrido (`ix + 8·iy`) o MESMO `sorteio` devolve 13 acesas e duas delas
     coladas de três em três na mesma fiada, e um trio aceso num ladrilho que
     se repete a cada 25,6 m não é um trio — é uma fita de luz carimbada na
     cidade inteira. Com os primos saem 14 espalhadas, 21,9% contra os 22%
     nominais. */
  const chave = ix * 211 + iy * 5003 + 1;
  if (sorteio(chave) >= TILE_ACESAS) {
    saida[0] = TILE_VIDRO[0];
    saida[1] = TILE_VIDRO[1];
    saida[2] = TILE_VIDRO[2];
    return saida;
  }
  /* 0,40 a 1,0 de intensidade, e uma em cada cinco puxando 35% para o CREME:
     é a mesma receita dos vãos da torre, pela mesma razão — sem variação a
     cidade inteira acende na mesma cor e lê como filtro, não como luzes. */
  const intens = 0.4 + 0.6 * sorteio(chave * 13 + 5);
  const frio = sorteio(chave * 29 + 11) < 0.2 ? 0.35 : 0;
  mistura(saida, JANELA, CREME, frio);
  return mistura(saida, TILE_VIDRO, saida, intens);
}

/**
 * A LUMINÂNCIA MÉDIA DO LADRILHO, calculada e não medida.
 *
 * Ela sai das FRAÇÕES DE ÁREA das três peças (31,25% de peitoril, 6,45% de
 * montante, 62,30% de vidro) e das 64 células, e não de uma varredura dos
 * 262 mil pixels do canvas: as medidas do ladrilho caem em pixels inteiros
 * (64 px por célula, 20 de peitoril, 6 de montante), de modo que as frações
 * são exatas e a varredura devolveria o mesmo número mais devagar.
 *
 * O canvas arredonda cada cor para 8 bits, e a cadeia de mipmaps quem gera é
 * o driver — muito provavelmente no espaço CODIFICADO e não em linear, que é
 * o que a especificação permite para uma textura sRGB. As duas coisas puxam
 * a média REAL para baixo da calculada, por décimos de por cento o
 * arredondamento e por algo mais o mipmap. É o lado seguro da tolerância de
 * V3: esta conta pode errar para escuro, nunca para claro.
 *
 * Ela é CONSTANTE DE MÓDULO porque é o par do ganho que o material aplica: o
 * dia em que alguém mexer numa cor do ladrilho ou na fração de acesas, o
 * ganho se corrige sozinho e a cidade não muda de brilho por acidente. Era
 * exatamente assim que o número tinha de nascer — a mesma lição dos "62.638"
 * triângulos que envelheceram sozinhos lá no alto deste arquivo.
 */
function mediaDoTile() {
  const fPeitoril = TILE_PEITORIL / TILE_VAO;
  const fBanda = 1 - fPeitoril;
  const fMontante = fBanda * (TILE_MONTANTE / TILE_VAO);
  const fVidro = fBanda - fMontante;

  const concreto = paraLinear([0, 0, 0], TILE_CONCRETO);
  const junta = paraLinear([0, 0, 0], TILE_JUNTA);
  const vidro: Tom = [0, 0, 0];
  const vidroL: Tom = [0, 0, 0];
  const soma: Tom = [0, 0, 0];

  for (let ix = 0; ix < TILE_CELULAS; ix++) {
    for (let iy = 0; iy < TILE_CELULAS; iy++) {
      paraLinear(vidroL, vidroDaCelula(ix, iy, vidro));
      soma[0] += vidroL[0];
      soma[1] += vidroL[1];
      soma[2] += vidroL[2];
    }
  }

  const celulas = TILE_CELULAS * TILE_CELULAS;
  const media: Tom = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    media[k] =
      fPeitoril * concreto[k] + fMontante * junta[k] + (fVidro * soma[k]) / celulas;
  }
  /* Luminância ITU-R BT.709, que é a que o `BLOOM_LIMIAR` do `HeroGlobePos`
     usa — comparar com outra régua seria comparar com outra cena. */
  return 0.2126 * media[0] + 0.7152 * media[1] + 0.0722 * media[2];
}

/** 0,0965 — o ganho do material das paredes é o inverso disto (10,37×). */
const TILE_MEDIA = mediaDoTile();

/** Um `Tom` em sRGB como o canvas 2D o entende. */
function css(t: Tom) {
  const b = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgb(${b(t[0])},${b(t[1])},${b(t[2])})`;
}

/**
 * O ladrilho pintado num canvas — nenhum arquivo novo em `public/`.
 *
 * São 262 mil pixels em 128 `fillRect`, menos de um milissegundo, pagos no
 * mesmo `useMemo` das outras texturas. Um PNG de 512×512 na pasta pública
 * custaria uma requisição, uma decodificação e um arquivo binário no
 * repositório para guardar um desenho que cabe em vinte linhas de código —
 * e, pior, tiraria as cores dele deste arquivo, que é onde a conta de
 * `TILE_MEDIA` precisa poder lê-las.
 *
 * O `y` do canvas cresce para BAIXO e o `v` da textura cresce para CIMA
 * (`flipY` é o padrão do three), então a célula `iy = 0` — a de baixo da
 * fachada — é pintada na última faixa do canvas. Inverter isso poria o
 * peitoril no teto de cada andar.
 */
function constroiTexturaJanelas(aniso: number) {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_PX;
  canvas.height = TILE_PX;
  const ctx = canvas.getContext("2d");
  /* Sem contexto 2D não há ladrilho — e o material sabe disso: ele fica sem
     mapa e sem ganho, e a cidade volta a ser a de 17/10. Nenhum caminho
     deste arquivo depende da textura existir. */
  if (!ctx) return null;

  const px = TILE_PX / TILE_METROS; // 20 px por metro
  const lado = TILE_PX / TILE_CELULAS; // 64 px por célula
  const hPeitoril = TILE_PEITORIL * px; // 20 px
  const meioMontante = (TILE_MONTANTE * px) / 2; // 3 px de cada lado

  /* O fundo é a JUNTA: assim os 3 px de montante que sobram em cada lado do
     vidro já estão pintados, e as metades de duas células vizinhas se juntam
     num fio de 6 px inteiro quando o `RepeatWrapping` emenda o ladrilho. */
  ctx.fillStyle = css(TILE_JUNTA);
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);

  const vidro: Tom = [0, 0, 0];
  for (let ix = 0; ix < TILE_CELULAS; ix++) {
    for (let iy = 0; iy < TILE_CELULAS; iy++) {
      const x = ix * lado;
      const y = (TILE_CELULAS - 1 - iy) * lado;
      // o vidro, entre os dois meios montantes e acima do peitoril
      ctx.fillStyle = css(vidroDaCelula(ix, iy, vidro));
      ctx.fillRect(
        x + meioMontante,
        y,
        lado - meioMontante * 2,
        lado - hPeitoril,
      );
      // o peitoril atravessa a célula inteira: ele é a laje, não o caixilho
      ctx.fillStyle = css(TILE_CONCRETO);
      ctx.fillRect(x, y + lado - hPeitoril, lado, hPeitoril);
    }
  }

  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  /* O `uv` das paredes está em METROS (u ao longo da aresta, v = z), e é o
     `repeat` que o traduz em ladrilhos. Guardar metros no buffer e dividir
     aqui deixa o atributo legível e põe o tamanho do ladrilho num lugar só. */
  textura.wrapS = RepeatWrapping;
  textura.wrapT = RepeatWrapping;
  textura.repeat.set(1 / TILE_METROS, 1 / TILE_METROS);
  /* Mipmaps e anisotropia são o que faz a conta de V3 valer LONGE: na
     contemplação (2,19 m/px) um texel de 5 cm é 1/44 de pixel, e sem a
     cadeia de mipmaps o que apareceria ali não seria a média do ladrilho e
     sim um texel sorteado por pixel — cintilação pura a cada quadro da
     órbita. Com ela, a parede longe lê exatamente a média calculada. */
  textura.anisotropy = aniso;
  return textura;
}

/**
 * Os 4.423 contornos em DUAS geometrias: as PAREDES, que têm `uv` e recebem
 * o ladrilho de janelas, e o LISO (telhados e o fio do parapeito), que não
 * tem nem pode ter.
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
   *   até 40 m    1 fatia  — o degradê simples, como era (2.898 prédios)
   *   40 a 60 m   2 fatias — a oclusão presa nos 9 m de baixo (627 prédios)
   *   acima de 60 2 fatias + o FIO: os 1,2 m de cima mais claros (245 prédios)
   *
   * São estas três linhas que levaram os prédios de 61.979 triângulos (uma
   * fatia para todos) aos 75.397 de 18/10: as 23.173 paredes rendem 46.346
   * com uma fatia, 56.632 com a segunda e 59.764 com o fio, e os 15.633
   * triângulos de telhado entram por cima disso. Contado da geometria. (Os
   * 80.069 de hoje são estes mesmos mais as peças de telhado de 21/10, que
   * não mexeram em fatia nenhuma — ver o cabeçalho do arquivo.)
   *
   * O fio é o pedido "telhados com um fio de aresta mais claro nos prédios
   * acima de 60 m". Ele é uma fatia da PAREDE e não uma fita no plano do
   * telhado — e isso é deliberado: no plano do telhado ele seria coplanar com
   * ele, e a esta escala (o palco tem 12.742 km de profundidade e um buffer de
   * 24 bits) um desnível de 15 cm não chega a um degrau do z-buffer. A fita
   * brigaria com o telhado em z-fighting. Na parede, vista a 32° de
   * obliquidade, ela lê exatamente como a aresta acesa do parapeito.
   *
   * ELE É A TERCEIRA FATIA DA PAREDE E MORA NA GEOMETRIA LISA (18/10). As
   * duas frases não se contradizem: ele continua sendo uma tira vertical na
   * parede, com a geometria que sempre teve, e só não entra no buffer que
   * recebe o ladrilho de janelas. O motivo é que ele é CONCRETO — a aresta
   * do parapeito — e 1,2 m de fachada amostrando um ladrilho de 3,2 m
   * pegariam meia janela: o fio acabaria tracejado, que é exatamente o
   * contrário da linha contínua que ele existe para desenhar.
   */
  const fatias = (altura: number) => (altura > 40 ? (altura > 60 ? 3 : 2) : 1);

  /* UM orçamento, não dois: o do lado TEXTURIZADO, que continua sendo uma
     conta fechada (as fatias são no máximo duas por aresta, a terceira — o fio
     do parapeito — é lisa). Contado: 56.632 triângulos de parede. */
  let triParede = 0;
  for (const a of aneis) {
    const nf = fatias(a.altura);
    triParede += a.n * 2 * (nf === 3 ? 2 : nf);
  }
  const posicoes = new Float32Array(triParede * 9);
  const cores = new Float32Array(triParede * 9);
  /* O `uv` em METROS: u anda ao longo do perímetro do anel e v é o próprio
     z. Quem divide pelos 25,6 m do ladrilho é o `repeat` da textura. */
  const uvs = new Float32Array(triParede * 6);

  /**
   * O LADO LISO PASSOU A SER `number[]` COM `push` EM 21/10, e isto é uma
   * TROCA DE CONTRATO, não um detalhe de implementação.
   *
   * Ele era um `Float32Array` dimensionado antes do laço por uma fórmula
   * fechada (`n·2` do fio mais `n−2` da tampa, por anel). Essa fórmula só
   * existia porque o lado liso tinha duas peças, as duas proporcionais ao
   * número de vértices. Com as peças de telhado do requinte ele passa a ter
   * oito, e cada uma com o seu próprio porteiro: a mureta depende de o miter
   * do anel não estourar, a caixa d'água de um sorteio, o heliponto de estar
   * entre os cinco mais altos do raio, a vitrine de um sorteio POR ARESTA. Um
   * orçamento à frente disso teria de repetir, exatamente, as oito condições
   * — e o dia em que uma delas mudasse num lugar e não no outro, o buffer
   * estouraria silenciosamente ou sobraria sem que ninguém visse.
   *
   * É a MESMA razão escrita em `constroiTorre`, palavra por palavra: esta
   * geometria é construída UMA vez na vida da página, e trocar uma realocação
   * de array (dezenas de microssegundos, amortizadas) por uma conta frágil é
   * o tipo de precisão que só serve para quebrar. Quem conta triângulos agora
   * é o comprimento do próprio array, que não pode divergir de nada.
   */
  const posLiso: number[] = [];
  const corLiso: number[] = [];

  let p = 0;
  let pu = 0;
  const cor: Tom = [0, 0, 0];
  const corTopo: Tom = [0, 0, 0];
  const corPe: Tom = [0, 0, 0];
  const corFio: Tom = [0, 0, 0];
  const corTelhado: Tom = [0, 0, 0];
  const corPeca: Tom = [0, 0, 0];
  /* Os dois extremos da paleta DESTE prédio: `PAREDE_LUZ` e `PAREDE_SOMBRA`
     tingidos pelo material sorteado, com a luminância travada (ver `tinge`). */
  const luzPredio: Tom = [0, 0, 0];
  const sombraPredio: Tom = [0, 0, 0];
  const corVitrine: Tom = [0, 0, 0];
  const luzLinear: Tom = [0, 0, 0];
  const topoLinear: Tom = [0, 0, 0];
  const peLinear: Tom = [0, 0, 0];
  const fioLinear: Tom = [0, 0, 0];
  const vitrineLinear: Tom = [0, 0, 0];
  const v2: Vector2[] = [];
  const poco: Vector2[] = [];
  /* Os pontos do inset da mureta, reusados de prédio em prédio pela mesma
     razão do `poco` de `Vector2` lá embaixo: são 346 prédios e até 200
     vértices em cada, e um array novo por prédio é lixo garantido logo depois
     do pior quadro do hero. */
  const inset: number[] = [];

  /**
   * O FATOR DE PÉ-DIREITO DO PRÉDIO CORRENTE — ele multiplica `u` E `v`.
   *
   * O `uv` das paredes está em metros e o `repeat` da textura divide pelos
   * 25,6 m do ladrilho, de modo que um fator aqui é, literalmente, a escala
   * do ladrilho naquela fachada: 0,88 estica o módulo de 3,2 para 3,64 m e
   * 1,12 o comprime para 2,86. São os dois extremos reais de um pé-direito de
   * escritório, e multiplicar os DOIS eixos (e não só o v) é o que mantém a
   * janela PROPORCIONAL — esticar apenas a altura daria janelas deitadas num
   * prédio e em pé no vizinho, que é pior que não variar nada.
   *
   * Ele é uma variável de módulo da função, lida dentro de `poe`, em vez de um
   * décimo parâmetro atravessando `tira`: são duas multiplicações no lugar
   * onde o `uv` já é escrito, e nenhuma assinatura mudou.
   */
  let fatorUV = 1;

  const poe = (x: number, y: number, z: number, u: number, c: Tom) => {
    posicoes[p] = x;
    posicoes[p + 1] = y;
    posicoes[p + 2] = z;
    cores[p] = c[0];
    cores[p + 1] = c[1];
    cores[p + 2] = c[2];
    uvs[pu] = u * fatorUV;
    uvs[pu + 1] = z * fatorUV;
    p += 3;
    pu += 2;
  };

  const poeLiso = (x: number, y: number, z: number, c: Tom) => {
    posLiso.push(x, y, z);
    corLiso.push(c[0], c[1], c[2]);
  };

  /**
   * Uma fatia de parede entre dois z, com a cor de baixo e a de cima.
   *
   * `u0` e `u1` são a distância percorrida ao longo do PERÍMETRO do anel, e
   * não o começo de cada face: as janelas atravessam o canto do prédio sem
   * quebrar a cadência, que é o que uma fachada modulada faz. O preço é uma
   * emenda por prédio, no canto em que o anel fecha — contra uma emenda por
   * FACE, que é o que zerar o `u` em cada aresta daria, e que alinharia a
   * mesma janela no canto esquerdo de todos os 3.770 vizinhos.
   */
  const tira = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    u0: number,
    u1: number,
    z0: number,
    z1: number,
    cb: Tom,
    ct: Tom,
  ) => {
    poe(ax, ay, z0, u0, cb);
    poe(bx, by, z0, u1, cb);
    poe(bx, by, z1, u1, ct);
    poe(ax, ay, z0, u0, cb);
    poe(bx, by, z1, u1, ct);
    poe(ax, ay, z1, u0, ct);
  };

  /** A mesma tira, do lado liso: sem `uv`, porque não há o que amostrar. */
  const tiraLisa = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    z0: number,
    z1: number,
    cb: Tom,
    ct: Tom,
  ) => {
    poeLiso(ax, ay, z0, cb);
    poeLiso(bx, by, z0, cb);
    poeLiso(bx, by, z1, ct);
    poeLiso(ax, ay, z0, cb);
    poeLiso(bx, by, z1, ct);
    poeLiso(ax, ay, z1, ct);
  };

  /* ------------------------------------------- as ferramentas das peças

     ELAS SÃO CÓPIAS DAS DA TORRE, E ISSO É DE PROPÓSITO.

     `constroiTorre` tem `caixa`, `lampada`, `cantosRet` e `tampaRet`, e as
     quatro fazem exatamente o que as quatro daqui fazem. Mover aquelas para o
     módulo pareceria a limpeza óbvia e seria um erro: elas escrevem no buffer
     DA TORRE, por um `poe` que mora naquele fecho, e um helper compartilhado
     precisaria receber o emissor como parâmetro — ou seja, trocar quatro
     funções de dez linhas por quatro funções de dez linhas mais um nível de
     indireção em todas as 15.794 chamadas de lá. Pior: ele acoplaria duas
     geometrias que não têm nada a ver uma com a outra (a torre é ficção
     desenhada, a cidade é cadastro extrudado) e que mudam por motivos
     diferentes.

     O que há de novo nas daqui é a GIRADA: toda peça de telhado se alinha ao
     `angMaior` do anel, e a torre, que é um quadrado alinhado ao mundo, nunca
     precisou disso. ------------------------------------------------------- */

  /** Em linear na saída, como o `L` da torre: a mistura toda é em sRGB. */
  const L = (t: Tom) => paraLinear([0, 0, 0], t);

  /** A luz da aresta a→b de um contorno anti-horário — a fórmula das paredes. */
  const luzDa = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const c = Math.hypot(dx, dy);
    return c < 1e-6 ? 0 : Math.max(0, (dy * LUZ.x - dx * LUZ.y) / c) / LUZ_MAX;
  };

  /**
   * Os quatro cantos de um retângulo GIRADO, em sentido anti-horário.
   *
   * Uma rotação não muda o sentido de um contorno, então basta montar os
   * cantos anti-horários no referencial da peça (−−, +−, ++, −+) e girar os
   * quatro: o contrato de "normal para fora" do arquivo inteiro continua
   * valendo sem uma única conferência de sinal.
   */
  const cantosGirados = (
    cx: number,
    cy: number,
    lx: number,
    ly: number,
    ang: number,
  ) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const mx = lx / 2;
    const my = ly / 2;
    const saida: [number, number][] = [];
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      saida.push([
        cx + sx * mx * ca - sy * my * sa,
        cy + sx * mx * sa + sy * my * ca,
      ]);
    }
    return saida;
  };

  /** Um polígono CONVEXO anti-horário tampado num leque: a face olha para +z. */
  const leque = (q: [number, number][], z: number, t: Tom) => {
    const c = L(t);
    for (let k = 1; k + 1 < q.length; k++) {
      poeLiso(q[0][0], q[0][1], z, c);
      poeLiso(q[k][0], q[k][1], z, c);
      poeLiso(q[k + 1][0], q[k + 1][1], z, c);
    }
  };

  /** A `caixa` da torre no lado liso: paredes com luz por face e tampa. */
  const caixaLisa = (
    q: [number, number][],
    z0: number,
    z1: number,
    base: Tom,
    topo: Tom,
    tam: Tom | null,
  ) => {
    const a: Tom = [0, 0, 0];
    const b: Tom = [0, 0, 0];
    for (let k = 0; k < q.length; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % q.length];
      const luz = luzDa(ax, ay, bx, by);
      mistura(a, base, topo, 0.15 + 0.85 * luz);
      mistura(b, a, PAREDE_TOPO, 0.3);
      tiraLisa(ax, ay, bx, by, z0, z1, L(a), L(b));
    }
    if (tam) leque(q, z1, tam);
  };

  /** A `lampada` da torre no liso: CHAPADA, porque o que emite não tem sombra. */
  const lampadaLisa = (
    q: [number, number][],
    z0: number,
    z1: number,
    t: Tom,
  ) => {
    const c = L(t);
    for (let k = 0; k < q.length; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % q.length];
      tiraLisa(ax, ay, bx, by, z0, z1, c, c);
    }
    leque(q, z1, t);
  };

  /**
   * OS CINCO HELIPONTOS, ESCOLHIDOS ANTES DO LAÇO.
   *
   * Eles não saem de um sorteio e sim de um RANKING: os cinco prédios mais
   * altos do raio de detalhe que sejam convexos e tenham 9 m de laje em volta
   * do centro. É a única peça deste arquivo que precisa saber dos OUTROS
   * prédios para decidir sobre um, e por isso é a única que não cabe dentro do
   * laço — daí este bloco, que roda uma vez sobre 346 anéis.
   *
   * CINCO e não "todos os que cabem": um heliponto é a peça mais caprichada do
   * telhado (46 triângulos, o H em creme, oito luzes de perímetro acima do
   * limiar de bloom), e o que ele diz no retrato é "este é um dos prédios
   * importantes daqui". Em todos os 23 que cabem ele diria o contrário — uma
   * cidade onde cada laje tem um heliponto é uma cidade sem hierarquia. Cinco
   * é o que a vista de 55° mostra sem que dois caiam no mesmo canto do quadro.
   *
   * E O DADO DE HOJE DEVOLVE QUATRO, não cinco: dos 346 prédios do raio, 19
   * passam dos 60 m sendo convexos e só QUATRO desses têm 9 m de laje em
   * volta do centroide — os outros quinze são lâminas estreitas, onde um
   * disco de 14 m de diâmetro ficaria pendurado para fora do prédio. O corte
   * é `slice(0, 5)` e não `slice(0, 4)` de propósito: o número que esta
   * decisão fixa é o TETO da hierarquia, e o dia em que o `spPredios.json`
   * for regerado com mais um prédio largo e alto, o quinto entra sozinho.
   *
   * A ORDENAÇÃO É POR ALTURA E DESEMPATA PELA SEMENTE: `altura` tem casas
   * decimais vindas do afunilamento da borda, então empate exato é raríssimo,
   * mas um `sort` instável num empate mudaria o conjunto de helipontos entre
   * dois motores de JavaScript — e esta cidade tem de nascer idêntica em todo
   * deploy, que é a mesma promessa do `sorteio`.
   */
  const comHeliponto = new Set<AnelPronto>();
  {
    const candidatos = aneis.filter(
      (a) =>
        a.dist < RAIO_DETALHE &&
        a.altura > 60 &&
        a.convexo &&
        a.rInscrito >= 9,
    );
    candidatos.sort((x, y) => y.altura - x.altura || x.semente - y.semente);
    for (const a of candidatos.slice(0, 5)) comHeliponto.add(a);
  }

  for (const anel of aneis) {
    const { pts, n, altura, semente, dist } = anel;
    const { cx, cy, convexo, rInscrito, angMaior } = anel;

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

    /**
     * O PÉ-DIREITO DESTE PRÉDIO (21/10) — 2,86 a 3,64 m por andar.
     *
     * O ladrilho de janelas tem um módulo fixo de 3,2 m, e por isso a cidade
     * inteira tinha o MESMO pé-direito: 3.770 prédios com a fiada na mesma
     * altura, o que no retrato de perto se lê como um carimbo. Um prédio
     * residencial dos anos 60 tem 2,8 m de piso a piso, uma torre corporativa
     * tem 3,6, e é essa diferença que diz quantos andares cada um tem.
     *
     * O multiplicador primo 7 e o deslocamento 3 na chave do `sorteio`: cada
     * uso do ruído neste arquivo tem o seu par (97 nas janelas, 31 no telhado,
     * 11 no tom, 41 na manta, 53 na vitrine, 59 na caixa d'água), porque duas
     * decisões que lessem a MESMA chave andariam juntas pela cidade inteira —
     * todo prédio de pé-direito alto teria também a manta escura, e o olho
     * acharia a correlação antes de saber que estava procurando.
     */
    fatorUV = 0.88 + 0.24 * sorteio(semente * 7 + 3);

    /**
     * O MATERIAL DESTE PRÉDIO (21/10): neutro, quente ou frio.
     *
     * 45% da cidade fica como era (o concreto azul-chumbo da reforma de
     * 17/10), 30% ganha 12% de pastilha bege e 25% ganha 12% de vidro
     * azulado — e os prédios acima de 55 m cuja chave cai abaixo de 0,5
     * viram CORTINA DE VIDRO, com o frio a 20%. A faixa dos altos pega de
     * propósito os dois primeiros terços do sorteio (o neutro inteiro e um
     * sexto do quente): quem tem mais de dezesseis andares em São Paulo é,
     * quase sempre, uma torre de vidro — e são justamente esses prédios que
     * têm pixels suficientes no retrato para o material deles importar.
     *
     * UMA chave para as duas decisões, e não duas: a cortina de vidro não é
     * um sorteio independente, é uma RELEITURA do mesmo número à luz da
     * altura. Com duas chaves um prédio alto poderia sortear "quente" numa e
     * "cortina" na outra, e aí a ordem das linhas decidiria o material — o
     * tipo de dependência de escrita que este arquivo evita de propósito.
     *
     * O TINGIMENTO ACONTECE NOS DOIS EXTREMOS DA PALETA, uma vez por prédio, e
     * não na cor pronta de cada face. São duas razões, e as duas importam:
     *
     *   o BRILHO    `tinge` trava a luminância (ver a função), e travá-la nos
     *               dois extremos trava a de TODA face, porque a cor de uma
     *               face é uma interpolação entre eles. Tingir a cor pronta
     *               faria a conta de V3 subir 12% — medido.
     *   o CUSTO     são duas conversões sRGB↔linear por prédio em vez de uma
     *               por face: 7.540 contra 23.173, e a face volta a ser o que
     *               sempre foi, um `mistura` de dois ternos.
     */
    const sTom = sorteio(semente * 11 + 9);
    let alvoTom: Tom = PAREDE_FRIO;
    let pesoTom = 0;
    if (altura > 55 && sTom < 0.5) {
      pesoTom = 0.2;
    } else if (sTom < 0.45) {
      pesoTom = 0; // o neutro: a parede de 17/10, intacta
    } else if (sTom < 0.75) {
      alvoTom = PAREDE_QUENTE;
      pesoTom = 0.12;
    } else {
      pesoTom = 0.12;
    }
    if (pesoTom > 0) {
      tinge(luzPredio, PAREDE_LUZ, alvoTom, pesoTom);
      tinge(sombraPredio, PAREDE_SOMBRA, alvoTom, pesoTom);
    } else {
      copia(luzPredio, PAREDE_LUZ);
      copia(sombraPredio, PAREDE_SOMBRA);
    }

    /**
     * O TELHADO EM TRÊS ACABAMENTOS (21/10) — e é ele que manda nas peças.
     *
     * 35% fica como era, 35% ganha 18% de `OCLUSAO` (a manta asfáltica preta,
     * que é o que cobre a maior parte das lajes de São Paulo) e 30% ganha 15%
     * de `PAREDE_TOPO` (a laje de concreto exposto, lavada pela chuva). Os
     * dois desvios são de sinal contrário e de peso parecido, e a conta
     * fecha: medida sobre a área real das 3.770 lajes, a luminância média
     * delas vai de 0,01676 para 0,01700 — +1,4%, a mesma ordem do que o
     * ladrilho de janelas custou às paredes, e bem dentro dos 10% de
     * tolerância do bloco `TILE_*`.
     *
     * ELE É CALCULADO AQUI, ANTES DAS PAREDES, e não lá embaixo junto da
     * tampa, porque virou a cor BASE de quatro outras peças: a face interna da
     * mureta, as paredes da casa de máquinas, a caixa d'água e o disco do
     * heliponto. Todas elas são, na vida real, construídas sobre a laje e com
     * o mesmo cimento dela — e deixá-las sair de `TELHADO` puro poria uma
     * casa de máquinas cinza-neutra em cima de uma laje com manta preta.
     *
     * O âmbar da laje iluminada (um telhado em dezesseis) NÃO entra aqui: ele
     * é luz de rua refletida na laje, não o material dela, e tingir a caixa
     * d'água de âmbar por causa disso seria o mesmo erro ao contrário.
     */
    mistura(corTelhado, TELHADO, PAREDE_TOPO, grauAlt);
    const sTelha = sorteio(semente * 41 + 13);
    if (sTelha >= 0.35 && sTelha < 0.7) {
      mistura(corTelhado, corTelhado, OCLUSAO, 0.18);
    } else if (sTelha >= 0.7) {
      mistura(corTelhado, corTelhado, PAREDE_TOPO, 0.15);
    }

    /* Quem está dentro do raio do requinte — a condição de TODAS as peças
       novas menos o tom da parede e o acabamento do telhado, que são de graça
       e valem para a cidade inteira. */
    const perto = dist < RAIO_DETALHE;
    const heliponto = comHeliponto.has(anel);
    /* A casa de máquinas pede 4,5 m de laje em volta do centro (a caixa tem
       4,5 × 3,5 e ainda se desloca 30% do raio para o norte), e nunca divide
       o telhado com um heliponto: num prédio real o heliponto É a laje livre. */
    const temCasa =
      perto && altura >= 12 && convexo && rInscrito >= 4.5 && !heliponto;
    /* A VITRINE pede 60 m de distância da torre. Não é sobre tamanho: é que a
       torre tem a própria vitrine de saguão (ver `constroiTorre`), com 14 m de
       largura e o bloom dela, e acender as lojas do vizinho colado nela seria
       pôr duas luzes brancas no mesmo pixel da base do quadro. */
    const temVitrine = perto && dist > 60 && altura >= 9;

    const nFatias = fatias(altura);
    const temFio = nFatias === 3;
    const zFio = temFio ? altura - 1.2 : altura;
    const zOclusao = nFatias >= 2 ? 9 : 0;

    /* AS PAREDES. Para um anel anti-horário, a normal para fora da aresta
       a→b é (dy, −dx) normalizada: na aresta de baixo de um quadrado
       (0,0)→(1,0) ela dá (0,−1), que aponta para fora. */
    /* A régua do `u`, em metros rodados ao longo do perímetro. Ela começa em
       zero no primeiro vértice de cada anel, e por isso a fase do ladrilho
       muda de prédio para prédio junto com a forma dele — 3.770 fachadas que
       nasceram do mesmo desenho e nenhuma começando igual à vizinha. */
    let u = 0;
    for (let k = 0, j = n - 1; k < n; j = k++) {
      const ax = pts[j * 2];
      const ay = pts[j * 2 + 1];
      const bx = pts[k * 2];
      const by = pts[k * 2 + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const comp = Math.hypot(dx, dy);
      if (comp < 0.05) continue; // vértice repetido no cadastro

      /* A face interpola entre os dois extremos TINGIDOS do prédio, e não
         entre as duas constantes da paleta: o material entra por aqui, de
         graça, sem uma mistura a mais por face e sem mexer na luminância (ver
         `tinge` e o bloco do `sTom`). As cores que vêm DEPOIS continuam sendo
         as da paleta — `PAREDE_TOPO` no fio, `OCLUSAO` no pé —, porque o fio
         do parapeito é concreto em todo prédio e a oclusão é a ausência de
         cor, não uma cor que se possa tingir. */
      const luz = Math.max(0, (dy * LUZ.x - dx * LUZ.y) / comp) / LUZ_MAX;
      mistura(cor, sombraPredio, luzPredio, luz);
      if (grauAlt < 1) mistura(cor, cor, sombraPredio, (1 - grauAlt) * 0.22);

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

      const u0 = u;
      const u1 = u + comp;
      u = u1;

      if (nFatias >= 2) {
        tira(ax, ay, bx, by, u0, u1, 0, zOclusao, peLinear, luzLinear);
        tira(ax, ay, bx, by, u0, u1, zOclusao, zFio, luzLinear, topoLinear);
      } else {
        tira(ax, ay, bx, by, u0, u1, 0, zFio, peLinear, topoLinear);
      }
      if (temFio) {
        paraLinear(fioLinear, corFio);
        tiraLisa(ax, ay, bx, by, zFio, altura, fioLinear, fioLinear);
      }

      /**
       * A VITRINE DO TÉRREO (21/10) — o que põe a cidade no chão.
       *
       * No retrato de perto a base dos vizinhos é a parte MAIS PERTO da
       * câmera e era onde menos havia o que ver: parede escura com a oclusão
       * de contato e nada mais. Numa rua de São Paulo à noite o térreo é a
       * fiada mais clara do prédio — é onde estão a portaria acesa, a loja de
       * esquina, a farmácia —, e é por isso que uma cidade sem térreo aceso
       * parece abandonada mesmo com todas as janelas de cima ligadas.
       *
       * UMA CHAPA de 0,15 m à frente da parede, de z 0,4 a 3,4, recuada 1,0 m
       * de cada canto da fachada: dois triângulos por loja. Os 0,15 m são a
       * verdade geométrica (uma vitrine avança mesmo sobre a calçada), mas
       * quem faz a chapa ganhar da parede é a ORDEM — o z-buffer desta cena
       * tem degraus de 3,76 m (ver a regra de ouro em `constroiTorre`), e o
       * que decide é o lado liso ser desenhado DEPOIS do texturizado, porque
       * o material dele nasce depois no `useMemo` e o three ordena opacos por
       * id de material. O recuo de 1,0 m dos cantos é o que impede duas
       * vitrines de fachadas vizinhas de se cruzarem no canto do prédio.
       *
       * Só em 30% das arestas de 7 m ou mais: uma fachada inteira de vitrine
       * em todo prédio devolveria a mesma fita de luz contínua que o item das
       * janelas por vão existe para evitar, uma escala acima. E CHAPADA, sem
       * luz por face, pelo mesmo motivo das balizas da torre: o que emite não
       * tem lado escuro.
       */
      if (temVitrine && comp >= 7 && sorteio(semente * 53 + k) < 0.3) {
        /* 0,55 a 1,0 de intensidade, por uma chave DERIVADA da que abriu a
           loja: lojas vizinhas no mesmo prédio acendem com brilhos
           diferentes, que é o que um térreo com três inquilinos faz. */
        const intens = 0.55 + 0.45 * sorteio((semente * 53 + k) * 19 + 3);
        mistura(corVitrine, JANELA, CREME, 0.4);
        mistura(corVitrine, cor, corVitrine, intens);
        paraLinear(vitrineLinear, corVitrine);
        /* O versor da aresta recua o 1,0 m de cada canto; o normal para fora,
           (dy, −dx)/comp, empurra os 0,15 m. O sentido a→b é preservado, de
           modo que a chapa herda o enrolamento (e a normal para fora) da
           parede que ela cobre. */
        const tx = dx / comp;
        const ty = dy / comp;
        const nx = dy / comp;
        const ny = -dx / comp;
        tiraLisa(
          ax + tx + nx * 0.15,
          ay + ty + ny * 0.15,
          bx - tx + nx * 0.15,
          by - ty + ny * 0.15,
          0.4,
          3.4,
          vitrineLinear,
          vitrineLinear,
        );
      }
    }

    /* O TELHADO. `ShapeUtils.triangulateShape` é o earcut que o próprio three
       usa no `ExtrudeGeometry` — nada novo no pacote. O sentido de cada
       triângulo é conferido pela área: earcut não promete orientação, e um
       telhado virado para baixo sumiria no `FrontSide`.

       Os `Vector2` saem de um POÇO que cresce e é reusado: são 23.173
       vértices de contorno (contados: a soma dos `n` dos 3.770 anéis), e um
       objeto por vértice é lixo garantido logo depois do pior quadro do hero.
       O poço tira as 23 mil alocações do caminho. */
    while (poco.length < n) poco.push(new Vector2());
    v2.length = 0;
    for (let k = 0; k < n; k++) {
      v2.push(poco[k].set(pts[k * 2], pts[k * 2 + 1]));
    }
    const faces = ShapeUtils.triangulateShape(v2, []);
    /* O telhado clareia com a altura — é o que separa a torre de escritórios
       do galpão ao lado quando os dois medem poucos pixels — e um em cada
       dezesseis puxa para o âmbar, que é a laje iluminada. A base é o
       `corTelhado` do prédio, que já leva o acabamento (manta ou laje) sorteado
       lá em cima; o âmbar entra numa CÓPIA, para não tingir as peças que
       nascem desta mesma laje logo abaixo. */
    copia(cor, corTelhado);
    if (sorteio(semente * 31 + 7) < 0.06) mistura(cor, cor, JANELA, 0.1);
    paraLinear(topoLinear, cor);
    for (const f of faces) {
      const a = v2[f[0]];
      const b = v2[f[1]];
      const c = v2[f[2]];
      const giro = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      poeLiso(a.x, a.y, altura, topoLinear);
      if (giro >= 0) {
        poeLiso(b.x, b.y, altura, topoLinear);
        poeLiso(c.x, c.y, altura, topoLinear);
      } else {
        poeLiso(c.x, c.y, altura, topoLinear);
        poeLiso(b.x, b.y, altura, topoLinear);
      }
    }

    /* ==================================================================
       AS PEÇAS DE TELHADO (21/10) — e elas vêm DEPOIS da tampa de
       propósito.

       A regra de ouro de `constroiTorre` vale aqui inteira: o z-buffer
       desta cena tem degraus de 3,76 m, de modo que uma mureta 1 m acima
       da laje, um disco de heliponto 10 cm acima dela e o "H" 5 cm acima
       do disco estão todos no MESMO degrau. Quem fica por cima é quem é
       escrito depois, e é por isso que a ordem destes blocos — tampa →
       mureta → casa de máquinas → caixa d'água → heliponto → baliza — é
       desenho, não arrumação.

       E todas elas são escritas DENTRO da iteração do prédio, não num
       segundo laço sobre os anéis: as peças de um prédio têm de ficar
       por cima da laje DELE, e um segundo laço poria o heliponto do
       prédio A depois da laje do prédio B — que é um empate entre peças
       de prédios diferentes, decidido por nada.
       ================================================================== */

    /**
     * 1. A MURETA DO PARAPEITO — o que faz um telhado ler como TERRAÇO.
     *
     * Vista a 55° do sul, uma laje nua é uma tampa: o olho não tem como
     * saber se aquilo é o topo de um prédio ou a face de cima de uma caixa.
     * O que desfaz a dúvida é a FACE INTERNA da mureta do fundo — a
     * platibanda do lado norte, que a esta obliquidade aparece inteira e
     * sombreada. É a única peça do requinte que muda a LEITURA da forma, e
     * não só a quantidade de detalhe.
     *
     * Três quadriláteros por aresta, seis triângulos:
     *
     *   face EXTERNA   de h a h+1,0, na cor do fio do parapeito (o topo da
     *                  parede com 30% de CREME) — ela continua a fachada
     *                  para cima, e é por isso que herda a cor da fachada.
     *   TAMPA          os 0,3 m entre a aresta e o inset, a h+1,0, com mais
     *                  20% de `PAREDE_TOPO`: é a face que recebe luz de cima
     *                  e desenha o contorno aceso do terraço.
     *   face INTERNA   do inset para dentro, de h a h+1,0, no tom da laje com
     *                  50% de OCLUSAO — ela está de costas para a luz de
     *                  noroeste E sombreada pela própria mureta.
     *
     * OS DOIS PORTEIROS, além do convexo e dos 12 m de altura:
     *
     *   menor aresta ≥ 2 m   uma aresta de 1 m com 0,3 m de inset de cada
     *                        ponta não tem miolo: a tampa sai invertida e a
     *                        face interna atravessa a externa.
     *   1 + n1·n2 ≥ 0,3      é o DENOMINADOR do miter. Num canto de 150° ele
     *                        vale 1,87 e o inset anda 0,32 m; num canto de
     *                        20° vale 0,06 e o inset voa 5 m para dentro do
     *                        prédio, levando a mureta com ele. 0,3 corta em
     *                        cantos de ~145° de reflexo, que é o ponto em que
     *                        o inset passa de 1 m — três vezes o nominal.
     */
    if (perto && altura >= 12 && convexo) {
      let menorAresta = Infinity;
      for (let k = 0; k < n; k++) {
        const m = (k + 1) % n;
        const comp = Math.hypot(pts[m * 2] - pts[k * 2], pts[m * 2 + 1] - pts[k * 2 + 1]);
        if (comp < menorAresta) menorAresta = comp;
      }

      let miterOk = menorAresta >= 2;
      if (miterOk) {
        inset.length = 0;
        for (let k = 0; k < n; k++) {
          const j = (k + n - 1) % n;
          const m = (k + 1) % n;
          /* Os normais INTERNOS das duas arestas do canto: num anel
             anti-horário o normal para fora é (dy, −dx), então o de dentro
             é (−dy, dx). */
          const d1x = pts[k * 2] - pts[j * 2];
          const d1y = pts[k * 2 + 1] - pts[j * 2 + 1];
          const c1 = Math.hypot(d1x, d1y);
          const d2x = pts[m * 2] - pts[k * 2];
          const d2y = pts[m * 2 + 1] - pts[k * 2 + 1];
          const c2 = Math.hypot(d2x, d2y);
          const n1x = -d1y / c1;
          const n1y = d1x / c1;
          const n2x = -d2y / c2;
          const n2y = d2x / c2;
          const den = 1 + (n1x * n2x + n1y * n2y);
          if (den < 0.3) {
            miterOk = false;
            break;
          }
          /* O miter: o ponto que fica a 0,3 m das DUAS arestas é
             p + 0,3·(n1 + n2)/(1 + n1·n2). É a fórmula que mantém a mureta
             com espessura constante ao virar o canto — somar os normais sem
             dividir pelo denominador afinaria a mureta em todo canto agudo. */
          const mx = (n1x + n2x) / den;
          const my = (n1y + n2y) / den;
          inset.push(pts[k * 2] + 0.3 * mx, pts[k * 2 + 1] + 0.3 * my);
        }
      }

      if (miterOk) {
        const zAlto = altura + 1;
        /* A face interna é a mesma em todo o anel: ela não vê a luz de
           lado nenhum, então não há por que recalcular por aresta. */
        mistura(corPeca, corTelhado, OCLUSAO, 0.5);
        const internaL = L(corPeca);
        for (let k = 0, j = n - 1; k < n; j = k++) {
          const ax = pts[j * 2];
          const ay = pts[j * 2 + 1];
          const bx = pts[k * 2];
          const by = pts[k * 2 + 1];
          const aix = inset[j * 2];
          const aiy = inset[j * 2 + 1];
          const bix = inset[k * 2];
          const biy = inset[k * 2 + 1];

          /* A cor do fio, recalculada do zero: é o topo da parede DESTA
             face (luz, altura e material do prédio) com 30% de creme, e
             sem o âmbar das janelas — pela mesma razão escrita no fio do
             parapeito lá em cima, creme sobre âmbar daria um rosa que não
             está na página. */
          const luz = luzDa(ax, ay, bx, by);
          mistura(corFio, sombraPredio, luzPredio, luz);
          if (grauAlt < 1) mistura(corFio, corFio, sombraPredio, (1 - grauAlt) * 0.22);
          mistura(corFio, corFio, PAREDE_TOPO, 0.26 + 0.34 * grauAlt);
          mistura(corFio, corFio, CREME, 0.3);
          paraLinear(fioLinear, corFio);
          tiraLisa(ax, ay, bx, by, altura, zAlto, fioLinear, fioLinear);

          /* A TAMPA, entre a aresta e o inset. O quadrilátero (a, b, b', a')
             é anti-horário visto de cima — a → b corre no sentido do anel e
             os linha estão para dentro —, que é o giro que faz a face olhar
             para +z, como o telhado. */
          mistura(corPeca, corFio, PAREDE_TOPO, 0.2);
          const tampaL = L(corPeca);
          poeLiso(ax, ay, zAlto, tampaL);
          poeLiso(bx, by, zAlto, tampaL);
          poeLiso(bix, biy, zAlto, tampaL);
          poeLiso(ax, ay, zAlto, tampaL);
          poeLiso(bix, biy, zAlto, tampaL);
          poeLiso(aix, aiy, zAlto, tampaL);

          /* A FACE INTERNA, com o enrolamento INVERTIDO (b' → a'): só assim a
             normal (dy, −dx) de `tiraLisa` aponta para DENTRO do prédio, que
             é de onde esta face é vista. Com o enrolamento do anel ela sairia
             de costas e sumiria no `FrontSide`. */
          tiraLisa(bix, biy, aix, aiy, altura, zAlto, internaL, internaL);
        }
      }
    }

    /**
     * 2. A CASA DE MÁQUINAS E A CAIXA D'ÁGUA — a silhueta de telhado desta
     * cidade.
     *
     * Um telhado paulistano nunca termina na laje: termina na casa de
     * máquinas do elevador, com a caixa d'água de concreto em cima dela. É
     * tão característico que a linha do horizonte de São Paulo vista de
     * qualquer mirante é uma serrilha dessas duas peças — e é por isso que
     * elas são o que o plano chamou de "o que fica ACIMA do telhado de
     * verdade", em vez de inventar recuos na silhueta que a altura do OSM (que
     * é a do parapeito) não autoriza.
     *
     * 4,5 × 3,5 × 2,8 m, alinhada à aresta mais longa e deslocada 30% do raio
     * inscrito para o +y LOCAL (o norte do prédio, perpendicular à fachada
     * mais comprida): tira a peça do centro exato da laje, que é onde ela
     * ficaria se o deslocamento fosse zero e onde nenhuma casa de máquinas
     * real está — ela segue a caixa de escada, que é encostada num dos lados.
     * A folga é conferida: 0,3·4,5 + 1,75 = 3,1 m contra os 4,5 do raio
     * mínimo, e a diagonal do canto chega a 4,2 m, ainda dentro da laje.
     *
     * A CAIXA D'ÁGUA é octogonal porque as de verdade são: um cilindro de
     * concreto armado com oito faces é a forma pré-moldada mais comum do
     * país. Raio 1,4 m e 2,2 m de altura, de h+2,8 a h+5,0 — ou seja, ela só
     * existe sobre a casa de máquinas, nunca solta na laje. Em 70% dos
     * prédios de 20 m ou mais: acima disso há bomba e reservatório superior
     * obrigatórios, abaixo a caixa é de fibra e não se vê de 300 m.
     */
    if (temCasa) {
      /* O +y local: o perpendicular à aresta mais longa. `angMaior` é a
         direção dela, então (−sen, cos) é o normal, e é nele que a casa anda. */
      const recuo = 0.3 * rInscrito;
      const px = cx - Math.sin(angMaior) * recuo;
      const py = cy + Math.cos(angMaior) * recuo;
      mistura(corPeca, corTelhado, PAREDE_TOPO, 0.25);
      caixaLisa(
        cantosGirados(px, py, 4.5, 3.5, angMaior),
        altura,
        altura + 2.8,
        corTelhado,
        PAREDE_LUZ,
        corPeca,
      );

      if (altura >= 20 && sorteio(semente * 59 + 17) < 0.7) {
        /* O octógono anti-horário: oito ângulos crescentes, com o meio passo
           de defasagem que põe uma FACE (e não um vértice) virada para a
           fachada principal — é assim que uma peça pré-moldada se assenta. */
        const q: [number, number][] = [];
        for (let k = 0; k < 8; k++) {
          const a = angMaior + ((k + 0.5) * Math.PI) / 4;
          q.push([px + Math.cos(a) * 1.4, py + Math.sin(a) * 1.4]);
        }
        /* Um degrau mais claro que a casa de máquinas: o concreto da caixa
           d'água é aparente e lavado pela chuva, enquanto a casa de máquinas
           é pintada e encardida. São 20% de `PAREDE_TOPO` na base, e a tampa
           leva os mesmos 25% de todas as tampas desta laje. */
        const concreto = mistura([0, 0, 0], corTelhado, PAREDE_TOPO, 0.2);
        caixaLisa(
          q,
          altura + 2.8,
          altura + 5,
          concreto,
          PAREDE_LUZ,
          mistura([0, 0, 0], concreto, PAREDE_TOPO, 0.25),
        );
      }
    }

    /**
     * 3. O HELIPONTO — 46 triângulos pela coisa mais paulistana que existe
     * num telhado.
     *
     * São Paulo tem a maior frota de helicópteros urbanos do mundo, e a marca
     * disso na cidade são os discos com o "H" nas lajes das torres. No
     * retrato, a 0,59 m/px, um disco de 7 m de raio tem 24 px de diâmetro: é
     * grande o bastante para o H ser lido e pequeno o bastante para não virar
     * o assunto do telhado.
     *
     * Três camadas, e todas chapadas (o disco é pintura sobre a laje, não
     * volume):
     *
     *   o DISCO     24 setores a h+0,1, no tom da laje com 25% de
     *               `PAREDE_TOPO` — a tinta cinza-clara regulamentar.
     *   o H         três chapas a h+0,15 (duas barras de 1 × 6 m e a travessa
     *               de 3 × 1), no tom do disco com 70% de CREME. Ele não é
     *               branco puro: tinta sobre laje nunca é.
     *   as LUZES    oito quadrados de 0,5 m no raio de 6,5 m, em CREME CHEIO.
     *               São as únicas peças do telhado dos vizinhos acima do
     *               `BLOOM_LIMIAR` de 0,12 do `HeroGlobePos`: elas sangram no
     *               pós-processamento e viram oito pontinhos de luz em volta
     *               do disco, que é exatamente o que uma luz de perímetro é
     *               vista de longe.
     *
     * Tudo alinhado ao `angMaior`, como as outras peças: um H a 30° do
     * parapeito lê como adesivo torto.
     */
    if (heliponto) {
      const zDisco = altura + 0.1;
      const zMarca = altura + 0.15;
      mistura(corPeca, corTelhado, PAREDE_TOPO, 0.25);
      const discoL = L(corPeca);
      const SETORES_H = 24;
      const passoH = (Math.PI * 2) / SETORES_H;
      for (let k = 0; k < SETORES_H; k++) {
        const a0 = angMaior + k * passoH;
        const a1 = angMaior + (k + 1) * passoH;
        /* Anti-horário visto de +z, que é para onde a face olha. */
        poeLiso(cx, cy, zDisco, discoL);
        poeLiso(cx + Math.cos(a0) * 7, cy + Math.sin(a0) * 7, zDisco, discoL);
        poeLiso(cx + Math.cos(a1) * 7, cy + Math.sin(a1) * 7, zDisco, discoL);
      }

      /* O H: as duas barras a ±1,5 m no eixo LONGO do prédio e a travessa
         ligando-as no meio. O versor desse eixo é (cos, sen) de `angMaior`. */
      const ex = Math.cos(angMaior);
      const ey = Math.sin(angMaior);
      const marca = mistura([0, 0, 0], corPeca, CREME, 0.7);
      leque(cantosGirados(cx - ex * 1.5, cy - ey * 1.5, 1, 6, angMaior), zMarca, marca);
      leque(cantosGirados(cx + ex * 1.5, cy + ey * 1.5, 1, 6, angMaior), zMarca, marca);
      leque(cantosGirados(cx, cy, 3, 1, angMaior), zMarca, marca);

      for (let k = 0; k < 8; k++) {
        const a = angMaior + (k * Math.PI) / 4;
        leque(
          cantosGirados(cx + Math.cos(a) * 6.5, cy + Math.sin(a) * 6.5, 0.5, 0.5, angMaior),
          zMarca,
          CREME,
        );
      }
    }

    /**
     * 4. AS BALIZAS VERMELHAS — os pontos que faltavam no horizonte.
     *
     * A torre tem duas desde 18/10 (ver o bloco dos mastros em
     * `constroiTorre`) e a cidade em volta não tinha nenhuma, o que é o
     * contrário da vida real: a luz de obstáculo é obrigatória em todo
     * edifício alto (OACI "baixa intensidade tipo A"; no Brasil a ICA 100-18),
     * e numa silhueta noturna de São Paulo há dezenas delas. Com só a torre
     * acesa, o vermelho dela lia como ornamento da marca; com os vizinhos
     * acesos também, ele passa a ler como NORMA — e é a norma que faz o
     * conjunto parecer uma cidade de verdade.
     *
     * O CORTE É DUPLO, e é o único do requinte que sai do raio de detalhe:
     * acima de 75 m dentro do raio e acima de 90 m em QUALQUER lugar do disco
     * de 1.200 m. A razão é que uma baliza não precisa de resolução — ela é um
     * ponto de luz, e um ponto de luz de meio pixel ainda é um ponto de luz
     * depois que o bloom passa por ele. É a peça mais barata do arquivo (18
     * triângulos) e a que trabalha mais longe.
     *
     * Mastro de 0,5 m de lado e 6 m de altura em aço (`caixaLisa`, que
     * reflete) com a lâmpada de 0,8 m chapada em cima (`lampadaLisa`, que
     * emite) — a mesma divisão de trabalho dos mastros da torre, pela mesma
     * razão escrita lá.
     *
     * ELE FOGE DA CASA DE MÁQUINAS quando ela existe: o mastro vai para o −y
     * local, o lado oposto ao que a casa ocupa. Nos prédios sem casa (os que
     * têm menos de 4,5 m de raio inscrito) ele fica no centroide mesmo, que é
     * o ponto mais alto e mais seguro de uma laje estreita.
     */
    if (convexo && !heliponto && ((perto && altura > 75) || altura > 90)) {
      const recuo = temCasa ? 0.3 * rInscrito : 0;
      const px = cx + Math.sin(angMaior) * recuo;
      const py = cy - Math.cos(angMaior) * recuo;
      caixaLisa(
        cantosGirados(px, py, 0.5, 0.5, angMaior),
        altura,
        altura + 6,
        TORRE_CORPO,
        TORRE_LUZ,
        null,
      );
      lampadaLisa(
        cantosGirados(px, py, 0.8, 0.8, angMaior),
        altura + 6,
        altura + 6.8,
        BALIZA,
      );
    }
  }

  /* O buffer TEXTURIZADO é dimensionado pelo pior caso (todas as arestas
     aproveitadas) e as paredes degeneradas descartadas no caminho deixam
     sobra no fim: a geometria usa só o que foi escrito. O LISO não tem sobra
     nenhuma — ele é do tamanho exato do que foi empurrado. */
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(posicoes.subarray(0, p), 3));
  geo.setAttribute("color", new BufferAttribute(cores.subarray(0, p), 3));
  geo.setAttribute("uv", new BufferAttribute(uvs.subarray(0, pu), 2));
  geo.computeBoundingSphere();

  const geoLiso = new BufferGeometry();
  geoLiso.setAttribute("position", new BufferAttribute(new Float32Array(posLiso), 3));
  geoLiso.setAttribute("color", new BufferAttribute(new Float32Array(corLiso), 3));
  geoLiso.computeBoundingSphere();

  return {
    geo,
    geoLiso,
    triangulos: p / 9,
    triangulosLisos: posLiso.length / 9,
  };
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
/**
 * Um disco de chão com alfa por vértice na borda — serve aos DOIS mapas, o
 * de 22 km e o recorte de 4 km, porque a única coisa que muda entre eles é
 * o raio e o lado do quadrado da textura.
 */
function constroiChao(
  R = LADO_CHAO / 2,
  lado = LADO_CHAO,
  ANEIS = [0, 0.7, 0.88, 1],
  ALFAS = [1, 1, 0.6, 0],
) {
  const SETORES = 128;

  const pos: number[] = [];
  const uv: number[] = [];
  const cor: number[] = [];
  const poe = (r: number, ang: number, alfa: number) => {
    const x = Math.cos(ang) * r * R;
    const y = Math.sin(ang) * r * R;
    pos.push(x, y, 0);
    uv.push(0.5 + x / lado, 0.5 + y / lado);
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
 * ao contrário das PAREDES dos vizinhos: a torre tem 15.794 triângulos contra
 * os 80.069 deles, e contar triângulos à mão para poupar uma realocação que
 * acontece UMA vez na vida da página é o tipo de precisão que só serve para
 * quebrar quando alguém acrescentar um andar. Em 21/10 o lado LISO dos
 * vizinhos foi pelo mesmo caminho, por esta mesma razão — ver o bloco do
 * `posLiso` em `constroiPredios`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * A REGRA DE OURO DESTE ARQUIVO: AQUI QUEM DECIDE QUEM FICA POR CIMA É A
 * ORDEM DE ESCRITA, NÃO A DISTÂNCIA.
 *
 * A câmera do palco é ORTOGRÁFICA com `near = 0,1` e `far = 10` (ver o
 * `<Canvas>` do `HeroGlobe3D`), e uma unidade de mundo é o raio da Terra. O
 * buffer de profundidade, que numa ortográfica é LINEAR, espalha os seus 24
 * bits por 9,9 unidades, ou seja por 63.073 km:
 *
 *     63.072.900 m / 2^24 = 3,76 m por degrau
 *
 * Nada abaixo de quatro metros existe para o z-buffer desta cena. A moldura
 * do letreiro, que está a 0,35 m da parede, não ganha dela por profundidade —
 * ganha porque é escrita DEPOIS no mesmo buffer, e com `LessEqualDepth` o
 * empate é do último. É por isso que as peças de perto desta função estão na
 * ordem em que estão, e por que mexer nessa ordem é mexer no desenho:
 *
 *     embasamento → marquise → VITRINE e ARO (que cobrem os dois)
 *     fustes e vãos → CAIXAS TÉCNICAS (que pousam nos terraços)
 *     coroa → remate → arestas → CINTA DA COROA (que passa por fora delas)
 *     mastros e balizas (que não encostam em nada)
 *     CAIXA DE LUZ → moldura → faixa (o letreiro, de trás para a frente)
 *
 * Os centímetros que cada peça avança sobre a parede continuam escritos
 * porque são a VERDADE GEOMÉTRICA da coisa (uma vitrine avança mesmo 0,2 m) e
 * porque o dia em que esta cena ganhar uma perspectiva com near/far apertados
 * eles passam a valer sozinhos. Hoje, quem trabalha é a ordem.
 * ──────────────────────────────────────────────────────────────────────────
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

  /* Os quatro cantos de um retângulo, em sentido ANTI-HORÁRIO — o contrato de
     normal para fora do arquivo inteiro. O caso quadrado, que é quase tudo
     aqui, continua tendo o nome curto. */
  const cantosRet = (lx: number, ly: number, cx = 0, cy = 0) => {
    const mx = lx / 2;
    const my = ly / 2;
    return [
      [cx - mx, cy - my],
      [cx + mx, cy - my],
      [cx + mx, cy + my],
      [cx - mx, cy + my],
    ] as [number, number][];
  };
  const cantos = (lado: number, cx = 0, cy = 0) => cantosRet(lado, lado, cx, cy);

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

  const tampaRet = (
    lx: number,
    ly: number,
    z: number,
    t: Tom,
    cx = 0,
    cy = 0,
  ) => {
    const q = cantosRet(lx, ly, cx, cy);
    const c = L(t);
    poe(q[0][0], q[0][1], z, c);
    poe(q[1][0], q[1][1], z, c);
    poe(q[2][0], q[2][1], z, c);
    poe(q[0][0], q[0][1], z, c);
    poe(q[2][0], q[2][1], z, c);
    poe(q[3][0], q[3][1], z, c);
  };
  const tampa = (lado: number, z: number, t: Tom, cx = 0, cy = 0) =>
    tampaRet(lado, lado, z, t, cx, cy);

  /**
   * Uma caixa reta: quatro paredes com luz por face e, se pedida, a tampa.
   *
   * Ela nasceu RETANGULAR em 18/10 por causa das caixas técnicas dos terraços,
   * que são 6×3 e não quadradas — um anel de recuo tem 4 m de largura e um
   * equipamento quadrado de 6 m não caberia nele. `bloco` continua sendo o
   * nome do caso quadrado, que é o resto da torre inteira.
   */
  const caixa = (
    lx: number,
    ly: number,
    z0: number,
    z1: number,
    base: Tom,
    topo: Tom,
    tam: Tom | null,
    cx = 0,
    cy = 0,
  ) => {
    const q = cantosRet(lx, ly, cx, cy);
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
    if (tam) tampaRet(lx, ly, z1, tam, cx, cy);
  };

  const bloco = (
    lado: number,
    z0: number,
    z1: number,
    base: Tom,
    topo: Tom,
    tam: Tom | null,
    cx = 0,
    cy = 0,
  ) => caixa(lado, lado, z0, z1, base, topo, tam, cx, cy);

  /**
   * Uma caixa de cor CHAPADA — sem luz por face, sem aresta clara no alto.
   *
   * O que é lâmpada não tem lado escuro: uma baliza de obstáculo emite, ela
   * não reflete a luz de noroeste como as paredes fazem. Passá-la pelo `bloco`
   * daria uma face norte apagada e a leitura de "cubinho vermelho pintado" em
   * vez de "luz acesa". É a mesma razão por que a cinta da coroa e a vitrine
   * do saguão também são escritas chapadas, cada uma no seu lugar.
   */
  const lampada = (
    lx: number,
    ly: number,
    z0: number,
    z1: number,
    c: Tom,
    cx = 0,
    cy = 0,
  ) => {
    const q = cantosRet(lx, ly, cx, cy);
    const cl = L(c);
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      parede(ax, ay, bx, by, z0, z1, cl, cl);
    }
    tampaRet(lx, ly, z1, c, cx, cy);
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

  /* ------------------------------------------------------------- a entrada */

  /**
   * O SAGUÃO ACESO E A POÇA DE LUZ NO PISO (18/10, a fase `fachada`).
   *
   * No retrato de perto a base da torre ocupa um terço de baixo do quadro, e
   * até aqui ela era parede escura e mais nada: um prédio sem ONDE SE ENTRA.
   * É o detalhe que o olho procura primeiro para dar escala humana a uma
   * massa — é pelo tamanho da porta que se sabe o tamanho do edifício.
   *
   * A VITRINE: 14 m de largura por 4,5 de altura (z 0,3 a 4,8), 0,2 m à frente
   * da parede do embasamento. Os 4,5 m são um pé-direito duplo de saguão, e os
   * 14 m são o vão de três portas e as duas vidraças ao lado. Ela fica SOB a
   * marquise e ainda assim visível: a laje avança 6 m e começa em z = 11,6,
   * então com a câmera a 35° acima do horizonte (os 55° de obliquidade da fase
   * `fachada`) ela esconde a parede só até z = 7,5 — a vitrine inteira está
   * abaixo disso.
   *
   * NAS DUAS FACHADAS, e não só na sul que o plano pedia. É a mesma razão das
   * placas da marca e do letreiro, escrita lá embaixo: o SINAL da obliquidade
   * é de quem integra o mergulho, e tombar a esfera para o outro lado não pode
   * custar a entrada do prédio. São dois triângulos a mais, e um edifício
   * deste porte tem acesso pelos dois lados da quadra de qualquer jeito.
   *
   * `JANELA` misturado 40% com `CREME`: é o único lugar da torre com luz
   * branca de verdade além da faixa do letreiro. Dá 0,83 de luminância em
   * sRGB, muito acima do `BLOOM_LIMIAR` de 0,12 — a vitrine SANGRA no
   * pós-processamento, e é esse halo baixo que faz a torre parecer apoiada na
   * rua em vez de encaixada nela.
   */
  {
    const saguao = mistura([0, 0, 0], JANELA, CREME, 0.4);
    const sl = L(saguao);
    for (const sul of [true, false]) {
      const y = (sul ? -1 : 1) * (EMBASAMENTO.lado / 2 + 0.2);
      chapa(sul, y, -7, 7, 0.3, 4.8, sl);
    }
  }

  /**
   * O ARO DE LUZ NO CHÃO — a marquise devolvida ao piso.
   *
   * Um anel plano de raio 44 a 47 m a 0,2 m do chão. Os 44 são exatamente a
   * meia-largura da marquise: a luz embutida na borda dela cai no piso logo
   * depois da projeção da laje, que é onde uma calçada iluminada começa.
   *
   * O NÚMERO DA COR SAI DE UMA CONTA DE MISTURA, não de gosto. O aro é
   * geometria OPACA e é desenhada antes dos dois chãos, que são transparentes
   * (`renderOrder` 2 e 2,2) e não escrevem profundidade — ou seja, no retrato
   * os dois passam por cima dele com 0,484 de opacidade cada (ver
   * `CHAO_NA_FACHADA`). O que sobra do aro, em linear:
   *
   *     final = c_chão·0,484 + 0,516·(c_chão·0,484 + 0,516·c_aro)
   *
   * Com o piso da praça em 0,0062 linear (0,08 sRGB) e o aro em 0,100
   * (`OCLUSAO` puxado 35% para `JANELA`, 0,36 sRGB), o anel chega na tela a
   * 0,0312 linear contra 0,0062 do chão em volta — 0,194 contra 0,082 em sRGB,
   * ou 2,4× mais claro. É a MESMA razão de legibilidade do `VIA_TETO` aqui ao
   * lado, e por isso o mesmo número: 2,3× é o que basta para uma forma
   * aparecer sob o mapa sem virar lâmpada.
   *
   * 35% e não mais: a 0,36 de sRGB o aro fica em 0,065 de luminância linear,
   * ABAIXO do limiar de bloom de 0,12. Ele é uma poça de luz, não uma fonte —
   * quem sangra na base do quadro é a vitrine, que é onde a luz nasce.
   *
   * Só a metade SUL dele se vê: do norte a própria torre o tapa. Custa 128
   * triângulos inteiros, o que é barato demais para valer a conta de cortar.
   */
  {
    const SETORES_ARO = 64;
    const r0 = 44;
    const r1 = 47;
    const zAro = 0.2;
    const aro = L(mistura([0, 0, 0], OCLUSAO, JANELA, 0.35));
    const passoAro = (Math.PI * 2) / SETORES_ARO;
    for (let k = 0; k < SETORES_ARO; k++) {
      const a0 = k * passoAro;
      const a1 = (k + 1) * passoAro;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);
      /* Anti-horário visto de +z, que é para onde a face olha. */
      poe(r0 * c0, r0 * s0, zAro, aro);
      poe(r1 * c0, r1 * s0, zAro, aro);
      poe(r1 * c1, r1 * s1, zAro, aro);
      poe(r0 * c0, r0 * s0, zAro, aro);
      poe(r1 * c1, r1 * s1, zAro, aro);
      poe(r0 * c1, r0 * s1, zAro, aro);
    }
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

  /**
   * AS JANELAS NASCEM POR VÃO, E NÃO POR FIADA (18/10, a fase `fachada`).
   *
   * Até aqui um andar eram DUAS tiras atravessando a face inteira: 70% de
   * vidro escuro embaixo e 30% de vidro aceso em cima. A 2,19 m/px da
   * contemplação isso basta — o andar tem 1,7 px e o que se lê é a cadência
   * claro/escuro. A 0,59 m/px do retrato, não: o andar passa a ter 6,3 px e
   * uma face acesa de uma vez vira uma FITA de luz de 26 px de largura, que é
   * a coisa que nenhum edifício de verdade tem. Um prédio aceso visto de perto
   * é uma GRADE, e a grade é feita de três coisas:
   *
   *   vão        `lado / round(lado/3,2)`: 3,22 m no fuste A (18 vãos em 58),
   *              3,13 no B (16 em 50), 3,23 no C (13 em 42). 3,2 m é o módulo
   *              de fachada de um edifício de escritórios — é dele que saem a
   *              malha de forro, o piso elevado e o lugar onde uma divisória
   *              pode encostar no vidro. Não é um número de desenho: é o
   *              número que faz a janela ter o tamanho de uma janela.
   *   montante   0,3 m entre dois vãos, em `TORRE_CORPO` escurecido 40%. Tem
   *              meio pixel no retrato e ainda assim aparece — é ele que corta
   *              a fita de luz em janelas. Na maquete de 9.200 some sozinho,
   *              que é exatamente o que se quer lá.
   *   peitoril   1,0 m na base de cada andar, da cor do CORPO e não do vidro:
   *              é a viga de borda, a faixa OPACA entre a laje e a janela de
   *              cima. Sem ela a torre é uma caixa de vidro do chão ao teto e
   *              perde a cadência horizontal, que é a única coisa capaz de
   *              dizer quantos andares o prédio tem.
   *
   * A CONTA DA CLARIDADE, que é o risco desta mudança. Sobram 2,7 m de vidro
   * por andar (73% da altura) contra os 30% de antes, e a largura acesa cai de
   * 100% para 78% dos 91% que não são montante:
   *
   *   antes   0,66 (andares acesos) × 0,30 (altura) × 1,00 (largura) = 0,198
   *   agora   0,73 × 0,91 × (0,66·0,78 + 0,34·0,06)                  = 0,356
   *
   * ou seja 1,8× mais ÁREA acesa. A compensação está na MISTURA: o pico de
   * âmbar vai a 0,37 (era 0,31) mas a média cai de 0,235 para 0,223, e o
   * produto área×mistura sai 1,7× o de antes (0,079 contra 0,0465). É um
   * aumento de propósito — a torre é o assunto do retrato, e um marco que não
   * é mais claro que os vizinhos não é marco —, e é pequeno o bastante para a
   * maquete de 9.200 não trocar de leitura. Quem confere isso no navegador é
   * a verificação final; o que esta conta garante é que ninguém vai descobrir
   * a mudança de brilho por acidente.
   *
   * NADA DISTO É CHAVEADO PELA PROP `fachada`. A torre é UMA geometria e UM
   * draw call, construída uma vez no `useMemo`; um nível de detalhe por
   * escala pediria uma segunda geometria, um segundo material e um segundo
   * draw call para economizar triângulos que a GPU desenha em microssegundos.
   * Os 14,6 mil triângulos que a tarefa F acrescenta estão SEMPRE no buffer, e
   * o que a escala decide é só se eles se enxergam.
   */

  /** O módulo de fachada: a largura de MIRA de um vão (o real sai da divisão). */
  const VAO_ALVO = 3.2;
  /** O fio vertical entre dois vãos. */
  const MONTANTE = 0.3;
  /** A viga de borda na base de cada andar. */
  const PEITORIL = 1.0;

  /* O montante não depende da face: ele é sombra, não material iluminado. O
     preto que escurece o `TORRE_CORPO` é o `OCLUSAO` da paleta — nenhuma cor
     nova entra neste arquivo por causa de um fio de 0,3 m. */
  const montanteL = L(mistura([0, 0, 0], TORRE_CORPO, OCLUSAO, 0.4));

  let andar = 0;
  for (const seg of FUSTES) {
    const q = cantos(seg.lado);
    const n = Math.max(1, Math.round((seg.z1 - seg.z0) / PE_DIREITO));
    const pe = (seg.z1 - seg.z0) / n;
    const nv = Math.max(1, Math.round(seg.lado / VAO_ALVO));
    const passoVao = seg.lado / nv;
    const vidro: Tom = [0, 0, 0];
    const reflexo: Tom = [0, 0, 0];
    const reflexoL: Tom = [0, 0, 0];
    const acesa: Tom = [0, 0, 0];
    const acesaL: Tom = [0, 0, 0];
    const alvo: Tom = [0, 0, 0];
    const peitoril: Tom = [0, 0, 0];
    const peitorilTopo: Tom = [0, 0, 0];

    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      /* O versor que anda ao longo da face: é ele que traduz "metro da
         esquerda para a direita da fachada" em x,y do referencial da cena, e
         é o que deixa as quatro faces usarem o mesmo laço de vãos. */
      const ux = (bx - ax) / seg.lado;
      const uy = (by - ay) / seg.lado;
      const luz = luzDa(ax, ay, bx, by);

      mistura(vidro, VIDRO, VIDRO_LUZ, luz);
      /* O peitoril é CONCRETO, não vidro: ele anda de `TORRE_CORPO` a
         `TORRE_LUZ` com a luz da face, e a aresta de cima leva mais 20% de
         `PAREDE_TOPO` — é o fio claro do canto da viga, o mesmo recurso que
         desenha a silhueta dos vizinhos contra o céu. */
      mistura(peitoril, TORRE_CORPO, TORRE_LUZ, luz);
      mistura(peitorilTopo, peitoril, PAREDE_TOPO, 0.2);
      const peitorilL = L(peitoril);
      const peitorilTopoL = L(peitorilTopo);

      for (let a = 0; a < n; a++) {
        const z0 = seg.z0 + a * pe;
        const zv = z0 + PEITORIL; // onde a viga acaba e o vidro começa
        const z1 = z0 + pe;

        /* A viga de borda, atravessando a face inteira — ela é a única peça
           contínua de um andar, e é por isso que ela lê como "laje". */
        parede(ax, ay, bx, by, z0, zv, peitorilL, peitorilTopoL);

        /* O REFLEXO VERTICAL: o vidro clareia até 12% da base ao alto do
           fuste. É o céu que ele devolve — num prédio real o vidro de baixo
           reflete a rua escura e o prédio da frente, e o de cima reflete o
           horizonte, que mesmo à noite é a parte mais clara do céu. 12% é
           pouco de propósito: o que esta rampa faz é impedir que uma parede
           de 93 m tenha o mesmo tom do primeiro ao último andar, e qualquer
           coisa além disso vira um degradê de cartaz. */
        const alt = n > 1 ? a / (n - 1) : 0;
        mistura(reflexo, vidro, VIDRO_LUZ, 0.12 * alt);
        paraLinear(reflexoL, reflexo);

        const nivel = fiada(andar + a);

        for (let v = 0; v < nv; v++) {
          /* Meio montante de cada lado, MENOS nas pontas da face: lá o canto
             já é a fita da aresta, que passa 0,05 m por fora e cobre os
             últimos 0,9 m — um montante ali seria um fio escuro escondido
             atrás de um fio laranja. */
          const s0 = v * passoVao + (v === 0 ? 0 : MONTANTE / 2);
          const s1 = (v + 1) * passoVao - (v === nv - 1 ? 0 : MONTANTE / 2);
          const x0 = ax + ux * s0;
          const y0 = ay + uy * s0;
          const x1 = ax + ux * s1;
          const y1 = ay + uy * s1;

          /* UMA chave por andar, por FACE e por vão. Sem o `k` as quatro
             fachadas acenderiam o mesmo desenho e a torre viraria um carimbo
             girado quatro vezes — o tipo de simetria que o olho pega na hora
             quando a órbita da fase `fachada` mostra duas faces ao mesmo
             tempo. Os multiplicadores primos (1021, 61) espalham as chaves de
             andares vizinhos para longe uma da outra no `sorteio`. */
          const chave = (andar + a) * 1021 + k * 61 + v;

          /* 78% dentro de um andar aceso, 6% num andar apagado. Os 6% são o
             detalhe que faz a fachada parecer habitada: um andar escuro com
             UMA sala acesa é alguém que ficou até tarde, e é a única coisa
             que diferencia um prédio à noite de uma grade desenhada. */
          if (sorteio(chave * 7 + 1) < (nivel > 0 ? 0.78 : 0.06)) {
            /* O brilho do vão: o andar dá a base (`fiada`, 0,42 a 1,0) e o vão
               varia de 0,45 a 1,0 em cima dela. A sala acesa num andar apagado
               não tem andar de quem herdar e entra com 0,55 — uma luz só,
               nem a mais forte nem a mais fraca da fachada. */
            const intens = 0.45 + 0.55 * sorteio(chave * 13 + 5);
            /* Uma em cada cinco puxa 35% para o CREME: é a luz fria de uma
               sala de reunião no meio das salas de luz quente. Sem essa
               variação a fachada inteira tem uma cor só e lê como filtro
               aplicado por cima, não como luzes diferentes acesas. */
            const frio = sorteio(chave * 29 + 11) < 0.2 ? 0.35 : 0;
            mistura(alvo, JANELA, CREME, frio);
            mistura(
              acesa,
              reflexo,
              alvo,
              0.07 + 0.3 * (nivel > 0 ? nivel : 0.55) * intens,
            );
            paraLinear(acesaL, acesa);
            parede(x0, y0, x1, y1, zv, z1, acesaL, acesaL);
          } else {
            parede(x0, y0, x1, y1, zv, z1, reflexoL, reflexoL);
          }

          /* O montante vai DEPOIS do vão e só ENTRE dois deles: os vãos e os
             montantes são tiras vizinhas no mesmo plano, encostadas e sem se
             sobrepor — nenhuma depende da profundidade para aparecer, o que
             nesta cena de degraus de 3,76 m é a única forma segura de desenhar
             duas cores lado a lado numa parede. */
          if (v < nv - 1) {
            const m0 = (v + 1) * passoVao - MONTANTE / 2;
            const m1 = (v + 1) * passoVao + MONTANTE / 2;
            parede(
              ax + ux * m0,
              ay + uy * m0,
              ax + ux * m1,
              ay + uy * m1,
              zv,
              z1,
              montanteL,
              montanteL,
            );
          }
        }
      }
    }
    /* O TERRAÇO DO RECUO. Uma tampa inteira, e não um anel: o fuste de cima
       nasce exatamente neste z e cobre o miolo, então o anel visível sai de
       graça e sem um único triângulo em L para calcular. */
    tampa(seg.lado, seg.z1, TELHADO);
    andar += n;
  }

  /* --------------------------------------- as caixas técnicas dos terraços */

  /**
   * O QUE PÕE UM TERRAÇO NO LUGAR DE UM DEGRAU.
   *
   * Um recuo vazio lê como um corte no bloco; o que faz dele um TERRAÇO é o
   * equipamento em cima — casa de máquinas, torre de resfriamento, a caixa do
   * elevador. Três caixas bastam: no retrato elas têm 4 px de altura e o que
   * elas entregam não é o objeto, é a QUEBRA da linha reta do parapeito.
   *
   * 6×3 e não os 6×4 que o plano pedia, e a razão é aritmética: o anel do
   * recuo de 108 m vai de 25 a 29 m de meia-largura (o fuste A tem 58 de lado,
   * o B tem 50) e o de 180 vai de 21 a 25 — quatro metros, os dois. Uma caixa
   * de 4 m de profundidade encostaria nas duas bordas do anel ao mesmo tempo,
   * e "sem tocar as arestas" é a condição do plano. Com 3 m ela fica centrada
   * no anel com 0,5 m de folga de cada lado.
   *
   * As posições fogem dos cantos (onde correm as fitas das arestas) e da
   * placa do terraço lá em cima. 2,5 m de altura: dois terços de um
   * pé-direito, que é o tamanho de uma casa de máquinas de verdade.
   */
  /* no terraço de 108 m (anel de 25 a 29): uma ao sul e uma ao norte */
  caixa(6, 3, 108, 110.5, TELHADO, PAREDE_TOPO, TELHADO, 15, -27);
  caixa(6, 3, 108, 110.5, TELHADO, PAREDE_TOPO, TELHADO, -15, 27);
  /* no terraço de 180 m (anel de 21 a 25): uma a leste, virada 90° */
  caixa(3, 6, 180, 182.5, TELHADO, PAREDE_TOPO, TELHADO, 23, -9);

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

  /* ----------------------------------------------- a cinta de luz da coroa */

  /**
   * A COROA ILUMINADA — a "crown lighting" dos arranha-céus de verdade.
   *
   * Uma cinta de 1,2 m de altura dando a volta no alto da coroa (z 276 a
   * 277,2), 0,3 m para fora da parede, em `CREME` com 15% de `LARANJA`. É a
   * peça que mais trabalha no retrato por triângulo gasto: oito triângulos
   * para a coisa que o olho usa, numa silhueta noturna, para separar o remate
   * do céu.
   *
   * POR QUE NO ALTO DA COROA E NÃO NO ALTO DO REMATE: o remate já é laranja
   * chapado e já é a peça mais clara da torre; uma cinta ali seria luz sobre
   * luz. A 276 ela fica logo abaixo do remate, e o que se lê de longe são
   * DUAS faixas acesas com um vão escuro entre elas — a assinatura de um
   * coroamento iluminado.
   *
   * Em luminância ela dá 0,93 em sRGB e 0,85 em linear, sete vezes o
   * `BLOOM_LIMIAR` de 0,12: é a peça da torre que mais sangra no
   * pós-processamento, e sangrar é o trabalho dela.
   *
   * CHAPADA (`parede` com a mesma cor em cima e embaixo, sem `bloco`): ela
   * emite, não reflete, e uma face norte escura entregaria o truque. E ela
   * passa POR FORA das fitas das arestas, que estão a 0,05 m da parede — os
   * 0,25 m de diferença não existem para um z-buffer de degraus de 3,76 m, e
   * o que faz a cinta ficar na frente é ser escrita DEPOIS delas. Por isso
   * este bloco está aqui e não antes.
   */
  {
    const cinta = L(mistura([0, 0, 0], CREME, LARANJA, 0.15));
    const q = cantos(COROA.lado + 0.6);
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = q[k];
      const [bx, by] = q[(k + 1) % 4];
      parede(ax, ay, bx, by, 276, 277.2, cinta, cinta);
    }
  }

  /* ------------------------------------------ os mastros e as balizas */

  /**
   * OS DOIS MASTROS DO TERRAÇO, com a luz de obstáculo no topo.
   *
   * 16 m de altura e 0,7 m de lado, nos cantos NORTE do remate (±12 m, +12 m),
   * subindo de 284 a 300; a baliza é um cubo de 1,0 m em cima, de 300 a 301.
   *
   * ELES SÃO A COISA MAIS ALTA DA CENA, e é esse o ponto. O remate parava em
   * 284 m com uma aresta horizontal limpa, e uma silhueta que termina numa
   * reta lê como objeto cortado. Os mastros quebram a reta com duas verticais
   * finas, e as balizas põem duas luzes vermelhas acima de tudo — dois pontos
   * que o bloom transforma em estrelas e que, de longe, são o que diz a
   * altura do prédio sem precisar comparar com nada.
   *
   * ±12 e não ±16: a placa da marca no terraço vai de −14 a +14 em x e até
   * 8,7 em y (ver `LOGO_TELHADO`), e os mastros têm de ficar fora dela SEM
   * ficar pendurados na borda do remate, que acaba em 18. Em (±12, +12) eles
   * passam 3,3 m ao norte da placa e 6 m dentro do parapeito.
   *
   * O mastro é `bloco` normal (ele reflete: é aço) e a baliza é `lampada`
   * (ela emite). Os dois juntos custam 36 triângulos.
   */
  for (const mx of [-12, 12]) {
    bloco(0.7, REMATE.z1, REMATE.z1 + 16, TORRE_CORPO, TORRE_LUZ, null, mx, 12);
    lampada(1, 1, REMATE.z1 + 16, REMATE.z1 + 17, BALIZA, mx, 12);
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

    /**
     * A CAIXA DE LUZ (18/10) — o que estava faltando para o letreiro ler como
     * letreiro no retrato de perto.
     *
     * Com a placa a 30 m de largura, o que se via era arte laranja flutuando
     * sobre a GRADE DE JANELAS do fuste: os vãos passavam por trás das letras
     * e picotavam a marca. Um letreiro de topo de prédio nunca é montado
     * direto no vidro — ele vem sobre um PAINEL fechado, que tapa a fachada
     * atrás dele e dá à marca um fundo liso.
     *
     * É um quad só, 1,0 m maior que a arte em cada lado (16,0 × 10,3 m de
     * meia-medida), em `LARANJA` misturado 70% com `TORRE_CORPO`. Esse laranja
     * escuro dá 0,22 de luminância em sRGB e 0,040 em linear — ABAIXO do
     * `BLOOM_LIMIAR` de 0,12, e isso é deliberado: a caixa é FUNDO, não luz.
     * Quem sangra no bloom aqui é a faixa creme embaixo e a placa da marca,
     * que são as duas peças acesas do conjunto.
     *
     * A 0,22 m DA PAREDE, e não aos 0,45 que o plano escreveu: a moldura está
     * a 0,35, e 0,45 poria a caixa NA FRENTE dela — o oposto do "entre a
     * parede e a moldura" que o próprio plano pede. Na prática o que decide
     * não é nem um número nem o outro (o z-buffer desta cena tem degraus de
     * 3,76 m, ver o cabeçalho da função): decide a ORDEM, e por isso a caixa é
     * escrita ANTES da moldura e da faixa, logo abaixo. Os 0,22 ficam porque
     * são a verdade geométrica da peça.
     */
    const caixaX = LOGO_LARGURA / 2 + 1;
    const caixaZ = LOGO_ALTURA / 2 + 1;
    const caixaL = L(mistura([0, 0, 0], LARANJA, TORRE_CORPO, 0.7));
    for (const sul of [true, false]) {
      const y = (sul ? -1 : 1) * (fuste.lado / 2 + 0.22);
      chapa(sul, y, -caixaX, caixaX, Z - caixaZ, Z + caixaZ, caixaL);
    }

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
 *
 *    NA FASE `fachada` OS PAPÉIS SE INVERTEM, e é por isso que as duas placas
 *    cresceram em 18/10. A obliquidade sobe de 32° para 55°: o terraço passa a
 *    encolher 43% (cos 55°) e a fachada só 18% (sen 55°). A placa que carrega
 *    o reconhecimento no retrato é a DA FACHADA — e é ela que ganhou o
 *    letreiro inteiro em volta (caixa de luz, moldura e faixa, em
 *    `constroiTorre`). A do terraço continua porque é ela que trabalha na
 *    contemplação, que é por onde o mergulho passa antes e depois.
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
  /**
   * AS AVENIDAS DO MAPA: 0 = acesas (o néon do mapa noturno), 1 = apagadas
   * (asfalto escuro, ver `VIA_TETO`).
   *
   * O PADRÃO É `predios`, E ISSO NÃO É ATALHO: `LIMIAR.avenidas` é o MESMO par
   * de `LIMIAR.predios` (a luz do quadro troca de dono — sai do chão, entra nas
   * arestas e janelas), então `visibilidades(zoom).avenidas` devolve, em todo
   * zoom, exatamente `visibilidades(zoom).predios`. Puxar um quinto fio pelo
   * `cena.ts`, pelo `HeroGlobe` e pelo `HeroGlobe3D` para transportar um número
   * que já chega igual seria três arquivos de encanamento sem um pixel de
   * diferença — e o fio de `predios` já vem zerado no celular, que é
   * exatamente o que esta rampa precisa lá.
   *
   * A prop existe para o dia em que os dois pares se separarem: quando isso
   * acontecer, é aqui que o valor próprio entra, e nada mais muda.
   */
  avenidas?: number;
  /** A marca na torre: 0 = apagada, 1 = acesa. */
  logo: number;
  /**
   * O RECORTE DE DETALHE do centro: 0 = só o mapa de 22 km, 1 = o de 4 km
   * por cima dele. A travessia acontece entre Z = 1.500 e Z = 3.000 (ver
   * LIMIAR.detalhe, em mergulhoSP), e como ela sai da ESCALA e não do
   * relógio, ela se desfaz sozinha na subida e em qualquer desvio.
   */
  detalhe: number;
  /**
   * O DETALHE DE PERTO: 0 = o mergulho de sempre, 1 = o RETRATO DA TORRE.
   *
   * Pedido do dono, 18/10: "adicione mais um zoom, no globo, onde mostra a
   * torre mais detalhada em uma vista mais próxima (...) capriche nos detalhes
   * do prédio".
   *
   * Sai da ESCALA como as outras visibilidades (`LIMIAR.fachada` em
   * `mergulhoSP`: acende entre Z = 12.000 e 26.000), e por isso vale ZERO em
   * todo o mergulho que existia até 9.200 — nada do que ele acende aparece na
   * contemplação, e a volta se desfaz sozinha na subida e em qualquer desvio
   * por clique. No celular chega sempre zerado, como `predios`.
   *
   * É o sinal de "um pixel vale 0,59 m agora": é ele que autoriza as peças que
   * medem menos de um pixel na maquete — as janelas por vão (montante de
   * 0,3 m), a caixa de luz do letreiro, a cinta da coroa (1,2 m), as balizas
   * dos mastros (1 m) e a vitrine do saguão. Padrão 0: a cena montada sem este
   * fio é exatamente a cena de 17/10.
   */
  fachada?: number;
  /**
   * A ESCALA DE TELA DA CÂMERA, em degraus de 1/16 de nat (ver `cidadeSP` no
   * `HeroGlobe3D`). O padrão de quem a consumir é `ZOOM_TORRE` (9.200), o fim
   * da contemplação — é o que `ZERO_SP` publica quando não há mergulho.
   *
   * POR QUE UMA CENA SEM CÂMERA PRECISA DO ZOOM. Ela não precisa dele para
   * NADA que seja geometria: tudo aqui é medido em metros, e metro não depende
   * de escala. Ele existe para as peças cujo tamanho é em PIXELS — os sprites
   * de luz dos postes das ruas (`SaoPauloLuzes`), que são pontos e não malhas,
   * e cujo `gl_PointSize` tem de sair de uma conta de px por metro:
   *
   *     px por metro = (largura do canvas em CSS / 2) · zoom / 6.371.000
   *
   * Em DEGRAUS e não por quadro porque este é um componente de React, e um
   * número contínuo aqui seria um render por quadro. 1/16 de nat é a resolução
   * em que um sprite de 1,8 m muda menos de meio pixel no fundo do mergulho.
   *
   * A TAREFA T SÓ LIGA O FIO, e por isso ele é declarado aqui e NÃO
   * desestruturado no corpo: quem lê este número é a tarefa L (os postes das
   * ruas), e um parâmetro com valor e sem leitor é aviso de lint — a régua
   * desta base é `pnpm lint` sem uma linha de saída. Quando o leitor existir,
   * é só acrescentar `zoom = ZOOM_TORRE` à desestruturação; o fio já chega
   * ligado do `HeroGlobe3D`, em degraus, desde 18/10.
   */
  zoom?: number;
  /**
   * Baixar ou não a textura de detalhe. Falso no celular: são 214 kB, e a
   * câmera de lá para em Z = 405, onde o recorte nem começaria a aparecer.
   */
  querDetalhe?: boolean;
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
  detalhe,
  fachada = 0,
  avenidas = predios,
  querDetalhe = false,
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
     o componente monta — 4.423 contornos, 3.770 prédios depois dos filtros,
     80.069 triângulos, 7,1 MB. A contagem sai da geometria, não do
     navegador; o par 3.769/61.945 que esta linha trazia é de antes de as
     paredes ganharem fatias, em 17/10.

     Os 7,1 MB são duas contas desde 18/10: as 56.632 paredes custam 96 bytes
     por triângulo (posição, cor e agora o `uv`, três vértices de float32) e
     dão 5,4 MB; os 23.437 triângulos lisos continuam a 72 bytes e dão 1,69.
     O `uv` acrescentou 1,36 MB de RAM e nenhum milissegundo: ele é escrito
     no mesmo laço, no mesmo passe, por duas atribuições a mais por vértice.
     As peças de telhado de 21/10 acrescentaram 0,34 MB — e o lado liso
     passou a ser um `number[]` que vira `Float32Array` no fim, de modo que
     durante a construção existe um pico de mais 3,4 MB (as 421.866 posições
     e cores como doubles de array) que o coletor leva embora logo depois. É o preço de não ter um orçamento
     frágil, e ele é pago uma vez, atrás da travessia do 2D para o 3D.

     O TEMPO, esse é medido, e é de 17/10: 40 ms na primeira construção e 17
     com o motor quente, pagos no mesmo instante em que o canvas do hero nasce
     (atrás dos 600 ms de travessia do 2D para o 3D), e nunca mais. Ele não
     foi refeito depois da grade de vãos da torre, que acrescenta 14,6 mil
     triângulos a uma conta de 97 mil — a ordem de grandeza não muda, mas quem
     for cobrar o número exato tem de medir de novo. O `useMemo` sem
     dependência nenhuma é o que garante o "uma vez": as props mudam a cada
     quadro do mergulho e nada aqui pode ser refeito por causa delas. */
  const pecas = useMemo(() => {
    const aneis = preparaAneis();
    const {
      geo: predioGeo,
      geoLiso: telhadoGeo,
      triangulos,
      triangulosLisos,
    } = constroiPredios(aneis);
    return {
      predioGeo,
      telhadoGeo,
      torreGeo: constroiTorre(),
      logoGeo: constroiLogo(),
      chaoGeo: constroiChao(),
      centroGeo: constroiChao(
        RAIO_CENTRO,
        LADO_CENTRO,
        [0, CHEIO_CENTRO, 0.9, 1],
        [1, 1, 0.45, 0],
      ),
      triangulos,
      triangulosLisos,
      aneis: aneis.length,
    };
  }, []);

  const texturas = useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    const aquece = (t: Texture) => gl.initTexture(t);
    return {
      chao: carrega(SP_MAPA.textura, aniso, invalidate, aquece),
      logo: carrega("/images/logo-icon.png", aniso, invalidate, aquece),
      /* O recorte entra no MESMO memo, e não num carregamento tardio com
         estado: pedi-lo só quando o zoom passa de 1.500 pouparia 214 kB de
         quem nunca chega lá, mas TODO MUNDO chega lá — São Paulo é a
         primeira cidade do voo. O que sobraria seria a chance de a textura
         ainda estar decodificando no quadro em que ela precisa aparecer. */
      centro: querDetalhe
        ? carrega(SP_CENTRO.arquivo, aniso, invalidate, aquece)
        : null,
      /* O LADRILHO DE JANELAS NÃO É CONDICIONAL, e isto é o contrário do
         recorte de detalhe aqui em cima. Não é por ele ser barato (512×512
         pintados no cliente, menos de um milissegundo e 1,4 MB de VRAM com
         a cadeia de mipmaps):
         é porque a cor das paredes já foi escrita contando com ele. O
         material multiplica por 10,37× para desfazer a média do ladrilho, e
         sem o ladrilho esse ganho não teria o que desfazer — a cidade sairia
         dez vezes mais clara. Quem dá conta do caso em que ele não nasce
         (canvas sem contexto 2D) é o próprio `materiais`, logo abaixo. */
      janelas: constroiTexturaJanelas(aniso),
    };
  }, [gl, invalidate, querDetalhe]);

  const materiais = useMemo(() => {
    /**
     * O UNIFORME DAS AVENIDAS é UM só para os dois chãos: o grande e o recorte
     * de detalhe trocam de lugar por crossfade, e um quadro em que os dois
     * estivessem em pontos diferentes da rampa mostraria justamente a emenda
     * que o `LIMIAR.detalhe` existe para esconder. `onBeforeCompile` entrega o
     * MESMO `{ value }` aos dois materiais: escrever nele é escrever nos dois.
     *
     * Ele nasce aqui dentro e sai pela função `poeAvenidas`, e não como
     * objeto: um uniforme é estado da GPU, não estado de React, e tudo o que
     * sai de um `useMemo` é imutável para quem o recebe (`react-hooks`). A
     * função é o jeito honesto de dizer "quem manda nisto é o material".
     */
    const uAvenidas = { value: 0 };

    /**
     * A INJEÇÃO. Uma função SÓ, compartilhada pelos dois materiais, e isso não
     * é estilo: o three monta a chave do cache de programas com
     * `onBeforeCompile.toString()` (ver `Material.customProgramCacheKey`), então
     * duas funções com o mesmo corpo já compartilhariam o programa — mas uma
     * função só deixa isso explícito e garante que as duas injeções não possam
     * divergir.
     *
     * O corte entra DEPOIS de `<map_fragment>`, que é onde `diffuseColor`
     * acabou de receber o texel, e ANTES de `<color_fragment>` (a cor de
     * vértice, que aqui é branca e só carrega o alfa da borda) e de
     * `<colorspace_fragment>` (a conversão de saída). Ou seja: mexe na cor
     * DIFUSA, em linear, antes de qualquer gama — o resultado é o mesmo com e
     * sem o compositor da etapa 5.
     *
     * `max(viaPico, VIA_TETO)` no denominador em vez de um `if`: ele tira a
     * divisão por zero do chão preto e já devolve k = 1 para tudo que está
     * abaixo do teto, sem desvio no fragmento.
     */
    const teto = VIA_TETO.toFixed(4);
    const apagaVias = (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uAvenidas = uAvenidas;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uAvenidas;")
        .replace(
          "#include <map_fragment>",
          [
            "#include <map_fragment>",
            "float viaPico = max(diffuseColor.r, diffuseColor.g);",
            `float viaK = ${teto} / max(viaPico, ${teto});`,
            "diffuseColor.rgb *= mix(1.0, viaK, uAvenidas);",
          ].join("\n"),
        );
    };

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
    /* O RECORTE usa o mesmo material do chão, com a mesma receita: alfa por
       vértice na borda, sem escrever profundidade (ele é camada de baixo e
       não pode recortar prédio) e com o teste ligado (é ele que faz o prédio
       tapar o mapa). O que o separa do chão grande é só a ORDEM de desenho. */
    const chaoCentro = texturas.centro
      ? new MeshBasicMaterial({
          map: texturas.centro,
          transparent: true,
          vertexColors: true,
          depthWrite: false,
          toneMapped: false,
        })
      : null;
    /**
     * AS PAREDES DOS VIZINHOS — o único material desta cena com textura E
     * cor de vértice ao mesmo tempo.
     *
     * `diffuseColor = color · vColor · texel`, tudo em linear. `vColor` é a
     * luz assada de 17/10 (face, oclusão, aresta, densidade de janelas) e
     * `texel` é o ladrilho; quem fecha a conta é `color`, que leva o ganho
     * de `1 / TILE_MEDIA` — ver o bloco `TILE_*`. O ganho entra pelo
     * `material-color-*` da malha, junto com o `brilho` da subida dos
     * prédios, e é por isso que ele não aparece aqui: este material nasce
     * branco e a malha escreve a cor em todo quadro do mergulho.
     */
    const predio = new MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      map: texturas.janelas,
    });
    /* Os TELHADOS e o fio do parapeito: o material de sempre, sem mapa. */
    const telhado = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
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
    chao.onBeforeCompile = apagaVias;
    if (chaoCentro) chaoCentro.onBeforeCompile = apagaVias;

    /* O ESPELHO DO UNIFORME NO `userData`, pelo mesmo motivo do `espia3d` do
       `HeroGlobe3D`: é por ele que a medição liga e desliga o teto no MESMO
       quadro — mesma escala, mesma órbita, mesma sessão — em vez de comparar
       duas builds e discutir se a diferença é da mudança ou do ângulo. Não
       custa um byte no desenho; `userData` nunca é lido pelo renderizador. */
    chao.userData.uAvenidas = uAvenidas;
    if (chaoCentro) chaoCentro.userData.uAvenidas = uAvenidas;

    const poeAvenidas = (v: number) => {
      uAvenidas.value = v;
    };

    /* O GANHO DAS PAREDES. 10,37× quando o ladrilho existe (o inverso da
       luminância média dele), 1 quando o canvas 2D faltou — e aí a cidade
       sai sem janelas, exatamente como saía em 17/10. É o único lugar do
       arquivo onde a ausência de uma textura muda uma conta, e por isso ele
       mora ao lado do material e não na malha. */
    const ganhoParede = texturas.janelas ? 1 / TILE_MEDIA : 1;

    return {
      chao,
      chaoCentro,
      predio,
      telhado,
      torre,
      marca,
      ganhoParede,
      poeAvenidas,
    };
  }, [texturas]);

  /* Devolver tudo ao driver no desmonte: o canvas do hero morre quando o
     usuário sai da seção no celular, e geometria de 4,4 mil prédios não pode
     ficar pendurada na GPU. */
  useEffect(
    () => () => {
      pecas.predioGeo.dispose();
      pecas.telhadoGeo.dispose();
      pecas.torreGeo.dispose();
      pecas.logoGeo.dispose();
      pecas.chaoGeo.dispose();
      pecas.centroGeo.dispose();
      materiais.chao.dispose();
      materiais.chaoCentro?.dispose();
      materiais.predio.dispose();
      materiais.telhado.dispose();
      materiais.torre.dispose();
      materiais.marca.dispose();
      texturas.chao.dispose();
      texturas.centro?.dispose();
      texturas.logo.dispose();
      /* O ladrilho é um `CanvasTexture`: o `dispose` devolve a cópia da GPU,
         e o canvas de 512×512 que ficou no JS morre com a textura. */
      texturas.janelas?.dispose();
    },
    [pecas, materiais, texturas],
  );

  /* O TETO DAS VIAS, escrito no uniforme que os dois chãos compartilham.
     É UMA ESCRITA POR MUDANÇA DE PROP, não por quadro: as props já chegam em
     degraus de 1/64 (ver `cidadeSP`, em `HeroGlobe3D`), de modo que o mergulho
     inteiro custa no máximo ~64 escritas contra os seus ~670 quadros — e
     nenhuma alocação, porque o `{ value }` nasceu no `useMemo` dos materiais e
     vive com eles.

     Num efeito e não no corpo porque escrever durante o render é mutação no
     meio do render (`react-hooks/immutability`). O atraso é o mesmo de
     qualquer prop de material do r3f — as opacidades aqui do lado chegam à GPU
     no mesmo quadro que este número. */
  useEffect(() => {
    materiais.poeAvenidas(avenidas);
  }, [materiais, avenidas]);

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
   * do material pela altura resolve sem transparência (que, com 75 mil
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
        material-opacity={
          mapa * (1 - CHAO_NO_FUNDO * logo) * (1 - CHAO_NA_FACHADA * fachada)
        }
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

      {/* O RECORTE DE DETALHE, por cima do mapa de 22 km.

          CENTRADO NA TORRE, não no meio da caixa da textura grande: é por
          isso que ele recebe o mesmo `deslocamento` dos prédios. Os dois
          mapas têm a mesma projeção e a mesma paleta por classe de via; o
          que muda é a escala, de 10,74 m/px para 1,95.

          ORDEM, E NÃO PROFUNDIDADE: os dois chãos têm `depthWrite` falso, de
          modo que nenhum dos dois escreve no buffer e não há disputa de
          profundidade entre eles — quem decide quem fica por cima é
          `renderOrder`. Os prédios continuam opacos e escrevendo, e por isso
          continuam tapando os dois.

          UM DRAW CALL A MAIS, e só enquanto ele existe: fora da faixa de
          troca o nó nem é criado. */}
      {materiais.chaoCentro && detalhe > 0.004 ? (
        <mesh
          geometry={pecas.centroGeo}
          material={materiais.chaoCentro}
          position={deslocamento}
          material-opacity={
            mapa *
            detalhe *
            (1 - CHAO_NO_FUNDO * logo) *
            (1 - CHAO_NA_FACHADA * fachada)
          }
          renderOrder={2.2}
          ref={(no) => {
            /* Entra no bloom pela mesma razão do chão grande: as vias dele
               são a FONTE DE LUZ do quadro no fundo do mergulho. */
            if (no && camadaBrilho !== undefined) no.layers.enable(camadaBrilho);
          }}
        />
      ) : null}

      {mostraPredios ? (
        <group position={deslocamento}>
          {/* Os prédios SOBEM do chão: a visibilidade é escala no eixo Z local
              (que aqui é o "para cima"), não opacidade.

              A ESCALA NÃO MEXE NO `uv`, que está em metros de geometria: no
              meio da subida o ladrilho de janelas aparece espremido, com
              andares de meio metro. É assim de propósito — a alternativa
              seria reescrever o atributo de 1,36 MB a cada quadro —, e não se
              vê: `brilho` vale `predios^1,35`, de modo que enquanto a cidade
              está esmagada ela também está quase preta. */}
          <group scale={[1, 1, alturaPredios]}>
            {/* AS PAREDES, com o ladrilho de janelas. O `brilho` da subida
                vem multiplicado pelo ganho que desfaz a média do ladrilho
                (ver `TILE_MEDIA`): os dois números moram no mesmo lugar
                porque são a mesma multiplicação, e separá-los em dois
                passos só daria a chance de um deles ser esquecido. */}
            <mesh
              geometry={pecas.predioGeo}
              material={materiais.predio}
              ref={(no) => {
                /* Os prédios também: o que brilha neles são as JANELAS, que
                   são do mesmo âmbar das vias. As paredes, bem abaixo do
                   limiar, não sangram nada. */
                if (no && camadaBrilho !== undefined) no.layers.enable(camadaBrilho);
              }}
              material-color-r={brilho * materiais.ganhoParede}
              material-color-g={brilho * materiais.ganhoParede}
              material-color-b={brilho * materiais.ganhoParede}
            />
            {/* OS TELHADOS e o fio do parapeito: a mesma cor de vértice de
                sempre, sem ladrilho e sem ganho. */}
            <mesh
              geometry={pecas.telhadoGeo}
              material={materiais.telhado}
              ref={(no) => {
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
