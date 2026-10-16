# Acabamento de sênior — Onda A — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os vinte descuidos de acabamento da landing e fixar as cinco invariantes que impedem que voltem, sem tocar na direção de arte.

**Architecture:** Primeiro a régua (o item de maior risco, isolado, porque todo o resto se mede contra ela), depois as invariantes transversais (dinheiro, fios), depois os defeitos por seção, por último a altura do celular — que só se mede com todo o resto no lugar. Cada tarefa mede ANTES (tem que falhar), corrige, mede DEPOIS (tem que passar) e commita.

**Tech Stack:** Next.js 16.3.7, React 19.2.8, Tailwind 4, TypeScript 5, three/@react-three/fiber. Sem framework de teste no projeto — a verificação é por medida no navegador (ver Harness).

**Spec:** `docs/superpowers/specs/2026-10-16-acabamento-senior-design.md`

## Global Constraints

- **Régua: 80rem (`max-w-7xl`) em toda a página.** Nenhum container de 88rem sobrevive. Só o globo do hero pode ter x menor que a borda do conteúdo.
- **Nenhuma frase do dicionário (`src/i18n/pt.ts`, `en.ts`) muda de sentido.** Quebra de linha e caixa podem mudar; palavra não.
- **Nenhuma seção nova, nenhuma seção removida, nenhuma mudança na ordem da página.**
- **Nenhuma dependência nova.** Nem de produção, nem de desenvolvimento. (A medição roda pelo Playwright do MCP, fora do repo.)
- **`prefers-reduced-motion` continua parando tudo.** Nenhuma animação nova escapa da regra global de `globals.css`.
- **Comentários em português**, no tom do arquivo onde entram: explicam POR QUE o número é aquele, não o que a linha faz. É a convenção do projeto inteiro.
- **Classe Tailwind nunca colada a `${` de template literal** — não é extraída. Lição registrada do projeto.
- **Um commit por tarefa**, mensagem em português, com `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **`prompts.txt`** recebe o prompt do dia uma única vez (já recebeu: entradas 123 e 124).

## Review Focus

Cinco coisas que a espec implica, que nenhuma tarefa exercita por si, e que mordem um usuário real:

1. **Janela baixa e larga (1440×700).** O teto do globo é `100svh − 340px`; a 700 isso dá 360px e o hero tem que continuar inteiro, sem o disco invadir a faixa de integrações. → teste na Tarefa 1.
2. **O degrau 1400–1407px**, onde o container ainda não chegou a 80rem e a grade de três trilhas já ligou. É onde as contas se cruzam e onde o layout quebrou antes. → teste na Tarefa 1.
3. **Moeda sem casas decimais contra moeda com casas** (`$ 650` e `£ 155,00` na mesma coluna). O alinhamento à direita só resolve se a largura do dígito for tabular. → teste na Tarefa 2.
4. **`prefers-reduced-motion: reduce`** depois de mexer em trilho, carrossel e gráfico: o segmento tem que nascer cheio e o gráfico desenhado, não invisíveis. → teste na Tarefa 5.
5. **Teclado no formulário** depois de trocar o `<select>` nativo: abrir, navegar com setas, escolher com Enter, fechar com Esc, e o valor chegar ao envio. → teste na Tarefa 4.

---

## Harness de medição

Não há framework de teste no projeto e a espec descartou adicionar um (caminho C, YAGNI). A medição roda pelo Playwright do MCP, com a função abaixo, salva no scratchpad como `medir.js` e passada a `browser_run_code_unsafe` com `filename`.

Ela é o gate: **roda antes de cada tarefa (tem que acusar o defeito) e depois (tem que passar).**

```js
// scratchpad/medir.js — o gate das invariantes. Não entra no repo.
async (page) => {
  const LARGURAS = [320, 390, 768, 1024, 1280, 1400, 1440, 1920, 2560];
  const rel = {};
  for (const w of LARGURAS) {
    await page.setViewportSize({ width: w, height: w < 500 ? 844 : 900 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    rel[w] = await page.evaluate(() => {
      const x = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().left) : null; };
      // 1. REGUA: toda borda esquerda de conteudo no mesmo x
      const bordas = {
        header: x('header a[href="/"]'),
        heroKicker: x('#topo .t-kicker'),
        secoes: [...document.querySelectorAll('section[data-section] .t-kicker')].map(e => Math.round(e.getBoundingClientRect().left)),
      };
      // 2. SOBRA no pe de cada secao
      const sobras = [...document.querySelectorAll('section[data-section]')].map((s) => {
        const sr = s.getBoundingClientRect();
        let maior = -Infinity;
        s.querySelectorAll('*').forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.height > 0 && r.width > 0 && getComputedStyle(e).visibility !== 'hidden') maior = Math.max(maior, r.bottom);
        });
        return { id: s.dataset.section, sobra: Math.round(sr.bottom - maior) };
      });
      // 3. ESTOURO horizontal
      const estouro = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      // 4. ALTURA do documento
      const altura = document.body.scrollHeight;
      // 5. GLOBO: unico no autorizado a ter x menor que a borda
      const g = document.querySelector('.hero-globo');
      const globo = g ? Math.round(g.getBoundingClientRect().left) : null;
      return { bordas, sobras, estouro, altura, globo };
    });
  }
  return JSON.stringify(rel, null, 1);
}
```

**Como ler o resultado:**
- `bordas`: `header`, `heroKicker` e cada item de `secoes` têm que ser o MESMO número, em cada largura. Divergência = falha da invariante 4.1.
- `sobras`: todos os valores dentro de 8px entre si. Um valor 100+ acima dos vizinhos = sobra morta.
- `estouro`: tem que ser 0 em toda largura.
- `altura` em 390: alvo ~12.000.
- `globo`: o único que pode ser menor que `bordas.header`.

**Baseline a registrar antes da Tarefa 1** (rodar o harness no commit `91a3b81` e guardar a saída no scratchpad como `baseline.json`). Toda tarefa compara contra ele.

---

## Tarefa 1: A régua única, e o globo que sangra

O item de maior risco da onda. Isolado de propósito: tudo depois se mede contra a régua que sai daqui.

**Files:**
- Modify: `src/components/Hero.tsx:246`
- Modify: `src/app/hero.css` (blocos `--globo`, `.hero-globo`, `.hero-controle`, `.hero-linha`, e o comentário-cabeçalho)

**Interfaces:**
- Consumes: nada.
- Produces: a variável CSS `--sangria` em `.hero-cena`, lida por `.hero-globo` e pela primeira trilha de `.hero-linha`. Nenhuma outra tarefa a usa.

### A conta, por extenso

Hoje a cena de 1400+ é `var(--globo) | 1fr | var(--painel)` dentro de 88rem. O conteúdo de 88rem mede `1408 − 64` (os dois `px-8`) `= 1344`. Com painel 208 e dois respiros de 40, sobram 1.056 para globo + texto, e por isso o globo coube em 574.

Com 80rem o conteúdo passa a medir `1280 − 64 = 1216`. Tirando painel 208 e respiros 80, sobram **928** para globo + texto. O texto é 29rem (464px) e **não pode encolher** — é a medida de "Telegram no" em 80px mais folga, e é o que mantém o título em três linhas. Logo a primeira trilha mede `928 − 464 = 464`.

464 seria um globo pequeno demais. Daí a sangria: **a trilha mede 464, mas o globo mede 536 e começa 72px à ESQUERDA da borda do conteúdo.**

```
--sangria: 72px
--globo:   536px        (teto; o piso continua sendo a altura da janela)
trilha 1 = --globo − --sangria = 464px
464 (trilha 1) + 40 + 464 (texto) + 40 + 208 (painel) = 1216 ✓
```

Onde o globo cai, por janela (conteúdo começa em `(janela − 1280) / 2 + 32`):

| janela | borda do conteúdo | globo começa em | folga até a borda da janela |
|---|---|---|---|
| 1400 | 92 | 20 | 20px |
| 1440 | 112 | 40 | 40px |
| 1920 | 352 | 280 | 280px |
| 2560 | 672 | 600 | 600px |

Nunca é cortado, e acima de 1400 sempre lê como deslocamento deliberado. O teto de altura (`100svh − 340px`) não muda: ele veio da Tarefa de hoje de manhã e continua valendo.

- [ ] **Step 1: Rodar o harness e guardar o baseline**

Rodar `medir.js` via `browser_run_code_unsafe` e salvar a saída em `scratchpad/baseline.json`.

Esperado: FALHA da invariante da régua — em 1440, `bordas.header` = 107 e `bordas.heroKicker` ≈ 42 (ou equivalente). Os dois números TÊM que divergir, senão o defeito não existe e a tarefa não tem objeto.

- [ ] **Step 2: Tirar o 88rem do Hero**

Em `src/components/Hero.tsx:246`, trocar:

```
className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:flex lg:flex-1 lg:flex-col lg:px-8 lg:pt-28 min-[1400px]:max-w-[88rem]"
```

por:

```
className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:flex lg:flex-1 lg:flex-col lg:px-8 lg:pt-28"
```

E reescrever o comentário logo acima (linhas 242–245), que hoje explica a virada para 88rem, para registrar a virada de volta: uma régua só para a página inteira, e o globo sangrando por `--sangria`.

- [ ] **Step 3: `--sangria` e o novo teto do globo em `hero.css`**

No bloco `@media (min-width: 1400px)` de `.hero-cena`, trocar `--globo: min(574px, 100svh - 340px)` por:

```css
@media (min-width: 1400px) {
  .hero-cena {
    /* 536 e não 574: a régua caiu de 88rem para 80rem e o conteúdo perdeu
       128px. Com painel 208 e dois respiros de 40, sobram 928 para globo +
       texto; o texto é intocável (464 = a medida de "Telegram no" em 80px), e
       464 seria um disco pequeno demais. Daí a sangria: a TRILHA mede 464, o
       DISCO mede 536, e os 72 de diferença saem para fora da coluna. */
    --globo: min(536px, 100svh - 340px);
    --sangria: 72px;
  }
}
```

- [ ] **Step 4: O globo e a linha de controle leem a sangria**

No bloco `@media (min-width: 1400px)` de `.hero-globo`, trocar o `left` de 88rem por 80rem menos a sangria:

```css
@media (min-width: 1400px) {
  .hero-globo {
    top: 100px;
    /* Menos a sangria: o disco é a ÚNICA peça da página autorizada a começar
       antes da borda do conteúdo, e começa sempre pelo mesmo tanto. */
    left: calc((100% - min(100%, 80rem)) / 2 + 2rem - var(--sangria));
  }
}
```

Em `.hero-controle`, apagar o bloco inteiro de `@media (min-width: 1400px)` — ele só existia para trocar 80rem por 88rem, e agora o bloco de 1024px já põe a linha na borda certa. A linha de controle é TEXTO: ela fica na borda do conteúdo, não sangra.

- [ ] **Step 5: A primeira trilha da grade desconta a sangria**

Em `.hero-linha`, trocar `grid-template-columns: var(--globo) minmax(0, 1fr) var(--painel)` por:

```css
    /* A primeira trilha é o que sobra do disco DENTRO da coluna: ele mede
       `--globo` e começa `--sangria` antes, então ocupa a diferença. */
    grid-template-columns: calc(var(--globo) - var(--sangria)) minmax(0, 1fr) var(--painel);
