/**
 * O MODELO DE VOO do globo do hero — a câmera que ACOMPANHA a bolinha.
 *
 * Pedido do dono, 17/10: "o globo tem a câmera desacoplada da bolinha que
 * viaja entre as cidades (...) quero uma câmera que ACOMPANHA a bolinha, tipo
 * 'voo' do Google Earth". Antes disto havia TRÊS relógios independentes sobre
 * DOIS caminhos diferentes — a bolinha corria uma perna do anel geográfico da
 * rede, a câmera fazia um pan próprio 300 ms DEPOIS e com outra curva de
 * tempo, e um `setInterval` de 3 s trocava o país por cima dos dois. Em 3 das 7
 * trocas a bolinha corria para um país que não era o próximo da fila — cinco
 * delas, contadas uma a uma —, e era daí que vinham os "cortes" que o dono viu.
 *
 * Aqui há UM caminho e UM relógio. A posição da bolinha e o centro da câmera
 * saem da MESMA interpolação de grande círculo, e o zoom sai da distância
 * dessa mesma perna. Não há como eles discordarem: é a mesma conta lida duas
 * vezes.
 *
 * ESTE ARQUIVO É PURO — sem DOM, sem canvas, sem React, sem a projeção do
 * globo 2D. Ele fala em latitude, longitude, radianos e milissegundos, e
 * devolve o ESTADO do voo; quem desenha decide como isso vira pixel. É o que o
 * dono vai reaproveitar quando o globo virar 3D: a câmera de lá lê o mesmo
 * `camera`/`zoom` e a bolinha a mesma `bola`.
 *
 * O CICLO, por cidade:  POUSO (1.800 ms, parado) → VOO (duração pela
 * distância) → e o fim do voo É o pouso na cidade seguinte. Quem avança a fila
 * é o fim do voo, nunca um relógio de fora: a perna de São Paulo a Londres não
 * cabe nos 3 s em que a de Bogotá a Quito sobra.
 */

const RAD = Math.PI / 180;

export type Ponto = { lat: number; lon: number };

/** `pouso` = parado na cidade; `voo` = a caminho da próxima. */
export type Fase = "pouso" | "voo";

export type Estado = {
  fase: Fase;
  /** Índice da cidade em que se pousou — a ORIGEM da perna em curso. */
  de: number;
  /** Índice da próxima cidade — o DESTINO da perna em curso. */
  para: number;
  /** 0 a 1 ao longo do grande círculo origem→destino (0 no pouso). */
  u: number;
  /** Onde a bolinha está. */
  bola: Ponto;
  /** O que a câmera centraliza — a MESMA curva, um passo atrás da bolinha. */
  camera: Ponto;
  /** A escala de tela. 1 = o enquadramento do servidor; 1,35 = detalhe. */
  zoom: number;
  /** Distância angular da perna, em radianos. */
  arco: number;
  /** Duração do voo desta perna, em ms. */
  duracao: number;
  /** Quanto dura o pouso NESTA cidade, em ms. */
  pouso: number;
  /**
   * Quanto tempo já se passou DENTRO do pouso, em ms — preso em `pouso` assim
   * que o voo começa.
   *
   * Existe desde 17/10 por causa do MERGULHO EM SÃO PAULO: `mergulhoSP(ms)`
   * quer exatamente este número, e deduzi-lo fora daqui significaria repetir a
   * conta de qual é a duração do pouso desta cidade — que é justamente o que
   * deixou de ser uma constante.
   */
  msPouso: number;
  /** Pouso + voo, em ms: é quando a cidade da vez troca. */
  ciclo: number;
  /** Quanto falta para a troca, em ms. */
  restante: number;
};

/* --------------------------------------------------------------------------
   OS NÚMEROS, e o porquê de cada um
   -------------------------------------------------------------------------- */

/**
 * O POUSO, em ms. É o pedido, ao pé da letra: "ao pousar (...) a câmera fica
 * parada ~1,8s e então parte para a próxima". 1,8 s é o tempo de o pulso do
 * pino abrir (600 ms), o rótulo acender e alguém LER "São Paulo · PIX · R$
 * 197,00" — medido em leitura, três palavras e um número por segundo.
 */
export const POUSO_MS = 1800;

