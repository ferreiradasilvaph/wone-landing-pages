/**
 * O CONTRATO ENTRE OS DOIS PINTORES DO PLANETA — o canvas 2D e a cena 3D.
 *
 * Pedido do dono, 17/10: "quero que o globo do hero tenha um visual
 * IMPACTANTE, de nível premiado (...) hoje ele é um canvas 2D de pontos; está
 * correto, mas plano". A virada para 3D é feita em seis etapas, e esta é a
 * primeira; o que ela precisa resolver antes de qualquer pixel é uma pergunta
 * de arquitetura: QUEM É O DONO DO TEMPO.
 *
 * A resposta é: continua sendo o laço do `HeroGlobe`. Ele lê o modelo de voo
 * (`voo.ts`), decide guinada, inclinação e escala do quadro, posiciona os
 * PINOS e RÓTULOS (que são DOM) e, no fim do mesmo quadro, PUBLICA esse estado
 * aqui e manda a cena 3D desenhar. UM relógio, UM estado, dois materiais.
 *
 * POR QUE UM OBJETO MUTÁVEL E NÃO ESTADO DE REACT. O estado muda 60 vezes por
 * segundo. Um `useState` por quadro seria um render do `Hero` inteiro por
 * quadro — o oposto do que a página faz hoje (o `HeroGlobe` escreve `transform`
 * direto nos nós justamente para não passar por render). Então é um objeto
 * ÚNICO, criado uma vez e mutado por quadro: zero alocação, zero render, e o
 * `useFrame` do 3D lê os campos que o laço acabou de escrever.
 *
 * POR QUE MÓDULO E NÃO `window`. O `HeroGlobe3D` entra por `next/dynamic`, ou
 * seja num CHUNK separado — mas o módulo é o mesmo nos dois (o empacotador não
 * duplica dependência compartilhada), então a identidade do objeto é garantida.
 * O espelho em `window.__cena` existe só para a medição no navegador poder
 * provar a coincidência pino×esfera sem olhar fotografia.
 *
 * A GEOMETRIA É A MESMA, E ISSO NÃO É COINCIDÊNCIA. O canvas 2D já é a projeção
 * ORTOGRÁFICA de uma esfera unitária:
 *
 *     x₁ = cos(yaw)·x + sen(yaw)·z        (giro em torno de Y)
 *     z₁ = −sen(yaw)·x + cos(yaw)·z
 *     y₂ = cos(p)·y − sen(p)·z₁           (giro em torno de X)
 *     z₂ = sen(p)·y + cos(p)·z₁
 *     tela: sx = R + Z·R·x₁      sv = R − Z·R·y₂      (Z = escala)
 *
 * No 3D isso é, LETRA POR LETRA, um `Group` com `rotation = (pitch, yaw, 0)` na
 * ordem XYZ do three (que aplica Y primeiro e X depois — ver `HeroGlobe3D`) e
 * uma `OrthographicCamera` com frustum ±1 e `zoom = Z`, olhando a origem de
 * +Z. Nenhuma `PerspectiveCamera`: é a perspectiva que descolaria os pinos DOM
 * da esfera, e eles continuam sendo posicionados pelo laço do 2D. O volume vem
 * de luz, atmosfera, arcos e parallax (etapas 2–5), não de distorção de lente.
 */

import type { Camera, Object3D } from "three";

/* --------------------------------------------------------------------------
   A PALETA: UM PLANETA DE WONE

   Ela morava no `HeroGlobe` e subiu para cá quando passou a ter DOIS leitores.
   Não é zelo: a cor da terra firme é identidade da marca ("deixe claro que a
   plataforma possui dominação global no seu nicho", 14/10), e dois arquivos
   escrevendo `#ff7700` de cabeça são dois lugares para o próximo ajuste
   esquecer um — com o agravante de que aqui a divergência apareceria como um
   SALTO DE COR no instante do crossfade entre os dois canvas.

   A rampa da terra vai do braseiro (lado da sombra) ao laranja cheio da marca
   (lado do sol) em seis passos; o creme, que antes era o chão, é o destaque dos
   países onde a Wone cobra.
   -------------------------------------------------------------------------- */

