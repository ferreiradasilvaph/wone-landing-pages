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
 * a órbita e as VISIBILIDADES das camadas. Quem desenha (o `HeroGlobe3D` e o
 * `SaoPauloCena`) só aplica.
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

export type FaseSP =
  | "pouso"
  | "chegada"
  | "mergulha"
  | "contempla"
  | "fachada"
  | "sobe"
  | "despedida"
  | "fim";

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
  /**
   * A ALTURA DO ALVO DO ENQUADRE, em METROS acima do chão da cena.
   *
   * Zero em todo o mergulho de hoje: o alvo é o PÉ da torre, e com 32° de
   * obliquidade e uma torre de 266 m de projeção num disco de 1.385 m isso
   * deixa o prédio inteiro na metade de cima do quadro, que é o que se quer.
   *
   * Na fase `fachada` o disco encolhe para 375 m e a torre passa a ocupar 71%
   * dele: com o alvo no pé, a base ficaria no CENTRO da tela e a coroa sairia
   * pelo topo. Então o alvo SOBE para `ALTURA_ALVO_FACHADA` (130 m, perto da
   * metade dos 284 m do prédio) e volta a zero na subida. Quem usa é
   * `enquadraSP`, que soma `ALTURA_CHAO_SP` e empurra o alvo radialmente para
   * fora antes de calcular a translação.
   */
  readonly alturaAlvo: number;
  /** 1 = os pontos de terra do globo visíveis; 0 = apagados. */
  readonly pontos: number;
  /** 0 = sem o chão de São Paulo; 1 = o mapa noturno opaco. */
  readonly mapa: number;
  /** 0 = prédios rentes ao chão; 1 = na altura real. */
  readonly predios: number;
  /** 0 = as vias do mapa acesas (néon); 1 = apagadas (asfalto). */
  readonly avenidas: number;
  /** 0 = marca apagada na torre; 1 = acesa. */
  readonly logo: number;
  /** 0 = só o mapa de 22 km; 1 = o recorte de 4 km do centro por cima. */
  readonly detalhe: number;
  /**
   * 0 = o mergulho de sempre; 1 = estamos NO RETRATO DA TORRE.
   *
   * É o sinal que acende tudo o que só existe de perto: as janelas por vão, a
   * caixa de luz do letreiro, a cinta da coroa, as balizas dos mastros, a
   * vitrine do saguão e os postes das ruas. Sai da ESCALA como as outras
   * visibilidades (`LIMIAR.fachada`), e por isso se desfaz sozinho na subida e
   * em qualquer desvio por clique.
   */
  readonly fachada: number;
  /**
   * O PALCO: 0 = o hero como sempre, 1 = o hero entregue ao planeta.
   *
   * É o sinal do MODO CINEMA, e ele é de TEMPO, não de escala — ao contrário
   * de todas as outras visibilidades deste arquivo. A diferença é deliberada
   * e foi pedida pelo dono em 17/10: "quando o pontinho parar em São Paulo,
   * esse efeito do globo ir para o centro e consequentemente a div sumir
   * deve acontecer quando o pontinho chega; aí na sequência os zooms".
   *
   * Ou seja: o palco é ORDEM, e ordem é tempo. Ele sobe inteiro na fase
   * `chegada`, com o zoom ainda parado no do pouso, e só depois o mergulho
   * começa. Derivá-lo da escala — que foi a primeira versão — punha a
   * viagem do disco no MEIO da descida, misturada com ela, e era isso que
   * se lia como "só o mapa deu zoom".
   */
  readonly palco: number;
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

/**
 * O ZOOM DA FACHADA — o retrato do prédio, e o novo fundo do mergulho.
 *
 * Pedido do dono, 18/10: "adicione mais um zoom, no globo, onde mostra a torre
 * mais detalhada em uma vista mais próxima e com o logo da wone bem estilizado.
 * mostre uma imagem da torre e capriche nos detalhes do prédio."
 *
 * "Mostre uma imagem da torre" é a própria VISTA: o quadro inteiro vira o
 * retrato do prédio, e é a geometria que diz quanto isso custa de escala.
 *
 *   Z = 34.000  →  disco de 375 m a 0,59 m/px (0,47 no cinema, onde ele cresce
 *                  para ~799 px)
 *                  torre a 55° de obliquidade: 284·sen 55° + 58·cos 55° =
 *                  233 + 33 = 266 m de projeção, ou 71% da altura do disco
 *                  a marca: a placa de hoje (`LOGO_LARGURA` = 22 m) mede 10 px
 *                  a 9.200 e 37 px aqui; nos 30 m a que a tarefa F a leva, 51 px
 *                  os montantes de 0,3 m entre vãos: meio pixel — é a menor
 *                  medida da fase F, e ela cai justamente no limite do visível
 *
 * POR QUE PARAR EM 34.000 E NÃO IR MAIS PERTO. Porque 71% do disco é o enquadre
 * de retrato: 100% seria o prédio encostando nas duas bordas, sem nada em volta
 * para dizer que ele está numa cidade, e a vizinhança (com as janelas da tarefa
 * V e os postes da L) é metade do que faz a vista parecer real. E porque abaixo
 * de ~0,5 m/px a textura do chão — 1,95 m por texel no recorte de detalhe —
 * passa de "borrão de luz" a "quadrado de cor": é por isso que o chão escurece
 * mais 45% aqui (ver `CHAO_NA_FACHADA` no `SaoPauloCena`) e quem carrega o
 * quadro passam a ser os prédios e os postes.
 *
 * SEM RISCO DE LIMBO A 55°, e isso tinha de ser conferido antes de subir de 32°:
 * o quadro mede 375 m, e a borda do recorte de detalhe de 4 km (2.000 m de raio)
 * projeta 2.000·cos 55° = 1.148 m na vertical da tela — TRÊS quadros inteiros
 * de folga acima do centro. O que limitava
 * os 32° de `INCLINACAO_MAX` era o chão de 22 km visto a 405 de escala, não a
 * esfera.
 */
