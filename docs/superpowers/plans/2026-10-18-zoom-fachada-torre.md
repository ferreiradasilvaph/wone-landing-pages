# O zoom da fachada — a torre de perto, com a marca em letreiro

**Pedido do dono ([158], 18/10):** "adicione mais um zoom, no globo, onde mostra a torre
mais detalhada em uma vista mais próxima e com o logo da wone bem estilizado. mostre uma
imagem da torre e capriche nos detalhes do prédio, crie um cenário o mais perto do real
possível."

**Leitura:** hoje o mergulho em São Paulo termina em `ZOOM_TORRE = 9.200` (disco de 1,4 km,
torre com ~58 px). Entra uma FASE NOVA depois da contemplação, `fachada`, em que a câmera
desce até a torre encher o disco, a obliquidade sobe para ver a FACHADA (e não a planta), o
alvo da câmera sobe do pé para o meio do prédio, e o que se vê ganha o detalhe que a
distância agora permite: janelas por vão, letreiro com caixa de luz, iluminação de coroa,
mastros com balizas, entrada iluminada, vizinhos com janelas de verdade e os postes das
ruas em volta. "Mostre uma imagem da torre" é a própria vista: o quadro inteiro vira o
retrato do prédio.

**Arquitetura que NÃO muda:** `mergulhoSP.ts` continua puro (tempo → estado); as
visibilidades continuam saindo da ESCALA; `SaoPauloCena` continua sem relógio, sem luz e
sem câmera; o celular continua parando em `ZOOM_CIDADE` (405) e sem prédios; o 2D não
mergulha. Toda cor nasce em sRGB e vai a linear na escrita do buffer (contrato do arquivo).

## Números da fase (base: disco de 633 px a 1440×900; no cinema o disco cresce a ~799)

- `ZOOM_FACHADA = 34000`: o disco mostra 375 m (0,59 m/px a 633; 0,47 no cinema). A torre
  (284 m) a 55° de obliquidade projeta 284·sen55 + 58·cos55 ≈ 266 m ≈ 72% do disco.
- `INCLINACAO_FACHADA = 55°` (de 32°). Sem risco de limbo: o quadro tem 375 m, a borda
  do recorte de 4 km está a mais de 1 km de projeção.
- `ALTURA_ALVO_FACHADA = 130 m`: o alvo do enquadre sobe do pé da torre (como hoje) para
  o meio dela, senão a base fica no centro e a coroa sai do quadro.
- `FACHADA_MS = 4200`: 45% aproximando (9.200 → 34.000 = 1,31 nats em 1,9 s, 0,69 nat/s —
  metade da velocidade da contemplação: é o "chegando"), 55% de demora (2,3 s) com a
  órbita correndo (`ORBITA_FACHADA = 7°`, um ciclo de seno com envelope, começa e termina
  em zero para emendar com `sobe`).
- `SOBE_MS` 2400 → 2700 (10,1 nats; 3,75 nat/s, no teto que o comentário já fixa). Na
  subida: `alturaAlvo` volta a 0 nos primeiros 40% (suave), obliquidade a 0 em 70% (como
  hoje), zoom de 34.000 a 1,35.
- `DURACAO_SP_MS` cresce 4,5 s (17,7 s no total). `voo.ts` lê a constante; nada a fazer lá.
- Sinal novo `fachada = entre(zoom, 12000, 26000)` em `visibilidades()`: 0 em todo o
  mergulho de hoje (9.200 < 12.000), 1 no fundo novo. É o que acende o detalhe de perto.

## Tarefa T — a linha do tempo e o encanamento

Arquivos: `hero/mergulhoSP.ts`, `hero/cena.ts`, `hero/HeroGlobe.tsx`, `hero/HeroGlobe3D.tsx`,
`hero/SaoPauloCena.tsx` (SÓ a assinatura de props + um uso mínimo).

