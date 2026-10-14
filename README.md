# Wone — landing

## O que é

Uma landing de página única para a lista de espera do Wone, em Next.js 16 (App
Router, Turbopack), React 19, Tailwind 4 e uma cena 3D em `@react-three/fiber`.
Tudo o que o visitante vê está em `src/app/page.tsx` e nos componentes de
`src/components/`; o texto não está no meio do JSX — mora em `src/i18n/pt.ts` e
`src/i18n/en.ts`, e `pt.ts` é a fonte do tipo `Content` (chave nova ou removida
entra nos dois arquivos na mesma edição, senão o build quebra).

A única rota de servidor é `POST /api/waitlist`: valida o cadastro, aplica um
freio de mão em memória (`src/lib/rate-limit.ts`) e entrega o lead para
`saveWaitlistEntry` (`src/lib/waitlist.ts`). Não há banco de dados, sessão nem
login — o destino do lead é um webhook, configurado por variável de ambiente.

No ar em <https://pedrinho.wone.bot>, servido por um container do Easypanel com
o Cloudflare na frente. É esse "na frente" que ocupa metade deste arquivo: boa
parte do comportamento visível em produção — cache, performance, imagem que não
atualiza — não é decidida pelo código deste repositório, e sim por três chaves
no painel do Cloudflare. Quem não sabe disso perde uma tarde. Nós perdemos.

## Rodar local

Pré-requisitos reais, não os genéricos: **Node ≥ 20.9** (o `next@16.3.7` declara
isso em `engines`) e **pnpm 12.4.2** (fixado em `packageManager`; o pnpm ≥ 10 se
auto-atualiza para essa versão sozinho, sem corepack).

```bash
pnpm install
cp .env.example .env.local   # e ajuste os valores
pnpm dev                     # http://localhost:3000
```

Sem `.env.local` a página sobe e funciona: as variáveis todas têm queda
elegante. O que você perde é exatamente o que elas ligam — veja a seção
seguinte, e repare que o erro mais caro delas é não parecer erro nenhum.

Outros comandos: `pnpm build` (o build de produção, que é o que a medição usa),
`pnpm start` (sobe o build), `pnpm lint`, `npx tsc --noEmit` e `pnpm perf`
(seção *Medir performance*).

## Variáveis de ambiente (e por que cada uma exige redeploy)

Há duas naturezas de variável aqui, e confundi-las é a fonte de quase todo
"mudei no painel e não mudou no site".

**`NEXT_PUBLIC_*` é embutida no bundle durante o `next build`.** O valor é
substituído no código JavaScript que vai para o navegador. Trocá-la no Easypanel
e reiniciar o container **não faz nada**: o arquivo servido já foi escrito com o
valor antigo (ou sem valor nenhum). Exige **novo deploy** — build novo.

**Sem o prefixo, a variável é só do servidor.** Fica no container, nunca chega
ao navegador, e um restart já a enxerga.

| Variável | Natureza | Sem ela |
| --- | --- | --- |
| `NEXT_PUBLIC_TELEGRAM_URL` | build | a tela de sucesso não oferece Telegram nenhum |
| `NEXT_PUBLIC_SITE_URL` | build | cai no domínio de produção escrito em `src/lib/site.ts` |
| `NEXT_PUBLIC_ARTE_V` | gerada no build | não configurar; veja *Artes e cache* |
| `WAITLIST_WEBHOOK_URL` | servidor | o lead morre no log do container |

### `NEXT_PUBLIC_TELEGRAM_URL` — hoje ausente no build de produção

Para onde o visitante é levado depois de entrar na fila (`WaitlistForm.tsx`: um
`window.open` no sucesso e o mesmo link no botão da tela de sucesso, que é a
rede de segurança para quando o bloqueador de pop-up barra o primeiro — e aí a
frase muda, porque o retorno do `window.open` diz se a aba abriu).

Está **faltando no build que está no ar**. Não é dedução: o bundle servido hoje
carrega a referência não substituída,

```js
ay = G.default.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/"
```

e, no navegador, `env` não tem essa chave — então valia o `??`. O resultado, no
build em produção, é que quem acaba de se cadastrar vai para a **home do
Telegram**, não para o canal: o funil termina numa tela genérica, e nada no site
denuncia isso, porque o botão funciona.