export const ZOOM_FACHADA = 34000;

/**
 * Os 30 m que o chão de São Paulo sobe acima da superfície da esfera.
 *
 * É o `ALTURA_CHAO` do `SaoPauloCena`, DUPLICADO aqui de propósito: este
 * arquivo é PURO (não conhece DOM nem three) e o `SaoPauloCena` é um componente
 * de react-three-fiber — importá-lo daqui arrastaria o three para dentro do
 * modelo de tempo, que é a única coisa que este arquivo não pode deixar
 * acontecer. Se um dos dois mudar, o outro muda: os dois comentários se citam.
 *
 * Por que ele entra na conta do enquadre: o alvo da câmera é a torre, e a torre
 * nasce no chão da cena, não na esfera. Com o alvo na superfície o quadro ficava
 * 30 m abaixo do pé do prédio — 14 px em 9.200 e 51 px em 34.000, ou seja
 * invisível na contemplação e um erro de enquadre no retrato.
 */
export const ALTURA_CHAO_SP = 30;

/** O raio da Terra em metros — o raio 1 da esfera do globo. */
const RAIO_TERRA = 6_371_000;

/**
 * O FATOR RADIAL DO ALVO DO ENQUADRE: quanto o vetor unitário da torre tem de
 * crescer para o alvo sair da superfície da esfera e ir para `alturaAlvo`
 * metros acima do CHÃO DA CENA.
 *
 * Uma função, e exportada, porque ela é usada em DOIS lugares — `enquadraSP`
 * (o mergulho) e a `enquadra()` do desvio por clique, no `HeroGlobe` — e os
 * dois têm de desfazer exatamente o que o outro fez. Duas cópias da mesma
 * fórmula é meio quadro de salto na emenda do clique esperando para acontecer.
 */
export function fatorAlvo(alturaAlvo: number) {
  return 1 + (ALTURA_CHAO_SP + alturaAlvo) / RAIO_TERRA;
}

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

   E DESDE 18/10 OS 9.200 JÁ NÃO SÃO O FUNDO DO MERGULHO: eles são o fim da
   CONTEMPLAÇÃO, o quadro da cidade-maquete, e o fundo passou a ser o retrato da
   torre em `ZOOM_FACHADA` (34.000). Todo o raciocínio acima continua valendo
   onde ele foi escrito — é ele que decide quanto do CHÃO se vê, e 9.200 continua
   sendo o zoom em que a maquete inteira é o assunto. O retrato não contradiz
   nada disso: ele desiste do chão (que escurece 45%) e troca-o pelo prédio.
   -------------------------------------------------------------------------- */

/* ------------------------------------------------------------ as durações */

/**
 * O POUSO. Igual ao das outras seis cidades (`POUSO_MS` de `voo.ts`): é o
 * tempo em que o rótulo abre e o pino pulsa. São Paulo não ganha nada aqui — o
 * que a faz "a mais longa" é tudo o que vem DEPOIS dele.
 */
export const POUSO_SP_MS = POUSO_MS;

/**
 * A CHEGADA: o hero se abre para o planeta, com o zoom PARADO.
 *
 * 1,1 s em que nada de escala acontece e tudo de palco acontece: o disco
 * inteiro — halo, oceano, atmosfera, marca d'água, limbo, pontos, pino e
 * rótulo de São Paulo — viaja da coluna da esquerda para o meio da tela,
 * no tamanho de repouso, enquanto o bloco de texto se apaga.
 *
 * É a fase que organiza a leitura: primeiro a página CEDE o espaço, depois
 * a câmera desce. Sem ela as duas coisas aconteciam juntas no meio do
 * mergulho e nenhuma das duas se lia.
 *
 * 1,1 s e não 0,6: a viagem é de ~320 px num disco de ~600, e abaixo de
 * ~0,9 s ela vira um salto lateral. Nem 1,8: acima disso o espectador já
 * entendeu que vai descer e a espera passa a ser espera.
 */
export const CHEGADA_MS = 1100;