```

- [ ] **Step 6: Atualizar o comentário-cabeçalho de `hero.css`**

O bloco de abertura (linhas 23–29, "A RÉGUA HORIZONTAL") e o comentário do teto do globo (linhas 31–47) citam 88rem e 574 e passam a mentir. Reescrever os dois com as contas do Step 3, mantendo o tom do arquivo.

- [ ] **Step 7: Medir**

Rodar `medir.js`.

Esperado:
- `bordas.header === bordas.heroKicker === cada item de bordas.secoes`, em TODAS as nove larguras.
- `globo < bordas.header` em 1400+ (é o único que pode).
- `estouro === 0` em todas.

- [ ] **Step 8: Os dois casos do Review Focus**

Medir também em **1440×700** (janela baixa) e em **1404×900** (o degrau onde o container ainda não chegou a 80rem e a grade de três trilhas já ligou).

Esperado em 1440×700: `--globo` resolve para `700 − 340 = 360px`, o hero não estoura e o pé do disco não cruza a faixa de integrações.
Esperado em 1404×900: régua alinhada, `estouro === 0`, título ainda em três linhas.

- [ ] **Step 9: Olhar**

Screenshot do hero em 1440×900 e em 390×844. O sangramento tem que ler como escolha — o disco saindo da coluna —, não como desalinhamento.

- [ ] **Step 10: Commit**

```bash
git add src/components/Hero.tsx src/app/hero.css
git commit -m "fix: uma regua so para a pagina, e o globo sangra"
```

---

## Tarefa 2: Um dinheiro

**Files:**
- Create: `src/lib/money.ts`
- Modify: `src/components/AwardsShowcase.tsx:553`
- Modify: `src/components/DashboardPreview.tsx:10`
- Modify: `src/components/howitworks/WonePanel.tsx:52`
- Modify: `src/components/demos/DeliveryDemo.tsx:105`
- Modify: `src/components/Highlights.tsx:208`
- Modify: a coluna PLANO da tabela de Pagamentos (localizar por `grep -rn "PLANO\|plano" src/components/sections/PaymentsSection.tsx src/components/CheckoutBoard.tsx`)

**Interfaces:**
- Produces:
  ```ts
  export type Moeda = "BRL" | "USD" | "EUR" | "GBP" | "MXN" | "ARS" | "COP";
  export function dinheiro(valor: number, moeda: Moeda): string;
  export const TABULAR = "tabular-nums";
  ```
  **`dinheiro` NÃO recebe o idioma do visitante, e é de propósito:** o separador
  segue a moeda. Um peso colombiano se escreve com ponto de milhar em PT e em
  EN; amarrá-lo ao idioma faria o mesmo preço mudar de forma quando alguém
  aperta EN no meio da página. Os cinco locais que hoje passam `locale` param
  de passar.
- Consumes: nada.

- [ ] **Step 1: Medir o defeito**

```bash
grep -rn "toLocaleString\|Intl.NumberFormat" --include=*.tsx --include=*.ts src | grep -v "money.ts"
```

Esperado: cinco ocorrências de dinheiro (AwardsShowcase, DashboardPreview, WonePanel, DeliveryDemo, Highlights). Se vierem menos de cinco, alguém já mexeu — reconferir antes de seguir.

- [ ] **Step 2: Escrever `src/lib/money.ts`**

```ts
/**
 * O dinheiro da página, num lugar só.
 *
 * Antes eram cinco: um `emDolar` em AwardsShowcase, dois `Intl.NumberFormat`
 * idênticos e independentes em DashboardPreview e WonePanel, e dois
 * `toLocaleString` inline em DeliveryDemo e Highlights. O resultado na tela
 * eram três gramáticas de número na mesma página — `$4,062` no gráfico (vírgula
 * de milhar), `$ 155.000` na tabela (ponto, e um espaço depois do símbolo) e
 * `R$ 197,00` no globo.
 *
 * A regra que esta tabela guarda: o separador segue a MOEDA, não o idioma do
 * visitante. Um peso colombiano se escreve com ponto de milhar para quem lê em
 * português e para quem lê em inglês — trocar isso pelo idioma faria o mesmo
 * preço mudar de forma no meio da página quando alguém aperta EN.
 *
 * As casas decimais também seguem a moeda, e por uma razão de leitura: moeda de
 * valor alto (peso argentino, peso colombiano) mostra inteiro, porque dois
 * dígitos de centavo em "155.000,00" só roubam atenção do que importa.
 */
