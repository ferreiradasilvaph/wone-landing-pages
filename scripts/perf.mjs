/**
 * `npm run perf` — o portão de medição da landing.
 *
 * ------------------------------------------------------------------------------
 * POR QUE ESTE ARQUIVO EXISTE
 * ------------------------------------------------------------------------------
 * Porque "ficou mais rápido" não é uma frase verificável, e porque o Lighthouse
 * rodado à mão, uma vez, em terminal diferente, com o Chrome aberto do lado,
 * mentiu para nós repetidas vezes. A mesma página, na mesma noite, no mesmo
 * commit, deu 64 e deu 80. Não havia nada de errado com a página: havia uma
 * máquina diferente embaixo de cada rodada.
 *
 * ------------------------------------------------------------------------------
 * POR QUE O `benchmarkIndex` É A PRIMEIRA COLUNA QUE SE OLHA
 * ------------------------------------------------------------------------------
 * O Lighthouse não mede o tempo real do seu notebook: ele simula uma rede 4G e
 * uma CPU lenta a partir do tempo real. Para simular, ele precisa saber o quão
 * rápida é a máquina de agora — e mede isso no início de cada rodada, gravando
 * o resultado em `environment.benchmarkIndex`. Esse número é o chão de toda a
 * aritmética que vem depois.
 *
 * As duas rodadas que deram 64 e 80 tinham `benchmarkIndex` 1402 e 1800. Não
 * foram duas medidas da mesma página: foram duas medidas de duas máquinas. A
 * de 1402 estava com o processador disputado por outra coisa (uma build, um
 * navegador com cinquenta abas, o antivírus acordando), e o Lighthouse, ao
 * extrapolar de uma base pior, puniu a página por um atraso que não é dela.
 *
 * Daí a regra prática que esta tabela serve para você poder aplicar: rodadas
 * cujo `benchmarkIndex` difere mais de ~20% NÃO SE COMPARAM. Se o índice caiu,
 * feche o que estiver pesando e meça de novo; não comemore nem se desespere com
 * o delta. O script avisa na saída quando a dispersão passa desse limite.
 *
 * ------------------------------------------------------------------------------
 * O PORTÃO REAL É O PSI; AQUI SE MEDEM DELTAS
 * ------------------------------------------------------------------------------
 * O número que vale é o do PageSpeed Insights, porque ele roda em hardware
 * padronizado do Google, longe do nosso processador e das nossas abas. O que se
 * mede aqui é a DIFERENÇA entre dois commits na mesma máquina, na mesma sessão,
 * com `benchmarkIndex` parecido — para isso a medição local é ótima e barata.
 * Para dizer "estamos em 97", não: isso se confere no PSI.
 *
 * Por isso a mediana, e não a média, de N rodadas (padrão 3): o ruído do
 * Lighthouse local é assimétrico — ele não produz rodadas boas demais, produz
 * rodadas ruins demais, quando algo rouba CPU no meio. A média afunda com uma
 * rodada ruim; a mediana a ignora.
 *
 * ------------------------------------------------------------------------------
 * COMO USAR
 * ------------------------------------------------------------------------------
 *   node scripts/perf.mjs                      # build + start + 3 rodadas mobile + 1 desktop
 *   node scripts/perf.mjs --runs=5             # mais rodadas, mediana mais firme
 *   node scripts/perf.mjs --no-build           # reaproveita o .next já buildado
 *   node scripts/perf.mjs --gate               # sai 1 se a mediana mobile de desempenho < 0.95
 *                                              # (corte do PSI; veja LIMIAR_PORTAO)
 *   node scripts/perf.mjs --url=https://pedrinho.wone.bot   # mede produção, sem buildar nada
 *
 * ------------------------------------------------------------------------------
 * DECISÕES DE IMPLEMENTAÇÃO, E O QUE FOI TENTADO E REVERTIDO
 * ------------------------------------------------------------------------------
 * - Mede-se `next start`, nunca `next dev`. O servidor de desenvolvimento serve
 *   bundles sem minificação, com HMR e source maps embutidos; medir ali dá um
 *   número que não existe para ninguém. É também por isso que este script sobe
 *   um servidor próprio em vez de apontar para o `localhost:3000` de quem está
 *   desenvolvendo — além de não poder derrubar o que não é dele.
 *
 * - A porta começa em 3002 e sobe até achar uma livre. 3000 é do `next dev` de
 *   quem está trabalhando e 3001 é o segundo que o Next escolhe sozinho quando
 *   a 3000 está ocupada; começar em 3002 evita roubar as duas.
 *
 * - "Livre" é decidido por DUAS perguntas, e isso custou uma medição inteira.
 *   A primeira versão só tentava abrir um socket em `127.0.0.1:3002`; deu certo,
 *   o script declarou a porta livre e subiu o `next start` ali. Só que a 3002
 *   já estava ocupada por um `next start` de OUTRO projeto, escutando em `::` —
 *   e no Windows abrir o IPv4 por cima disso não falha. O resultado: dois
 *   servidores na mesma porta, `localhost` resolvendo para `::1` e o Lighthouse
 *   medindo, por três rodadas, a página do outro projeto. A tabela saiu
 *   plausível (54/54/69) e o elemento do LCP entregou o disfarce: "Portal do
 *   Lojista - Login", texto que não existe nesta landing.
 *   Agora: a porta só vale se um socket em pilha dupla subir ali E nenhuma das
 *   duas famílias (`127.0.0.1` e `[::1]`) responder a um HTTP. E o servidor sobe
 *   com `-H 127.0.0.1`, medido em `http://127.0.0.1:<porta>/`, para que não
 *   reste ambiguidade sobre qual dos dois loopbacks o Chrome visitou.
 *
 * - Antes de medir, três requisições de aquecimento. Um `next start` recém-subido
 *   paga a primeira visita com o disco. A evidência veio da rodada contaminada
 *   descrita no item acima — era o servidor do outro projeto, mas era um
 *   `next start` igual ao nosso: FCP 2,24 s na primeira rodada e 0,80 s na
 *   terceira, com `benchmarkIndex` praticamente igual, sem nada mudar entre elas.
 *   Sem aquecer, a mediana de três rodadas é a mediana de um servidor frio — o
 *   único estado em que o site nunca está, em produção.
 *
 * - O servidor é derrubado em `finally`, sempre, inclusive quando o Lighthouse
 *   estoura, e a porta é conferida depois do kill antes de o script dizer que
 *   derrubou. Um `next start` esquecido envenena a rodada seguinte, que mediria
 *   o commit anterior sem avisar — e "servidor derrubado" impresso por fé é a
 *   mentira mais cara que este arquivo poderia contar. No Windows a morte é por
 *   `taskkill /T /F` e não por `child.kill()`: o `.cmd` do Next é um shim que
 *   lança um `node` filho, e matar só o shim deixaria o filho com a porta.
 *
 * - O Lighthouse é invocado por `node <npx-cli.js>`, sem shell, quando o
 *   `npx-cli.js` da instalação do Node é encontrado; só cai para `npx` com
 *   `shell: true` se não achar. O motivo é quoting: com `shell: true` o Node
 *   concatena os argumentos e entrega a string para o `cmd.exe`, que reinterpreta
 *   aspas por conta própria — é por isso que ele emite o DEP0190 nesse modo.
 *   Sem shell, cada argumento viaja como argumento e `--chrome-flags` chega
 *   inteiro. Por precaução nenhum argumento montado aqui contém espaço (nem
 *   aspas internas em `--chrome-flags`) e o `--output-path` é relativo à raiz do
 *   repositório, para que o caminho da pasta não possa trazer um espaço consigo.
 *
 * - O elemento do LCP é lido de `largest-contentful-paint-element` OU de
 *   `lcp-breakdown-insight`. O Lighthouse 13 removeu a primeira auditoria e
 *   declara, no `replacesAudits` da segunda, que ela tomou o lugar — os
 *   relatórios antigos do repositório (12.8.2) ainda têm a antiga. Ler as duas
 *   deixa o script comparar o passado com o presente.
 *
 * - `CHROME_PATH` é definido na mão quando não existe no ambiente. O Lighthouse
 *   acha o Chrome sozinho na maioria dos casos, mas não quando roda por `npx`
 *   fora do PATH do usuário; definir é mais curto que depurar.
 *
 * - Os JSON vão para `.lighthouse/` (ignorada pelo git, como já eram os
 *   `lighthouse-*.report.json` da raiz): são algumas centenas de kB cada, com
 *   screenshot em base64 dentro, e descrevem uma máquina e um instante — não
 *   são fonte, são prova descartável.
 */

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as esperar } from "node:timers/promises";
import path from "node:path";
import process from "node:process";