/**
 * A DURAÇÃO da perna: 1.200 ms de base mais 500 ms a cada 30° de arco, como o
 * pedido fixou. Nas sete pernas de hoje isso dá de 1.308 ms (Bogotá → Quito,
 * 6,6°) a 2.624 ms (Londres → São Paulo, 85,4°): uma volta inteira pelos sete
 * leva ~26,9 s (14,3 s de voo mais 12,6 s de pouso), contra os 21 s do relógio
 * fixo de 3 s que havia antes.
 *
 * A base não é zero porque uma perna curta ainda é uma VIAGEM: Bogotá e Quito
 * estão a 710 km, e atravessá-las em 100 ms seria um corte com outro nome.
 */
export const BASE_MS = 1200;
export const POR_30_MS = 500;

/**
 * O ZOOM DE DETALHE — a escala em que a câmera pousa. É A CONSTANTE DE
 * CALIBRAÇÃO desta peça: mexer nela muda o pouso E, por tabela, o quanto cada
 * perna abre (a curva de van Wijk é relativa a ela).
 *
 * ERA 1,8× — o teto da nuvem, herdado do mergulho de ontem, que acontecia a
 * cada três países. Quando ele passou a acontecer em TODA chegada, o dono viu o
 * que isso virou e pediu, em 17/10: "diminua o zoom nas transações onde o ponto
 * passa (nos países)". A 1,8× o disco mostrava ±34° de arco em volta da capital
 * — o país e pouco mais —, e o planeta deixava de se ler como planeta.
 *
 * 1,35× mostra ±48° de arco: São Paulo pousa com a América do Sul inteira
 * dentro do disco, Lisboa com a Europa ocidental e o norte da África, a Cidade
 * do México com o golfo e o Caribe. É o "bom pedaço do continente além do país"
 * que o pedido pede, e continua sendo zoom de verdade — a capital tem 1,35 vez
 * o tamanho que teria no enquadramento do servidor.
 *
 * O teto da NUVEM continua valendo como limite superior para quem for
 * recalibrar: os 5.102 pontos do planeta têm passo médio de ~1,4° de arco, e a
 * partir de ~2× o olho lê a espiral de Fibonacci em vez de terra firme.
 */
export const ZOOM_DETALHE = 1.35;

/**
 * O ATRASO DA CÂMERA, em fração da perna: ela fica 4% do caminho ATRÁS da
 * bolinha, nunca à frente.
 *
 * É o que dá a leitura de perseguição em vez de carregamento — com atraso zero
 * a bolinha fica cravada no pixel central e parece presa à lente, não viajando.
 * 4% é pequeno de propósito: na perna mais longa (85°) são 3,4° de arco, que no
 * zoom mínimo dessa perna (1,11×) deslocam a bolinha 6% do raio do disco. Ela
 * continua no miolo da vigia — a regra "a bolinha nunca sai da área visível" é
 * verdadeira por CONSTRUÇÃO, e não por limite.
 */
export const ATRASO = 0.04;

/**
 * As duas pontas do atraso, em fração da perna: ele ABRE nos primeiros 8% e
 * FECHA nos últimos 14%.
 *
 * Sem isto a câmera chegaria 4% antes do destino e a cidade não ficaria
 * centralizada no pouso — que é justamente o que a CHEGADA promete. A janela
 * resolve nas duas pontas: o voo parte da cidade exatamente centralizada,
 * ganha o atraso, viaja com ele constante, e o devolve antes de pousar. A saída
 * é mais longa que a entrada (14% contra 8%) porque desacelerar com a bolinha
 * ainda fora do centro é o que se lê como "freando para pousar".
 *
 * As duas derivadas de `uCam` ficam positivas (1 − 0,04/0,08 = 0,5 na entrada,
 * 1 + 0,04/0,14 = 1,29 na saída): a câmera nunca anda para trás.
 */
const JANELA_ENTRA = 0.08;
const JANELA_SAI = 0.14;

/**
 * ρ da curva de van Wijk. √2 é o valor que o próprio artigo ("Smooth and
 * efficient zooming and panning", van Wijk & Nuij, 2003) encontra como ótimo
 * para o olho, e é o que o `d3.interpolateZoom` usa por padrão. Mexer nele
 * muda o quanto a curva prefere SUBIR a VIAJAR: abaixo de √2 ela viaja mais
 * rasante, acima ela sobe mais alto. Não há motivo para divergir do d3 aqui —
 * o pedido cita essa curva como referência de comportamento.
 */
export const RHO = Math.SQRT2;