/**
 * O MERGULHO: de `ZOOM_DETALHE` (1,35) até `ZOOM_CIDADE` (405).
 *
 * São ln(405 / 1,35) = 5,70 nats de escala em 3,4 s — 1,68 nat/s, dentro da
 * faixa em que um voo do Google Earth se lê como descida e não como corte.
 */
export const MERGULHA_MS = 3400;

/**
 * A CONTEMPLAÇÃO: o resto da descida (405 → 9.200) MAIS a demora em cima da
 * cidade-maquete.
 *
 * Aqui há um desvio do roteiro, e ele é medido: o roteiro pedia esta fase
 * PARADA no zoom da cidade, e nenhum prédio se lê a 49,7 m/px (veja
 * `ZOOM_TORRE`). Então a fase virou duas: os primeiros `CONTEMPLA_APROXIMA`
 * aproximam de 405 a 9.200 — 3,12 nats em 2,09 s, ou 1,49 nat/s contra os 1,68
 * do `MERGULHA_MS`, que é o que dá o "chegando" — enquanto a obliquidade sobe
 * de 0 a 32° e os prédios crescem; o resto é a demora de verdade, 1,5 s de
 * câmera firme com a órbita correndo e a marca acesa.
 *
 * (A versão de 17/10 dizia "metade da velocidade da descida anterior" com
 * 1,70 nat/s contra 1,68 — a conta nunca fechou, e o recuo do fundo de 14.000
 * para 9.200 derrubou o 1,70 para 1,49. Quem é de fato metade da velocidade
 * de quem vem antes é a `FACHADA_MS`, abaixo.)
 */
export const CONTEMPLA_MS = 3600;

/** A fração da contemplação gasta descendo; o resto é a demora em cima. */
export const CONTEMPLA_APROXIMA = 0.58;

/**
 * A FACHADA: o retrato da torre (9.200 → 34.000) e a demora em cima dele.
 *
 * Os mesmos dois tempos da contemplação, na mesma ordem e por isso mesmo mais
 * lentos: 45% APROXIMANDO — 1,31 nat em 1,89 s, ou 0,69 nat/s, METADE da
 * velocidade com que a contemplação desceu — e 55% de DEMORA, 2,31 s de câmera
 * firme com a órbita correndo. A desaceleração é a leitura: cada degrau do
 * mergulho chega mais devagar que o anterior, e o último é o mais devagar de
 * todos, que é o que diz "é aqui, olhe".
 *
 * 4,2 s e não 2,5: o que há para ver nesta fase é DETALHE (janela por vão,
 * letreiro, coroa, balizas, vitrine, postes), e detalhe leva tempo de olho —
 * abaixo de ~2 s de demora o espectador ainda está acompanhando a câmera
 * quando ela já começou a subir. Nem 6 s: a parada em São Paulo já é a mais
 * longa do tour por larga margem, e 17,7 s é o teto que `DURACAO_SP_MS`
 * declara.
 */
export const FACHADA_MS = 4200;

/** A fração da fase `fachada` gasta aproximando; o resto é a demora. */
export const FACHADA_APROXIMA = 0.45;

/**
 * A SUBIDA: de 34.000 de volta a 1,35, e a obliquidade de volta a 0.
 *
 * 10,13 nats em 2,7 s (3,75 nat/s) — a saída é MAIS RÁPIDA que a entrada, de
 * propósito: a descida é a promessa (e tem de ser saboreada), a subida é o
 * pagamento já feito, e segurar o espectador nela é o jeito mais fácil de a
 * cena passar de "extraordinária" a "longa". A curva é a mesma, espelhada.
 *
 * 2,7 s e não os 2,4 de antes: com o fundo em 34.000 em vez de 9.200 são 0,89
 * nat a mais para subir, e manter 2,4 s levaria a cadência a 4,22 nat/s. O teto
 * desta página é o que o `DESVIO_MS_POR_NAT` do `HeroGlobe` fixou em 300 ms por
 * nat (3,33 nat/s) com a nota "com folga"; 3,75 é o mesmo número de antes
 * (eram 3,85), ou seja a subida não ficou mais brusca — ela só ficou mais longa
 * na proporção do caminho novo.
 */
export const SOBE_MS = 2700;

/**
 * A DESPEDIDA: o inverso da chegada, e também com o zoom parado.
 *
 * 900 ms — mais curta que a chegada pela mesma razão que a subida é mais
 * curta que a descida: a ida é promessa, a volta é conta já paga. O voo só
 * parte para a cidade seguinte depois dela, de modo que o disco nunca
 * levanta voo de um lugar que não é o lugar dele.
 */
export const DESPEDIDA_MS = 900;

/**
 * A parada inteira: 17,7 s (eram 13,2 antes da fase `fachada`, e 11,2 antes da
 * chegada e da despedida). É esta a constante que o `voo.ts` recebe como duração
 * do pouso em São Paulo — o voo não sabe o que acontece aqui dentro, só quanto
 * tempo esperar, e por isso o retrato da torre não custou uma linha lá.
 *
 * 1,8 + 1,1 + 3,4 + 3,6 + 4,2 + 2,7 + 0,9 = 17,7 s.
 */