/* A raiz do repositório, deduzida da posição deste arquivo: o script funciona
   chamado de qualquer pasta, inclusive pelo `npm run perf` de um subdiretório. */
const RAIZ = path.resolve(import.meta.dirname, "..");
const PASTA_SAIDA = path.join(RAIZ, ".lighthouse");

/* Versão fixada de propósito. O Lighthouse muda o peso das auditorias e o
   algoritmo de simulação entre versões maiores — comparar 12 com 13 é comparar
   duas réguas. Mudar este número é um ato deliberado, que invalida as medições
   anteriores e pede baseline novo. */
const LIGHTHOUSE = "lighthouse@13.5.0";

/* Onde o Chrome costuma estar no Windows. A primeira que existir vale. */
const CHROMES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const PORTA_INICIAL = 3002;
/* O corte do `--gate`. É o número que se exige do PSI, não desta máquina: o
   baseline local de 2026-10-14, no HEAD limpo, deu mediana mobile 69 com
   `benchmarkIndex` 976 — uma máquina ocupada dividida com outros processos.
   Usar `--gate` aqui só faz sentido quando o `benchmarkIndex` da rodada está na
   mesma faixa daquele em que a meta foi batida; para o dia a dia, o que importa
   é o delta entre dois commits medidos em sequência. */