const REGRA: Record<Moeda, { locale: string; casas: number }> = {
  BRL: { locale: "pt-BR", casas: 2 },
  USD: { locale: "en-US", casas: 2 },
  EUR: { locale: "pt-PT", casas: 2 },
  GBP: { locale: "en-GB", casas: 2 },
  MXN: { locale: "es-MX", casas: 0 },
  ARS: { locale: "es-AR", casas: 0 },
  COP: { locale: "es-CO", casas: 0 },
};

export type Moeda = keyof typeof REGRA;

/** O símbolo vem colado ao número: `$650`, não `$ 650`. */
const SIMBOLO: Record<Moeda, string> = {
  BRL: "R$", USD: "$", EUR: "€", GBP: "£", MXN: "$", ARS: "$", COP: "$",
};

const cache = new Map<string, Intl.NumberFormat>();

export function dinheiro(valor: number, moeda: Moeda): string {
  const { locale, casas } = REGRA[moeda];
  const chave = `${moeda}`;
  let fmt = cache.get(chave);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    cache.set(chave, fmt);
  }
  return `${SIMBOLO[moeda]}${fmt.format(valor)}`;
}

/**
 * A classe que toda pilha ou coluna de valor usa. Sem ela, o `6` e o `1` da
 * Geist têm larguras diferentes e uma coluna de preços fica esfarrapada — é o
 * defeito que a coluna PLANO da tabela de Pagamentos tinha.
 */
