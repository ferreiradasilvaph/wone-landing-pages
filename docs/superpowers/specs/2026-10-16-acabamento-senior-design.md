# Acabamento de sênior na landing da Wone

**Data:** 16/10/2026
**Pedido do dono:** "preciso que o site todo seja melhorado, aperfeiçoando o que já existe,
visualmente falando. precisa ficar com aparência de um desenvolvimento de um dev senior."

---

## 1. O que estamos fazendo, e por quê

A landing já tem direção de arte: preto + laranja, Geist, a calibração contra a Dotfy, as
demos, as cenas 3D, o globo. Isso não está em discussão e não muda.

O que falta é **acabamento**. Uma varredura de 14 telas em 1440×900 e 5 em 390×844 encontrou
um padrão: a página acerta o difícil (uma cena 3D de placas de cristal, um globo com atmosfera,
um editor de fluxo em perspectiva) e erra o barato — duas margens esquerdas, cinco maneiras de
escrever um valor em dinheiro, um `<select>` do sistema operacional no meio de campos próprios,
seções que terminam em 250px de nada.

É exatamente esse contraste que lê como amador. Um site com cena 3D e número mal formatado
parece feito por alguém que sabe a parte vistosa e não terminou a parte chata. O inverso — nenhuma
cena 3D e todo número no lugar — lê como sênior.

**Critério de sucesso:** nenhum dos tells listados na seção 5 sobrevive, e cada invariante da
seção 4 é verificável por medida (um número que eu leio no navegador), não por opinião.

## 2. Decisões fixadas nesta sessão

Respondidas pelo dono em 16/10, e não se reabrem durante a execução:

1. **Duas ondas, acabamento primeiro.** Onda A fecha os descuidos na página inteira. Onda B sobe
   a ambição visual, e só então.
2. **Piores seções, na percepção do dono:** Hero/topo, Como funciona, e o conjunto
   Recursos/Pagamentos/Análises. A onda B se concentra nelas.
3. **Régua única a 80rem.** Todas as seções, hero incluso, passam a medir 80rem. O globo deixa de
   ser medido pelo container e **sangra para fora da coluna**, de propósito.
   Isto REABRE, com autorização explícita do dono, a consequência registrada na espec anterior
   ("acima de 1400 o hero é 128px mais largo que as demais seções"). O pedido original — "joga o
   globo mais para a esquerda" — continua atendido: o globo vai mais para a esquerda do que a
   coluna, e agora isso é sangramento deliberado em vez de um segundo container.
4. **Onda B enriquece, não reorganiza.** Mesma estrutura, mesmo conteúdo, mesma ordem de seções.
   Sobe profundidade, camadas, densidade de detalhe e movimento na rolagem.

## 3. Fora de escopo

- Redesenho de qualquer seção, seções novas, corte de seções, mudança de ordem da página.
- Texto: nenhuma frase do dicionário muda de sentido. (Quebra de linha e caixa podem mudar.)
- A paleta, a tipografia e a alternância de fundos registradas na espec anterior.
- Lint ou testes de layout automatizados. Discutido como caminho C e descartado por YAGNI: é
  trava para depois de a porta existir.
- Os dados que faltam do dono (seção 8). O que depende deles fica preparado, não inventado.

## 4. As invariantes

O coração do trabalho. Cada uma vira uma regra única que a página inteira obedece, e cada uma
tem uma medida que diz se obedece.

### 4.1 Uma régua

**Hoje:** `Section` usa `max-w-7xl` (80rem); `Hero.tsx:246` usa
`max-w-7xl min-[1400px]:max-w-[88rem]`; `hero.css` ancora globo e linha de controle em 80rem até
1399px e em 88rem a partir de 1400. Em 1440 isso põe o rodapé do hero em x=42 e o logo do
cabeçalho em x=107.

**Passa a ser:** 80rem em toda parte. O hero perde o `min-[1400px]:max-w-[88rem]`; `hero.css`
perde os dois blocos de 88rem. O globo é posicionado por uma conta que pode sair da coluna, e o
sangramento vira valor nomeado (um token, não um número solto em quatro lugares).