const LIMIAR_PORTAO = 0.95;
/* Acima disso, duas rodadas mediram máquinas diferentes — veja o cabeçalho. */
const DISPERSAO_ACEITAVEL = 0.2;

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------

function lerArgumentos(argv) {
  const opcoes = { build: true, runs: 3, gate: false, url: null };
  for (const arg of argv) {
    if (arg === "--no-build") opcoes.build = false;
    else if (arg === "--gate") opcoes.gate = true;
    else if (arg.startsWith("--runs=")) opcoes.runs = Number(arg.slice(7));
    else if (arg.startsWith("--url=")) opcoes.url = arg.slice(6);
    else {
      console.error(`perf: argumento desconhecido: ${arg}`);
      console.error("perf: use --no-build, --runs=N, --gate, --url=<url>");
      process.exit(2);
    }
  }
  if (!Number.isInteger(opcoes.runs) || opcoes.runs < 1) {
    console.error(`perf: --runs precisa ser um inteiro >= 1 (veio ${opcoes.runs})`);
    process.exit(2);
  }
  /* Medir uma URL externa e buildar são coisas excludentes: com `--url` não há
     o que buildar nem o que subir. Avisar é melhor que ignorar em silêncio. */
  if (opcoes.url && !opcoes.build) {
    console.warn("perf: --no-build é redundante com --url (nada é buildado).");
  }
  return opcoes;
}

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

function acharChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const achado = CHROMES.find((caminho) => existsSync(caminho));
  if (!achado) {
    console.warn(
      "perf: CHROME_PATH não definido e nenhum chrome.exe nos lugares de sempre;\n" +
        "      deixando o Lighthouse procurar sozinho (pode falhar).",
    );
    return null;
  }
  return achado;
}