export const TABULAR = "tabular-nums";
```

- [ ] **Step 3: Trocar os cinco locais**

Em cada arquivo: apagar o formatador local e importar `dinheiro` (e `TABULAR` onde houver pilha ou coluna de valores). Manter o valor exibido igual ao de hoje EXCETO pelo espaço depois do símbolo, que sai.

- [ ] **Step 4: A coluna PLANO alinha à direita**

Na tabela de Pagamentos, a célula de valor ganha `text-right` e `tabular-nums`. O cabeçalho "PLANO" acompanha o alinhamento da coluna.

- [ ] **Step 5: Medir**

```bash
grep -rn "toLocaleString\|Intl.NumberFormat" --include=*.tsx --include=*.ts src | grep -v "src/lib/money.ts"
```
Esperado: **zero linhas** de dinheiro. (`globeMath.ts` e `HeroGlobe.tsx` usam `toFixed` para coordenadas — não são dinheiro e ficam.)

- [ ] **Step 6: O caso do Review Focus — moeda com e sem centavo na mesma coluna**

No navegador, medir a borda DIREITA de cada valor da coluna PLANO em 1440.
Esperado: todas iguais, dentro de 1px, com `$650` (sem casas) e `£155,00` (com casas) na mesma coluna.

- [ ] **Step 7: Commit**

```bash
git add src/lib/money.ts src/components/AwardsShowcase.tsx src/components/DashboardPreview.tsx src/components/howitworks/WonePanel.tsx src/components/demos/DeliveryDemo.tsx src/components/Highlights.tsx
git commit -m "fix: um formatador de dinheiro para a pagina inteira"
```

---

## Tarefa 3: Um fim de seção

**Files:**
- Modify: `src/components/Highlights.tsx` (seção Plataforma, `#destaques`)
- Modify: `src/components/FeatureCarousel.tsx` e/ou `src/components/sections/FeaturesSection.tsx` (`#recursos`)
- Modify: `src/components/AnalyticsSection.tsx` (`#analises`)

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Medir**

