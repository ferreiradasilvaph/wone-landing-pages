# Leva 2 da criatividade — ligar o CSS pronto ao JSX

**Estado em 18/10 (retomada depois de o PC desligar):** `src/app/leva2.css` (763 linhas)
está COMPLETO e importado em `globals.css`. Cada bloco dele é a espec da peça: a classe,
o gatilho, os tempos e o porquê. No JSX só três peças foram ligadas: a paralaxe do palco
(`palco-painel`/`palco-aparelho`, em `OperationStage`), a batida do cabeçalho do chat
(`apa-chegada`, em `CustomerDevice`) e o reatraso do "digitando" (`howitworks.css`).

Este plano é o que FALTA: pendurar as classes/atributos nos componentes, com o estado e
as medidas que cada uma pede. Nenhuma linha nova de CSS deve ser necessária; se for,
é sinal de desvio da espec — reler o bloco correspondente do `leva2.css` antes.

## Regras duras (as mesmas das levas 1 e 2 — valem palavra por palavra)

1. **Repouso = estado final.** O HTML do servidor mostra a peça pronta. Quem pendura
   classe de animação é o componente, e só quando há movimento permitido.
2. **`matchMedia` só dentro de efeito**, nunca no render. Primeiro render do cliente ==
   servidor. Padrão já existente: `TrackingFlow`, `FeatureCarousel` (`reduced` via
   `useEffect`), `useContagem` (arme só abaixo da dobra).
3. **Mover é `transform`/`opacity`.** Zero layout, CLS 0. Toda caixa que vai receber algo
   (chip, bolinha) está reservada desde o primeiro quadro.
4. **Nada de número ou texto novo no dicionário.** Só rótulos que já existem
   (`ui.simulation`, `phone.approved` = "Pagamento aprovado", `highlights.demos.delivery.done`
   = "Acesso liberado").
5. **Medir o DOM só quando o estado muda ou no `resize`**, nunca por quadro.
6. **Um relógio por viewport**: reaproveitar os relógios que já existem (o `setTimeout` do
   `TrackingFlow`, o `AUTOPLAY` do carrossel, o `useStepShow`). Nenhum `setInterval` novo.
7. Comentários no estilo do repo (português, o PORQUÊ, com as medidas). Não mexer em
   `leva2.css` a não ser para corrigir um seletor que não case com o DOM real — e aí
   anotar o motivo no próprio CSS.
8. `pnpm lint` e `pnpm exec tsc --noEmit` limpos ao fim de cada tarefa.

## Tarefa A — "Como funciona" (arquivos: `howitworks/WonePanel.tsx`, `howitworks/StepRail.tsx`)

A1. **`apa-pulso`** — o anel que bate uma vez na pílula "Webhook ativo" (`WonePanel.tsx`
    ~linha 300, `<Chip tone="ok">{panel.webhook}</Chip>`, dentro do `StepLayer` do passo 01).
    - Envolver o Chip num `<span className="relative ml-auto shrink-0">` (o `ml-auto shrink-0`
      sai do Chip e vai para o wrapper) e pôr dentro um
      `<span aria-hidden className="apa-pulso pointer-events-none absolute inset-0 rounded-full border border-emerald-400 opacity-0" />`.
    - Gatilho é o `data-hiw-on="1"` do `StepLayer` (já existe) — nenhuma lógica nova.
      A regra `[data-hiw-on="1"] .apa-pulso` usa `both` e termina em `opacity: 0`; fora do
      ativo não há animação, então o anel nasce invisível por utilitário (`opacity-0`) e a
      animação sobrescreve (`from` 0.55 → `to` 0). Verificar no navegador que no passo 01
      ativo o anel aparece e some e que em repouso não há anel.

A2. **`hiw-rolo` / `hiw-desc`** — o numeral ativo rola 8px e a descrição entra atrás
    (`StepRail.tsx`).
    - Só o numeral ATIVO recebe `hiw-rolo`, e precisa RECOMEÇAR a cada troca: dar ao
      `<span>` do numeral uma `key` que muda quando ele vira ativo (ex.: `isActive ? "on-" + active : "off"`),
      remontando só o que vira ativo. Mesmo para a `<p>` da descrição: `key={active}` + classe `hiw-desc`.
    - Só com movimento permitido: `show.reduced === false` (já vem de `useStepShow`). Com
      `reduced`, sem classe e sem `key` dinâmica (não remontar à toa).
    - Não tocar no `h-10`/`h-[42px]` (CLS 0). Comentário curto explicando a `key`.

## Tarefa B — "Recursos" (arquivos: `FeatureCarousel.tsx`, `sections/FeaturesSection.tsx`)

