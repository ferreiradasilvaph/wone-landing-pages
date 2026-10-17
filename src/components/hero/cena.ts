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

/* --------------------------------------------------------------------------
   AS RÉGUAS DO PINO — e por que elas moram no contrato

   Elas vinham do `HeroGlobe`, e subiram para cá na etapa 4, quando os pinos
   passaram a ser posicionados pela cena 3D. Agora há DOIS caminhos que os
   escrevem — o 3D, quando a cena está de pé; o canvas 2D, no fallback sem
   WebGL, no movimento reduzido e nos 600 ms do crossfade — e os dois têm de
   dar o MESMO número, ou a troca entre eles seria um quadro de salto.
   -------------------------------------------------------------------------- */

/**
 * A VIGIA, para os pinos: a faixa de raio em que o rótulo desvanece, em fração
 * de R. É a MESMA faixa do limbo que o canvas já tinha — a rampa de `z₂` de
 * 0,05 a 0,30, escrita em raio em vez de cosseno (`rad = √(1 − z₂²)`) —, e por
 * isso em repouso nada muda. O que ela acrescenta é valer no espaço JÁ
 * ESCALADO: com o zoom de pouso, o pino longe da cidade da vez sai do disco, e
 * um rótulo pendurado no vazio ao lado do planeta é pior que nenhum.
 */
export const VIGIA_DENTRO = 0.954;
export const VIGIA_FORA = 0.999;

/**
 * A RÉGUA DA COLUNA DE TEXTO: um rótulo só existe perto do meio.
 *
 * É a guarda GEOMÉTRICA — a única que não depende de tempo — e vale para os
 * SETE rótulos. A razão é permanente: a câmera está sempre aproximada, e no
 * zoom de detalhe cada 1% do raio vale mais pixel. Um rótulo a meio caminho da
 * borda abre 240px de caixa de texto e vai parar dentro da coluna do `<h1>`.
 *
 * Os dois números são medidos, e quem os fixa é o rótulo MAIS LARGO dos sete:
 * "Transferência CVU / CBU · $ 38.000", 239px, abrindo para a direita. Com o
 * pino a 34% de R (caixa de 665, R 332), a borda direita dele cai em x 798
 * contra os 841 do `<h1>` — 43px de folga. A 52% ela chegaria a 858, e é por
 * isso que lá a opacidade já é zero.
 */
export const CHEGOU_DENTRO = 0.34;
export const CHEGOU_FORA = 0.52;

/**
 * A CAMADA DO BRILHO do pós-processamento (etapa 5).
 *
 * Ela mora AQUI, e não no módulo do compositor, por uma razão medida: um
 * `import` estático de qualquer coisa daquele arquivo arrasta o grafo inteiro
 * dele — `postprocessing` incluído — para o chunk de quem importou, e o
 * `next/dynamic` ao lado vira enfeite. Medido em produção: o celular, que não
 * tem compositor nenhum, baixava os 27,8 kB mesmo assim.
 *
 * 11 e não a 10 padrão do `@react-three/postprocessing`: a 10 é o que ele usa
 * quando ninguém diz nada, e um dia alguém acrescenta um segundo efeito seletivo
 * nesta cena sem saber que a 10 já estava tomada.
 */
export const CAMADA_BRILHO = 11;

/** Quanto dura o pulso do pino no pouso, em ms. */
export const PULSO_MS = 600;

/**
 * O ANEL DE ALVO no pino da cidade da vez, em px de tela. É o que o Maps põe no
 * ponto escolhido; aqui ele marca o POUSO, e cresce com a escala.
 */
