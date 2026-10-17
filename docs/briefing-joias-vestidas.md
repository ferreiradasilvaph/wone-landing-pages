# Briefing: as joias vestidas (pulseira do 100K e colar do 500K)

Para gerar ou fotografar as duas imagens que substituem os manequins da vitrine
de Prêmios. Escrito em 17/10/2026, a partir do que a cena 3D realmente exige —
cada exigência abaixo tem uma razão técnica, não é gosto.

## O que muda, e por quê

Hoje as duas peças aparecem vestidas num **manequim de vitrine em plástico preto
brilhante**: uma mão de expositor com dedos chatos, e um busto sem cabeça e sem
mãos. A joia em si está bem feita — a pulseira solta traz o fecho gravado
"WONE BOT · 100K CLUB", o pavê e o logo em ouro. O que lê como barato é o corpo.

O pedido do dono em 16/10: "deixe o mais humanizado possível".

## As duas imagens

| arquivo | o que mostra |
|---|---|
| `public/images/pulseira-100k-vestida.webp` | a pulseira num pulso humano |
| `public/images/colar-500k-vestido.webp` | o colar com o pingente num peito humano |

Mantendo esses nomes, a cena encontra tudo sozinha — a escala de cada uma é
procurada **pelo nome do arquivo** (`VESTIDA_ESCALA`, em `AwardPlaque3D.tsx`).
Nome novo também serve; só me avise, que eu atualizo a tabela.

## Exigências técnicas (duras)

**Proporção 2:3 em pé.** 1000×1500 é a medida ideal; 970×1465 também serve. O
quadro da cena tem 2,42 × 3,6 unidades, a mesma proporção — e é por isso que as
duas atuais travam pela altura. Proporção diferente obriga a re-afinar a cena.

**Fundo 100% transparente, recorte duro.** WebP ou PNG com alfa. Nada de fundo
branco, nada de fundo preto chapado: a peça flutua sobre a vitrine e o fundo da
seção tem de aparecer em volta dela. As duas atuais já são assim (alfa 0 nos
cantos).

**Luz assada na imagem.** A cena desenha a foto com `meshBasicMaterial` e
`toneMapped={false}` — material que NÃO recebe luz nenhuma. Toda a iluminação
tem de já estar na fotografia. Se vier plana, vai ficar plana.

**Um fio de luz quente na borda.** As imagens atuais trazem um contorno laranja
de um dos lados, e é o que as costura à cena (o laranja da marca é #FF7700).
Vale manter — é o detalhe que faz a peça pertencer àquele palco escuro.

**Sem texto legível.** A imagem é desenhada em DOIS planos costas com costas,
para não sumir quando a peça gira de perfil. No plano de trás ela aparece
espelhada. Qualquer palavra legível vai aparecer invertida metade do tempo.

**Nada importante no rodapé do quadro.** A base da imagem para logo acima do
pódio (0,34 unidade de folga) e a peça ainda sobe e desce no ar. O terço de
baixo é margem — braço, peito, sombra —, nunca a joia.

## Enquadramento (é isto que decide a escala)

A escala de cada foto depende de **quanto do quadro é joia e quanto é corpo
vazio**. As atuais: 0,58 para o pulso (a pulseira ocupa menos de um terço do
quadro) e 0,80 para o dorso (o busto preenche de ponta a ponta).

O ideal para as novas:

- **Pulso** — antebraço entrando na diagonal, pulseira no terço central do
  quadro, corte acima dos dedos ou com a mão relaxada e fechada. Evite a mão
  aberta com os dedos espalmados: é o que mais denuncia manequim.
- **Peito** — do pescoço até a altura do esterno, com o pingente no centro. Sem
  rosto (a vitrine não é sobre uma pessoa específica) e sem cortar no meio do
  braço, que é o que faz o busto atual parecer decepado.

Se o enquadramento mudar muito em relação às atuais, eu re-afino a escala
medindo — é um número, e eu meço, não chuto.

## Pele

É o ponto do pedido. Pele real, com textura: poro, pelo, veia no antebraço,
relevo da clavícula. Tom médio ou mais escuro funciona melhor contra o chão
quente da vitrine (`--floor`, #110f0e), e deixa o metal da joia saltar. Pele
muito clara sobre fundo escuro vira uma mancha e rouba o brilho da peça.

## O que evitar

- Fundo branco ou qualquer caixa em volta
- Sombra projetada assada na imagem (a cena tem a sua própria)
- Mão de manequim, luva, ou pele plástica demais
- Outra joia na mesma foto (relógio, anel, outra corrente)
- Marca d'água, logo de banco de imagem
- Corpo inteiro: o quadro é 2:3 e o que não é joia vira peso morto

## Depois que você entregar

Põe os arquivos em `public/images/` com os nomes acima. Eu:

1. confiro proporção, alfa e peso;
2. re-afino `VESTIDA_ESCALA` medindo a peça contra a placa na cena;
3. confiro que a base não atravessa o pódio em nenhuma largura;
4. confiro no navegador de 1024 a 2560 e no celular;
5. subo.

As fotos SOLTAS das joias (`pulseira-100k.webp`, `colar-500k.webp`) continuam
como estão — são a joia sem corpo, e nelas não há nada de manequim.