export const DURACAO_SP_MS =
  POUSO_SP_MS +
  CHEGADA_MS +
  MERGULHA_MS +
  CONTEMPLA_MS +
  FACHADA_MS +
  SOBE_MS +
  DESPEDIDA_MS;

const FIM_POUSO = POUSO_SP_MS;
const FIM_CHEGADA = FIM_POUSO + CHEGADA_MS;
const FIM_MERGULHA = FIM_CHEGADA + MERGULHA_MS;
const FIM_CONTEMPLA = FIM_MERGULHA + CONTEMPLA_MS;
const FIM_FACHADA = FIM_CONTEMPLA + FACHADA_MS;
const FIM_SOBE = FIM_FACHADA + SOBE_MS;

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
 * A OBLIQUIDADE DO RETRATO — 55°, de 32°.
 *
 * O que separa os dois números é O QUE SE ESTÁ OLHANDO. A 32° o quadro ainda é
 * uma MAQUETE vista de cima: 85% do chão (cos 32°) e 53% da altura dos prédios
 * (sen 32°) — perfeito para a cidade, que é a assunto da contemplação. Na fase
 * `fachada` o assunto é a FACHADA, e fachada se vê de lado: a 55° são 82% da
 * altura (sen 55°) contra 57% do chão, ou seja o prédio passa a ocupar a
 * vertical do quadro e o chão vira o piso embaixo dele. É o mesmo gesto de
 * qualquer fotógrafo de arquitetura — abaixar a câmera até a parede virar o
 * assunto.
 *
 * Não 70° ou 80°, que seriam a vista "da rua": a esta obliquidade o chão
 * encurta para 34% ou 17% e os 3.769 prédios vizinhos passam a se esconder uns
 * atrás dos outros, perdendo exatamente a vizinhança que diz que a torre está
 * numa cidade. E a cena não tem oclusão de verdade (nem luz, nem sombra), então
 * uma vista rasante mostraria o truque: paredes chapadas umas sobre as outras.
 *
 * O limite que justificava os 32° — o limbo da esfera entrando pelo topo —
 * não vale aqui: ele era medido num quadro de 31,5 km (Z = 405); a 34.000 o
 * quadro mede 375 m. Ver `ZOOM_FACHADA`.
 */
export const INCLINACAO_FACHADA = 55 * RAD;

/**
 * A ALTURA DO ALVO NO RETRATO — 130 m acima do chão da cena.
 *
 * O enquadre põe o alvo no MEIO do disco. Com o alvo no pé da torre e um disco
 * de 375 m, a base do prédio ficaria no centro exato da tela e a coroa, 233 m
 * de projeção acima, sairia pelo topo (que está a 187 m do centro). Subindo o
 * alvo para 130 m — 46% dos 284 m, perto do meio da massa construída — o EIXO
 * da torre passa a ir de −107 a +126 m de projeção vertical; somando a
 * profundidade do volume (a esquina da frente do embasamento desce mais
 * 29·cos 55° = 17 m, o canto de trás do remate sobe mais 10 m), a silhueta
 * ocupa ~260 dos 375 m do disco e sobram ~50 m de céu acima do remate e ~64 m
 * de chão abaixo da esquina — que é exatamente onde a entrada iluminada e o aro
 * de luz da marquise (tarefa F) têm de caber.
 */
export const ALTURA_ALVO_FACHADA = 130;

/**
 * A ÓRBITA — ±5° de guinada, um ciclo inteiro ao longo da contemplação.
 *
 * É o que faz a cidade parecer SÓLIDA: com a câmera cravada, prédios extrudados
 * viram um padrão impresso no chão; bastam 5° de deslocamento para as paredes
 * trocarem de lado e o olho ler volume. Mais do que isso e as fachadas da torre
 * passam a entrar e sair de vista no meio da leitura da marca.
 */
export const ORBITA_MAX = 5 * RAD;

/**
 * A ÓRBITA DO RETRATO — ±7°, um ciclo inteiro ao longo da fase `fachada`.
 *
 * Mais que os 5° da contemplação, e por uma razão de PERSPECTIVA: a órbita
 * existe para o olho ler volume, e o que ele lê é o quanto as faces trocam de
 * largura aparente. Na torre, 7° de guinada fazem a fachada de 58 m encurtar
 * 0,7% e a face lateral abrir de 0 para 7,1 m (58·sen 7°) — 12 px a 0,59 m/px,
 * que é uma quina visível girando. Com 5° seriam 5,1 m de face, ou 8,5 px, que
 * a esta distância ainda lê como tremor em vez de giro.
 *
 * E não 15°: a marca está nas faces SUL e NORTE, e a leitura do letreiro é o
 * assunto da fase. A 15° a fachada sul já perdeu 3,4% de largura e a placa de
 * 30 m começa a se inclinar o bastante para os dois anéis do símbolo se
 * encostarem. 7° deixa a marca de frente o tempo inteiro.
 *
 * Um ciclo de seno com envelope, como na contemplação: começa e termina em
 * ZERO, para emendar sem degrau de guinada com a `sobe`.
 */