/* O `npx-cli.js` que vem com a instalação do Node. Existindo, roda-se o
   Lighthouse por `node <ele>` e nenhum shell entra no caminho — veja o
   cabeçalho, item quoting. */
function acharNpxCli() {
  const candidato = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npx-cli.js",
  );
  return existsSync(candidato) ? candidato : null;
}

// ---------------------------------------------------------------------------
// Porta e servidor
// ---------------------------------------------------------------------------

/* Sem `host`: o Node sobe em `::` com pilha dupla, o que reserva as duas
   famílias de uma vez. É a diferença entre este teste e o da primeira versão,
   que fixava `127.0.0.1` e por isso não via o servidor alheio em `::`. Com
   pilha dupla, a 3002 ocupada passou a reprovar aqui, como devia. */
function bindLivre(porta) {
  return new Promise((resolve) => {
    const servidor = createServer();
    servidor.once("error", () => resolve(false));
    servidor.once("listening", () => servidor.close(() => resolve(true)));
    servidor.listen(porta);
  });
}

/* A segunda pergunta, e a que não se deixa enganar: alguém responde HTTP aí?
   Um `fetch` que falha é o sinal bom. Fica mesmo com o bind de pilha dupla
   acertando, porque no Windows um teste de bind é só uma opinião — o sistema
   deixa dois sockets dividirem a mesma porta em mais situações do que seria
   razoável, e foi exatamente por confiar no bind que três rodadas mediram a
   página de outro projeto. Os dois loopbacks são consultados porque um servidor
   em `::` some do teste IPv4 e vice-versa. Serve também para conferir, depois
   do kill, que a porta de fato ficou vazia. */
async function alguemResponde(porta) {
  for (const hospedeiro of ["127.0.0.1", "[::1]"]) {
    try {
      await fetch(`http://${hospedeiro}:${porta}/`, {
        redirect: "manual",
        signal: AbortSignal.timeout(2000),
      });
      return true;
    } catch {
      /* Conexão recusada é o que se espera de uma porta livre. */
    }
  }
  return false;
}

async function portaLivre(inicio) {
  for (let porta = inicio; porta < inicio + 50; porta += 1) {
    if (!(await bindLivre(porta))) continue;
    if (await alguemResponde(porta)) {
      console.log(`perf: porta ${porta} aceita bind mas já responde HTTP; pulando`);
      continue;
    }
    return porta;
  }
  throw new Error(`perf: nenhuma porta livre entre ${inicio} e ${inicio + 49}`);
}

/* O shim do Next: `.cmd` no Windows, script sh no resto. Chamar o shim em vez
   de `node node_modules/next/dist/bin/next` preserva o `NODE_PATH` que o pnpm
   escreve dentro dele — sem isso a resolução de peer deps do Next fica por
   sorte. O preço é precisar de `shell: true` no Windows, onde o Node se recusa
   a lançar um `.cmd` sem shell desde a correção do CVE-2024-27980.
   E aí vem a segunda sutileza: com `shell: true` E um array de argumentos o
   Node emite o DEP0190 ("the arguments are not escaped, only concatenated") no
   meio da saída. Um aviso de segurança atravessado na tabela da medição é
   ruído que ninguém lê depois da terceira vez. Então, no Windows, a linha de
   comando é montada aqui, com o caminho do shim entre aspas — é o que o Node
   faria, só que dito em voz alta e com o caminho protegido. */
function lancarNext(args) {
  if (process.platform === "win32") {
    const shim = path.join(RAIZ, "node_modules", ".bin", "next.cmd");
    return { comando: `"${shim}" ${args.join(" ")}`, args: [], shell: true };
  }
  return { comando: path.join(RAIZ, "node_modules", ".bin", "next"), args, shell: false };
}