/* --------------------------------------------------------------------------
   GEOMETRIA DA ESFERA — na base GEOGRÁFICA, não na da projeção

   De propósito: o grande círculo entre duas cidades é o mesmo em qualquer
   base, e escrevê-lo em lat/lon é o que mantém este arquivo independente da
   projeção ortográfica do globo 2D. Quem for desenhar converte.
   -------------------------------------------------------------------------- */

function unitario(p: Ponto): [number, number, number] {
  const phi = p.lat * RAD;
  const lam = p.lon * RAD;
  const c = Math.cos(phi);
  return [c * Math.cos(lam), c * Math.sin(lam), Math.sin(phi)];
}

function coordenada(x: number, y: number, z: number): Ponto {
  return {
    lat: Math.asin(z < -1 ? -1 : z > 1 ? 1 : z) / RAD,
    lon: Math.atan2(y, x) / RAD,
  };
}

/** Distância angular entre dois pontos, em radianos. */
export function distancia(a: Ponto, b: Ponto) {
  const A = unitario(a);
  const B = unitario(b);
  const d = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
  return Math.acos(d < -1 ? -1 : d > 1 ? 1 : d);
}

/**
 * Interpolação de GRANDE CÍRCULO (slerp) entre dois pontos — a mesma conta que
 * as pernas da rede do globo já faziam, e é de propósito que seja a mesma: o
 * caminho que a bolinha percorre é o arco que o desenho mostra, e dois jeitos
 * de calcular o mesmo arco seriam dois lugares para divergir.
 */
export function interpola(a: Ponto, b: Ponto, t: number): Ponto {
  const A = unitario(a);
  const B = unitario(b);
  const d = Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const w = Math.acos(d);
  const s = Math.sin(w);
  /* Pontos coincidentes (ou antípodas) caem na interpolação linear: o arco não
     tem direção definida, e o limite do slerp é a reta. */
  const wa = s < 1e-6 ? 1 - t : Math.sin((1 - t) * w) / s;
  const wb = s < 1e-6 ? t : Math.sin(t * w) / s;
  return coordenada(
    A[0] * wa + B[0] * wb,
    A[1] * wa + B[1] * wb,
    A[2] * wa + B[2] * wb,
  );
}

/* --------------------------------------------------------------------------
   ZOOM: A ESCALA DE TELA E A LARGURA DA VISTA, UM SÓ FATO EM DUAS UNIDADES

   A curva de van Wijk não trabalha em escala, trabalha em LARGURA DE VISTA —
   quanto de mundo cabe na tela. As duas são a mesma coisa invertida, e aqui a
   conversão é exata porque a projeção é ortográfica: com o disco do globo
   cobrindo o raio R da vigia e uma escala Z, o que sobra dentro da vigia é o
   pedaço de esfera de raio projetado 1/Z — ou seja um raio angular de
   asin(1/Z). A vista é o dobro disso.

   Em Z = 1 a vista é π (os 180° da face visível, o enquadramento do servidor);
   em Z = 1,35 são 1,668 rad (95,6°), que é o "zoom de detalhe da cidade" desde
   o pedido de 17/10 — ±48° de arco em volta da capital, ou seja o país e um bom
   pedaço do continente em volta dele.
   -------------------------------------------------------------------------- */

/** Largura angular da vista, em radianos, para uma escala de tela. */
export function vista(escala: number) {
  return 2 * Math.asin(Math.min(1, 1 / escala));
}

/**
 * O inverso: a escala que cabe numa largura de vista. PRESA EM 1 — abaixo
 * disso o planeta encolheria DENTRO da vigia e apareceria um anel vazio entre
 * a terra e a borda do disco, que é o único lugar onde o hero não admite
 * pixel: o oceano e a atmosfera são CSS pintados pelo servidor, e não encolhem
 * junto. Nas sete pernas de hoje o teto nunca é atingido (a vista máxima é
 * 2,24 rad, de Londres a São Paulo, contra os 3,14 do limite); com o pouso mais
 * afastado ele deixou de ser teoria: uma perna de ~110° já encostaria no
 * planeta inteiro, que é o que o dono pediu para as viagens longas.
 */
export function escalaDe(largura: number) {
  if (largura >= Math.PI) return 1;
  return 1 / Math.sin(largura / 2);
}

/** A largura da vista no zoom de detalhe — o w₀ = w₁ das pernas. */
export const VISTA_DETALHE = vista(ZOOM_DETALHE);

