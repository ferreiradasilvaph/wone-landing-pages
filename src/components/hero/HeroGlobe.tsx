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
  naEuropa,
  GLOBE_STEP,
  noise,
  RECUO,
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

   Oceano e atmosfera são CSS (`.globe-sea`, `.globe-air`): custam zero por
   quadro e, mais importante, estão pintados no HTML do servidor — o planeta
   existe antes de o JavaScript rodar, e os pontos apenas pousam nele. O canvas
   nasce vazio e transparente. Nenhum `opacity-0`, nenhuma entrada animada:
   regra dura do hero.

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

/** Raio angular, em radianos, do núcleo e da borda do tingimento (500/1.100 km). */
const NUCLEO = 500 / 6371;
const BORDA = 1100 / 6371;

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
  let t = p;
  for (let i = 0; i < 4; i += 1) {
    const u = 1 - t;
    const x = 3 * u * u * t * 0.2 + 3 * u * t * t * 0.2 + t * t * t;
    const dx = 3 * u * u * 0.2 + 3 * t * t * 0.8;
    if (dx < 1e-5) break;
    t -= (x - p) / dx;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  }
  const u = 1 - t;
  return 3 * u * u * t * 0.7 + 3 * u * t * t + t * t * t;
}

/**
 * Alfa e cor de cada balde: 6 níveis de terra (braseiro → laranja), 1 de costa
 * e 3 dos países em creme. São dez `fill` por quadro, não um por ponto.
 *
 * O laranja pede mais alfa que o creme pedia para a mesma presença: a 0,42 o
 * creme sobre o preto dá um cinza de luminância ~0,42, e o #FF7700 dá ~0,25 —
 * daí a rampa subir até 0,52 no ponto mais aceso. Os países sobem até 0,86
 * porque é deles que o olho precisa sair com a informação.
 */