function rodarNext(args) {
  const { comando, args: argumentos, shell } = lancarNext(args);
  const inicio = Date.now();
  const r = spawnSync(comando, argumentos, { cwd: RAIZ, stdio: "inherit", shell });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    /* O palpite que economiza meia hora. `.next` é compartilhado com o
       `next dev` de quem está desenvolvendo, e o typegen do Next já entregou
       `.next/dev/types/routes.d.ts` com uma chave `}` sobrando — 18 abrindo,
       19 fechando — o que reprova a etapa de TypeScript da build com um
       `error TS1128` numa linha de arquivo que ninguém escreveu. O arquivo é
       gerado e ignorado pelo git; apagar a pasta `.next/dev/types` faz o
       servidor de desenvolvimento escrevê-la de novo. */
    if (args[0] === "build") {
      console.error(
        "perf: se o erro acima aponta para .next/dev/types/*.d.ts, não é o seu código:\n" +
          "      é o typegen do `next dev` escrevendo um arquivo torto no .next compartilhado.",
      );
    }
    throw new Error(`perf: "next ${args.join(" ")}" saiu com código ${r.status}`);
  }
  return Date.now() - inicio;
}

function matarArvore(filho) {
  if (!filho || filho.exitCode !== null || filho.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(filho.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-filho.pid, "SIGTERM");
    } catch {
      filho.kill("SIGTERM");
    }
  }
}

/* Dizer "servidor derrubado" e deixar a porta ocupada é pior que não dizer
   nada: a rodada seguinte mediria este commit achando que mede o próximo. Então
   a frase só sai depois de conferida. */
async function derrubarEConferir(filho, porta) {
  matarArvore(filho);
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    if (!(await alguemResponde(porta))) {
      console.log("perf: servidor derrubado");
      return;
    }
    await esperar(250);
  }
  console.error(
    `perf: ATENÇÃO — algo continua respondendo na porta ${porta} depois do kill.\n` +
      "      Veja quem é antes da próxima medição: " +
      `Get-NetTCPConnection -LocalPort ${porta} -State Listen`,
  );
}

async function esperar200(url, limiteMs = 90_000) {
  const prazo = Date.now() + limiteMs;
  let ultimoErro = "sem tentativa";
  while (Date.now() < prazo) {
    try {
      const resposta = await fetch(url, { redirect: "manual" });
      if (resposta.status === 200) return;
      ultimoErro = `HTTP ${resposta.status}`;
    } catch (erro) {
      ultimoErro = erro instanceof Error ? erro.message : String(erro);
    }
    await esperar(500);
  }
  throw new Error(`perf: ${url} não respondeu 200 em ${limiteMs / 1000}s (${ultimoErro})`);
}

// ---------------------------------------------------------------------------
// Lighthouse
// ---------------------------------------------------------------------------

/* `nome` é só o nome do arquivo; o caminho é montado relativo à raiz para que
   nenhum argumento com espaço chegue a uma linha de comando. */
function rodarLighthouse({ url, nome, extras, chrome, npxCli }) {
  const relativo = path.posix.join(".lighthouse", `${nome}.json`);
  const args = [
    "--yes",
    LIGHTHOUSE,
    url,
    "--only-categories=performance,accessibility",
    ...extras,
    "--output=json",
    `--output-path=${relativo}`,
    "--chrome-flags=--headless=new",
    "--quiet",
  ];

  const env = { ...process.env };
  if (chrome) env.CHROME_PATH = chrome;

  const r = npxCli
    ? spawnSync(process.execPath, [npxCli, ...args], { cwd: RAIZ, stdio: "inherit", env })
    : spawnSync("npx", args, { cwd: RAIZ, stdio: "inherit", env, shell: true });

  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`perf: lighthouse saiu com código ${r.status}`);

  const absoluto = path.join(RAIZ, ".lighthouse", `${nome}.json`);
  if (!existsSync(absoluto)) {
    throw new Error(`perf: o Lighthouse não escreveu ${absoluto}`);
  }
  return absoluto;
}