/** Braseiro → laranja da marca, em seis passos. */
export const TERRA = [
  "#8a3f0a",
  "#a14a08",
  "#b95506",
  "#d06104",
  "#e86c02",
  "#ff7700",
];
/** A costa, só no lado iluminado: laranja claro. */
export const COSTA = "#ffb070";
/** Os sete países: creme quente na borda, creme puro no núcleo. */
export const PAIS_BORDA = "#ffe2b8";
export const PAIS_NUCLEO = "#ffffe3";

/**
 * Quantos vértices tem a polilinha da perna em curso (`cena.arco`).
 *
 * São os mesmos 25 do rastro que o canvas 2D já montava (`RASTRO_PASSOS + 1`,
 * no `HeroGlobe`) — e isso não é coincidência, é a razão de o número morar
 * aqui: o 2D monta a polilinha UMA vez por perna e escreve nos DOIS buffers no
 * mesmo laço, o plano para o rastro dele e o elevado para o cometa 3D. Duas
 * contagens diferentes seriam dois laços, ou um laço com dois passos.
 *
 * 24 segmentos dão a curva lisa num disco de R 317: na perna mais longa (85°)
 * cada segmento tem 3,6°, e a flecha dele é 0,05% do raio — meio pixel.
 */
export const ARCO_PASSOS = 25;

/**
 * A NUVEM DE TERRA FIRME, montada UMA vez pelo `HeroGlobe` a partir dos deltas
 * de `globeDots.ts` e lida pelos dois pintores.
 *
 * O 3D NÃO a remonta, e isso é a mesma regra da paleta levada a sério: quem
 * decide se um ponto é terra, costa ou país é o gerador, e refazer a peneira do
 * lado do 3D seria uma segunda verdade sobre a geografia — com o custo extra de
 * 0,4 ms e 180 kB de `Float32Array` duplicados.
 */
export type Nuvem = {
  /** Vetores na base da projeção, prontos para girar. */
  bx: Float32Array;
  by: Float32Array;
  bz: Float32Array;
  /** Raio base do ponto (fleck + costa), antes do fator de luz. */
  rb: Float32Array;
  /** Parcela de alfa que a costa acrescenta. */
  ac: Float32Array;
  /** Força do tingimento, 0 fora dos sete países. */
  tingimento: Float32Array;
  /** Índice do país tingido, ou 255 (nenhum). Só vale com `tingimento > 0`. */
  pais: Uint8Array;
  /**
   * O RUÍDO do ponto, 0 a 1 — `noise(indice + 0,25)`, o mesmo número que o 2D
   * já usa para variar o raio.
   *
   * Ele está guardado (e não recalculado) porque o 3D precisa dele para a COR e
   * para o ALFA de cada ponto, e recuperá-lo de `rb` seria desfazer uma conta de
   * três termos. 20 kB a mais numa nuvem que já tem 180 — e o índice da espiral,
   * que é a semente, não sobrevive à montagem.
   */
  fleck: Float32Array;
};

/**
 * O ESTADO DO QUADRO, publicado pelo laço do 2D e consumido pelo 3D.
 *
 * Os nomes são os do 2D de propósito: `yaw`/`pitch`/`escala` são exatamente as
 * três variáveis que `desenha()` já tinha, e `fase`/`cidade`/`u` são o que o
 * modelo de voo devolve. Nada aqui é derivado — se fosse, haveria duas contas
 * para a mesma câmera.
 */