**Medida:** em 1024, 1280, 1440, 1920 e 2560, a borda esquerda do conteúdo do cabeçalho, do
kicker do hero, da fileira de fatos do hero e do kicker de toda seção cai no MESMO x. Tolerância
zero. O globo é o único nó autorizado a ter x menor.

### 4.2 Um dinheiro

**Hoje:** cinco implementações independentes —
`AwardsShowcase.tsx:553` (`emDolar`, `toLocaleString("en-US")`),
`DashboardPreview.tsx:10` (`Intl.NumberFormat` próprio),
`howitworks/WonePanel.tsx:52` (outro `Intl.NumberFormat` próprio),
`demos/DeliveryDemo.tsx:105` e `Highlights.tsx:208` (dois `toLocaleString` inline).
O resultado na tela: `$4,062` no gráfico (vírgula de milhar), `$ 155.000` na tabela (ponto, e um
espaço depois do símbolo), `R$ 197,00` no globo. Três gramáticas de número na mesma página.

**Passa a ser:** `src/lib/money.ts`, único, consciente do idioma, com a regra de qual moeda usa
qual separador escrita UMA vez. Os cinco locais passam a chamá-lo. Toda coluna ou pilha de
valores ganha `tabular-nums`; coluna de valor em tabela alinha à direita (hoje a coluna PLANO da
tabela de Pagamentos alinha à esquerda, e "650" ao lado de "155.000" fica esfarrapado).

**Medida:** `grep` por `toLocaleString`, `Intl.NumberFormat` e `toFixed` em contexto de dinheiro
retorna ocorrências apenas dentro de `money.ts`. Na tela, os valores de uma mesma coluna têm a
mesma borda direita.

### 4.3 Um fim de seção

**Hoje:** Plataforma (`#destaques`), Recursos e Análises terminam com 120–250px entre o último
elemento e a borda inferior, porque as duas colunas têm alturas diferentes e ninguém reconciliou
a mais curta. O `padding-block` do `Section` soma por cima, e o buraco vira quase meia tela.

**Passa a ser:** nenhuma seção termina em vazio. A reconciliação é por seção (a mais curta cresce,
a mais alta divide, ou as duas se alinham pelo pé), nunca cortando `padding-block` — o ritmo
vertical da página é token (`--secao-y`) e continua sendo.

**Medida:** em 1440×900, a distância entre o pé do último elemento visível de cada seção e o fim
do `padding-block` dela é o mesmo valor em todas as seções, dentro de 8px.

### 4.4 Um controle de formulário

**Hoje:** `WaitlistForm.tsx:269` é um `<select>` nativo. No meio de inputs com raio, borda e foco
próprios, ele aparece com a seta do sistema operacional e com altura e tipografia de outro
projeto.

**Passa a ser:** um select próprio com a mesma altura, o mesmo raio, a mesma borda e o mesmo anel
de foco dos campos irmãos. Acessibilidade não regride: continua operável por teclado, continua
anunciando rótulo e valor, continua funcionando sem JavaScript se hoje funciona.

**Medida:** altura, raio e cor de borda idênticos aos do campo E-mail, medidos no navegador; foco
por `Tab` percorre Nome → E-mail → Nacionalidade → Telegram → WhatsApp → botão, nessa ordem.

### 4.5 Uma escala de fios

**Hoje:** o trilho não preenchido do `SegmentProgress` é `bg-cream/12`
(`SegmentProgress.tsx:95,98`), escuro demais para se ler contra os fundos ink. Daí a leitura
errada de que os segmentos tinham larguras diferentes: eles são `flex-1`, iguais; o que some é o
trilho vazio. As demais divisórias da página usam opacidades avulsas, decididas componente a
componente.

**Passa a ser:** uma escala pequena de fios (régua de seção, divisória interna, trilho de
progresso), cada nível com um valor só, e um piso de contraste que o trilho vazio respeita.

**Medida:** contraste do trilho vazio contra cada um dos fundos onde ele aparece, acima do piso
escolhido; nenhuma opacidade de fio fora da escala, por `grep`.