T1. `mergulhoSP.ts`: `FaseSP` ganha `"fachada"`; `EstadoSP` ganha `alturaAlvo` (m) e
    `fachada` (0..1, vinda de `visibilidades`); constantes acima; `linhaSP` com a fase nova
    entre `contempla` e `sobe` (a contemplação não muda: continua terminando em 9.200 com a
    órbita em zero); `enquadraSP(e)` passa a aceitar `alturaAlvo` e usa o alvo
    `ALVO · (1 + (30 + alturaAlvo)/6.371.000)` (os 30 m são o `ALTURA_CHAO` da cena — exportar
    a constante de um lugar só, ou duplicar com nota). Atualizar os comentários do topo
    (tabela das fases, "13,2 s"), `FRACAO_CIDADE` continua relativa a `ZOOM_TORRE`? NÃO:
    trocar por `LN_FACHADA` onde a fração for usada como "fim do mergulho" (grep antes).
T2. `cena.ts`: `sp` ganha `fachada: number` (doc + valor inicial 0). `HeroGlobe.tsx`:
    publicar `sp.fachada = celular ? 0 : v.fachada` em `mergulha()`; no DESVIO
    (`sp.fase = "desvio"`) publicar `v.fachada` também, e a `enquadra()` local do desvio
    ganha o mesmo parâmetro de altura: capturar `alt0: u.alturaAlvo` (guardar `alturaAlvo`
    no `uq` ao lado de `incl`/`orb`) e decair com o mesmo `k` de `DESVIO_ENDIREITA`.
    O rótulo "SIMULAÇÃO" (`rotulaTorre` em `HeroGlobe3D`): os deslocamentos (76, −44)
    valem para a torre de 58 px; com `fachada`, interpolar para um canto que não cubra a
    fachada: `x = 76 + 110·fachada`, `y = −44 − 240·fachada` — AJUSTAR olhando no navegador.
T3. `HeroGlobe3D.tsx`: `cidadeSP`/`ultimaSP`/`ZERO_SP` ganham `fachada` e `zoomLog`
    (`Math.log(q.sp.zoom)` em degraus de 1/16 de nat — é o que os postes precisam para o
    tamanho em px; o degrau de 1/64 de `DEGRAU_SP` serve ao `fachada`). Passar
    `fachada={cidadeSP.fachada}` e `zoom={Math.exp(cidadeSP.zoomLog)}` ao `SaoPauloCena`.
T4. `SaoPauloCena.tsx`: props novas `fachada?: number` (padrão 0) e `zoom?: number`
    (padrão `ZOOM_TORRE`), documentadas; uso mínimo: o chão (os dois) escurece mais no
    fundo novo — `material-opacity={mapa * (1 - CHAO_NO_FUNDO * logo) * (1 - 0.45 * fachada)}`
    (a textura de 1,95 m/texel aparece ampliada 4× a 0,47 m/px; quem carrega o quadro
    aqui são os prédios e os postes). Nada mais nesta tarefa.
T5. `pnpm exec tsc --noEmit` e `pnpm lint` limpos. Não rodar build.

## Tarefa F — a torre de perto (depois de T; arquivo: `hero/SaoPauloCena.tsx`)

Tudo em `constroiTorre`/`constroiLogo`/materiais; sem luz nova, sem textura nova além
da marca; cores em sRGB → linear como o resto. Orçamento: a torre pode ir de ~1,6 mil a
~25 mil triângulos (um draw call continua um draw call).