Rodar `medir.js`, olhar `sobras` em 1440.
Esperado: `destaques`, `recursos` e `analises` com valores 100–250px acima da mediana das outras seções.

- [ ] **Step 2: Reconciliar as colunas, seção por seção**

Regra: **nunca cortar `padding-block`** — o ritmo vertical é token (`--secao-y`) e continua sendo. O que se reconcilia é a coluna curta.

- `#destaques`: o cartão da direita termina ~200px antes da coluna da esquerda. Ou a grade de 2×2 de números passa a dividir a altura com o cartão (`align-items: stretch` e o cartão crescendo), ou o cartão recebe o conteúdo que hoje sobra no vazio. Escolher pelo que lê melhor e registrar a escolha em comentário.
- `#recursos`: ~115px entre a trilha de progresso e o fim. A trilha é o último elemento; o buraco é `padding-block` somado a margem que já não serve. Reduzir a margem, não o token.
- `#analises`: ~130px abaixo do cartão, mesma causa.

- [ ] **Step 3: Medir**

Rodar `medir.js`.
Esperado: todos os valores de `sobras` dentro de 8px entre si, em 1024, 1440 e 1920.

- [ ] **Step 4: Commit**

```bash
git add -A src/components
git commit -m "fix: nenhuma secao termina em vazio"
```

---

## Tarefa 4: Um controle de formulário

**Files:**
- Modify: `src/components/WaitlistForm.tsx:269` (o `<select>`) e a lista Cadastro/Levas/Convite da mesma seção

**Interfaces:** nenhuma nova exportada.

- [ ] **Step 1: Medir**

No navegador, em 1440, comparar altura, raio e cor de borda do campo Nacionalidade com os do campo E-mail.
Esperado: DIVERGEM (o nativo tem altura e seta do sistema).

- [ ] **Step 2: Trocar por um select próprio**

Exigências, nesta ordem de prioridade:
1. **Teclado não regride:** abre por Enter/Espaço/seta, navega por setas, escolhe por Enter, fecha por Esc, devolve o foco ao gatilho.
2. **Leitor de tela não regride:** rótulo associado, valor anunciado, estado aberto/fechado anunciado.
3. Altura, raio, borda e anel de foco idênticos aos dos campos irmãos.
4. O valor chega ao envio do formulário como chegava.

Se qualquer um dos três primeiros não for alcançável sem biblioteca (e não há dependência nova permitida), a alternativa é manter o `<select>` nativo e **estilizá-lo** (`appearance: none`, seta própria em `background-image`, altura e raio dos irmãos). Essa alternativa é aceitável e fecha o defeito visual sem risco nenhum de acessibilidade — **preferi-la se houver qualquer dúvida.**

- [ ] **Step 3: Fechar a lista Cadastro/Levas/Convite**

Hoje as duas primeiras linhas têm régua embaixo e a terceira não. Ou todas fecham, ou nenhuma. Escolher e aplicar.

- [ ] **Step 4: O caso do Review Focus — teclado**

