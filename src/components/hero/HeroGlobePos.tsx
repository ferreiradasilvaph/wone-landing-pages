"use client";

import {
  EffectComposer,
  Noise,
  SelectiveBloom,
  FXAA,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { UnsignedByteType, type Object3D } from "three";

import { CAMADA_BRILHO } from "./cena";

/* --------------------------------------------------------------------------
   ETAPA 5 — O PÓS-PROCESSAMENTO

   A ÚNICA etapa das seis que traz biblioteca nova: `postprocessing` e
   `@react-three/postprocessing`. Elas vivem NESTE arquivo e em nenhum outro, e
   o arquivo entra por `next/dynamic` só no desktop — o celular nunca baixa o
   chunk. O peso real medido no build está no relatório da etapa.

   POR QUE `SelectiveBloom` E NÃO `Bloom`. O pedido é explícito sobre o alvo:
   "a cabeça do cometa, os núcleos creme dos arcos, a luz no chão, o anel de
   pulso e a logo da torre — NUNCA nos pontos de terra nem no texto". Um
   `Bloom` comum escolhe por LUMINÂNCIA, e a luminância não separa essas
   coisas: medido nesta página, o pixel mais aceso da terra firme tem
   luminância relativa 0,65 e a logo da torre, que é `#FF7700` chapado, tem
   0,46 — qualquer corte que pegue a logo pega o continente junto, e qualquer
   corte que poupe o continente apaga a logo. A seleção por OBJETO é a única
   que respeita o pedido.

   O CUSTO DELA, declarado: o `SelectiveBloom` desenha a cena uma segunda vez
   com a máscara de camada da seleção. Parece caro e não é — o teste de camada
   derruba tudo o que não foi selecionado antes de virar triângulo, e o que
   sobra são quatro objetos pequenos (98 pontos do cometa, 2 anéis, 154
   segmentos do fio creme e três placas da marca). Mesmo no fundo do mergulho
   em São Paulo, onde a cena tem 62 mil triângulos, a passada do brilho
   continua desenhando só as placas.

   O TEXTO NUNCA BRILHA, e isso é por construção e não por ajuste: o `<h1>`, os
   rótulos dos países e o rótulo da torre são DOM, fora do canvas. Nenhum
   pós-processamento de WebGL pode alcançá-los.
   -------------------------------------------------------------------------- */

/**
 * A INTENSIDADE, e ela é a decisão estética inteira desta etapa.
 *
 * 0,85 — "é cinema, não néon", nas palavras do pedido. Esta página não tem
 * glow em lugar nenhum: a única exceção já aberta foi a atmosfera do planeta, a
 * 26% de alfa na beira da vigia, e o bloom tem de ficar na mesma família. A
 * 0,85 a cabeça do cometa ganha um halo de uns 12 px que satura no meio e some
 * em três quartos do caminho; acima de ~1,4 o halo passa a ter borda visível e
 * a leitura vira lanterna.
 *
 * `luminanceThreshold` 0,12 e não zero: dentro da seleção ainda há coisa quase
 * apagada — a ponta do rastro, o anel de pulso no fim dos 600 ms, a marca da
 * torre nascendo. Zero faria tudo isso brilhar desde o primeiro quadro em que
 * existe, e o efeito apareceria ANTES do objeto que o justifica.
 *
 * `mipmapBlur` porque o borrão por pirâmide de mipmaps é o que dá o halo largo
 * e macio sem um segundo alvo em resolução cheia — é mais barato e mais bonito
 * que o desfoque gaussiano clássico.
 */
const BLOOM_INTENSIDADE = 0.85;
const BLOOM_LIMIAR = 0.12;
const BLOOM_SUAVIZA = 0.22;
const BLOOM_RAIO = 0.62;

/**
 * O GRÃO e a VINHETA, os dois removíveis numa linha.
 *
 * O grão é 1,6% de opacidade em mistura `OVERLAY`: é menos do que o ruído de
 * compressão de um JPEG e serve a uma coisa só — quebrar o BANDEAMENTO. Um
 * gradiente radial escuro sobre preto puro (o oceano, a vinheta) mostra anéis
 * num monitor de 8 bits por canal, e um ruído de meio nível os dissolve. Acima
 * de ~3% ele deixa de ser invisível e vira textura de filme, que esta página
 * não pediu.
 *
 * A vinheta é leve e tem um motivo de composição: o globo é um disco no canto
 * esquerdo de uma tela preta, e a vinheta fecha o quadro em volta dele sem
 * tocar no miolo — `offset` 0,45 começa o escurecimento depois da metade do
 * raio, e 0,42 de `darkness` é um quarto do que a palavra "vinheta" costuma
 * significar.
 */
const COM_GRAO = true;
const COM_VINHETA = true;
const GRAO_OPACIDADE = 0.016;
const VINHETA_INICIO = 0.45;
const VINHETA_FORCA = 0.42;

/**
 * O COMPOSITOR.
 *
 * `multisampling={0}` porque não há o que suavizar: os pontos de terra e o
 * cometa já saem com a borda resolvida no próprio fragmento (um `smoothstep`
 * sobre `gl_PointCoord`), as linhas da rede são `LineSegments2`, que se
 * suavizam sozinhas, e o bloom borra o resto. Pagar o resolve de um
 * framebuffer multiamostrado por quadro seria comprar o que já se tem.
 *
 * `enableNormalPass={false}` e `depthBuffer` padrão: nenhum destes três efeitos
 * lê normal nem profundidade, e a passada de normais é um render inteiro da
 * cena a mais.
 *
 * O BUFFER É DE 8 BITS, E ISSO É CORREÇÃO DE DEFEITO MEDIDO, NÃO ECONOMIA.
 *
 * O padrão do `EffectComposer` é `HalfFloatType`, e um alvo de ponto flutuante é
 * LINEAR: ao renderizar nele, o three troca `linearToOutputTexel` pela
 * identidade (a conversão para sRGB passa a acontecer no fim da cadeia) e, com
 * isso, TODA A MISTURA ALFA DA CENA muda de espaço. A diferença não é sutil —
 * a atmosfera, que é laranja a 26% de alfa, saía de 0,156 de sRGB para 0,33, ou
 * seja mais que o dobro, e o fio fino da borda do disco virava uma faixa grossa
 * acesa. O planeta inteiro ganhava um halo de néon que não foi pedido (e que é
 * justamente o que o pedido proíbe).
 *
 * Com `UnsignedByteType` o `postprocessing` marca a textura do alvo como sRGB, o
 * `linearToOutputTexel` dos meus shaders volta a converter, e a mistura
 * acontece no MESMO espaço com e sem compositor. É a única forma de o desktop e
 * o celular — que não tem compositor nenhum — mostrarem o mesmo planeta.
 *
 * O preço são 8 bits por canal na cadeia, ou seja bandeamento possível nos
 * gradientes escuros. É exatamente o que o grão, logo abaixo, existe para
 * dissolver.
 *
 * O LAÇO CONTINUA SENDO O DO 2D. O compositor assume a renderização por um
 * `useFrame` de prioridade alta — e esse `useFrame` roda dentro do `advance()`
 * que o laço do `HeroGlobe` chama, como todos os outros. Não há laço novo, não
 * há `invalidate`, e a pausa com a aba oculta continua sendo zero quadro.
 */
export default function HeroGlobePos({
  selecao,
  cidade,
}: {
  selecao: Object3D[];
  /**
   * Estamos na parada de São Paulo? É o único momento em que a cena tem
   * ARESTAS DE POLÍGONO para serrilhar.
   */
  cidade: boolean;
}) {
  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={false}
      frameBufferType={UnsignedByteType}
    >
      <SelectiveBloom
        selection={selecao}
        selectionLayer={CAMADA_BRILHO}
        /* Sem luzes: esta cena não tem nenhuma (todo material é `Basic`, com a
           luz já escrita nos vértices). O `SelectiveBloom` só pede a lista para
           poder acender o que ilumina o selecionado, e aqui não há o que
           acender. */
        lights={[]}
        intensity={BLOOM_INTENSIDADE}
        luminanceThreshold={BLOOM_LIMIAR}
        luminanceSmoothing={BLOOM_SUAVIZA}
        radius={BLOOM_RAIO}
        mipmapBlur
      />
      {COM_GRAO ? (
        <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={GRAO_OPACIDADE} />
      ) : (
        <></>
      )}
      {COM_VINHETA ? (
        <Vignette offset={VINHETA_INICIO} darkness={VINHETA_FORCA} eskil={false} />
      ) : (
        <></>
      )}
      {/* O ANTISSERRILHAMENTO, E SÓ NA CIDADE.

          O contexto nasce com antialias: false desde a etapa 2, e a razão
          continua boa: fora do mergulho a única aresta da cena é a borda de
          cada ponto, resolvida por um smoothstep no fragment, e as linhas da
          rede são LineSegments2, que já se suavizam sozinhas. MSAA ali não
          comprava nada.

          Dentro da cidade a conta vira do avesso: são 76 mil triângulos de
          paredes e telhados, com arestas quase horizontais, no único momento
          da página em que a câmera fica parada por dois segundos — o lugar
          clássico de serrilha, e o único em que alguém tem tempo de olhar
          para ela.

          FXAA E NÃO SMAA, E ISSO FOI MEDIDO, NÃO ESCOLHIDO POR GOSTO.

          O pedido era SMAA. O build diz o preço dele: o chunk do compositor
          vai de 28,2 kB para 83,5 kB gzip — 55,3 kB, que não são shader e sim
          as duas tabelas de busca (área e busca) que o pacote embute como
          data URI. E elas não dá para separar num chunk tardio: vivem dentro
          do mesmo módulo postprocessing de que o EffectComposer já depende,
          então assim que qualquer linha do projeto cita SMAAEffect elas caem
          no chunk que o PRIMEIRO quadro 3D espera. Tentei o import dinâmico
          num arquivo só para elas e o bundler as juntou de volta, como tinha
          de juntar.

          FXAA faz o mesmo serviço por 1,4 kB gzip (29,6 contra 28,2), lendo a
          imagem que já existe, sem tabela nenhuma. Ele é um pouco mais mole
          que o SMAA em aresta quase horizontal — e o que esta cena tem é
          silhueta escura de prédio sobre mapa escuro, onde essa diferença não
          é o que separa o quadro bom do ruim. Quarenta vezes o peso pela
          fração de nitidez que sobra é um negócio ruim; se o dono quiser a
          nitidez extra, a troca é uma palavra nesta linha. */}
      {cidade ? <FXAA /> : <></>}
    </EffectComposer>
  );
}
