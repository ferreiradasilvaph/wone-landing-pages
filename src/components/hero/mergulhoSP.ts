/**
 * O MERGULHO EM SÃO PAULO — o modelo de TEMPO da pausa mais longa do voo.
 *
 * Pedido do dono, 17/10: "quando a bolinha parar no brasil, aumente o zoom e
 * mostre como se fosse imagens de satélite reais detalhando a cidade de são
 * paulo, essa pausa da bolinha vai ser a mais longa dentre os outros países.
 * detalhe uma cidade vista de cima, com prédios e um prédio em destaque com a
 * logo do wone no prédio."
 *
 * Este arquivo é PURO: não conhece DOM, React nem three. Ele devolve, para um
 * instante em ms desde o começo da parada, a escala da câmera, a obliquidade,
 * a órbita e as QUATRO VISIBILIDADES das camadas. Quem desenha (o `HeroGlobe3D`
 * e o `SaoPauloCena`) só aplica.
 *
 * AS VISIBILIDADES SAEM DO ZOOM, NÃO DO TEMPO. É de propósito: o mesmo zoom
 * mostra a mesma coisa descendo e subindo, então a volta não precisa de uma
 * segunda tabela de tempos e não existe o degrau clássico de "apareceu num
 * instante e sumiu noutro". Trocar as durações não desalinha as camadas.
 *
 * A RÉGUA DE TODAS AS CONTAS DAQUI: o disco do globo mede `--globo` =
 * min(44vw, 100svh − 140px) (hero.css), que numa janela de 1440×900 dá 633 px,
 * e o disco inteiro mostra os 12.742 km do diâmetro da Terra quando a escala é
 * 1. Então, numa escala Z:
 *
 *     largura visível (km) = 12.742 / Z          metros por pixel = 12.742.000 / (633·Z)
 *
 * (A forma exata é 2·asin(1/Z)·6.371 km — a mesma `vista()` de `voo.ts`. Acima
 * de Z ≈ 20 as duas diferem menos de 0,05%, e todas as contas daqui vivem
 * acima disso.)
 */

import { baseVector, centraliza } from "./globeMath";
import { SP_MAPA } from "./spMapa";
import { POUSO_MS, suave, ZOOM_DETALHE } from "./voo";

/* ------------------------------------------------------------------ fases */

export type FaseSP = "pouso" | "mergulha" | "contempla" | "sobe" | "fim";

export type EstadoSP = {
  /** Em que trecho da parada estamos. */
  readonly fase: FaseSP;
  /** Progresso DENTRO da fase, em [0, 1]. */
  readonly t: number;
  /** A escala de tela da câmera — a mesma unidade do `zoom` de `voo.ts`. */
  readonly zoom: number;
  /**
   * A obliquidade da vista, em RADIANOS e sempre ≥ 0 (0 = de cima a pino).
   *
   * O SINAL É DE QUEM INTEGRA: no laço do `HeroGlobe3D` a esfera gira em
   * `rotation = (pitch, yaw, 0)` na ordem XYZ, e aí `rotation.x = pitch −
   * inclinacao` é a vista "a partir do SUL" (as fachadas sul ficam de frente, o
   * norte do mapa afunda para o topo da tela) e `pitch + inclinacao` é a vista
   * a partir do norte. A cena foi feita para o SUL, que é o pedido, mas a marca
   * da torre está nas DUAS fachadas justamente para o erro de sinal não custar
   * a cena inteira.
   */
  readonly inclinacao: number;
  /** O balanço lento de guinada, em radianos, para somar à guinada da câmera. */
  readonly orbita: number;
  /** 1 = os pontos de terra do globo visíveis; 0 = apagados. */
  readonly pontos: number;
  /** 0 = sem o chão de São Paulo; 1 = o mapa noturno opaco. */
  readonly mapa: number;
  /** 0 = prédios rentes ao chão; 1 = na altura real. */
  readonly predios: number;
  /** 0 = marca apagada na torre; 1 = acesa. */
  readonly logo: number;
};

/* ------------------------------------------------------- os dois patamares */

/**
 * O ZOOM DA CIDADE — São Paulo inteira dentro do disco.
 *
 *   o disco mostra 12.742 km em Z = 1; a mancha urbana da textura mede 22 km
 *   (2048 px × 10,742 m/px, `SP_MAPA`); para ela ocupar 70% do disco:
 *
 *     Zc = 12.742 / (22 / 0,70) = 12.742 · 0,70 / 22 = 405,4   →   405
 *
 * Em 405 o disco mostra 31,5 km a 49,7 m/px: a cidade com um dedo de borda em
 * volta, e a textura (10,74 m por texel) ainda sobrando resolução — é o quadro
 * de "imagem de satélite" do pedido. Os 30 m de um prédio comum, aqui, medem
 * 0,6 px: nenhum prédio se lê neste patamar, e é por isso que ele NÃO é o fim
 * do mergulho, e sim o meio dele.
 */