Percorrer o formulário só com teclado: Tab chega a Nacionalidade, abre, escolhe outro país com setas, Enter confirma, Tab segue para Telegram.
Esperado: ordem Nome → E-mail → Nacionalidade → Telegram → WhatsApp → botão; o valor escolhido aparece no campo.

- [ ] **Step 5: Medir**

Altura, raio e cor de borda do Nacionalidade iguais aos do E-mail, no navegador.

- [ ] **Step 6: Commit**

```bash
git add src/components/WaitlistForm.tsx
git commit -m "fix: o campo de pais deixa de ser o do sistema"
```

---

## Tarefa 5: Uma escala de fios

**Files:**
- Modify: `src/app/globals.css` (a escala)
- Modify: `src/components/SegmentProgress.tsx:95,98`
- Modify: os componentes cujas divisórias usam opacidade fora da escala (achar por `grep -rn "cream/0\?[0-9]\+" --include=*.tsx src`)

**Interfaces:**
- Produces: tokens CSS de fio em `globals.css`. Nomes a escolher no padrão do arquivo; registrar no comentário quais três níveis existem e onde cada um se usa.

- [ ] **Step 1: Medir**

No navegador, medir o contraste do trilho vazio (`bg-cream/12`) contra cada fundo ink onde o `SegmentProgress` aparece (Recursos, Como funciona, Segurança, Prêmios).
Esperado: abaixo do piso — é por isso que a trilha parece ter segmentos de larguras diferentes quando o ativo está pela metade.

- [ ] **Step 2: Definir a escala**

Três níveis, um valor cada: régua de seção (a mais discreta), divisória interna, trilho de progresso (a mais forte das três, porque carrega informação). Escrever em `globals.css` com o comentário explicando por que o trilho é o mais forte.

- [ ] **Step 3: Aplicar**

`SegmentProgress.tsx:95,98` passam a ler o token do trilho. Toda divisória com opacidade fora da escala passa a ler o token do seu nível.

- [ ] **Step 4: O caso do Review Focus — movimento reduzido**

Com `prefers-reduced-motion: reduce` ligado (`browser_emulate_media`), recarregar e conferir: o segmento ativo nasce CHEIO (não invisível), o gráfico de Análises nasce desenhado, o carrossel não se move sozinho.

- [ ] **Step 5: Medir**