/* O nó do elemento do LCP pode estar solto na lista de detalhes (Lighthouse 13,
   `lcp-breakdown-insight`) ou dentro de uma coluna de tabela (Lighthouse 12,
   `largest-contentful-paint-element`). Em vez de escrever os dois caminhos,
   procura-se o primeiro objeto `type: "node"` da árvore. */
function acharNo(valor, profundidade = 0) {
  if (!valor || typeof valor !== "object" || profundidade > 8) return null;
  if (valor.type === "node") return valor;
  const filhos = Array.isArray(valor) ? valor : Object.values(valor);
  for (const filho of filhos) {
    const achado = acharNo(filho, profundidade + 1);
    if (achado) return achado;
  }
  return null;
}

function elementoLcp(auditorias) {
  const auditoria =
    auditorias["largest-contentful-paint-element"] ?? auditorias["lcp-breakdown-insight"];
  const no = acharNo(auditoria?.details);
  if (!no) return "—";
  const texto = no.nodeLabel || no.selector || no.snippet || "—";
  return texto.replace(/\s+/g, " ").trim();
}

function lerRelatorio(arquivo) {
  const r = JSON.parse(readFileSync(arquivo, "utf8"));
  const numero = (id) => r.audits?.[id]?.numericValue ?? null;
  return {
    arquivo,
    versao: r.lighthouseVersion,
    desempenho: r.categories?.performance?.score ?? null,
    acessibilidade: r.categories?.accessibility?.score ?? null,
    lcp: numero("largest-contentful-paint"),
    fcp: numero("first-contentful-paint"),
    tbt: numero("total-blocking-time"),
    cls: numero("cumulative-layout-shift"),
    si: numero("speed-index"),
    elementoLcp: elementoLcp(r.audits ?? {}),
    benchmark: r.environment?.benchmarkIndex ?? null,
  };
}

// ---------------------------------------------------------------------------
// Estatística e tabela
// ---------------------------------------------------------------------------

/* Mediana de verdade: com N par, a média dos dois centrais. Com N ímpar — o
   caso de sempre, porque o padrão é 3 — é o do meio, e nenhuma rodada ruim
   contamina o resultado. */