export const ZOOM_CIDADE = 405;

/**
 * O ZOOM DA TORRE — o fim do mergulho, onde o pedido do prédio acontece.
 *
 * A CONTA QUE OBRIGOU ESTE SEGUNDO PATAMAR. No zoom da cidade o disco tem
 * 49,7 m/px; a torre de 240 m, vista a 32° de obliquidade, projeta
 * 240·sen 32° = 127 m na vertical, ou seja 2,6 px — e a fachada de 58 m mede
 * 1,2 px. Com o pedido do dono sendo "um prédio em destaque com a logo do wone
 * no prédio", parar em 405 seria entregar a cidade e não entregar o prédio.
 *
 *   Z = 14.000  →  disco de 0,910 km a 1,44 m/px
 *                  torre: 88 px de altura, 40 px de fachada
 *                  marca no topo: 32 px — reconhecível
 *                  prédios reais: a mediana (10,7 m) com 4 px, o percentil 95
 *                  (65 m) com 24 px, o mais alto do OSM (105,8 m) com 39 px
 *
 * O PREÇO, declarado: a textura do chão tem 10,74 m por texel, então aqui ela
 * aparece ampliada 7,5×. Num mapa NOTURNO de filamentos de luz a ampliação lê
 * como brilho de rua espalhado, não como borrão de foto — e, a 0,9 km de
 * largura, dois terços do quadro são telhado e parede, não chão. Mesmo assim o
 * `SaoPauloCena` escurece o chão no fundo do mergulho (veja `CHAO_NO_FUNDO`).
 */
export const ZOOM_TORRE = 9200;

/* --------------------------------------------------------------------------
   POR QUE 9.200 E NÃO 14.000 (pedido do dono, 17/10)

   "Melhore a aparência da cidade (...) melhore a qualidade em pixels, faça um
   belo trabalho cinematográfico."

   O que limita a nitidez do fundo do mergulho não é o canvas: é a TEXTURA do
   chão, que tem 10,74 m por texel e é fixa. Em 14.000 o disco mostrava 0,91 km
   em 1,44 m/px, ou seja o mapa aparecia ampliado 7,5× — cada texel virava um
   quadrado de 7,5 px, e nenhum ajuste de filtro conserta isso. Em 9.200 o disco
   mostra 1,385 km a 2,19 m/px e a ampliação cai para 4,9×: um terço a menos de
   borrão, no mesmo lugar da cena.

   O QUE SE PERDE, declarado: a torre passa de 88 para 58 px de altura e a marca
   na fachada de 32 para 21 px — e 21 px é exatamente o número que a nota do
   `LIMIAR.logo` já apontava como o ponto em que "os dois anéis do símbolo se
   separam". O prédio continua sendo o prédio, e o que estava borrado embaixo
   dele melhora em um terço.

   O que compensa a perda de tamanho é o BLOOM da etapa 5, que passou a pegar a
   cidade: as vias e as janelas acesas sangram luz, e um quadro noturno com
   brilho se lê como "mais resolvido" mesmo com o mesmo número de pixels. É o
   truque de todo mapa noturno bonito, e é o que a referência que o dono
   aprovou (`sp-noite.webp`) faz com as Marginais.
   -------------------------------------------------------------------------- */

/* ------------------------------------------------------------ as durações */

/**
 * O POUSO. Igual ao das outras seis cidades (`POUSO_MS` de `voo.ts`): é o
 * tempo em que o rótulo abre e o pino pulsa. São Paulo não ganha nada aqui — o
 * que a faz "a mais longa" é tudo o que vem DEPOIS dele.
 */
export const POUSO_SP_MS = POUSO_MS;

/**
 * O MERGULHO: de `ZOOM_DETALHE` (1,35) até `ZOOM_CIDADE` (405).
 *
 * São ln(405 / 1,35) = 5,70 nats de escala em 3,4 s — 1,68 nat/s, dentro da
 * faixa em que um voo do Google Earth se lê como descida e não como corte.
 */
export const MERGULHA_MS = 3400;