const ALFA = [0.05, 0.14, 0.23, 0.32, 0.42, 0.52, 0.42, 0.26, 0.5, 0.86];
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
  const alfinetes = useRef<(HTMLSpanElement | null)[]>([]);
  const nuvem = useRef<Nuvem | null>(null);
  const geo = useRef<Geometria | null>(null);
  /** Ângulos do último quadro: o arco congela a posição do pino na ativação. */
  const angulo = useRef({ yaw: 0, pitch: 0 });
  const ativo = useRef(activeIndex);
  /** Instante em que o país da vez acendeu: é o relógio do flash da rede. */
  const acendeuEm = useRef(0);

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
   * Três modos, por largura. O balanço SÓ existe a partir de `xl`, e isso é
   * medida, não gosto: a 1024 o corredor entre a moldura do aparelho (791) e a
   * borda da janela (1014) tem 223px e o vão do pino do México ao de São Paulo,
   * a R 220, mede 181px — sobram 21px de cada lado, e a excursão de ±11° do
   * balanço mais o recuo vale ±33px. O México entraria ATRÁS do telefone e São
   * Paulo sairia da tela em parte do ciclo (medido no navegador, não deduzido).
   * Entre 1024 e 1279 o globo fica então PARADO na orientação de repouso — a
   * mesma que o servidor pintou —, e o que muda com o país é o tingimento, que
   * custa um quadro a cada 5 s. A 1280 o corredor passa de 400px e o balanço
   * cabe com 16px de folga no pior quadro.
   */
  const [modo, setModo] = useState<"celular" | "parado" | "laco">("parado");

  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const sync = () =>
      setModo(!lg.matches ? "celular" : xl.matches ? "laco" : "parado");
    sync();
    lg.addEventListener("change", sync);
    xl.addEventListener("change", sync);
    return () => {
      lg.removeEventListener("change", sync);
      xl.removeEventListener("change", sync);
    };
  }, []);

  /* O país da vez vai para um `ref`: o laço lê a cada quadro sem se refazer.
     O carimbo de hora vai junto, e é o relógio do flash da rede: a perna que
     chega a Lisboa ou a Londres acende em laranja cheio por 1 s a partir daqui. */
  useEffect(() => {
    ativo.current = activeIndex;
    acendeuEm.current = performance.now();
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

    function mede() {
      const lado = box!.clientWidth;
      const dpr = celular ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(lado * dpr);
      canvas!.height = Math.round(lado * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      geo.current = {
        lado,
        raio: lado / 2,
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

      const linha = (pontos: [number, number][], forte: boolean) => {
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
        ctx!.globalAlpha = (forte ? 0.09 : 0.06) * g.ganho;
        ctx!.strokeStyle = LARANJA;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      };

      for (let m = -2; m <= 3; m += 1) {
        const lon = -72 + m * 30;
        const pontos: [number, number][] = [];
        for (let s = 0; s <= 48; s += 1)
          pontos.push([-80 + (160 * s) / 48, lon]);
        linha(pontos, false);
      }
      for (const lat of [0, 30, -30]) {
        const pontos: [number, number][] = [];
        for (let s = 0; s <= 48; s += 1)
          pontos.push([lat, -72 - 90 + (180 * s) / 48]);
        linha(pontos, lat === 0);
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
    function malha(cy: number, sy: number, cp: number, sp: number) {
      const g = geo.current!;
      const R = g.raio;
      const pts = rede();
      const n = REDE_PASSOS + 1;

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
        ctx!.lineWidth = largura;
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
      const desde = performance.now() - acendeuEm.current;
      const flash =
        europeuAtivo && modo === "laco" && desde < FLASH_MS
          ? 1 - desde / FLASH_MS
          : 0;
      const naPerna = (perna: [string, string]) =>
        perna[0] === ativoCode || perna[1] === ativoCode;
      const tocaEuropa = (perna: [string, string]) =>
        EUROPEUS.has(perna[0]) || EUROPEUS.has(perna[1]);
      const acesa = (perna: [string, string]) =>
        flash > 0 && europeuAtivo && naPerna(perna);

      traca((perna) => !tocaEuropa(perna) && !acesa(perna), 0.14);
      traca((perna) => tocaEuropa(perna) && !acesa(perna), 0.3);
      if (flash > 0) traca(acesa, 0.3 + 0.7 * flash, 1.5);
    }

    function desenha(yaw: number, pitch: number) {
      const g = geo.current!;
      const R = g.raio;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

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

      ctx!.clearRect(0, 0, g.lado, g.lado);
      sob(() => grade(cy, sy, cp, sp));

      const atual = ativo.current;
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

        const t = dados.tingimento[i];
        let balde: number;
        if (t > 0.02) {
          /* Os quatro países: creme, e o da vez com meio passo a mais. */
          const s = t * (dados.pais[i] === atual ? 1.6 : 1);
          balde = 7 + (s >= 1.2 ? 2 : s >= 0.6 ? 1 : 0);
        } else {
          /* Queda do alfa até o limbo: é o que evita a linha dura na borda. */
          const u = z2 >= 0.18 ? 1 : z2 / 0.18;
          const alfa =
            (0.06 + 0.28 * lit + dados.ac[i]) * (u * u * (3 - 2 * u));
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
        /* Os países ganham 18% de raio além do alfa: é o que faz os quatro
           acesos ficarem legíveis contra uma terra que agora é toda laranja. */
        trab.r[n] =
          dados.rb[i] *
          (0.72 + 0.4 * lit) *
          (balde % BALDES >= 7 ? 1.18 : 1);
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
         então nada salta quando o laço assume. Composto, sem layout. */
      if (!celular) {
        for (let j = 0; j < g.repouso.length; j += 1) {
          const el = alfinetes.current[j];
          if (!el) continue;
          const [x, y, z] = alvo(lista[j]);
          const x1 = cy * x + sy * z;
          const z1 = -sy * x + cy * z;
          const y2 = cp * y - sp * z1;
          const z2 = sp * y + cp * z1;
          el.hidden = z2 < 0;
          const dx = R + x1 * R - g.repouso[j].x;
          const dy = R - y2 * R - g.repouso[j].y;
          el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        }
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
    let recYaw = angulo.current.yaw;
    let recPitch = angulo.current.pitch;

    const quadro = (t: number) => {
      raf = requestAnimationFrame(quadro);
      if (ultimo >= 0 && t - ultimo < PASSO_MS) return;
      const dt = ultimo < 0 ? 0 : Math.min(0.1, (t - ultimo) / 1000);
      ultimo = t;
      if (!t0) t0 = t;
      const seg = (t - t0) / 1000;

      /* Balanço: ±6° de guinada em 20 s e ±2,5° de inclinação em 33 s, os dois
         partindo de ZERO — é por isso que o primeiro quadro do laço cai
         exatamente sobre o que o servidor pintou. */
      const balancoYaw = 0.02618 * Math.sin((TAU * seg) / 20);
      const balancoPitch = 0.01309 * Math.sin(((TAU * seg) / 20) * 0.6);

      /* Recuo para o país ativo, perseguido (assenta em ~1,2 s). */
      const meta = RECUO[lista[ativo.current]] ?? { yaw: 0, pitch: 0 };
      const k = 1 - Math.exp(-dt / 0.28);
      recYaw += (meta.yaw - recYaw) * k;
      recPitch += (meta.pitch - recPitch) * k;

      const marca = performance.now();
      desenha(balancoYaw + recYaw, balancoPitch + recPitch);
      medidor(performance.now() - marca);
    };

    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      observador?.disconnect();
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
    const destino = alvoRef?.current?.getBoundingClientRect();
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
      {/* A CAIXA DO GLOBO: tamanho CRAVADO por breakpoint, sempre absoluta —
          CLS zero por construção, porque nada aqui participa do fluxo.
          Desde 15/10 ela mede a METADE ESQUERDA DA JANELA, e não um pedaço de
          coluna: o pai desta camada é a seção inteira, então `left` conta da
          borda da janela, e o disco sangra por ela. A conta de cada degrau tem
          duas pontas presas — a borda esquerda da coluna de texto (x 445 a
          1024, 552 a 1280, 632 a 1440) e o pino mais a oeste, a Cidade do
          México, que mora a 9,5% da caixa:
            · o limbo leste termina 74–88px DEPOIS do início do texto, que é o
              "levemente por cima" do pedido;
            · o pino do México sobra 23–32px dentro da tela, com folga para a
              excursão do balanço (±1,5°) e do recuo (±2,5°).
          Os degraus são `min-[]` arbitrários, e não `lg:`/`xl:`, porque o
          Tailwind emite os arbitrários ANTES dos nomeados: com `lg:left` e
          `min-[1400px]:left` na mesma classe, o `lg` venceria a 1440 (medido —
          o disco não saía do lugar). Em arbitrários, a ordem é a numérica.
          O corte de cima é 1400 e não 1440 porque quem o avalia é a LARGURA DE
          LAYOUT: numa janela de 1440 com barra de rolagem clássica sobram
          1430px, e um `min-[1440px]` nunca valeria na medida que o dono usa.
          No celular ela fica centrada no bloco de 420px que vem depois dos
          botões: lá não há pino nem rótulo (sete caixas de texto não cabem em
          370px de largura), e quem nomeia o país é a `StageStatus`. */}
      <div
        ref={caixa}
        className="absolute top-1/2 left-1/2 -mt-[210px] -ml-[210px] h-[420px] w-[420px] min-[1024px]:top-[64px] min-[1024px]:left-[calc((100vw-min(100vw,80rem))/2+2rem-10px)] min-[1024px]:mt-0 min-[1024px]:ml-0 min-[1024px]:h-[min(500px,100svh_-_300px)] min-[1024px]:w-[min(500px,100svh_-_300px)] min-[1280px]:top-[48px] min-[1280px]:left-[calc((100vw-min(100vw,80rem))/2+2rem+4px)] min-[1280px]:h-[min(600px,100svh_-_310px)] min-[1280px]:w-[min(600px,100svh_-_310px)] min-[1400px]:top-[36px] min-[1400px]:left-[calc((100vw-min(100vw,80rem))/2+2rem-36px)] min-[1400px]:h-[min(680px,100svh_-_320px)] min-[1400px]:w-[min(680px,100svh_-_320px)]"
      >
        {/* Oceano e atmosfera: CSS, pintados no servidor. É o que faz o planeta
            existir antes de o JavaScript montar a nuvem. */}
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
        <span className="globe-mark absolute top-1/2 left-1/2 block aspect-[642/400] w-[46%] -translate-x-1/2 -translate-y-1/2" />

        {/* A terra firme. Vazio e transparente até o primeiro quadro. */}
        <canvas ref={tela} className="absolute inset-0 h-full w-full" />

        {/* Os pinos. Abaixo de `lg` não existem (globo atrás do aparelho).
            Na entrada eles aparecem DEPOIS da onda (700 ms), e só em
            opacidade: mover um pino seria mentir sobre o lugar dele no planeta,
            e mostrá-lo antes da onda seria pendurá-lo no vazio. */}
        <div className="ent-surge absolute inset-0 hidden [--ent-atraso:700ms] lg:block">
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
function medidor(ms: number) {
  const w = window as typeof window & {
    __globo?: { quadros: number; soma: number; media: number; passo: number };
  };
  const m = (w.__globo ??= {
    quadros: 0,
    soma: 0,
    media: 0,
    passo: GLOBE_STEP,
  });
  m.quadros += 1;
  m.soma += ms;
  m.media = m.soma / m.quadros;
}