O fallback `https://t.me/` **saiu do código**: sem a variável, a tela de sucesso
agora mostra apenas a confirmação e a nota — nem botão de Telegram, nem a frase
dizendo que uma aba foi aberta. Prometer um canal que não existe é pior do que
não prometer nada. A variável continua sendo a primeira coisa a arrumar no
Easypanel e, por ser `NEXT_PUBLIC_*`, **tem de existir na hora do `next build`**:
definir no painel e reiniciar o container não traz o botão de volta — só o
deploy seguinte traz.

### `NEXT_PUBLIC_SITE_URL`

Usada pelas metatags do `layout.tsx`, pelo `robots.ts` e pelo `sitemap.ts`, por
meio de `src/lib/site.ts`. O padrão em produção é `https://pedrinho.wone.bot`, e
esse padrão existe por causa de um defeito real: sem a variável, o site publicava
`og:image` apontando para `http://localhost:3000/images/og.png`, e todo
link compartilhado em WhatsApp, Telegram ou LinkedIn saía sem prévia. Hoje o
esquecimento degrada para o endereço certo em vez de degradar para a máquina de
quem buildou — mas **se o domínio mudar, a variável passa a ser obrigatória**, e
mudá-la exige novo deploy.

### `NEXT_PUBLIC_ARTE_V` — não configure

Gerada pelo próprio build, em `next.config.ts` (`String(Date.now())`), e lida
por `src/lib/arte.ts`. No bundle de produção de hoje ela vale `1791917724473`.
Definir à mão é pedir para congelar a arte na versão de um deploy antigo. Veja
*Artes e cache (`?v=`)*.

### `WAITLIST_WEBHOOK_URL` — o lead

Qualquer endereço que aceite um `POST` com JSON: função da Supabase, webhook do
n8n/Make/Zapier, canal do Discord, rota do back-end. O corpo é o cadastro
(`name`, `email`, `telegram`, `nationality`, `phone`, `createdAt`), e
`nationality` é um dos cinco códigos de `NATIONALITIES` (`src/lib/waitlist.ts`)
ou vem ausente — a rota recusa qualquer outro valor.

É a variável mais perigosa da lista, porque **a sua ausência é silenciosa dos
dois lados**: `saveWaitlistEntry` registra o cadastro no log do container (com
e-mail e telefone mascarados), avisa em `console.warn` que não há destino, e
**retorna sem erro** — o visitante vê "você está na fila". O log do container
some no próximo deploy. Lead perdido com tela de sucesso é pior que lead perdido
com tela de erro, porque ninguém vai atrás. Por isso, quando o destino *existe*
e falha, a falha é propagada de propósito: a rota responde 500 e o visitante vê
o erro.

Não é `NEXT_PUBLIC_*`: um restart do container já a enxerga.

## Deploy (Easypanel)

O build roda com **Nixpacks**, e o plano está em `nixpacks.toml` — Node 22, pnpm
10 (que se auto-atualiza para 12.4.2), `pnpm install --frozen-lockfile` e
`./node_modules/.bin/next build`. O arquivo tem o porquê de cada linha; três
defeitos do plano auto-detectado são explicados lá, inclusive por que o
`corepack` foi removido do caminho.

Duas coisas do lado do painel que o arquivo não consegue garantir:

1. **Os campos Install / Build / Start Command do serviço ficam VAZIOS**, e
   nenhum override de Deploy command. O Easypanel aplica esses campos como a
   camada "environment" do Nixpacks, que vence o arquivo (`provider < file <
   environment < CLI`) — qualquer coisa digitada ali ganha em silêncio.
2. **O builder precisa de pelo menos 2 GB.** `next build` neste repositório
   chega a ~1,1 GB de RSS. Se a build morrer com *Killed* / exit 137, é isso. A
   saída documentada, se não houver como dar memória, é desistir do Turbopack:
   `cmds = ['./node_modules/.bin/next build --webpack']`.

### Como se publica

```bash
git push origin main      # 1. o código sobe
curl "<webhook do Easypanel>"   # 2. um GET dispara o rebuild
```

O endereço do webhook **tem um token e não entra no repositório**. Ele mora em
`prompts-originais.local.txt`, na raiz, que é ignorado pelo git exatamente para
isso. Não copie o token para cá, para um commit, nem para uma mensagem.

E a parte que mais surpreende: **o deploy não limpa o cache do Cloudflare.** O
container novo sobe com o conteúdo novo e a borda continua servindo o que tem.
Hoje isso é inofensivo porque o HTML não é cacheado na borda (`CF-Cache-Status:
DYNAMIC`); vira um problema no dia em que alguém criar uma Cache Rule sem ler a
seção seguinte.

## Cloudflare: o que está ligado e o que recomendamos