F1. **Janelas por VÃO, não por fiada.** Cada face de cada fuste é dividida em vãos de
    ~3,2 m (`round(lado/3.2)`), com montante de 0,3 m (`TORRE_CORPO` escurecido 40%) entre
    vãos e peitoril/viga de 1,0 m na base de cada andar (`TORRE_CORPO` → `TORRE_LUZ` pela
    luz da face, com a aresta de cima 20% mais clara). O vidro do vão: `VIDRO`→`VIDRO_LUZ`
    pela face, com um reflexo vertical sutil (até +12% para o topo de cada fuste). Andar
    aceso continua sorteado por ANDAR (`fiada`), e dentro de um andar aceso cada vão acende
    com 78% (sorteio por andar×vão); num andar apagado, 6%. O tom da janela acesa varia
    por vão: 0,45–1,0 de intensidade de `JANELA`, e 1 em 5 puxa 35% para `CREME` (sala com
    luz fria). Mesmo `sorteio()` determinístico; nada de `Math.random`.
F2. **O letreiro.** `LOGO_LARGURA` 22 → 30 m (o fuste C tem 42: sobram 6 m de cada lado);
    a moldura acompanha (`mx = lw + 1.5`). Entra uma CAIXA DE LUZ: um quad a 0,45 m da
    parede (entre a parede e a moldura), 1,0 m maior que a arte em cada lado, em
    `LARANJA` misturado 70% com `TORRE_CORPO` (um laranja escuro, abaixo do limiar do
    bloom — é fundo, não luz). A faixa de luz creme abaixo fica. A placa da marca
    (`constroiLogo`) sobe para 30 m e a do terraço para 28 m (o remate tem 36).
F3. **Coroa iluminada.** Uma cinta de luz creme (`CREME` 85% + `LARANJA` 15%) de 1,2 m de
    altura no topo da coroa (z 276–277,2) nas quatro faces, 0,3 m para fora da parede. É a
    "crown lighting" dos arranha-céus reais e é o que vai sangrar no bloom no alto.
F4. **O terraço.** Dois mastros de 16 m (0,7 m de lado, `TORRE_LUZ`) nos cantos NORTE do
    remate (±12 m, +12 m), cada um com uma BALIZA no topo: um cubo de 1,0 m em vermelho
    de aviso `#ff2a2a` (acima do limiar do bloom — vai brilhar). Três caixas técnicas
    (6×4×2,5 m, `TELHADO` com aresta `PAREDE_TOPO`) nos terraços dos recuos (108 m e
    180 m), fora do caminho da placa do terraço e sem tocar as arestas.
F5. **A entrada.** Na face SUL do embasamento, uma vitrine de 14 m de largura × 4,5 m de
    altura (z 0,3–4,8), 0,2 m para fora da parede, em `JANELA` misturado 40% com `CREME`:
    é o saguão aceso. Mais um ARO de luz no chão: um anel plano (raio interno 44, externo
    47 m) a z 0,2, `JANELA` a 35% com `OCLUSAO` — a luz da marquise no piso.
F6. Verificar no navegador (dev server) no fundo da fase `fachada`: a fachada legível,
    o letreiro central, a coroa e as balizas brilhando, nada atravessando a placa do
    terraço; e na contemplação (9.200) a torre não pode ter ficado "suja" — a 2,19 m/px
    os montantes (0,3 m) somem sozinhos, mas conferir que o padrão de vãos não vira moiré.
    Atualizar os comentários de custo ("QUATRO draw calls", triângulos) com o medido.

## Tarefa L — os postes das ruas (em paralelo com F; arquivo NOVO
`hero/SaoPauloLuzes.tsx` + a montagem em `HeroGlobe3D.tsx`)

L1. Componente `SaoPauloLuzes({ fachada, zoom, camadaBrilho })`, montado DENTRO do grupo
    que gira, logo depois de `<SaoPauloCena …/>`, com `fachada={cidadeSP.fachada}` e o
    mesmo `zoom`; devolve `null` quando `fachada <= 0.002`. Só no desktop (`!leve`).