## 5. Onda A — a varredura

Cada item abaixo foi confirmado no código, não só no screenshot.

### Página inteira
1. **Régua** — invariante 4.1.
2. **Dinheiro** — invariante 4.2.
3. **Fios e trilho** — invariante 4.5.
4. **Altura no celular:** 16.589px em 390px de largura (~20 telas). A espec anterior já mirava
   12.000 e registrava 12.700. Onde a altura cresceu desde então, é respiro vertical que não paga
   o preço no celular. Alvo: ~12.000px, sem remover conteúdo.

### Hero
5. **Etiquetas de país colidem** no globo: Cidade do México, Bogotá e a de Lima se sobrepõem entre
   si e com o limbo. Precisam de um teste de colisão, ou de posições que o impeçam por construção.
6. **"automático" perde o sublinhado laranja no celular** — no desktop a palavra é sublinhada;
   em 390px não. É regra de CSS que não alcança o degrau.
7. **O kicker quebra em duas linhas** em 1440 ("COBRANÇA, ENTREGA E RASTREIO · BRASIL, AMÉRICA /
   LATINA E EUROPA") e o traço de 24×1 fica só ao lado da primeira. Ou o traço acompanha o bloco,
   ou o kicker não quebra.
8. **Duas gramáticas de lista** dentro do painel "O que vem com a Wone": seis fileiras com marcador
   e divisória, e logo abaixo uma sublista menor e mais apertada ("Independentes entre si.").

### Como funciona
9. **Baselines dos passos 01–04 desencontradas:** "Monte seu funil" ocupa uma linha e "Conecte seu
   gateway" ocupa duas, então os rótulos não partilham linha de base e o cartão do passo ativo
   empurra a fileira para cima.
10. **Sobra vertical** entre o bloco de texto (termina em ~470) e o aparelho (começa em ~530),
    desproporcional ao resto do ritmo da seção.

### Recursos
11. **Sobra morta** de ~115px entre a trilha de progresso e o fim da seção.
12. **Cartões do carrossel com topos desencontrados** — a escala por distância é intencional, mas
    o resultado lê como desalinho. Ancorar a escala pelo centro, e não pelo topo.

### Pagamentos
13. **Coluna PLANO alinhada à esquerda** e sem `tabular-nums` — parte da invariante 4.2.
14. **Espaço entre símbolo e valor** (`$ 650`, `£ 155,00`) decidido caso a caso no dicionário;
    passa a sair do formatador.

### Análises
15. **Eixo Y com três linhas de grade e nenhum rótulo** (`DashboardPreview.tsx:127`). Ou as linhas
    ganham escala, ou saem. Um gráfico com grade sem número é decoração que finge ser dado.
16. **O degradê da área lê como corte.** A causa real: o caminho (`DashboardPreview.tsx:53`) cobre
    a largura toda, mas o degradê é vertical, de 0.38 a 0, e nas horas em que a curva está baixa a
    área já nasce transparente. Daí o "preenchimento que começa no meio". A correção é fazer o
    preenchimento ser função do dado e não da altura absoluta.
17. **Sobra morta** de ~130px abaixo do cartão.

### Lista de espera
18. **`<select>` nativo** — invariante 4.4.
19. **A lista Cadastro/Levas/Convite fecha a última linha sem régua**, enquanto as duas de cima
    têm. Ou fecha, ou nenhuma fecha.

### Rodapé
20. **Buraco de ~225px à direita.** NÃO é bug de grade: a coluna "Empresa" existe e se retira
    sozinha quando nenhum slot está preenchido (`SiteFooter.tsx:42-46`), e hoje nenhum está —
    `footer.company` e `footer.legalEntity` estão vazios no dicionário (`pt.ts:1443,1456`).
    Dois caminhos: o dono fornece os dados (seção 8) e a coluna volta, ou a grade reequilibra para
    três colunas sem deixar o vão. **Decisão:** reequilibrar agora; quando os dados chegarem, a
    quarta coluna volta e a grade acomoda. O reequilíbrio não pode custar o retorno.

## 6. Onda B — enriquecer

Só depois de a onda A fechar e ser verificada. Mesma estrutura, mesmo conteúdo.

**A onda B ganha espec própria**, escrita quando a onda A fechar e com a página limpa à vista. O
plano de implementação que sai DESTA espec cobre apenas a onda A. O que segue aqui é a direção
acordada, para que a onda A não feche nenhuma porta que a onda B vá precisar:

- **Hero** — o globo é o melhor ativo da página e hoje é um disco sobre um fundo chapado. Ganha
  relação com o que está em volta: o sangramento da invariante 4.1 passa a ser lido como escolha,
  a luz da cena conversa com a faixa de integrações, e a entrada já coreografada ganha profundidade
  em vez de mais movimento.
- **Como funciona** — a sala de operação tem painel, aparelho e fio, e os três estão no mesmo
  plano de leitura. Ganha hierarquia de profundidade: o que é foco, o que é contexto, o que é fundo.
- **Recursos / Pagamentos / Análises** — as três são "um bloco de dado sobre um fundo". Ganham
  densidade de detalhe (o acabamento das bordas, dos estados, do que acontece ao passar o mouse) e
  um motivo para o olho percorrer, em vez de só pousar.

Cada seção da onda B é proposta ao dono com medida antes de virar código, porque "enriquecer" é a
parte onde gosto decide — e o dono já disse que quer reconhecer o site ao fim.

## 7. Verificação

Toda afirmação de pronto vem com número, medido no Playwright (o Chrome do dono é Edge a 125% e
não redimensiona pelo MCP — lição registrada na espec anterior).

Larguras: 320, 390, 768, 1024, 1280, 1440, 1920, 2560.

| O que se mede | Critério |
|---|---|
| Borda esquerda de cabeçalho, kickers e fatos do hero | mesmo x em toda largura; só o globo diverge |
| Sobra no pé de cada seção | mesmo valor em todas, dentro de 8px |
| Valores de uma mesma coluna | mesma borda direita; `tabular-nums` ativo |
| Formatadores de dinheiro fora de `money.ts` | zero |
| Contraste do trilho vazio | acima do piso, em cada fundo onde aparece |
| Altura do documento em 390px | ~12.000px |
| Estouro horizontal | zero, em toda largura |
| Campo Nacionalidade | altura, raio e borda iguais aos do E-mail |
| Ordem de foco no formulário | Nome → E-mail → Nacionalidade → Telegram → WhatsApp → botão |

## 8. Pendências de dados do dono

Nada aqui é inventado; o que depende destes dados fica preparado e vazio:

- `footer.company` (e-mail, Telegram) e `footer.legalEntity` (CNPJ) — hoje vazios, e é por isso
  que a coluna Empresa some e o rodapé abre um vão.
- Pendências antigas que seguem abertas: `proof.*`, `NEXT_PUBLIC_TELEGRAM_URL` no Easypanel,
  logos oficiais (Kwai/UTMify/Otimizey), logo vetorial, PSI oficial.

## 9. Riscos

- **A régua a 80rem encolhe o hero em 128px acima de 1400.** O título de 80px foi dimensionado
  contra a trilha do meio da cena de três trilhas, cujas contas estão em `hero.css` e dependem de
  `--globo`. Trocar a régua obriga a refazer essas contas, e o teto do globo (574px) sai de uma
  conta que tinha 88rem como entrada. É o item de maior risco da onda A e o primeiro a ser feito,
  isolado, para que o resto se meça contra ele.
- **A altura do celular (16.589 → 12.000) é uma redução de 28%.** Sem remover conteúdo, ela sai de
  respiro vertical. Há um ponto em que apertar o respiro passa a custar legibilidade; se o alvo só
  for alcançável atravessando esse ponto, eu paro antes e reporto o número a que cheguei.
- **A onda B é gosto.** Por isso ela vem depois, por isso cada seção é proposta antes de virar
  código, e por isso "enriquecer, não reorganizar" está fixado na seção 2.