Medido em produção, não suposto. Reproduza com
`curl -sI https://pedrinho.wone.bot/`.

### O que está ligado hoje

**HTML sem cache de borda.** `CF-Cache-Status: DYNAMIC` em toda visita: cada
pedido atravessa o Atlântico até o container. TTFB de 0,4 a 0,8 s, e o próprio
Lighthouse estima **−650 ms** se a página fosse servida da borda. É o maior
ganho isolado que sobrou nesta landing, e ele não está no código — está num
painel.

**Browser Cache TTL reescrevendo o `Cache-Control` para 4 horas.** `next.config.ts`
manda `no-cache` em `/placas`, `/images` e `/arte`; o que chega ao navegador é
`max-age=14400`. Conferido hoje: `/placas/placa-100k.webp` respondeu
`Cache-Control: max-age=14400`, com a origem pedindo o contrário. **Foi isso que
escondeu as placas novas por uma tarde** — as recortadas, com acrílico
translúcido, subiram e quem já tinha visitado o site continuou vendo as antigas,
chapadas, enquanto a origem respondia a versão certa a quem chegasse de
primeira. A história completa está em `src/lib/arte.ts`.

**Bot Fight Mode.** O Cloudflare injeta, no fim do `<body>`,
`/cdn-cgi/challenge-platform/scripts/jsd/main.js` (confere-se no HTML servido;
ele só aparece quando o pedido traz User-Agent de navegador). Custo medido no
celular: **450–550 ms de bootup de JavaScript**, dos quais uma **long task de
~270 ms**. Bloqueado na medição, o PageSpeed sobe **5 a 7 pontos**. É proteção
que esta landing não precisa — a única rota pública é `/api/waitlist`, e ela já
tem freio próprio em `src/lib/rate-limit.ts`.

**Web Analytics (beacon).** `static.cloudflareinsights.com/beacon.min.js/...`,
também injetado pela borda. ~60 ms, e é a **única fonte de dados de visita que o
projeto tem** — não há Google Analytics, nem Plausible, nem nada no código.
**Manter.** Os 60 ms pagam saber se alguém entrou no site.

### A armadilha da Cache Rule

O Next manda, no HTML, `Cache-Control: s-maxage=31536000`. Um ano. Uma Cache
Rule configurada para "respeitar os cabeçalhos da origem" **congelaria a página
na borda por um ano** — e, como o deploy (push + webhook) **não faz purge**, o
site pararia no tempo sem ninguém entender por quê. O `s-maxage` enorme é a
convenção do Next para CDNs que ele mesmo revalida; o Cloudflare não participa
desse acordo.

A regra certa ignora a origem e define **Edge TTL curto: 300 s**, que é
exatamente o `x-nextjs-stale-time: 300` que o Next envia junto — a janela em que
ele próprio considera a página fresca. A alternativa, se um dia se quiser TTL
longo, é acrescentar um purge ao deploy; enquanto o deploy for só push +
webhook, 300 s é o número.

### O que recomendamos, em uma linha cada

- **Cache Rule** para o HTML com **Edge TTL de 300 s** (ignorando os cabeçalhos
  da origem) — os −650 ms, sem o risco do ano.
- **Bot Fight Mode: off** — +5 a 7 pontos de PageSpeed.
- **Browser Cache TTL: Respect Existing Headers** — devolve a `next.config.ts` o
  controle do cache das artes.
- **Web Analytics: manter ligado.**

E como conferir que cada uma pegou, sem acreditar no painel:

```bash
# Cache Rule: a 2ª chamada deve dar HIT (a 1ª esquenta a borda)
curl -sI https://pedrinho.wone.bot/ | grep -i cf-cache-status

# Bot Fight Mode off: esta busca deve ficar VAZIA
curl -s https://pedrinho.wone.bot/ -H "User-Agent: Mozilla/5.0 (Linux; Android 13; Pixel 7) \
AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36" \
  | grep -o 'cdn-cgi/challenge-platform[^"]*'

# Browser Cache TTL respeitando a origem: deve voltar no-cache, não max-age=14400
curl -sI https://pedrinho.wone.bot/placas/placa-100k.webp | grep -i cache-control

# Web Analytics vivo: esta busca deve CONTINUAR achando o beacon
curl -s https://pedrinho.wone.bot/ -H "User-Agent: Mozilla/5.0 (Linux; Android 13; Pixel 7) \
AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36" \
  | grep -o 'cloudflareinsights.com/beacon[^"]*'
```