export const ORBITA_FACHADA = 7 * RAD;

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
   * AS AVENIDAS APAGAM NA MESMA RAMPA EM QUE OS PRÉDIOS SOBEM — pedido do dono,
   * 17/10: "no último zoom, na cidade de São Paulo (…) têm duas linhas
   * tracejadas em laranja que se cruzam. Preciso que, nesse zoom da maquete,
   * esse tracejado suma."
   *
   * O QUE ELE VIU. As duas linhas não são da rede de arcos (essa já está
   * apagada desde Z = 14, por `pontos`): são as vias de classe `expressa` da
   * textura noturna — laranja da marca com NÚCLEO CREME, 2,2 px de textura a
   * 1,95 m/px, ou seja 4,3 m de creme quase branco. No zoom da cidade isso é
   * meio pixel de filamento e é lindo; no zoom da torre, a 2,19 m/px, é uma
   * fita de 2 px de brilho máximo passando por baixo de uma maquete — e, como
   * os prédios a cortam em pedaços, ela lê como TRACEJADO. O defeito não é a
   * via existir, é ela continuar sendo néon depois que o chão virou maquete.
   *
   * POR QUE O MESMO PAR DE `predios`, E NÃO UM PRÓPRIO. Porque é a mesma
   * troca, lida dos dois lados: a cidade tem uma quantidade de luz, e quem a
   * carrega muda de dono no meio da aproximação. Até Z = 1.600 quem acende o
   * quadro é o chão (as vias são a FONTE DE LUZ do mapa noturno, e é por isso
   * que o `CHAO_NO_FUNDO` do `SaoPauloCena` caiu de 30% para 12%); de 5.000 em
   * diante quem acende são as arestas e as janelas dos prédios, que crescem
   * com `brilho = predios^1,35`. Fazer as duas rampas com o mesmo par é o que
   * mantém o total de luz do quadro aproximadamente constante na travessia —
   * com um par próprio, mais tarde, haveria um trecho com as duas acesas
   * (clarão) e, mais cedo, um trecho com nenhuma (buraco escuro).
   *
   * E O ZOOM DA CIDADE NÃO É TOCADO, por construção: em Z = 405 esta rampa
   * ainda vale ZERO (405 < 1.600), e o mapa noturno de São Paulo inteira —
   * que o dono aprovou e não pediu para mexer — continua exatamente como era.
   * No celular, que para em 405 e não tem prédios, ela nunca sai de zero.
   */
  avenidas: [1600, 5000],
  /**
   * A MARCA é a última coisa a acender, e só no fim: em Z = 5.000 a placa de
   * 46 m mede 11 px (a marca ainda seria um borrão laranja); em 9.000 mede
   * 21 px e os dois anéis do símbolo se separam; no fundo do mergulho, 32 px.
   * Acesa a 87% da aproximação, ela fica inteira pelos ~2 s da demora.
   */
  logo: [5000, 9000],
  /**
   * A TEXTURA DE DETALHE do centro (SP_CENTRO, 4 km nos mesmos 2048 px).
   *
   * A grande cobre 22 km a 10,74 m/px, e no fundo do mergulho a câmera
   * chega a 1,44 m/px: são 7,5 texels de tela por texel de textura, ou
   * seja uma ampliação de borrão. A de detalhe tem 1,95 m/px — 1,36x de
   * ampliação no mesmo ponto, que é nítido.
   *
   * 1.500 e 3.000 saem da geometria do disco, não do gosto: a 13.248/Z
   * metros por pixel, o disco de 633 px mostra 2.795 m de raio em 1.500 e
   * 1.398 m em 3.000. O recorte de detalhe é cheio até 1.400 m e desvanece
   * até 2.000 — ou seja, a troca TERMINA exatamente no zoom a partir do
   * qual a borda dele deixa de caber no quadro. Depois de 3.000 o que se
   * vê é só a parte cheia, e a emenda não tem mais onde aparecer.
   */
  detalhe: [1500, 3000],
  /**
   * O DETALHE DE PERTO — o sinal da fase `fachada`.
   *
   * 12.000 e 26.000, e os dois números são escolhidos por uma garantia e um
   * enquadre:
   *
   * A GARANTIA é 12.000 > 9.200. A contemplação termina exatamente em
   * `ZOOM_TORRE`, e nela este sinal tem de valer ZERO CRAVADO — não "quase
   * zero": tudo o que ele acende (janelas por vão de 0,3 m de montante, cinta
   * da coroa de 1,2 m, balizas de 1 m, aro no chão) mede menos de um pixel a
   * 2,19 m/px, e meio pixel de detalhe acendendo é moiré, não detalhe. Os 2.800
   * de folga são 0,27 nat, ou 0,38 s na cadência da aproximação: o sinal não
   * encosta na emenda nem com o arredondamento de float.
   *
   * O ENQUADRE é 26.000 < 34.000. O detalhe tem de estar INTEIRO antes de a
   * câmera parar, senão os 2,3 s de demora começariam com o prédio ainda
   * acendendo. 26.000 fica a 79% do caminho em nats (1,04 de 1,31), o que com o
   * smoothstep da aproximação cai a ~70% dela: 1,34 s de fase, com 0,55 s de
   * sobra antes de a câmera parar. O retrato chega pronto.
   *
   * Em 26.000 o disco mostra 490 m a 0,77 m/px: o montante de 0,3 m vale 0,39 px
   * e a cinta da coroa 1,6 px. É daí para cima que estas peças existem.
   */
  fachada: [12000, 26000],
} as const;