export type Cena = {
  /* ---------------------------------------------------- a câmera do quadro */
  /** Guinada e inclinação, em radianos (já com o empurrão do cursor). */
  yaw: number;
  pitch: number;
  /** A escala de tela do voo. 1 = enquadramento do servidor; 1,35 = detalhe. */
  escala: number;

  /* ------------------------------------------------------------- a caixa */
  /** Lado da caixa do globo, em px de CSS (o globo é quadrado: lado = 2R). */
  lado: number;
  /** Raio da vigia, em px de CSS. */
  raio: number;

  /* --------------------------------------------------------------- o voo */
  fase: string;
  /** Índice da cidade da vez — o que acende o país em creme claro. */
  cidade: number;
  /** 0 a 1 ao longo da perna. */
  u: number;
  /** O acumulador da ENTRADA do hero, em ms: é o portão do item 3. */
  entrada: number;
  /**
   * O relógio DA FASE, em ms: desde o pouso, ou desde o começo do voo. É o que
   * faz o rastro apagar em 1 s e o flash da Europa durar 1 s (etapa 3).
   */
  msFase: number;
  /** Índices das duas pontas da perna em curso. */
  de: number;
  para: number;
  /** Há perna montada para desenhar rastro? (`false` antes do primeiro voo.) */
  temRastro: boolean;
  /**
   * A BOLINHA, já na base da projeção — o mesmo vetor que o 2D desenha. Um
   * `Float32Array` de 3 reusado, nunca um array novo por quadro.
   */
  bola: Float32Array;
  /**
   * A perna em curso, já na base da projeção e JÁ ELEVADA (23 pontos × 3). É o
   * arco que o rastro percorre, e ele sobe o mesmo tanto das pernas da rede
   * (`REDE_SOBE`): a bolinha viaja POR CIMA do planeta, não raspando nele.
   */
  arco: Float32Array;
  /** Os sete códigos de moeda, na ordem da fila. */
  codigos: string[];

  /* ------------------------------------------------------------- a ponte */
  nuvem: Nuvem | null;
  /**
   * O `advance` do react-three-fiber, registrado pela cena 3D quando ela monta.
   * `null` = não há 3D, e o 2D pinta o planeta como sempre fez.
   */
  avanca: ((segundos: number) => void) | null;
  /**
   * `true` depois do crossfade: o 3D é o planeta, e o 2D para de pintar terra,
   * grade, trama e rede. Ele CONTINUA dono do voo, dos pinos, dos rótulos, do
   * rastro e da bolinha (que migram na etapa 3).
   */
  pronto: boolean;

  /* ----------------------------------------------------------- a medição */
  /** Quantos quadros o 2D entregou ao 3D, e o custo deles em ms. */
  quadros: number;
  soma: number;
  media: number;
  pior: number;
  /** `gl.info.render` do último quadro: a prova do "UM draw call". */
  chamadas: number;
  pontos: number;
  /** `performance.now()` do primeiro quadro 3D desenhado. 0 = nenhum ainda. */
  nasceu: number;
  /**
   * O ESPIÃO DA CENA 3D: a câmera e o grupo que gira, como objetos do three.
   *
   * Existe pela mesma razão do `window.__globo` deste arquivo vizinho — provar,
   * no navegador, o que o pedido manda conferir. Aqui a conferência é a mais
   * importante de todas: que a posição de tela de um PINO (que é DOM, escrito
   * pelo laço do 2D) coincide com a projeção do MESMO ponto pela matriz da
   * câmera 3D, dentro de 1,5 px, ao longo do voo e do pouso. Para isso a
   * medição precisa das matrizes DE VERDADE: reconstruí-las a partir de
   * `yaw/pitch/escala` seria conferir a fórmula contra ela mesma.
   *
   * O `import type` do three é apagado na compilação — este arquivo continua
   * sem uma linha de três no bundle da primeira dobra.
   */
  espia3d: { camera: Camera; grupo: Object3D } | null;
  /** Os marcos do portão de montagem (item 3), em `performance.now()`. */
  marcos: { load: number; idle: number; entrada: number; montou: number };
};