/**
 * A CONTEMPLAÇÃO: o resto da descida (405 → 14.000) MAIS a demora em cima da
 * torre.
 *
 * Aqui há um desvio do roteiro, e ele é medido: o roteiro pedia esta fase
 * PARADA no zoom da cidade, e nenhum prédio se lê a 49,7 m/px (veja
 * `ZOOM_TORRE`). Então a fase virou duas: os primeiros `CONTEMPLA_APROXIMA`
 * aproximam de 405 a 14.000 — 3,54 nats em 2,09 s, 1,70 nat/s, metade da
 * velocidade da descida anterior, que é o que dá o "chegando" — enquanto a
 * obliquidade sobe de 0 a 32° e os prédios crescem; o resto é a demora de
 * verdade, 1,5 s de câmera firme com a órbita correndo e a marca acesa.
 */
export const CONTEMPLA_MS = 3600;

/** A fração da contemplação gasta descendo; o resto é a demora em cima. */
export const CONTEMPLA_APROXIMA = 0.58;

/**
 * A SUBIDA: de 14.000 de volta a 1,35, e a obliquidade de volta a 0.
 *
 * 9,24 nats em 2,4 s (3,85 nat/s) — a saída é MAIS RÁPIDA que a entrada, de
 * propósito: a descida é a promessa (e tem de ser saboreada), a subida é o
 * pagamento já feito, e segurar o espectador nela é o jeito mais fácil de a
 * cena passar de "extraordinária" a "longa". A curva é a mesma, espelhada.
 */
export const SOBE_MS = 2400;

/** A parada inteira: 11,2 s. A segunda mais longa do tour tem 1,8 s. */
export const DURACAO_SP_MS = POUSO_SP_MS + MERGULHA_MS + CONTEMPLA_MS + SOBE_MS;

const FIM_POUSO = POUSO_SP_MS;
const FIM_MERGULHA = FIM_POUSO + MERGULHA_MS;
const FIM_CONTEMPLA = FIM_MERGULHA + CONTEMPLA_MS;

/* ------------------------------------------------- obliquidade e órbita */

const RAD = Math.PI / 180;

/**
 * A OBLIQUIDADE MÁXIMA — 32°.
 *
 * Abaixo de ~25° os prédios ainda são manchas e o quadro continua sendo uma
 * planta; acima de ~40° a esfera entrega o limbo no topo do quadro (a cidade
 * está a −23,5° de latitude, e o globo inteiro gira junto) e o chão de 22 km
 * passa a cobrir menos da metade da altura útil. 32° deixa 53% da altura de um
 * prédio na vertical da tela (sen 32°) e 85% do chão (cos 32°).
 */
export const INCLINACAO_MAX = 32 * RAD;

/**
 * A ÓRBITA — ±5° de guinada, um ciclo inteiro ao longo da contemplação.
 *
 * É o que faz a cidade parecer SÓLIDA: com a câmera cravada, prédios extrudados
 * viram um padrão impresso no chão; bastam 5° de deslocamento para as paredes
 * trocarem de lado e o olho ler volume. Mais do que isso e as fachadas da torre
 * passam a entrar e sair de vista no meio da leitura da marca.
 */
export const ORBITA_MAX = 5 * RAD;

/* ------------------------------------------------------- as visibilidades */

/**
 * OS LIMIARES, em escala de tela. Cada par é [apaga, acende] — a camada
 * interpola com smoothstep entre os dois, nos dois sentidos.
 */
export const LIMIAR = {
  /**
   * OS PONTOS DE TERRA somem cedo: eles são uma espiral de Fibonacci de ~1,4°
   * de passo (`globeMath`), ou seja 156 km entre vizinhos. Em Z = 6 esse passo
   * já mede 46 px na tela e o olho lê a GRADE em vez de ler terra; em 14 são
   * 108 px — meia dúzia de pontos soltos no disco, que é constelação e não
   * planeta. É nessa faixa que eles têm de dar lugar ao chão de verdade.
   */
  pontos: [6, 14],
  /**
   * O CHÃO entra logo depois, e bem antes de a cidade encher o disco: em Z = 18
   * os 22 km da textura medem 20 px (um selo no meio do oceano de pontos), em
   * 40 medem 44 px. A troca acontece nessa faixa justamente porque é onde o
   * mapa ainda é pequeno demais para mostrar que está borrado e já é grande
   * demais para ser confundido com um pino.
   */
  mapa: [18, 40],
  /**
   * OS PRÉDIOS sobem no meio da aproximação. Em Z = 1.600 o disco tem
   * 12,6 m/px e o percentil 95 dos prédios (65 m, já com o encurtamento de 32°
   * da vista oblíqua) mede 2,7 px — o suficiente para o relevo começar a
   * aparecer sem virar serrilha; em 5.000 (4,0 m/px) esse mesmo prédio tem
   * 8,6 px e a cidade já é tridimensional. Eles sobem em ALTURA (a escala no
   * eixo "para cima" do grupo), não em opacidade: nascem do chão.
   */
  predios: [1600, 5000],
  /**
   * A MARCA é a última coisa a acender, e só no fim: em Z = 5.000 a placa de
   * 46 m mede 11 px (a marca ainda seria um borrão laranja); em 9.000 mede
   * 21 px e os dois anéis do símbolo se separam; no fundo do mergulho, 32 px.
   * Acesa a 87% da aproximação, ela fica inteira pelos ~2 s da demora.
   */
  logo: [5000, 9000],
} as const;