O User-Agent de navegador não é frescura: com o `curl` padrão o Cloudflare não
injeta nem o desafio nem o beacon, e a conferência dá falso negativo nos dois.

## Medir performance

```bash
pnpm perf                                  # build + start + 3 rodadas mobile + 1 desktop
pnpm perf --runs=5                         # mediana mais firme
pnpm perf --no-build                       # reaproveita o .next já buildado
pnpm perf --url=https://pedrinho.wone.bot  # mede produção, sem buildar nada
pnpm perf --gate                           # sai 1 se a mediana mobile < 95
```

`scripts/perf.mjs` roda o **Lighthouse 13.5.0** (versão fixada: comparar 12 com
13 é comparar duas réguas) três vezes contra um `next start` próprio — nunca
contra o `next dev` de quem está trabalhando, e nunca na porta 3000, que é dele.
Imprime uma tabela com **mediana** (não média: o ruído local é assimétrico, uma
rodada ruim afunda a média e a mediana a ignora) e, na última coluna, o
`benchmarkIndex`.

**A porta é dele; o `.next`, não.** Sem `--url=`, `pnpm perf` começa por um
`next build` — e essa build escreve na mesma pasta `.next` que o `next dev` de
quem está trabalhando usa, `.next/dev/types` inclusive, de onde já saiu um
`routes.d.ts` com uma chave `}` sobrando que reprovou a etapa de TypeScript com
um `error TS1128` numa linha que ninguém escreveu (quando a build falha,
`scripts/perf.mjs` imprime esse palpite). Então, com o dev de pé: meça produção
(`--url=https://pedrinho.wone.bot`, que não builda nada) ou feche o dev antes de
rodar. `--no-build` também evita a colisão, mas só mede algo honesto se já
existir uma build de produção em `.next` — é ela que o `next start` do script
serve.

**Leia o `benchmarkIndex` antes de qualquer outra coluna.** Ele é a velocidade da
máquina medida no início da rodada, e é o chão de toda a simulação que vem
depois. A mesma página, no mesmo commit, na mesma noite, deu 64 e 80 — com
índices 1402 e 1800. Não foram duas medidas da página; foram duas medidas de
duas máquinas. **Rodadas cujo índice difere mais de ~20% não se comparam**, e o
script avisa quando isso acontece.

O que se mede aqui é **delta entre dois commits**, na mesma máquina, na mesma
sessão. **O portão oficial é o PageSpeed Insights mobile ≥ 95**, porque ele roda
em hardware padronizado do Google, longe do nosso processador e das nossas abas.
Para dizer "estamos em 97", é no PSI — e com o Cloudflare na frente, medir
produção no PSI é a única forma de ver o efeito das três chaves do painel.

Os JSON vão para `.lighthouse/`, ignorada pelo git: descrevem uma máquina e um
instante, não o código.

## Artes e cache (`?v=`)

As placas e as joias moram em `public/` com nome fixo — `placa-500k.webp` é
sempre `placa-500k.webp`, por mais que o arquivo por trás mude. Para todo cache
do caminho, endereço igual é arquivo igual.

Daí o carimbo: `arte("/placas/placa-500k.webp")` devolve
`/placas/placa-500k.webp?v=1791917724473`, onde o número é o instante do build
(`NEXT_PUBLIC_ARTE_V`, gerada em `next.config.ts`). Muda a cada deploy e **só** a
cada deploy: a arte recarrega uma vez quando sobe algo novo e fica guardada até
o próximo.

Três motivos para isso existir, todos aprendidos à força:

1. Os cabeçalhos da origem não bastam — o Cloudflare reescreve o `no-cache` para
   4 horas, e isso só se desliga no painel dele.
2. `Ctrl+Shift+R` não alcança estas imagens: elas não vêm no HTML, são buscadas
   por JavaScript quando a seção entra em cena, e o furo de cache do
   recarregamento forçado não vale para o que é pedido depois.
3. Um endereço novo é, para navegador, CDN e proxy, um arquivo que ninguém tem.
   Ninguém precisa pedir nada a ninguém.

**Toda arte servida de `public/` tem de passar por `arte()`** — a da placa e a da
joia, tanto no pré-carregamento do carrossel quanto na textura da cena 3D. Se as
duas pontas pedirem endereços diferentes, o pré-carregamento aquece uma entrada
que a cena não vai usar e a troca de marco volta a esperar a rede.

E o lado chato de trocar uma arte: substituir o arquivo em `public/` **não basta
sem um deploy**, porque é o deploy que troca o `?v=`. Trocar a arte é: arquivo
novo, push, webhook.
