# Requinte na cidade do retrato — os vizinhos deixam de ser caixas

Pedido ([161], 21/10): "melhore os detalhes da cidade, no último zoom, no globo —
capriche, dê toques de requinte".

Arquivo: `src/components/hero/SaoPauloCena.tsx` (só ele). Tudo entra na geometria
LISA dos vizinhos (`geoLiso`, material `telhado`, cor de vértice, já na camada do
bloom) — ZERO draw calls, zero materiais, zero texturas e zero luzes novas. Nada
muda no celular (a cena nem chega à fase `fachada` lá).

## O que o retrato enxerga

- Fundo da fase `fachada`: Z = 34.000, 0,59 m/px, disco de 375 m, câmera a 55°
  olhando do SUL, alvo a 130 m. No chão o quadro cobre ~±250 m em x e ~±320 m em y.
- `RAIO_DETALHE = 420` m do centroide à torre (`AnelPronto.dist`): 346 prédios,
  202 com h ≥ 12, 55 com h > 60, 23 com h > 75, 142 convexos.
- O que está fora do raio nunca chega a 2 px em nenhuma fase: as peças de perto
  (itens 2–6) só nascem dentro dele. Os itens 7–8 são globais e de custo zero.

## Preparação (em `preparaAneis` / `AnelPronto`)

Acrescentar por anel: `cx, cy` (centroide), `convexo` (todos os produtos vetoriais
consecutivos com o mesmo sinal), `rInscrito` (menor distância do centroide às
arestas; 0 se o centroide cai fora do polígono), `angMaior` (ângulo da aresta mais
longa). Quem decide se uma peça cabe num telhado é `convexo && rInscrito >= X`.

O lado liso passa de `Float32Array` orçado para `number[]` com `push` (como a
torre faz, pela razão escrita lá: é construído UMA vez e as peças abaixo tornariam
a conta de orçamento frágil). O lado texturizado continua orçado.

## As peças

1. **Mureta do parapeito** (dentro do raio, h ≥ 12, convexo, menor aresta ≥ 2 m,
   miter sem estouro: `1 + dot(n1, n2) >= 0.3`). Inset de 0,3 m por miter dos
   normais internos. Por aresta: face EXTERNA de h a h+1,0 na cor do fio (`corFio`:
   topo + 30% CREME), TAMPA entre a aresta e o inset a h+1,0 (fio + 20% PAREDE_TOPO),
   face INTERNA (do inset, virada para dentro) de h a h+1,0 no tom do telhado + 50%
   OCLUSAO. O fio existente (fatia h−1,2 → h, só acima de 60 m) fica como está.
   Vista a 55° a mureta do fundo mostra a face interna sombreada: é o que faz um
   telhado ler como terraço e não como tampa.

2. **Casa de máquinas + caixa d'água** (dentro do raio, h ≥ 12, convexo,
   `rInscrito ≥ 4,5`, e NÃO heliponto). Caixa de 4,5×3,5×2,8 m alinhada a
   `angMaior`, centrada no centroide deslocado 30% de `rInscrito` para o norte
   (+y) no referencial do prédio. Paredes com a luz por face (mesma fórmula
   `luz` das paredes, base = tom do telhado, topo = PAREDE_LUZ), tampa +25% para
   PAREDE_TOPO. Em h ≥ 20 e `sorteio < 0,7`: caixa d'água octogonal de raio 1,4 m
   e 2,2 m de altura em cima da casa de máquinas (z h+2,8 → h+5,0), concreto um
   degrau mais claro que a caixa, tampa idem. É a silhueta de telhado de São Paulo.

3. **Helipontos** nos 5 prédios mais altos do raio com h > 60, convexos e
   `rInscrito ≥ 9`: disco de raio 7 m (24 setores) a h+0,1 em telhado +25% para
   PAREDE_TOPO; o "H" em três chapas (duas barras 1,0×6 m, travessa 3×1 m) a
   h+0,15 em CREME a 70%; oito luzes de perímetro (quadrados chapados de 0,5 m a
   h+0,15, raio 6,5 m) em CREME cheio — acima do `BLOOM_LIMIAR`, elas sangram.
   Escritos DEPOIS do telhado do mesmo prédio: a ordem de escrita decide o
   empate no z-buffer (ver a regra de ouro em `constroiTorre`).

4. **Balizas vermelhas** em prédios com h > 75 dentro do raio e h > 90 em
   qualquer lugar, convexos, não-heliponto: mastro 0,5×0,5 m de h a h+6 em
   TORRE_LUZ (via caixa com luz por face) e lâmpada chapada de 0,8 m em BALIZA no
   topo. Toda cidade real tem esses pontos vermelhos no horizonte; hoje só a torre
   tem.

5. **Vitrines no térreo** (dentro do raio, 60 m < dist, h ≥ 9): para cada aresta
   com comprimento ≥ 7 m e `sorteio(semente·53 + k) < 0,30`, uma chapa 0,15 m
   para FORA da parede (normal (dy, −dx), mesmo enrolamento de `tira`), de z 0,4
   a 3,4, recuada 1,0 m de cada canto, em JANELA + 40% CREME com intensidade
   0,55–1,0 por sorteio. Chapada (sem luz por face: é lâmpada). O lado liso é
   desenhado depois do texturizado (material criado depois → id maior), então a
   chapa ganha o empate de profundidade com a parede.

6. **Pé-direito e tom por prédio** (global, custo zero). Fator `k = 0,88 +
   0,24·sorteio(semente·7 + 3)` multiplicando `u` E `v` do ladrilho (andares de
   2,86 a 3,64 m, proporção da janela mantida). Tom da parede por
   `sorteio(semente·11 + 9)`: 45% neutro, 30% quente (12% para `#6a5a48`), 25%
   frio (12% para `#3a4a6a`); prédios com h > 55 e sorteio < 0,5 são "cortina
   de vidro": frio a 20%. As misturas são de luminância quase neutra, para a
   conta de V3 (+1,4% hoje) não sair da tolerância de 10%.

7. **Telhado em três tons** (global, custo zero): `sorteio(semente·41 + 13)` —
   35% como é, 35% manta escura (18% para OCLUSAO), 30% laje clara (15% para
   PAREDE_TOPO). Média de luminância ≈ inalterada.

## O que NÃO entra, e por quê

- Árvores, carros, calçadas: precisam de dado de rua que não existe aqui, e
  "quase alinhado" com a textura é pior do que ausente.
- Recuos inventados na silhueta (coroas menores): a altura do OSM é o telhado;
  casa de máquinas e caixa d'água são o que fica ACIMA dele de verdade.
- Atlas de fachadas (dois ladrilhos): o `RepeatWrapping` atravessaria o atlas e
  um `fract` no shader quebra os mipmaps nas emendas. O item 6 compra a variação
  sem isso.

## Conferências

- `npx tsc --noEmit -p .` e `npx eslint src/components/hero/SaoPauloCena.tsx`
  limpos.
- Triângulos CONTADOS da geometria (log temporário de `triangulosLisos` e
  `triangulos`, removido depois) e escritos no cabeçalho do arquivo, que hoje
  diz 18.765 de liso e 92.477 no total.
- Nenhuma peça fora do raio além dos itens 6–7; nenhuma peça em prédio côncavo.
- No navegador (quem confere é o planejador, no Playwright): contemplação a
  9.200 sem piorar; retrato com muretas, casas de máquinas, helipontos acesos,
  balizas e vitrines; 0 erros de console.