function mediana(valores) {
  const limpos = valores.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (limpos.length === 0) return null;
  const ordenados = [...limpos].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1
    ? ordenados[meio]
    : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

const pontos = (s) => (typeof s === "number" ? String(Math.round(s * 100)) : "—");
const ms = (v) => (typeof v === "number" ? `${Math.round(v)} ms` : "—");
const seg = (v) => (typeof v === "number" ? `${(v / 1000).toFixed(2)} s` : "—");
const tres = (v) => (typeof v === "number" ? v.toFixed(3) : "—");
const inteiro = (v) => (typeof v === "number" ? String(Math.round(v)) : "—");

function montarTabela(colunas, linhas) {
  const larguras = colunas.map((coluna, i) =>
    Math.max(coluna.length, ...linhas.map((linha) => String(linha[i] ?? "").length)),
  );
  const formatar = (celulas) =>
    celulas
      .map((celula, i) => (i === 0 ? String(celula).padEnd(larguras[i]) : String(celula).padStart(larguras[i])))
      .join("  ");
  const regua = larguras.map((l) => "-".repeat(l)).join("  ");
  return [formatar(colunas), regua, ...linhas.map(formatar)].join("\n");
}

function relatorioDeTexto({ alvo, opcoes, mobile, desktop, med, avisos }) {
  const colunas = [
    "rodada",
    "desemp.",
    "acess.",
    "LCP",
    "FCP",
    "TBT",
    "CLS",
    "SI",
    "bench",
  ];
  const linha = (nome, m) => [
    nome,
    pontos(m.desempenho),
    pontos(m.acessibilidade),
    seg(m.lcp),
    seg(m.fcp),
    ms(m.tbt),
    tres(m.cls),
    seg(m.si),
    inteiro(m.benchmark),
  ];

  const linhas = mobile.map((m, i) => linha(`mobile ${i + 1}`, m));
  linhas.push([
    "mediana",
    pontos(med.desempenho),
    pontos(med.acessibilidade),
    seg(med.lcp),
    seg(med.fcp),
    ms(med.tbt),
    tres(med.cls),
    seg(med.si),
    inteiro(med.benchmark),
  ]);
  if (desktop) linhas.push(linha("desktop", desktop));

  const partes = [
    "",
    `alvo:        ${alvo}`,
    `lighthouse:  ${mobile[0]?.versao ?? "?"} (fixado em ${LIGHTHOUSE})`,
    `rodadas:     ${opcoes.runs} mobile + ${desktop ? "1" : "0"} desktop`,
    "",
    montarTabela(colunas, linhas),
    "",
    "elemento do LCP:",
    ...mobile.map((m, i) => `  mobile ${i + 1}  ${m.elementoLcp}`),
    ...(desktop ? [`  desktop   ${desktop.elementoLcp}`] : []),
    "",
    `benchmarkIndex mediano: ${inteiro(med.benchmark)} — o chão da simulação.`,
    "Rodadas com índices que diferem mais de ~20% não se comparam: a mesma",
    "página deu 64 e 80 na mesma noite, com índices 1402 e 1800.",
    "O portão real é o PSI (hardware do Google); isto aqui serve para deltas.",
  ];
  if (avisos.length > 0) partes.push("", ...avisos.map((a) => `AVISO: ${a}`));
  partes.push("");
  return partes.join("\n");
}

// ---------------------------------------------------------------------------
// Programa
// ---------------------------------------------------------------------------

async function principal() {
  const opcoes = lerArgumentos(process.argv.slice(2));
  const chrome = acharChrome();
  const npxCli = acharNpxCli();

  /* A pasta é recriada a cada rodada. Deixar o JSON da medição anterior
     conviver com a de agora é como deixar um `next start` velho na porta: no
     dia seguinte ninguém sabe qual arquivo é de qual commit. */
  rmSync(PASTA_SAIDA, { recursive: true, force: true });
  mkdirSync(PASTA_SAIDA, { recursive: true });

  let servidor = null;
  let porta = null;
  let alvo = opcoes.url;

  try {
    if (!opcoes.url) {
      if (opcoes.build) {
        console.log("perf: next build");
        const msBuild = rodarNext(["build"]);
        console.log(`perf: build em ${(msBuild / 1000).toFixed(1)}s`);
      } else {
        console.log("perf: --no-build, reaproveitando o .next existente");
      }

      porta = await portaLivre(PORTA_INICIAL);
      /* 127.0.0.1 literal, nunca `localhost`: `localhost` resolve para `::1`
         antes do IPv4 e foi assim que a medição foi parar no servidor de outro
         projeto. Veja o cabeçalho. */
      alvo = `http://127.0.0.1:${porta}/`;
      console.log(`perf: next start -H 127.0.0.1 -p ${porta}`);

      const { comando, args, shell } = lancarNext([
        "start",
        "-H",
        "127.0.0.1",
        "-p",
        String(porta),
      ]);
      servidor = spawn(comando, args, {
        cwd: RAIZ,
        stdio: "ignore",
        shell,
        /* Fora do Windows o grupo próprio é o que permite matar o shim e o
           filho de uma vez, com `process.kill(-pid)`. */
        detached: process.platform !== "win32",
      });
      servidor.on("error", (erro) => {
        console.error(`perf: falha ao subir o servidor: ${erro.message}`);
      });

      await esperar200(alvo);
      /* Aquecimento: a primeira visita a um `next start` frio paga o disco e
         sai com FCP quase três vezes pior — 2,24 s contra 0,80 s medidos no
         mesmo commit. Produção nunca está nesse estado. */
      for (let i = 0; i < 3; i += 1) {
        await fetch(alvo, { redirect: "manual" }).catch(() => {});
      }
      console.log(`perf: servidor de pé e aquecido em ${alvo}`);
    } else {
      console.log("perf: medindo URL externa, sem build e sem servidor local");
    }

    const mobile = [];
    for (let i = 1; i <= opcoes.runs; i += 1) {
      console.log(`perf: lighthouse mobile ${i}/${opcoes.runs}`);
      mobile.push(
        lerRelatorio(
          rodarLighthouse({
            url: alvo,
            nome: `mobile-${i}`,
            extras: [
              "--form-factor=mobile",
              "--screenEmulation.mobile",
              "--throttling-method=simulate",
            ],
            chrome,
            npxCli,
          }),
        ),
      );
    }

    console.log("perf: lighthouse desktop 1/1");
    const desktop = lerRelatorio(
      rodarLighthouse({
        url: alvo,
        nome: "desktop",
        /* `--preset=desktop` já troca form factor, tela e throttling de uma vez;
           é a forma documentada de medir desktop e não se mistura com os flags
           de mobile. Uma rodada só: desktop serve de sanidade, o produto é
           visto no telefone. */
        extras: ["--preset=desktop"],
        chrome,
        npxCli,
      }),
    );

    const med = {
      desempenho: mediana(mobile.map((m) => m.desempenho)),
      acessibilidade: mediana(mobile.map((m) => m.acessibilidade)),
      lcp: mediana(mobile.map((m) => m.lcp)),
      fcp: mediana(mobile.map((m) => m.fcp)),
      tbt: mediana(mobile.map((m) => m.tbt)),
      cls: mediana(mobile.map((m) => m.cls)),
      si: mediana(mobile.map((m) => m.si)),
      benchmark: mediana(mobile.map((m) => m.benchmark)),
    };

    const avisos = [];
    const indices = mobile.map((m) => m.benchmark).filter((v) => typeof v === "number");
    if (indices.length > 1) {
      const menor = Math.min(...indices);
      const maior = Math.max(...indices);
      const dispersao = (maior - menor) / maior;
      if (dispersao > DISPERSAO_ACEITAVEL) {
        avisos.push(
          `benchmarkIndex variou ${(dispersao * 100).toFixed(0)}% entre as rodadas ` +
            `(${Math.round(menor)} a ${Math.round(maior)}): a máquina não ficou parada. ` +
            `Feche o que estiver pesando e meça de novo antes de tirar conclusão do delta.`,
        );
      }
    }

    const texto = relatorioDeTexto({ alvo, opcoes, mobile, desktop, med, avisos });
    console.log(texto);
    /* A tabela também em arquivo: é ela que vai para o registro da medição,
       junto dos JSON, sem ninguém ter de recortar o terminal. */
    writeFileSync(path.join(PASTA_SAIDA, "tabela.txt"), texto, "utf8");

    if (opcoes.gate) {
      const nota = med.desempenho;
      if (typeof nota !== "number" || nota < LIMIAR_PORTAO) {
        console.error(
          `perf: PORTÃO FECHADO — mediana mobile de desempenho ${pontos(nota)} ` +
            `abaixo de ${Math.round(LIMIAR_PORTAO * 100)}.`,
        );
        process.exitCode = 1;
        return;
      }
      console.log(
        `perf: portão aberto — mediana mobile de desempenho ${pontos(nota)} ` +
          `>= ${Math.round(LIMIAR_PORTAO * 100)}.`,
      );
    }
  } finally {
    if (servidor) await derrubarEConferir(servidor, porta);
  }
}

principal().catch((erro) => {
  console.error(erro instanceof Error ? `perf: ${erro.message}` : erro);
  process.exitCode = 1;
});