function entre(x: number, a: number, b: number) {
  return suave((x - a) / (b - a));
}

/**
 * As quatro visibilidades para uma escala qualquer — exportada à parte porque
 * ela, e não o relógio, é o contrato: quem integra pode chamá-la com o zoom que
 * tiver na mão (inclusive fora do mergulho) e receber um estado coerente.
 */
export function visibilidades(zoom: number) {
  return {
    pontos: 1 - entre(zoom, LIMIAR.pontos[0], LIMIAR.pontos[1]),
    mapa: entre(zoom, LIMIAR.mapa[0], LIMIAR.mapa[1]),
    predios: entre(zoom, LIMIAR.predios[0], LIMIAR.predios[1]),
    logo: entre(zoom, LIMIAR.logo[0], LIMIAR.logo[1]),
  };
}

/* ----------------------------------------------------------- a escala */

const LN_DETALHE = Math.log(ZOOM_DETALHE);
const LN_CIDADE = Math.log(ZOOM_CIDADE);
const LN_TORRE = Math.log(ZOOM_TORRE);

/**
 * A interpolação do LOGARITMO da escala, que é a assinatura do mergulho de
 * mapa: o que o olho lê como velocidade não é a escala, é a razão entre duas
 * escalas vizinhas. Em escala linear os primeiros 10% do caminho comeriam 97%
 * do movimento aparente e o resto seria uma reta parada. Em logaritmo, cada
 * segundo dobra o tamanho do mundo o mesmo tanto que o anterior — é a mesma
 * ideia que a curva de van Wijk de `voo.ts` resolve para as pernas do voo.
 */
function escalaLog(a: number, b: number, s: number) {
  return Math.exp(a + (b - a) * s);
}

/** Onde, dentro do mergulho, a cidade inteira enche o disco. */
export const FRACAO_CIDADE = (LN_CIDADE - LN_DETALHE) / (LN_TORRE - LN_DETALHE);

/* ------------------------------------------------------------- o estado */

/** `ms` desde o instante em que a bolinha pousou em São Paulo. */
export function mergulhoSP(ms: number): EstadoSP {
  // POUSO — a cidade ainda é um pino no globo, como nas outras seis.
  if (ms < FIM_POUSO) {
    return monta("pouso", ms / POUSO_SP_MS, ZOOM_DETALHE, 0, 0);
  }

  // MERGULHA — 1,35 → 405. Os pontos apagam e o chão entra no caminho.
  if (ms < FIM_MERGULHA) {
    const t = (ms - FIM_POUSO) / MERGULHA_MS;
    return monta("mergulha", t, escalaLog(LN_DETALHE, LN_CIDADE, suave(t)), 0, 0);
  }

  // CONTEMPLA — 405 → 14.000 na primeira parte, firme na segunda.
  if (ms < FIM_CONTEMPLA) {
    const t = (ms - FIM_MERGULHA) / CONTEMPLA_MS;
    const desce = suave(Math.min(1, t / CONTEMPLA_APROXIMA));
    /* A órbita é UM ciclo de seno ao longo da fase inteira (começa e acaba em
       zero, sem degrau de guinada na emenda com a subida), com um envelope que
       tira a ponta de velocidade dos 15% iniciais e finais. */
    const envelope = suave(Math.min(1, t / 0.15)) * suave(Math.min(1, (1 - t) / 0.15));
    return monta(
      "contempla",
      t,
      escalaLog(LN_CIDADE, LN_TORRE, desce),
      INCLINACAO_MAX * desce,
      ORBITA_MAX * Math.sin(2 * Math.PI * t) * envelope,
    );
  }

  // SOBE — a mesma curva ao contrário, do fundo até 1,35.
  if (ms < DURACAO_SP_MS) {
    const t = (ms - FIM_CONTEMPLA) / SOBE_MS;
    const volta = suave(t);
    /* A obliquidade some ANTES da escala (em 70% da fase): endireitar primeiro
       e afastar depois é o que dá a leitura de "levantar voo"; afastar com a
       cidade ainda tombada mostraria o limbo da esfera entrando pelo topo. */
    const endireita = suave(Math.min(1, t / 0.7));
    return monta(
      "sobe",
      t,
      escalaLog(LN_TORRE, LN_DETALHE, volta),
      INCLINACAO_MAX * (1 - endireita),
      0,
    );
  }

  // FIM — devolve exatamente o estado de pouso das outras cidades, para o laço
  // do voo poder seguir daqui sem um quadro de diferença.
  return monta("fim", 1, ZOOM_DETALHE, 0, 0);
}