function entre(x: number, a: number, b: number) {
  return suave((x - a) / (b - a));
}

/**
 * As visibilidades para uma escala qualquer — exportada à parte porque ela, e
 * não o relógio, é o contrato: quem integra pode chamá-la com o zoom que tiver
 * na mão (inclusive fora do mergulho) e receber um estado coerente.
 *
 * `avenidas` sai do MESMO par de `predios` (ver `LIMIAR.avenidas`) e por isso
 * vale, em todo zoom, exatamente o mesmo número. É de propósito, e é o que
 * deixa o `SaoPauloCena` ler o sinal do fio que ele já recebe em vez de pedir
 * um quinto: enquanto os dois pares forem iguais, não há o que transportar.
 */
export function visibilidades(zoom: number) {
  return {
    pontos: 1 - entre(zoom, LIMIAR.pontos[0], LIMIAR.pontos[1]),
    mapa: entre(zoom, LIMIAR.mapa[0], LIMIAR.mapa[1]),
    predios: entre(zoom, LIMIAR.predios[0], LIMIAR.predios[1]),
    avenidas: entre(zoom, LIMIAR.avenidas[0], LIMIAR.avenidas[1]),
    logo: entre(zoom, LIMIAR.logo[0], LIMIAR.logo[1]),
    detalhe: entre(zoom, LIMIAR.detalhe[0], LIMIAR.detalhe[1]),
    fachada: entre(zoom, LIMIAR.fachada[0], LIMIAR.fachada[1]),
  };
}

/* ----------------------------------------------------------- a escala */

const LN_DETALHE = Math.log(ZOOM_DETALHE);
const LN_CIDADE = Math.log(ZOOM_CIDADE);
const LN_TORRE = Math.log(ZOOM_TORRE);
const LN_FACHADA = Math.log(ZOOM_FACHADA);

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

/**
 * Onde, dentro do mergulho INTEIRO, a cidade enche o disco: 0,563.
 *
 * A fração é medida EM NATS (que é o que o olho lê como caminho percorrido) e
 * o denominador é o mergulho inteiro, de `ZOOM_DETALHE` ao FUNDO — e desde
 * 18/10 o fundo é `ZOOM_FACHADA`, não `ZOOM_TORRE`. Trocar `LN_TORRE` por
 * `LN_FACHADA` aqui a derrubou de 0,646 para 0,563: a cidade continua
 * aparecendo no mesmo zoom, mas ela deixou de ser dois terços do caminho e
 * passou a ser pouco mais da metade, porque o caminho cresceu.
 *
 * NENHUM CONSUMIDOR HOJE (grep em `src/` em 18/10: só esta linha). Ela é
 * exportada porque é a medida que responde "a que altura da descida a cidade
 * entra" sem ninguém ter de refazer os logaritmos à mão — e é por isso que
 * precisava acompanhar a fase nova: uma fração relativa a um fundo que já não é
 * o fundo é uma resposta errada esperando por quem a pergunte.
 */
export const FRACAO_CIDADE =
  (LN_CIDADE - LN_DETALHE) / (LN_FACHADA - LN_DETALHE);

/* ------------------------------------------------------------- o estado */

/** `ms` desde o instante em que a bolinha pousou em São Paulo. */
/**
 * A LINHA DO TEMPO DA PARADA EM SÃO PAULO, inteira, numa função pura.
 *
 * SETE fases em ordem, e a ordem É o conteúdo (pedidos do dono, 17 e 18/10):
 *
 *   pouso      1,8 s   o pino pulsa e o rótulo abre, como nas outras seis
 *   chegada    1,1 s   o PALCO sobe: o disco viaja, o texto apaga — zoom parado
 *   mergulha   3,4 s   1,35 → 405        (o planeta → a cidade)
 *   contempla  3,6 s   405 → 9.200       (a cidade → a maquete; 0 → 32°)
 *   fachada    4,2 s   9.200 → 34.000    (a maquete → o RETRATO; 32° → 55°,
 *                                         e o alvo sobe do pé aos 130 m)
 *   sobe       2,7 s   34.000 → 1,35     (endireita, baixa o alvo e sai)
 *   despedida  0,9 s   o PALCO desce: o disco volta, o texto volta — zoom parado
 *
 * TRÊS DEGRAUS DE APROXIMAÇÃO, cada um mais devagar que o anterior — 1,68,
 * 1,49 e 0,69 nat/s — e cada um com uma DEMORA no fim. É a forma de todo
 * sobrevoo de mapa que funciona: a câmera chega, mostra, chega mais, mostra
 * mais. A fase nova é o terceiro degrau, e é a mais lenta porque é a que tem
 * mais o que mostrar.
 *
 * O QUE A SEPARA EM DUAS GRANDEZAS: `zoom` (e tudo o que sai dele pelas
 * `visibilidades`) é a escala; `palco` é o tempo. A chegada e a despedida
 * mexem SÓ no palco, com o zoom cravado no do pouso; as CINCO do meio mexem
 * só no zoom, com o palco cravado em 1. Nenhum quadro faz as duas coisas, e é
 * isso que dá a sequência que o dono pediu em vez da mistura que havia.
 *
 * E UMA TERCEIRA GRANDEZA, que nasceu com a fase nova: `alturaAlvo`, que é
 * ENQUADRE. Ela é de TEMPO como o palco (sobe com a aproximação da `fachada`,
 * desce nos primeiros 40% da `sobe`) e não de escala, porque o que ela resolve
 * é a composição do quadro, não o que está visível nele. Ver `enquadraSP`.
 */
