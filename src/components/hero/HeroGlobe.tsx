"use client";

import { useEffect, useRef, useState } from "react";

import { CountryTag } from "./CountryTag";
import { GLOBE_COAST, GLOBE_COUNT, GLOBE_DELTAS } from "./globeDots";
import {
  amostra,
  baseVector,
  CAPITAIS,
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
   chamadas de `fill`: os pontos caem em 9 baldes (6 níveis de luz em creme + 3
   de tingimento laranja), e cada balde é um `beginPath` com N arcos e UM
   `fill`. No celular o globo fica atrás do aparelho, não tem pino nem rótulo e
   nada visível muda com o país ativo — então ele é pintado UMA vez e nunca
   mais, zero `requestAnimationFrame`.
   -------------------------------------------------------------------------- */

const TAU = Math.PI * 2;
const CREME = "#ffffe3";
const LARANJA = "#ff7700";

/**
 * A guarda do laço, em ms. 27 e não 33: num monitor de 60 Hz os quadros chegam
 * de 16,7 em 16,7 ms, então 27 deixa passar o segundo (33,3) e dá os 30 fps
 * pedidos; com 33 o segundo quadro chegaria CEDO por 0,3 ms, seria descartado,
 * e o laço cairia para 20 fps. Numa tela de 120 Hz continua dando 30; numa de
 * 30 Hz, os 30 que o aparelho tem.
 */
const PASSO_MS = 27;

/** Raio angular, em radianos, do núcleo e da borda do tingimento (500/1.100 km). */
const NUCLEO = 500 / 6371;
const BORDA = 1100 / 6371;

/** Alfa de cada balde: 6 níveis de creme (até 0,46) e 3 de laranja. */
const ALFA = [0.038, 0.115, 0.192, 0.268, 0.345, 0.422, 0.2, 0.42, 0.72];

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
  /** Índice do país tingido (0–3), só vale quando `tingimento > 0`. */
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
  const n = GLOBE_COUNT;
  const nuvem: Nuvem = {
    bx: new Float32Array(n),
    by: new Float32Array(n),
    bz: new Float32Array(n),
    rb: new Float32Array(n),
    ac: new Float32Array(n),
    tingimento: new Float32Array(n),
    pais: new Uint8Array(n),
  };

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

    /* Tingimento: 1 dentro de 500 km da capital, caindo por smoothstep até 0 em
       1.100 km. O produto escalar já é o cosseno da distância angular. */
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

    k += 1;
  }

  return nuvem;
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
}: {
  /** Na ordem de `payments.table.countries`: Brasil, Argentina, México, Colômbia. */
  pins: { code: string; city: string; chip: string }[];
  activeIndex: number;
  /** `true` só depois de o relógio começar a andar e sem movimento reduzido. */
  animated: boolean;
  /** Os quatro freios do relógio do `Hero`, já combinados. */
  running: boolean;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const alfinetes = useRef<(HTMLSpanElement | null)[]>([]);
  const nuvem = useRef<Nuvem | null>(null);
  const geo = useRef<Geometria | null>(null);
  /** Ângulos do último quadro: o arco congela a posição do pino na ativação. */
  const angulo = useRef({ yaw: 0, pitch: 0 });
  const ativo = useRef(activeIndex);

  /** O arco do pino até o aparelho. `null` até o relógio trocar de país. */
  const [arco, setArco] = useState<{ code: string; d: string } | null>(null);
  const primeiraVolta = useRef(true);

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
    const sync = () => setModo(!lg.matches ? "celular" : xl.matches ? "laco" : "parado");
    sync();
    lg.addEventListener("change", sync);
    xl.addEventListener("change", sync);
    return () => {
      lg.removeEventListener("change", sync);
      xl.removeEventListener("change", sync);
    };
  }, []);

  /* O país da vez vai para um `ref`: o laço lê a cada quadro sem se refazer. */
  useEffect(() => {
    ativo.current = activeIndex;
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
    x: new Float32Array(GLOBE_COUNT),
    y: new Float32Array(GLOBE_COUNT),
    r: new Float32Array(GLOBE_COUNT),
    b: new Uint8Array(GLOBE_COUNT),
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
        ganho: celular ? 0.4 : 1,
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
        ctx!.globalAlpha = (forte ? 0.085 : 0.05) * g.ganho;
        ctx!.strokeStyle = CREME;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      };

      for (let m = -2; m <= 3; m += 1) {
        const lon = -72 + m * 30;
        const pontos: [number, number][] = [];
        for (let s = 0; s <= 48; s += 1) pontos.push([-80 + (160 * s) / 48, lon]);
        linha(pontos, false);
      }
      for (const lat of [0, 30, -30]) {
        const pontos: [number, number][] = [];
        for (let s = 0; s <= 48; s += 1) pontos.push([lat, -72 - 90 + (180 * s) / 48]);
        linha(pontos, lat === 0);
      }
    }

    function desenha(yaw: number, pitch: number) {
      const g = geo.current!;
      const R = g.raio;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);

      ctx!.clearRect(0, 0, g.lado, g.lado);
      grade(cy, sy, cp, sp);

      const atual = ativo.current;
      let n = 0;
      let usados = 0;

      for (let i = 0; i < GLOBE_COUNT; i += g.salto) {
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
          const s = t * (dados.pais[i] === atual ? 1.6 : 1);
          balde = 6 + (s >= 1.2 ? 2 : s >= 0.6 ? 1 : 0);
        } else {
          /* Queda do alfa até o limbo: é o que evita a linha dura na borda. */
          const u = z2 >= 0.18 ? 1 : z2 / 0.18;
          const alfa = (0.06 + 0.28 * lit + dados.ac[i]) * (u * u * (3 - 2 * u));
          balde = (alfa * 13.04) | 0;
          if (balde > 5) balde = 5;
        }

        trab.x[n] = R + x1 * R;
        trab.y[n] = R - y2 * R;
        trab.r[n] = dados.rb[i] * (0.72 + 0.4 * lit);
        trab.b[n] = balde;
        usados |= 1 << balde;
        n += 1;
      }

      /* Um `beginPath` + um `fill` por balde: 9 chamadas de pintura por quadro,
         não uma por ponto. */
      for (let b = 0; b < 9; b += 1) {
        if (!(usados & (1 << b))) continue;
        ctx!.beginPath();
        for (let k = 0; k < n; k += 1) {
          if (trab.b[k] !== b) continue;
          const r = trab.r[k];
          ctx!.moveTo(trab.x[k] + r, trab.y[k]);
          ctx!.arc(trab.x[k], trab.y[k], r, 0, TAU);
        }
        ctx!.globalAlpha = ALFA[b] * g.ganho;
        ctx!.fillStyle = b < 6 ? CREME : LARANJA;
        ctx!.fill();
      }
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
      return () => observador?.disconnect();
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
      const balancoYaw = 0.10472 * Math.sin((TAU * seg) / 20);
      const balancoPitch = 0.04363 * Math.sin(((TAU * seg) / 20) * 0.6);

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
  }, [codes, running, modo, trocaParada]);

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
    /* Meio da borda direita do aparelho: 300 de largura e 620 de altura
       encostados na base do palco, que é a medida de `xl` — o único tamanho em
       que o arco aparece. */
    const altura = box.parentElement?.clientHeight ?? 656;
    const tx = 300;
    const ty = altura - 310;
    const qx = (px + tx) / 2;
    const qy = (py + ty) / 2 - 70;

    setArco({
      code: pins[activeIndex]?.code ?? "",
      d: `M${px.toFixed(1)} ${py.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${tx} ${ty}`,
    });
  }, [activeIndex, pins]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* A CAIXA DO GLOBO: tamanho CRAVADO por breakpoint, sempre absoluta —
          CLS zero por construção, porque nada aqui participa do fluxo.
          A 1440 ela sangra 90px pela borda direita da janela (quem corta é o
          `overflow-x-clip` da seção), que é a mordida que a referência tem.
          No celular ela fica centrada ATRÁS do aparelho: lá os quatro pinos
          cairiam todos dentro dos 268px da moldura, então eles não existem e
          quem nomeia o país é a `StageStatus`. */}
      <div
        ref={caixa}
        className="absolute top-1/2 left-1/2 -mt-[210px] -ml-[210px] h-[420px] w-[420px] lg:top-[64px] lg:right-[-140px] lg:left-auto lg:mt-0 lg:ml-0 lg:h-[440px] lg:w-[440px] xl:top-[36px] xl:right-[-202px] xl:h-[600px] xl:w-[600px]"
      >
        {/* Oceano e atmosfera: CSS, pintados no servidor. É o que faz o planeta
            existir antes de o JavaScript montar a nuvem. */}
        <span className="globe-sea absolute inset-0 block" />
        <span className="globe-air absolute inset-0 block" />

        {/* A terra firme. Vazio e transparente até o primeiro quadro. */}
        <canvas ref={tela} className="absolute inset-0 h-full w-full" />

        {/* Os pinos. Abaixo de `lg` não existem (globo atrás do aparelho). */}
        <div className="absolute inset-0 hidden lg:block">
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
  const m = (w.__globo ??= { quadros: 0, soma: 0, media: 0, passo: GLOBE_STEP });
  m.quadros += 1;
  m.soma += ms;
  m.media = m.soma / m.quadros;
}