Contraste do trilho vazio acima do piso, em cada um dos quatro fundos. Nenhuma opacidade de fio fora da escala, por `grep`.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/SegmentProgress.tsx
git commit -m "fix: uma escala de fios, e o trilho vazio passa a se ler"
```

---

## Tarefa 6: O hero por dentro

**Files:**
- Modify: `src/components/hero/CountryTag.tsx` e/ou `src/components/hero/paises.ts` (colisão)
- Modify: `src/app/hero.css` (sublinhado no celular, kicker)
- Modify: `src/components/hero/HeroFacts.tsx` (as duas gramáticas de lista)

- [ ] **Step 1: Medir as quatro coisas**

1. Em 1440, listar os retângulos de todas as `CountryTag` e procurar interseção. Esperado: Cidade do México × Bogotá × a de Lima se cruzam.
2. Em 390, conferir se a palavra "automático" tem sublinhado. Esperado: NÃO tem; em 1440 tem.
3. Em 1440, contar as linhas do kicker do hero. Esperado: 2, com o traço de 24×1 só ao lado da primeira.
4. No painel HeroFacts, comparar o passo e o tamanho das seis fileiras com os da sublista "Independentes entre si." logo abaixo. Esperado: divergem.

- [ ] **Step 2: Resolver a colisão das etiquetas**

As posições saem de `globeMath.ts` a partir de lat/lon reais, então não dá para empurrar à mão sem mentir sobre a geografia. Duas saídas, nesta ordem de preferência:
1. **Teste de colisão em tempo de render:** medida a caixa de cada etiqueta, a que colidir com uma já posicionada se desloca no eixo vertical até caber, ou se esconde se não couber. É o que um mapa de verdade faz.
2. **Menos etiquetas visíveis por vez**, com as demais aparecendo conforme o globo gira.

Escolher 1 se o custo por quadro for zero (a posição só muda quando o globo gira, e o globo já recalcula); senão 2.

- [ ] **Step 3: O sublinhado de "automático" no celular**

Achar a regra em `hero.css` (`h1.hero-titulo` / `.hero-sublinha`) que só vale a partir de um degrau e fazê-la valer no celular também. Conferir que a espessura e o afastamento do sublinhado escalam com o tamanho do título — num título de 36px o sublinhado de um título de 80px fica grosso demais.

- [ ] **Step 4: O kicker em duas linhas**

Ou o traço de 24×1 acompanha o bloco inteiro (alinhado ao topo, não à primeira linha), ou o kicker não quebra em 1440. A espec fixou "kicker com traço 24×1 em todas as seções" — o traço fica; o que muda é como ele se relaciona com o bloco de duas linhas.

- [ ] **Step 5: Uma gramática de lista no painel**

As seis fileiras e a sublista "Independentes entre si." viram a mesma coisa, ou a sublista deixa de parecer uma lista (vira uma frase).

- [ ] **Step 6: Medir**

Repetir as quatro medidas do Step 1. Esperado: zero interseção entre etiquetas em 1024/1440/1920 e com o globo em três ângulos diferentes; sublinhado presente em 390 e em 1440; kicker resolvido; uma gramática de lista só.

- [ ] **Step 7: Commit**

```bash
git add src/components/hero src/app/hero.css
git commit -m "fix: etiquetas que nao colidem, sublinhado no celular e um kicker so"
```

---

## Tarefa 7: Como funciona

**Files:**
- Modify: `src/components/sections/HowItWorksSection.tsx` e/ou `src/components/howitworks/*`

- [ ] **Step 1: Medir**

Em 1440: a linha de base dos rótulos dos passos 01–04 e o topo do cartão do passo ativo; e a distância entre o pé do bloco de texto e o topo do aparelho.
Esperado: rótulos de uma linha ("Monte seu funil") e de duas ("Conecte seu gateway") com bases diferentes; vão de ~60px entre texto e aparelho, fora do ritmo da seção.

- [ ] **Step 2: Alinhar as bases**

Os quatro passos passam a partilhar a mesma linha de base, com o rótulo ancorado pelo TOPO e a caixa com altura igual à do maior. O cartão do passo ativo cresce sobre essa caixa sem empurrar a fileira.

- [ ] **Step 3: Fechar o vão**

Aproximar texto e aparelho até o vão entrar no ritmo vertical da seção.

- [ ] **Step 4: Medir**

Bases iguais dentro de 1px nos quatro passos, em 1024/1440/1920, com o passo ativo em cada uma das quatro posições. Vão dentro do ritmo.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/HowItWorksSection.tsx src/components/howitworks
git commit -m "fix: os quatro passos partilham a linha de base"
```

---

## Tarefa 8: Os cartões do carrossel de Recursos

**Files:**
- Modify: `src/components/FeatureCarousel.tsx`

- [ ] **Step 1: Medir**

Em 1440, o topo e a altura de cada um dos cinco cartões visíveis.
Esperado: topos em cinco valores diferentes (~60 a ~100), porque a escala por distância é ancorada pelo topo.

- [ ] **Step 2: Ancorar a escala pelo centro**

`transform-origin: center` em vez do padrão que está em uso, para que encolher não desça o cartão. A escala por distância é intencional e fica; o que sai é o desalinho que ela produz.

- [ ] **Step 3: Medir**

Os cinco cartões com o mesmo CENTRO vertical, dentro de 1px, em cada posição do carrossel.

- [ ] **Step 4: Commit**

```bash
git add src/components/FeatureCarousel.tsx
git commit -m "fix: os cartoes do carrossel escalam pelo centro"
```

---

## Tarefa 9: O gráfico de Análises

**Files:**
- Modify: `src/components/DashboardPreview.tsx:53` (o caminho da área) e `:127` (as linhas de grade)

- [ ] **Step 1: Medir**

Em 1440: existem três linhas de grade (`[0.25, 0.5, 0.75]`) e nenhum rótulo no eixo Y. E o degradê (`0.38 → 0`, vertical) deixa a área invisível nas horas em que a curva está baixa.

- [ ] **Step 2: Decidir o eixo Y**

Duas saídas, as duas legítimas:
1. **As linhas ganham escala:** três rótulos à esquerda, na mesma família mono do eixo X, com o valor formatado por `dinheiro()` da Tarefa 2.
2. **As linhas saem** e o gráfico fica com a linha, a área e o eixo X — a leitura passa a ser a forma da curva, e o número exato vive no `$4.062` e no `21h PICO`.

Preferir 1: a seção se chama Análises e um gráfico de análise com grade muda tem gosto de enfeite. Se 1 ficar apertado na largura do cartão em 1024, cair para 2 e registrar por quê.

- [ ] **Step 3: O degradê deixa de depender da altura absoluta**

A causa: o degradê é `objectBoundingBox` sobre a caixa inteira, então uma área baixa nasce já na parte transparente. A correção é o degradê ser função do dado — ancorado na curva, não na caixa. (`gradientUnits="userSpaceOnUse"` com `y1` no topo da curva e `y2` na linha de base resolve, e é uma linha.)

- [ ] **Step 4: Medir**

Em 1440 e 1024: a área tem preenchimento visível em TODA a largura, sem aresta vertical; o eixo Y tem rótulo ou não tem linha.

- [ ] **Step 5: Commit**

```bash
git add src/components/DashboardPreview.tsx
git commit -m "fix: o grafico ganha escala no eixo e area que nao corta"
```

---

## Tarefa 10: O rodapé sem vão

**Files:**
- Modify: `src/components/SiteFooter.tsx`

- [ ] **Step 1: Medir**

Em 1440, a borda direita da última coluna do rodapé contra a borda direita do conteúdo.
Esperado: vão de ~225px, porque a coluna "Empresa" se retira sozinha quando `footer.company` está vazio (`SiteFooter.tsx:42-46`) e hoje está.

- [ ] **Step 2: Reequilibrar**

A grade passa a distribuir o que existe em vez de reservar lugar para o que não existe. **Exigência dura:** quando `footer.company` for preenchido, a quarta coluna tem que voltar sozinha, sem nova mudança de código. Testar os dois estados.

- [ ] **Step 3: Medir os dois estados**

Estado atual (company vazio): sem vão à direita.
Estado futuro: preencher `footer.company.email` temporariamente no dicionário, recarregar, conferir que a coluna Empresa aparece e a grade acomoda — e DESFAZER o preenchimento temporário.

- [ ] **Step 4: Commit**

```bash
git add src/components/SiteFooter.tsx
git commit -m "fix: o rodape distribui o que existe"
```

---

## Tarefa 11: A altura no celular

Por último, porque só se mede com todo o resto no lugar: as dez tarefas anteriores já mudam a altura.

**Files:** a definir pela medição — provavelmente `src/app/globals.css` (`--secao-y`, `--secao-y-curta`) e os degraus de respiro das seções mais altas.

- [ ] **Step 1: Medir**

Rodar `medir.js` e ler `altura` em 390.
Baseline antes da onda: 16.589px. Alvo: ~12.000px.

- [ ] **Step 2: Achar onde está a altura**

Em 390, medir a altura de cada seção e ordenar. Atacar as três maiores primeiro — é onde 28% moram.

- [ ] **Step 3: Reduzir, só por respiro**

Nenhum conteúdo sai. O que cai é respiro vertical que não paga o preço no celular: `--secao-y` no degrau do celular, margens entre blocos dentro das seções mais altas, e altura de elementos que no celular não precisam da medida do desktop.

- [ ] **Step 4: Medir, e parar antes de custar legibilidade**

Rodar `medir.js` em 320 e 390.
Esperado: `altura` ≈ 12.000, `estouro === 0`, nada cortado, nada colado.

**Se o alvo só for alcançável apertando o respiro ao ponto de a leitura sofrer, PARAR antes e reportar o número alcançado.** A espec autoriza explicitamente, e um celular legível a 13.500 é melhor que um apertado a 12.000.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "fix: o celular encolhe por respiro, sem perder conteudo"
```

---

## Fechamento da onda

- [ ] **Step 1: `pnpm build`** — tem que passar limpo.
- [ ] **Step 2: `pnpm lint`** — tem que passar limpo.
- [ ] **Step 3: Rodar `medir.js` inteiro** nas nove larguras e comparar com `baseline.json`.

Tabela final, toda linha com número:

| O que se mede | Critério |
|---|---|
| Bordas esquerdas (cabeçalho, kickers, fatos do hero) | mesmo x em 320→2560; só o globo diverge |
| Sobra no pé de cada seção | todas dentro de 8px |
| Valores de uma mesma coluna | mesma borda direita; `tabular-nums` |
| Formatadores de dinheiro fora de `money.ts` | zero |
| Contraste do trilho vazio | acima do piso, nos quatro fundos |
| Altura em 390px | ~12.000 (ou o número alcançado, reportado) |
| Estouro horizontal | zero em toda largura |
| Nacionalidade × E-mail | altura, raio e borda iguais |
| Ordem de foco no formulário | Nome → E-mail → Nacionalidade → Telegram → WhatsApp → botão |

- [ ] **Step 4: Mostrar ao dono** — screenshots de antes e depois das seções que ele apontou (Hero, Como funciona, Recursos/Pagamentos/Análises), em 1440 e em 390.