function monta(
  fase: FaseSP,
  t: number,
  zoom: number,
  inclinacao: number,
  orbita: number,
): EstadoSP {
  return { fase, t, zoom, inclinacao, orbita, ...visibilidades(zoom) };
}

/* --------------------------------------------------------------------------
   O ENQUADRE — por que inclinar não é só girar

   Esta é a parte que o roteiro não previa, e ela é OBRIGATÓRIA: sem ela a cena
   fica PRETA no fundo do mergulho, que foi o primeiro resultado medido no
   laboratório.

   O grupo da esfera gira em torno do CENTRO DA TERRA. Tombá-lo 32° não inclina
   a vista sobre São Paulo: leva São Paulo 32° de arco para longe do meio do
   disco, ou seja 3.376 km. Em zoom 1,35 isso é meia tela e passa por
   movimento de câmera; em zoom 14.000, onde o disco inteiro mostra 910 m, a
   cidade sai de quadro por quatro mil larguras de tela. O mesmo vale para os
   5° de órbita: 556 km de deslocamento.

   O conserto é uma TRANSLAÇÃO do grupo que devolve o alvo ao centro. Com a
   câmera ortográfica em +Z, um ponto `p` aparece em (p.x, p.y) na tela, então
   basta pôr o grupo em (−p.x, −p.y) depois de girado. O resultado é uma órbita
   em volta da TORRE, que é o que o olho espera de um sobrevoo, e não um giro
   do planeta com a cidade presa na borda.

   O ALVO É A TORRE, não o centro do mapa: são 45 m entre os dois, que valem
   1 px no zoom da cidade e 31 px no zoom da torre — ou seja, escolher o centro
   do mapa deixaria o prédio da marca fora do meio justamente no quadro em que
   ele é o assunto.
   -------------------------------------------------------------------------- */

const ALVO = baseVector(SP_MAPA.torre.lat, SP_MAPA.torre.lon);
const ALVO_BASE = centraliza(SP_MAPA.torre.lat, SP_MAPA.torre.lon);

export type Enquadre = {
  /** `rotation.x` do grupo da esfera, em radianos. */
  readonly pitch: number;
  /** `rotation.y` do grupo da esfera, em radianos. */
  readonly yaw: number;
  /** `position.x` do grupo, em unidades de esfera (raio 1). */
  readonly x: number;
  /** `position.y` do grupo. */
  readonly y: number;
};

/**
 * Os quatro números que põem a cena no lugar, a partir de um estado do
 * mergulho. Uso, no laço de quem desenha:
 *
 *   const e = mergulhoSP(ms);
 *   const q = enquadraSP(e);
 *   grupo.rotation.set(q.pitch, q.yaw, 0);   // ordem XYZ, como já é
 *   grupo.position.set(q.x, q.y, 0);
 *   camera.zoom = e.zoom; camera.updateProjectionMatrix();
 *
 * Com `inclinacao = 0` e `orbita = 0` ela devolve exatamente o que
 * `centraliza()` já devolvia, e `x = y = 0`: fora do mergulho nada muda.
 */
export function enquadraSP(e: {
  inclinacao: number;
  orbita: number;
}): Enquadre {
  const pitch = ALVO_BASE.pitch - e.inclinacao;
  const yaw = ALVO_BASE.yaw + e.orbita;
  const [x, y, z] = ALVO;

  // Ry(yaw) e depois Rx(pitch) — a ordem XYZ do three com z = 0.
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = cy * x + sy * z;
  const z1 = -sy * x + cy * z;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = cp * y - sp * z1;

  return { pitch, yaw, x: -x1, y: -y2 };
}