L2. Os pontos vêm da PRÓPRIA textura de detalhe (`SP_CENTRO.arquivo`): no `useEffect`,
    carregar a imagem (`new Image()`; o navegador já a tem em cache — a cena a baixou),
    desenhar num canvas fora da tela, `getImageData` de uma janela de 480 m de raio em
    volta do pixel da torre (`projetaSPCentro(SP_MAPA.torre.lat, SP_MAPA.torre.lon)`), e
    em células de 5×5 texels (9,8 m) escolher o texel mais claro; se a luminância passar
    de 0,35 vira um poste: posição `(dx·1,953, −dy·1,953, 9)` m no referencial da cena
    (o MESMO `referencialTangente` + `deslocamento` de `SaoPauloCena` — exportar os dois
    de lá ou recalcular com a mesma receita, com nota), cor = âmbar `#ffb070` para via
    laranja, creme `#ffffe3` para núcleo claro. Esperado: ~800–1.500 pontos. Um
    `Points`, um `ShaderMaterial`, mistura aditiva, `depthWrite` falso, disco macio no
    fragmento (como o cometa), `frustumCulled` falso.
L3. Tamanho: o poste tem 1,8 m "de luz". A câmera é ortográfica com frustum ±1 e
    `camera.zoom = Z`, então `px por metro = (larguraCanvasCSS/2) · Z / 6.371.000`;
    `gl_PointSize = clamp(1.8 · pxPorMetro · dpr, 1.5, 48)`. `pxPorMetro` entra por
    uniforme, escrito num efeito quando `zoom` ou o tamanho do canvas mudam (useThree
    `size` e `gl.getPixelRatio()`), nunca por quadro. Opacidade = `0.9 · fachada`.
    `layers.enable(camadaBrilho)` como as outras malhas da cena.
L4. Custo e descarte: construir uma vez (useMemo + estado "pronto" quando a imagem
    decodifica), `dispose` de geometria e material no desmonte, zero alocação por quadro.
    Comentar o porquê de os pontos nascerem da textura (a 0,47 m/px a textura de 1,95 m
    vira borrão; os filamentos dela viram lâmpadas de verdade, e o bloom faz o halo).

## Tarefa V — os vizinhos ganham janelas (depois de F; arquivo: `hero/SaoPauloCena.tsx`)

V1. Em `constroiPredios`, as PAREDES ganham `uv` (u = metros ao longo da aresta, v = z em
    metros) e passam a um material próprio com uma textura de janelas gerada em canvas no
    cliente (sem arquivo): um tile de 8×8 células de 3,2 m (25,6 m de repetição, 512 px),
    cada célula com montante escuro (0,3 m), peitoril (1,0 m) e vidro; células acesas
    sorteadas com `sorteio()` (determinístico) a 22% em âmbar `JANELA` com variação de
    intensidade, o resto vidro quase preto. `RepeatWrapping`, `SRGBColorSpace`, anisotropia
    máxima, mipmaps. A cor de vértice continua multiplicando (face, oclusão, topo).
V2. Os TELHADOS saem para uma segunda geometria (sem uv, material plano como hoje): é um
    draw call a mais, documentado (a cena passa de 4 para 6 com os postes).
V3. Longe (contemplação a 9.200, 2,19 m/px) o tile vira mipmap e a parede volta a ler como
    hoje; o que NÃO pode acontecer é a cidade clarear em média — conferir a luminância
    média da parede com e sem textura e compensar na cor de vértice se subir mais de 10%.
V4. `pnpm exec tsc --noEmit` e `pnpm lint` limpos; medir triângulos e draw calls e
    atualizar o comentário de custo do topo do arquivo.

## Verificação final (eu, no navegador)

- Dev server a 1440×900: um ciclo inteiro de São Paulo; capturas em 9.200 (não pode ter
  piorado), na aproximação e no fundo de 34.000; o rótulo SIMULAÇÃO legível e fora da
  fachada; o texto do hero volta na despedida; o desvio por clique a partir do fundo novo
  endireita sem salto.
- 0 erros de console; `gl.info.render.calls` dentro do mergulho ≤ 6 chamadas a mais que
  fora dele.
- Commit com o bloco [158] já em `prompts.txt`.