const ESTADO: Cena = {
  yaw: 0,
  pitch: 0,
  escala: 1,
  lado: 0,
  raio: 0,
  fase: "",
  cidade: 0,
  u: 0,
  entrada: 0,
  msFase: 0,
  de: 0,
  para: 1,
  temRastro: false,
  bola: new Float32Array([0, 0, 1]),
  arco: new Float32Array(ARCO_PASSOS * 3),
  codigos: [],
  nuvem: null,
  avanca: null,
  pronto: false,
  quadros: 0,
  soma: 0,
  media: 0,
  pior: 0,
  chamadas: 0,
  pontos: 0,
  nasceu: 0,
  espia3d: null,
  marcos: { load: 0, idle: 0, entrada: 0, montou: 0 },
};

if (typeof window !== "undefined") {
  (window as typeof window & { __cena?: Cena }).__cena = ESTADO;
}

/** O objeto compartilhado. Sempre o mesmo — nunca uma cópia. */
export function cena(): Cena {
  return ESTADO;
}

/**
 * O QUADRO ENTREGUE: o laço do 2D acabou de publicar a câmera, e a cena 3D
 * desenha AGORA, no mesmo quadro.
 *
 * POR QUE `advance()` E NÃO `invalidate()`. A decisão de arquitetura pedia
 * `frameloop="demand"` com `invalidate()` — e `invalidate()` agenda um
 * `requestAnimationFrame` próprio, ou seja o 3D desenharia no quadro SEGUINTE.
 * Um quadro de atraso não é detalhe aqui: no pico de velocidade a câmera
 * percorre 0,82° de guinada por quadro, que num disco de R 317 a 1,2× de escala
 * são 5,4 px — quase quatro vezes a tolerância de 1,5 px que a conferência
 * exige entre o pino DOM e a esfera 3D, e visível como um descolamento do
 * rótulo. Com `frameloop="never"` e `advance()` chamado AQUI, dentro do mesmo
 * `requestAnimationFrame` que acabou de desenhar o 2D, o atraso é zero por
 * construção.
 *
 * O espírito da decisão fica intacto, e de forma mais forte: não existe laço
 * autônomo nenhum no 3D. Aba oculta, hero fora da tela ou movimento reduzido
 * param o laço do `HeroGlobe`, ninguém chama esta função, e o 3D desenha ZERO
 * quadros — não "um quadro a menos", zero.
 *
 * O tempo vai em SEGUNDOS porque é a unidade do `Clock` do three, que o r3f
 * atualiza a partir deste carimbo quando o `frameloop` é `never`.
 */
export function entrega(ms: number) {
  const c = ESTADO;
  if (!c.avanca) return;
  const antes = performance.now();
  c.avanca(ms / 1000);
  const custo = performance.now() - antes;
  c.quadros += 1;
  c.soma += custo;
  c.media = c.soma / c.quadros;
  if (custo > c.pior) c.pior = custo;
  if (c.nasceu === 0) c.nasceu = antes;
}

/**
 * TEM WEBGL? Testado UMA vez e memorizado.
 *
 * Um contexto de teste é criado e descartado: é o preço de não montar um canvas
 * 3D que nasceria preto numa máquina sem aceleração. `webgl2` primeiro, `webgl`
 * depois — é a mesma ordem que o three tenta, então um `true` aqui é a garantia
 * de que ele vai conseguir. Sem nenhum dos dois, o portão nunca abre e o globo
 * 2D fica: é o fallback do pedido, e ele não tem código próprio nenhum — é
 * simplesmente a página de hoje.
 */
let WEBGL: boolean | null = null;

export function temWebGL() {
  if (WEBGL !== null) return WEBGL;
  try {
    const teste = document.createElement("canvas");
    const ctx =
      teste.getContext("webgl2") ??
      teste.getContext("webgl") ??
      teste.getContext("experimental-webgl");
    WEBGL = !!ctx;
    /* O contexto de teste é devolvido na hora: o navegador tem um teto de
       contextos WebGL vivos (16 no Chrome), e um canvas de prova pendurado num
       deles é exatamente o tipo de vazamento que faz o 16º falhar. */
    const perder = (
      ctx as WebGLRenderingContext | null
    )?.getExtension?.("WEBGL_lose_context") as { loseContext?: () => void } | null;
    perder?.loseContext?.();
  } catch {
    WEBGL = false;
  }
  return WEBGL;
}