B1. **`data-feat`** no slide do CENTRO (`FeatureCarousel.tsx`, o `div.feature-slot`):
    `data-feat={isCenter && demo ? "1" : "0"}` onde
    `demo = onScreen && !tabHidden && !reduced && !touching`.
    - `touching` já existe (vai a `true` em `onPointerDown` e a `false` em `endDrag`) —
      reusar, não criar estado duplicado. Assim o arrasto devolve ao estado final e o soltar
      recomeça ("clicar no cartão do meio repete"), exatamente como a espec do CSS descreve.

B2. **As dez placas** (`FeatureMockup`): pendurar as classes com `--d` inline
    (`style={{ "--d": "120ms" } as CSSProperties}`), sempre com o estado final como repouso:
    - `plans`: cada `<li>` `feat-acende` com `--d` 0/120/240ms (a régua percorrida).
    - `bump`: a caixa (o `span` laranja com o Check) `feat-marca`; o `+$57.00`
      `feat-entra-x` com `--d` 420ms.
    - `packs`: a linha `feat-entra` (0ms); o Chip "Prévia" `feat-revela` com `--d` 250ms.
    - `subscription`: Chip + o ARO: um `<svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0">`
      antes do Chip, no mesmo `flex items-center gap-2`, com dois `<circle cx=10 cy=10 r=8 fill=none>`
      — o trilho `stroke="currentColor"` em `text-cream/15` (strokeWidth 1) e o fio laranja
      `className="feat-aro-fio text-brand"` strokeWidth 1, `transform="rotate(-90 10 10)"`.
      O Chip do lembrete entra com `feat-entra` `--d` 900ms (quando o aro fecha).
    - `upsell`: `<li>` 1 `feat-acende` 0ms; `<li>` 2 `feat-entra` 400ms ("400ms entre
      Comprou e Recusou").
    - `openPix`: o cursor (`span.h-4.w-px.bg-brand`) `feat-cursor`.
    - `testMode`: o Chip "Sem cobrança real" `feat-pisca` `--d` 300ms.
    - `remarketing`: as duas barras internas (`span.block.h-full.w-1/2`) `feat-barra`
      com `--d` 0 e 220ms.
    - `delivery`: o Chip "Acesso liberado" `feat-chip` `--d` 300ms.
    - `ai`: os quatro `<li>` `feat-entra` com `--d` 0/90/180/270ms (cascata).
    O `Chip` aceita `className` mas NÃO `style`, e o kit não ganha prop por causa disto:
    nos Chips que precisam de atraso, envolver num `<span className="inline-flex self-start feat-…" style={{--d}}>`
    (e tirar o `self-start` do Chip). Onde o atraso é 0, a classe vai direto no Chip.

B3. **`feat-marcador`** — o sublinhado que desliza no índice 01-10 (`FeaturesSection.tsx`):
    - A `<ol>` ganha `relative` e um filho `<li aria-hidden role="presentation">`? NÃO — filho
      de `<ol>` tem de ser `<li>`; então o marcador fica FORA: envolver a `<ol>` num
      `<div className="relative mt-1 hidden lg:block">` (o `mt-1`/`hidden lg:grid` da `ol` se
      ajustam) com `<span aria-hidden className="feat-marcador pointer-events-none absolute top-0 left-0 h-px w-px bg-brand opacity-0">`
      (um nó só). O botão ativo é medido: `getBoundingClientRect()` do botão relativo ao do
      wrapper; escreve `--x` (left do TEXTO do título, isto é, do segundo `<span>` do botão),
      `--y` (bottom desse span + 2px) e `--w` (width do span em px — o nó mede 1px e
      `scaleX(var(--w))` dá a largura). Opacity 1 depois da primeira medida.
    - Medir num `useEffect` que depende de `active` e num listener de `resize`
      (coalescido em rAF). Guardar refs dos dez spans de título num `useRef<(HTMLElement|null)[]>`.
    - Abaixo de `lg` o wrapper é `hidden`: não medir se `offsetParent === null`.

B4. **Setas**: nos dois botões das setas, somar `seta-prev` / `seta-next` à classe `seta`,
    e o ícone `ArrowLeft`/`ArrowRight` recebe `seta-interna`.

## Tarefa C — "Pagamentos" (arquivos: `CheckoutBoard.tsx`, `TrackingFlow.tsx`, `sections/PaymentsSection.tsx`)

C1. **Tabela**: o `<button>` da linha ganha `pais-linha`; o `FlagMark` ganha
    `pais-bandeira` (via `className`, somando ao `h-6 w-9 shrink-0`); cada `Chip` da fileira
    "Paga com" ganha `pais-chip` (eles são os únicos filhos do `span.flex-wrap`, então o
    `nth-child` do CSS casa).

C2. **O checkout roda a simulação** (`CheckoutBoard.tsx`, painel aberto):
    - Estado `sim: "idle" | "rodando" | "aprovado"` (reset para `idle` ao trocar país ou
      método). Clique no `CtaButton` (tirar `disabled`; `loading` enquanto roda):
      `rodando` → `setTimeout` de 700ms (com cleanup no efeito) → `aprovado`. Clicar de novo
      em `aprovado` roda de novo.
    - Rótulo do botão: `idle`/`rodando` = `{checkout.payWith} {metodoAtivo}`;
      `aprovado` = `phone.approved` ("Pagamento aprovado"). Pegar `phone` de `useContent()`.
    - **A bolinha** (só `xl:`, enquanto `rodando`): a fileira de métodos+botão (o
      `div.flex.flex-wrap.items-center.gap-3`) ganha `relative`; dentro, quando `rodando` e com
      movimento permitido:
      `<span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 hidden xl:block"><span className="pix-carro"><span className="bolinha" style={{"--cx":"-5px","--cy":"0px"}}><i/><i/><i/><i/></span></span></span>`.
      `.bolinha` e os quatro `<i>` são o contrato da leva 1 (`leva1.css`; ver `DeliveryDemo.tsx:156`).
    - **"Acesso liberado"** quando `aprovado`: no bloco da esquerda, a linha do rótulo vira
      `<span className="flex h-7 items-center gap-3"><span className="t-label">{ui.simulation}</span>{aprovado ? <Chip tone="ok" className={movimento ? "pix-liberado" : ""}>{highlights.demos.delivery.done}</Chip> : null}</span>`
      — a altura de 28px (`h-7`) está reservada desde o primeiro quadro, então o chip entra
      sem mover a fileira (CLS 0). `movimento` = estado `reduced === false` via `matchMedia`
      em efeito (padrão do `TrackingFlow`).
    - Com `reduced`, o clique ainda funciona (700ms → aprovado), só sem bolinha e sem classe.

C3. **O rastreio** (`TrackingFlow.tsx`):
    - A `<ol>` já é `relative`. Guardar refs dos cinco nós redondos (`span.h-8.w-8`).
    - **`rastro-carro`**: `<span aria-hidden className="rastro-carro pointer-events-none absolute top-0 left-[0.9375rem] z-20 hidden lg:block">`
      com a `.bolinha` dentro (`--cx: 0px; --cy: -5px`, cauda para cima), com
      `style.transform = translateY(y px)` onde `y` = `offsetTop + 16` do nó de índice
      `max(0, lit - 1)` (medido quando `animated` muda; `offsetTop` basta porque os `<li>` são
      `relative` dentro da `ol` — somar `li.offsetTop + no.offsetTop`). Montada só com `inView && !reduced`;
      a bolinha FICA no último nó quando a sequência acaba (repouso = estado final). A
      transição de 900ms linear vem do CSS: a perna dura o mesmo que o relógio dos nós.
      Posicionar horizontalmente no centro do nó: `left` = 1rem menos 0 (a `.bolinha` tem caixa
      zero e as cópias penduram por margem), ou seja `left-4`.
    - **`rastro-utm`**: o `<code>utm_source</code>` do passo 01 ganha um VIAJANTE: no passo 02,
      ao fim da fileira (`div.mt-1.5.flex`), um `<code aria-hidden className="invisible">utm_source</code>`
      reserva o POUSO desde o primeiro quadro (é renderizado sempre, inclusive no servidor,
      para o layout não mudar). O viajante é um `<code aria-hidden className="rastro-utm absolute …">utm_source</code>`
      posicionado sobre o original (medir `getBoundingClientRect` do original e do pouso,
      relativos à `ol`, no instante em que a perna 1 começa — quando `animated` passa de 1
      para 2 — e escrever `transform: translate(dx, dy)`); quando a bolinha segue para o nó 3
      (`animated` 2→3) volta a `translate(0,0)`. Só em `lg+` e com movimento; sem isso, nada é
      montado. O original fica onde está (é o registro).
    - Reusar o `useEffect` do relógio que já existe para derivar os instantes; NÃO criar
      outro relógio.

C4. **As quatro garantias** (`PaymentsSection.tsx`):
    - A `<ol>` das garantias ganha `ref`, e classes `gar` (quando ARMADA) e `gar--roda`
      (quando chega à vista). Reusar `useContagem(ref, 720, { amount: 0.3 })`: `animar` → `gar`;
      `animar && t > 0` → `gar--roda` (é exatamente o par da `trilha`/`trilha--roda` em
      `AwardsPrefaceSection.tsx:206`). 720ms = 3×80 de cascata + 480 do curso.
    - Cada numeral `<p className="tnum …">` ganha `gar-num` e `style={{ "--d": posicao*80 + "ms" }}`.
    - `PaymentsSection` já é `"use client"`; precisa de `useRef` e do import de `useContagem`.

## Verificação (depois das três tarefas)

- `pnpm exec tsc --noEmit` e `pnpm lint` limpos.
- No navegador (dev server), a 1440×900: cada peça roda uma vez, no gatilho certo, e o
  repouso é o estado final; CLS 0 na troca de passo, no carrossel e no checkout; com
  `prefers-reduced-motion` nada anima e tudo está no estado final.
- Commit único da leva 2; o bloco [157] já está em `prompts.txt`.