/**
 * A CURVA DE ZOOM DE VAN WIJK — as equações do `d3.interpolateZoom`, escritas
 * aqui em UMA dimensão (a largura da vista), porque a outra — para onde a
 * câmera vai — já é resolvida pelo grande círculo.
 *
 * Por que ela e não uma rampa qualquer: van Wijk escolhe a trajetória de zoom
 * que minimiza o esforço percebido, e o resultado tem a forma que o dono
 * descreveu sem nomear — "ao sair da cidade o zoom abre; no meio do trajeto
 * fica no mínimo; ao chegar, fecha de volta". A conta é hiperbólica e não
 * cosmética: `w(t) = w₀·cosh(r₀) / cosh(ρ·s + r₀)`.
 *
 * COM AS DUAS PONTAS IGUAIS (w₀ = w₁ = w, o caso das pernas entre cidades) a
 * conta fecha numa forma que vale a pena saber de cor: o pico é
 * `w_max = √(w² + d²)`. A hipotenusa da largura de detalhe com a distância
 * percorrida — e é ela que cumpre o pedido inteiro sem nenhum número de ajuste:
 *   · Quito → Bogotá (6,5°, d = 0,11): w_max = 1,184 contra w = 1,178 — o zoom
 *     sai de 1,800× para 1,792×. "Quase não abre";
 *   · São Paulo → Londres (85,4°, d = 1,49): w_max = 1,90 rad = 109°, zoom
 *     mínimo 1,23× — e os dois pontos, a 85° um do outro, CABEM na vista.
 * Nenhum `if` entre perna curta e perna longa: é a mesma curva.
 *
 * COM AS PONTAS DIFERENTES (o mergulho de entrada, de 1× a 1,8×) a conta geral
 * decide sozinha se vale abrir antes de fechar — e para a entrada ela não abre:
 * a vista cai monotonicamente de π a 1,178, que é o que se espera de um
 * mergulho.
 *
 * O ramo degenerado (distância ~zero) é o do próprio d3: interpola-se o
 * LOGARITMO da largura, que é a exponencial `w₀·(w₁/w₀)^t`.
 */
export function vanWijk(w0: number, w1: number, d: number, t: number) {
  if (d < 1e-6) return w0 * Math.pow(w1 / w0, t);

  const rho2 = RHO * RHO;
  const rho4 = rho2 * rho2;
  const d2 = d * d;
  const w02 = w0 * w0;
  const w12 = w1 * w1;

  const b0 = (w12 - w02 + rho4 * d2) / (2 * w0 * rho2 * d);
  const b1 = (w12 - w02 - rho4 * d2) / (2 * w1 * rho2 * d);
  /* `log(√(b²+1) − b)` é `−asinh(b)`, escrito como no d3 para quem comparar
     lado a lado reconhecer a fórmula do artigo. */
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / RHO;

  return (w0 * Math.cosh(r0)) / Math.cosh(RHO * t * S + r0);
}

/**
 * O EASING, sobre o parâmetro de TEMPO e não sobre o espaço: o van Wijk já
 * cuida da velocidade aparente ao longo do caminho, e torcer o espaço por cima
 * dele seria desfazer o que ele resolve. O smoothstep é o mesmo da casa
 * (`t²(3−2t)`), e o que importa nele são as pontas: derivada ZERO nas duas, ou
 * seja a bolinha parte do repouso e chega ao repouso. É isto que faz o fim do
 * voo encostar no pouso sem um degrau de velocidade.
 */
export function suave(t: number) {
  const p = t < 0 ? 0 : t > 1 ? 1 : t;
  return p * p * (3 - 2 * p);
}

/** A duração do voo de uma perna, em ms, pela distância angular. */
export function duracaoDe(arco: number) {
  return BASE_MS + (POR_30_MS * arco) / (30 * RAD);
}

/** O atraso da câmera em `u`, já com as janelas das duas pontas. */
function atrasoEm(u: number, atraso: number) {
  const janela = Math.min(1, u / JANELA_ENTRA, (1 - u) / JANELA_SAI);
  return atraso * (janela < 0 ? 0 : janela);
}

/**
 * UMA PERNA, do estado cru: onde está a bolinha, o que a câmera centraliza e
 * qual a escala, em `t` (0 a 1, tempo cru — o easing é aplicado aqui dentro).
 *
 * É a peça que `voo()` e `mergulho()` compartilham, e é por isso que a entrada
 * do hero e as sete pernas do laço não podem ter comportamentos diferentes:
 * são a mesma função com outras pontas de largura.
 */