export function linhaSP(ms: number): EstadoSP {
  // POUSO — a cidade ainda é um pino no globo, como nas outras seis.
  if (ms < FIM_POUSO) {
    return monta("pouso", ms / POUSO_SP_MS, ZOOM_DETALHE, 0, 0, 0);
  }

  /* CHEGADA — o hero cede o espaço. Zoom PARADO no do pouso: o disco atravessa
     a tela inteiro e do tamanho que sempre teve, com o pino e o rótulo de São
     Paulo ainda em cima dele. Só quando ele chega é que a câmera desce. */
  if (ms < FIM_CHEGADA) {
    const t = (ms - FIM_POUSO) / CHEGADA_MS;
    return monta("chegada", t, ZOOM_DETALHE, 0, 0, suave(t));
  }

  // MERGULHA — 1,35 → 405. Os pontos apagam e o chão entra no caminho.
  if (ms < FIM_MERGULHA) {
    const t = (ms - FIM_CHEGADA) / MERGULHA_MS;
    return monta(
      "mergulha",
      t,
      escalaLog(LN_DETALHE, LN_CIDADE, suave(t)),
      0,
      0,
      1,
    );
  }

  // CONTEMPLA — 405 → 9.200 na primeira parte, firme na segunda.
  if (ms < FIM_CONTEMPLA) {
    const t = (ms - FIM_MERGULHA) / CONTEMPLA_MS;
    const desce = suave(Math.min(1, t / CONTEMPLA_APROXIMA));
    /* A órbita é UM ciclo de seno ao longo da fase inteira (começa e acaba em
       zero, sem degrau de guinada na emenda com a subida), com um envelope que
       tira a ponta de velocidade dos 15% iniciais e finais. */
    const envelope =
      suave(Math.min(1, t / 0.15)) * suave(Math.min(1, (1 - t) / 0.15));
    return monta(
      "contempla",
      t,
      escalaLog(LN_CIDADE, LN_TORRE, desce),
      INCLINACAO_MAX * desce,
      ORBITA_MAX * Math.sin(2 * Math.PI * t) * envelope,
      1,
    );
  }

  /* FACHADA — 9.200 → 34.000 e a demora em cima do retrato.

     A contemplação entregou este quadro pronto para a emenda: ela termina com
     a órbita em ZERO (um ciclo inteiro de seno) e a obliquidade em 32°, que é
     de onde esta fase parte. Aqui não há degrau nenhum na junta — só a câmera
     continuando a descer, agora metade mais devagar. */
  if (ms < FIM_FACHADA) {
    const t = (ms - FIM_CONTEMPLA) / FACHADA_MS;
    const chega = suave(Math.min(1, t / FACHADA_APROXIMA));
    /* O mesmo ciclo único de seno com envelope da contemplação: começa e acaba
       em zero, para a junta com a `sobe` também não ter degrau de guinada. */
    const envelope =
      suave(Math.min(1, t / 0.15)) * suave(Math.min(1, (1 - t) / 0.15));
    return monta(
      "fachada",
      t,
      escalaLog(LN_TORRE, LN_FACHADA, chega),
      /* A obliquidade acompanha a aproximação: a câmera baixa junto com a
         descida, não depois dela — são o mesmo gesto de "olhar a parede". */
      INCLINACAO_MAX + (INCLINACAO_FACHADA - INCLINACAO_MAX) * chega,
      ORBITA_FACHADA * Math.sin(2 * Math.PI * t) * envelope,
      1,
      /* E o alvo sobe na mesma curva, pela mesma razão: enquadrar o prédio é
         parte de chegar nele. Ver `ALTURA_ALVO_FACHADA`. */
      ALTURA_ALVO_FACHADA * chega,
    );
  }

  // SOBE — a mesma curva ao contrário, do fundo até 1,35.
  if (ms < FIM_SOBE) {
    const t = (ms - FIM_FACHADA) / SOBE_MS;
    const volta = suave(t);
    /* A obliquidade some ANTES da escala (em 70% da fase): endireitar primeiro
       e afastar depois é o que dá a leitura de "levantar voo"; afastar com a
       cidade ainda tombada mostraria o limbo da esfera entrando pelo topo. */
    const endireita = suave(Math.min(1, t / 0.7));
    /* O ALVO DESCE PRIMEIRO DE TODOS: 40% da fase, contra os 70% da
       obliquidade. Baixar o alvo de 130 m a 0 é deslizar o quadro 130·sen 55° =
       107 m ao longo do prédio — 180 px no começo da subida —, e isso tem de
       acontecer enquanto a torre ainda enche a tela: é o que se lê como "a
       câmera solta o prédio". Os 40% não são gosto: é exatamente onde a escala
       passa por 1.000, e ali os mesmos 107 m já valem 5 px. Deixado para
       depois, o deslize seria um puxão invisível; estendido até os 70% da
       obliquidade, seriam dois movimentos verticais no mesmo instante. */
    const desceAlvo = suave(Math.min(1, t / 0.4));
    return monta(
      "sobe",
      t,
      escalaLog(LN_FACHADA, LN_DETALHE, volta),
      INCLINACAO_FACHADA * (1 - endireita),
      0,
      1,
      ALTURA_ALVO_FACHADA * (1 - desceAlvo),
    );
  }

  /* DESPEDIDA — o palco desce com o zoom JÁ de volta ao do pouso. O disco
     volta para a coluna da esquerda e o texto reacende; só depois disto o voo
     parte, de modo que a próxima perna sempre começa do lugar de repouso. */
  if (ms < DURACAO_SP_MS) {
    const t = (ms - FIM_SOBE) / DESPEDIDA_MS;
    return monta("despedida", t, ZOOM_DETALHE, 0, 0, 1 - suave(t));
  }

  // FIM — devolve exatamente o estado de pouso das outras cidades, para o laço
  // do voo poder seguir daqui sem um quadro de diferença.
  return monta("fim", 1, ZOOM_DETALHE, 0, 0, 0);
}