export const ZOOM_ANEL = 22;

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
  /**
   * ESCOLHER UM PAÍS — o mesmo caminho que o clique no globo usa.
   *
   * Ele abre um DESVIO: uma perna de voo de onde a câmera está até a cidade
   * pedida (ver `escolher` no `HeroGlobe`). Está no contrato por duas razões:
   * é por aqui que a medição no navegador prova o desvio partindo de lugares
   * que o ponteiro não alcança — do fundo do mergulho, por exemplo, onde não há
   * pino nenhum na tela —, e é o gancho pronto para o dia em que outro controle
   * da página (a `StageStatus`, um seletor) quiser mandar o globo a um país.
   */
  escolher: ((indice: number) => void) | null;
  /**
   * O DESLOCAMENTO LIVRE do gesto, em radianos — o quanto o dedo do visitante
   * afastou a câmera do que o voo manda. Publicado para a medição poder isolá-lo
   * do movimento do próprio voo, que nunca para de contar por baixo.
   */
  livreYaw: number;
  livrePitch: number;
  /**
   * A VERSÃO LEVE, abaixo de 1024 (etapa 6): metade dos pontos, `dpr` 1,
   * fresnel sem `pow`, arcos sem o fio creme por dentro e metade das faíscas.
   * Mora no contrato porque quem decide é a largura (o `HeroGlobe`) e quem
   * obedece é a cena — e porque o desenho do cometa, que é função livre, também
   * precisa saber.
   */
  leve: boolean;

  /* ------------------------------------------- os pinos (etapa 4)

     Os PINOS e os RÓTULOS continuam sendo DOM — é o que mantém o texto
     legível, selecionável, traduzível (PT/EN) e fora de uma textura. O que
     mudou na etapa 4 é QUEM os posiciona: era o laço do 2D, com a sua própria
     projeção; passou a ser a cena 3D, com a MATRIZ DA CÂMERA — a mesma que
     desenha a esfera, no mesmo `requestAnimationFrame`. Deixou de haver duas
     contas para o mesmo pixel, e com isso deixou de haver como elas
     divergirem. */

  /** Os nós dos alfinetes, na ordem de `codigos`. Publicados pelo `HeroGlobe`. */
  pinos: (HTMLSpanElement | null)[];
  /**
   * Foco perseguido de cada pino: 1 na cidade da vez, 0 nas outras. Sobe manso
   * (0,40 s) e desce rápido (0,12 s) — é o que faz a chegada ser um cruza-fade
   * entre o rótulo que sai e o que entra, em vez de um corte.
   */
  focos: Float32Array;
  /** 1 = os sete rótulos; 0 = só o da cidade da vez. */
  rotulos: number;
  /** "Quanto do detalhe está aplicado", de 0 a 1. Deriva da escala. */
  revela: number;
  /** O mergulho de entrada acabou? Antes disso nada pulsa. */
  mergulhou: boolean;
  /**
   * A posição de REPOUSO de cada pino, em px da caixa — a que o servidor
   * escreveu em `left`/`top`. O que se escreve no nó é o DESLOCAMENTO a partir
   * dela, e em repouso ele é (0,0): nada salta quando a cena assume.
   */
  repousoX: Float32Array;
  repousoY: Float32Array;
  /** Saída: x, y (px da caixa) e z₂ de cada pino, como a cena 3D os projetou. */
  telaPinos: Float32Array;
  /** Último valor de destaque escrito no DOM, por pino. 2 = ainda não sei. */
  destacado: Uint8Array;
  /**
   * O rótulo "SIMULAÇÃO" que acompanha a torre no fundo do mergulho. DOM, como
   * os outros rótulos, e pela mesma razão: a torre da Wone é ficção de
   * ilustração, e esta página rotula toda ficção com texto de verdade — não com
   * uma textura que nenhum leitor de tela lê e nenhum tradutor traduz.
   */
  rotuloSP: HTMLSpanElement | null;

  /* ------------------------------- o mergulho em São Paulo (integração) ---

     Ele é um BLOCO À PARTE, e não campos soltos ao lado de `escala`, por uma
     razão que é o contrato inteiro desta integração: durante os 11,2 s da
     parada em São Paulo existem DUAS câmeras, e elas discordam de propósito.

     O canvas 2D — que é o placeholder, o fallback sem WebGL e o caminho de
     movimento reduzido — continua no enquadramento de POUSO, 1,35×, pelos 11,2
     segundos inteiros. Ele não tem cidade para mostrar: a textura noturna, os
     3.769 prédios e a torre são geometria 3D. Mandá-lo seguir a escala até
     14.000 seria pedir que ele ampliasse 5.102 pontos de Fibonacci até cada um
     virar um disco de meio quilômetro — uma lupa sobre o nada.

     Então `escala`, `yaw` e `pitch` continuam sendo os do VOO (o que o 2D
     desenha e o que o 3D usa fora do mergulho), e tudo o que o mergulho muda
     mora aqui dentro. Fora dele, `sp.ativo` é `false` e nada nesta caixa é lido.
     ------------------------------------------------------------------------ */
  sp: {
    /** O mergulho está em curso? `false` nas outras seis cidades. */
    ativo: boolean;
    /** A fase do mergulho (ver `mergulhoSP`). */
    fase: string;
    /** A escala do mergulho — de 1,35 a 14.000 (ou a 405, no celular). */
    zoom: number;
    /** Obliquidade e órbita, em radianos. */
    inclinacao: number;
    orbita: number;
    /** O enquadre de `enquadraSP`: rotação do grupo e translação que devolve
        a torre ao centro do disco. */
    pitch: number;
    yaw: number;
    x: number;
    y: number;
    /** As quatro visibilidades, todas derivadas da ESCALA. */
    pontos: number;
    mapa: number;
    predios: number;
    logo: number;
  };

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
  /**
   * `gl.info.memory`: quantas geometrias e texturas a GPU está segurando.
   * É a conta que o pedido da etapa 6 manda conferir no celular ("memória GPU
   * modesta") — e a que denuncia um vazamento, porque geometria que o desmonte
   * esquece de liberar aparece aqui como um número que só sobe.
   */
  geometrias: number;
  texturas: number;
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
  marcos: {
    load: number;
    idle: number;
    /** O último `startTime` de LCP visto, e quando ele parou de mudar. */
    lcp: number;
    lcpPronto: number;
    /** O primeiro gesto do visitante, no celular. 0 = não houve. */
    gesto: number;
    entrada: number;
    montou: number;
  };
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
  escolher: null,
  livreYaw: 0,
  livrePitch: 0,
  leve: false,
  pinos: [],
  focos: new Float32Array(0),
  rotulos: 1,
  revela: 0,
  mergulhou: false,
  repousoX: new Float32Array(0),
  repousoY: new Float32Array(0),
  telaPinos: new Float32Array(0),
  destacado: new Uint8Array(0),
  rotuloSP: null,
  sp: {
    ativo: false,
    fase: "",
    zoom: 1,
    inclinacao: 0,
    orbita: 0,
    pitch: 0,
    yaw: 0,
    x: 0,
    y: 0,
    pontos: 1,
    mapa: 0,
    predios: 0,
    logo: 0,
  },
  nuvem: null,
  avanca: null,
  pronto: false,
  quadros: 0,
  soma: 0,
  media: 0,
  pior: 0,
  chamadas: 0,
  pontos: 0,
  geometrias: 0,
  texturas: 0,
  nasceu: 0,
  espia3d: null,
  marcos: {
    load: 0,
    idle: 0,
    lcp: 0,
    lcpPronto: 0,
    gesto: 0,
    entrada: 0,
    montou: 0,
  },
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