export function perna(
  de: Ponto,
  para: Ponto,
  w0: number,
  w1: number,
  t: number,
  atraso = ATRASO,
) {
  const arco = distancia(de, para);
  const u = suave(t);
  const uCam = u - atrasoEm(u, atraso);
  return {
    u,
    arco,
    bola: interpola(de, para, u),
    camera: interpola(de, para, uCam),
    zoom: escalaDe(vanWijk(w0, w1, arco, u)),
  };
}

/**
 * O ESTADO DO VOO: dada a lista ordenada de cidades, o índice da cidade em que
 * se pousou e o tempo decorrido desde esse pouso, devolve tudo o que o desenho
 * precisa saber.
 *
 * A ORDEM DA LISTA É A LEI, e ela não é a geográfica: é `hero.stage.cities`
 * (que é `payments.table.countries`) — São Paulo, Cidade do México, Buenos
 * Aires, Bogotá, Quito, Lisboa, Londres, e de volta a São Paulo. O anel
 * desenhado no globo (`REDE_PERNAS`, no `HeroGlobe`) é OUTRA coisa — decoração
 * geográfica — e a bolinha deixou de usá-lo justamente porque ele discordava da
 * fila em cinco das sete trocas.
 *
 * `ms` é um ACUMULADOR de quadros, não o relógio de parede: os freios do hero
 * (aba oculta, hero fora da tela, movimento reduzido) param de somar, e ao
 * voltar o voo retoma de onde estava em vez de aparecer três cidades adiante.
 */
export function voo(
  cidades: Ponto[],
  indice: number,
  ms: number,
  /**
   * Quanto dura o POUSO nesta cidade. Padrão: `POUSO_MS`, os 1,8 s de seis das
   * sete paradas.
   *
   * É PARÂMETRO, e não uma tabela aqui dentro, por uma razão de dependência:
   * quem sabe que São Paulo para por 11,2 s é `mergulhoSP.ts`, e ele já importa
   * deste arquivo (`POUSO_MS`, `suave`, `ZOOM_DETALHE`). Importar de volta fecharia um
   * ciclo entre os dois módulos — e, pior, faria este arquivo, que é PURO e
   * fala só de esferas e relógios, conhecer uma cidade específica. Quem integra
   * passa o número; o modelo continua sem saber de São Paulo.
   */
  pouso: number = POUSO_MS,
): Estado {
  const n = cidades.length;
  const de = ((indice % n) + n) % n;
  const para = (de + 1) % n;

  const arco = distancia(cidades[de], cidades[para]);
  const duracao = duracaoDe(arco);
  const ciclo = pouso + duracao;

  const pousado = ms < pouso;
  const t = pousado ? 0 : Math.min(1, (ms - pouso) / duracao);
  const q = perna(
    cidades[de],
    cidades[para],
    VISTA_DETALHE,
    VISTA_DETALHE,
    t,
  );

  return {
    fase: pousado ? "pouso" : "voo",
    de,
    para,
    u: q.u,
    bola: q.bola,
    camera: q.camera,
    zoom: q.zoom,
    arco,
    duracao,
    pouso,
    msPouso: pousado ? ms : pouso,
    ciclo,
    restante: Math.max(0, ciclo - ms),
  };
}

/**
 * O MERGULHO DE ENTRADA — a única vez em que o voo começa de um estado que não
 * é um pouso.
 *
 * O servidor pinta o globo INTEIRO a 1×, centrado na projeção, e o primeiro
 * quadro do laço tem de cair exatamente nele (regra dura do hero: o `<h1>` ao
 * lado é o LCP da página). Depois da rampa de entrada, a câmera mergulha daí
 * até o pouso na primeira cidade — mesma curva de van Wijk, mesmo grande
 * círculo, só com as pontas de largura diferentes: π (a face visível inteira) a
 * 1,178 (o detalhe).
 *
 * Sem atraso de câmera: não há bolinha viajando aqui, e um atraso sem bolinha é
 * só a câmera chegando torta.
 */
export function mergulho(de: Ponto, para: Ponto, ms: number, duracao: number) {
  const t = Math.min(1, ms / duracao);
  const q = perna(de, para, Math.PI, VISTA_DETALHE, t, 0);
  return { ...q, pronto: t >= 1 };
}