/**
 * O nome antigo, mantido porque é o que o `HeroGlobe` chama. A conta mora em
 * `linhaSP` e só lá: um segundo caminho para o mesmo instante é a forma mais
 * fácil de as duas metades da parada divergirem meio quadro.
 */
export const mergulhoSP = linhaSP;


/**
 * `alturaAlvo` é o ÚLTIMO parâmetro e tem padrão 0 de propósito: das sete
 * fases, cinco têm o alvo no pé da torre, e só a `fachada` e a `sobe` precisam
 * dizer alguma coisa a respeito.
 */
function monta(
  fase: FaseSP,
  t: number,
  zoom: number,
  inclinacao: number,
  orbita: number,
  palco: number,
  alturaAlvo = 0,
): EstadoSP {
  return {
    fase,
    t,
    zoom,
    inclinacao,
    orbita,
    palco,
    alturaAlvo,
    ...visibilidades(zoom),
  };
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

   E O ALVO TEM ALTURA (18/10). Ele era um ponto da SUPERFÍCIE da esfera, e a
   torre não nasce na superfície: ela nasce no chão da cena, 30 m acima
   (`ALTURA_CHAO_SP`). Na fase `fachada` isso deixou de ser arredondamento —
   30 m são 51 px a 0,59 m/px — e, pior, o enquadre do retrato pede o alvo no
   MEIO do prédio, não no pé dele (ver `ALTURA_ALVO_FACHADA`). Então o alvo
   subiu para fora da esfera:

       alvo = ALVO · fatorAlvo(alturaAlvo)
            = ALVO · (1 + (ALTURA_CHAO_SP + alturaAlvo) / RAIO_TERRA)

   `ALVO` é unitário, então multiplicá-lo por 1 + h/R é exatamente "o mesmo
   ponto, h metros mais alto". A translação que devolve o alvo ao centro do
   disco é a mesma conta de sempre, feita sobre esse ponto deslocado — nada
   mais mudou aqui.
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
 * `centraliza()` já devolvia — e `x`, `y` valem 4,7·10⁻⁶ em vez de 0, que são
 * os 30 m do chão da cena: 0,0015 px no zoom de repouso (1,35×) e 14 px no fim
 * da contemplação, que é a correção que se queria. Fora do mergulho ninguém
 * chama esta função.
 *
 * `alturaAlvo` é opcional e vale 0 (o pé da torre): o `HeroGlobe` passa o
 * `EstadoSP` inteiro, que já o traz, e o enquadre geral do desvio (a `enquadra`
 * local de lá) recebe o mesmo número por parâmetro.
 */
export function enquadraSP(e: {
  inclinacao: number;
  orbita: number;
  alturaAlvo?: number;
}): Enquadre {
  const pitch = ALVO_BASE.pitch - e.inclinacao;
  const yaw = ALVO_BASE.yaw + e.orbita;
  /* O alvo sai da superfície: o chão da cena mais a altura pedida. Ver o bloco
     de cima — `ALVO` é unitário, então o fator é "h metros mais alto". */
  const sobe = fatorAlvo(e.alturaAlvo ?? 0);
  const x = ALVO[0] * sobe;
  const y = ALVO[1] * sobe;
  const z = ALVO[2] * sobe;

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
