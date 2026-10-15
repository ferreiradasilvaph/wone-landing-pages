"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { useContent } from "@/i18n";
import { useOnScreen } from "@/lib/useOnScreen";
import { CtaButton } from "./CtaButton";
import { chipDe, metodoDe, precoDe } from "./hero/paises";
import { HeroFacts } from "./hero/HeroFacts";
import { HeroGlobe } from "./hero/HeroGlobe";
import { StageStatus } from "./hero/StageStatus";
import { IntegrationBand } from "./IntegrationBand";
import { PauseButton } from "./PauseButton";
import { TextLink } from "./TextLink";

/**
 * O relógio do palco: UM passo, UM país.
 *
 * Era um passo por BATIDA do chat (oferta → aprovado → convite, três batidas
 * por venda), porque quem contava o tempo era o telefone. Com o aparelho fora
 * do hero (15/10, pedido da diretoria do dono), o que muda a cada passo é o
 * país: o ponto que acende no globo, o arco até o ticket e o próprio ticket
 * leem o MESMO contador, e por isso não têm como discordar.
 *
 * 3 s por país: é o tempo de ler cidade, método e valor sem pressa, e dá 21 s
 * de volta pelos sete.
 */
const INTERVALO = 3000;
/**
 * A primeira espera é maior: o primeiro render já mostra o Brasil completo —
 * ticket pintado, ponto de São Paulo aceso — e quem chega precisa de tempo para
 * ler a tela inteira antes de ela trocar de país.
 */
const PRIMEIRA_ESPERA = 3600;

/**
 * A escada do título na entrada da home: 80 ms entre as linhas, como o dono
 * pediu. São classes de propriedade arbitrária do Tailwind (elas só escrevem a
 * variável `--ent-atraso`, que é o `animation-delay` lá em `globals.css`) e não
 * `style` inline, para o atraso continuar visível aqui no JSX e o CSS continuar
 * sendo o único dono da coreografia. A terceira linha — a palavra laranja — tem
 * o atraso escrito no próprio nó, logo abaixo.
 */
const ATRASO_LINHA = ["[--ent-atraso:0ms]", "[--ent-atraso:80ms]"];

/**
 * Abertura da página: O PLANETA OCUPANDO A METADE ESQUERDA DA JANELA, e o texto
 * à direita entrando alguns pixels por cima dele.
 *
 * É a virada de 15/10, pedido da diretoria do dono: fora o celular, que ocupava
 * metade do palco e escondia o Atlântico; o globo cresce até a metade da tela,
 * sangrando pela esquerda; o texto começa por volta de 44% da largura e a sua
 * borda esquerda passa ~90px POR CIMA do disco — é o "levemente em cima" do
 * pedido, e é o que costura as duas metades em uma imagem só, em vez de duas
 * colunas lado a lado.
 *
 * No lugar do telefone ficou um TICKET: o comprovante da venda do país da vez,
 * pequeno, no pé do palco, com o arco saindo do pino ativo até ele. O que o
 * aparelho mostrava em três bolhas o ticket mostra em quatro linhas — e o
 * planeta, que é a figura da seção, deixa de ter metade coberta.
 *
 * NÃO ANIME NADA DESTA SEÇÃO NA ENTRADA.
 *
 * O `<h1>` daqui é o elemento de LCP da página no mobile. Quando ele nascia em
 * `opacity: 0` (era um `motion.h1` com `initial`), o navegador não tinha o que
 * pintar até o React hidratar e a animação rodar: o Lighthouse media 3,5 s de
 * LCP, dos quais 3.068 ms eram só Render Delay — 87% da métrica — contra 1,3 s
 * de FCP. O texto agora está pintado no primeiro paint, e o LCP cai para junto
 * do FCP. Qualquer `opacity`, `blur` ou `translate` inicial aqui devolve o
 * problema — e é por isso que `started` nasce `false` nos dois lados e só vira
 * `true` DENTRO do primeiro avanço do relógio.
 *
 * Sem `motion/react` em nada deste hero: o pacote custava 42,2 kB transferidos
 * no caminho crítico, e tirá-lo valeu 12 pontos no Lighthouse mobile (etapa 6).
 * O movimento que sobrou é `@keyframes` de CSS.
 *
 * A seção é `flex flex-col` com 100svh de PISO (`min-h`, não `h`) por causa da
 * fileira de benefícios (`mt-auto`) e da faixa de integrações: é o que as cola
 * na base sem altura cravada.
 */
export function Hero() {
  const { hero, integrations, payments, highlights, ui } = useContent();

  const paises = payments.table.countries;
  const precos = highlights.demos.checkout.prices;

  /**
   * Um passo só para o globo e para o ticket. Nasce em 0 — o Brasil — no
   * servidor E no primeiro render do cliente: o HTML sai com o ticket de São
   * Paulo pintado e o ponto dele aceso. Nada em `opacity: 0`, nada animando,
   * nada esperando o React.
   */
  const [ativo, setAtivo] = useState(0);
  const ativoRef = useRef(0);
  /**
   * A BATIDA do mesmo relógio, para o painel de fatos.
   *
   * É um contador que só cresce, e não um segundo índice: o painel tem seis
   * fileiras e o globo sete países, então um índice compartilhado prenderia um
   * ao tamanho do outro. Com a batida, cada um faz o seu módulo e os dois
   * continuam andando no MESMO passo de 3 s — um relógio por viewport, que é a
   * regra. Nasce em 0 no servidor e no primeiro render do cliente: o painel sai
   * do HTML com a primeira fileira acesa, sem esperar o React.
   */
  const [batida, setBatida] = useState(0);
  /** Só depois do primeiro avanço do relógio é que alguma coisa pode animar. */
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);


  /**
   * A preferência de movimento JAMAIS decide o primeiro render: ela vem do
   * `matchMedia` lido dentro de efeito, nasce `false` no servidor e no primeiro
   * render do cliente, então o HTML sai igual com e sem ela. Com movimento
   * reduzido o relógio simplesmente não começa, e o palco congela no Brasil —
   * nada de tela vazia para quem pediu menos movimento.
   */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /**
   * Aba em segundo plano: o relógio para. `setTimeout` continua disparando em
   * aba oculta (o navegador só o estrangula para 1×/s), e sem isto quem volta
   * de outra aba encontra o palco num país sorteado pelo tempo que passou — o
   * portão pede zero relógio rodando com a aba escondida.
   */
  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /**
   * Quarto freio: hero fora da tela. Enquanto a página está em Pagamentos ou no
   * rodapé, o relógio do palco não tem a quem mostrar nada — e continuava
   * andando, trocando de país e redesenhando o globo para ninguém. O
   * `IntersectionObserver` é o mesmo gancho das outras seções (`useOnScreen`),
   * com `threshold` 0: basta um pixel do hero à vista para o relógio voltar a
   * andar, e ele retoma do país em que parou (o passo vive num `ref`).
   */
  const secao = useRef<HTMLElement>(null);
  const naTela = useOnScreen(secao);

  /**
   * O relógio: um `setTimeout` encadeado que avança o país e se reagenda.
   *
   * `setStarted(true)` acontece no MESMO avanço, e não na montagem: no instante
   * em que ele vira `true` o país também muda, então o que ganha classe de
   * entrada é nó novo — o que já estava pintado na primeira tela nunca anima.
   */
  useEffect(() => {
    if (paused || reduced || tabHidden || !naTela) return;

    let cancelado = false;
    let timer = 0;

    const agenda = (espera: number) => {
      timer = window.setTimeout(() => {
        if (cancelado) return;
        ativoRef.current = (ativoRef.current + 1) % paises.length;
        setAtivo(ativoRef.current);
        setBatida((passos) => passos + 1);
        setStarted(true);
        agenda(INTERVALO);
      }, espera);
    };

    agenda(ativoRef.current === 0 && !started ? PRIMEIRA_ESPERA : INTERVALO);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
    /* `started` de propósito fora das dependências: ele só decide a PRIMEIRA
       espera, e pô-lo aqui refaria o relógio no instante em que ele vira true. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, reduced, tabHidden, naTela, paises.length]);

  /** Só anima depois do primeiro avanço, e nunca com movimento reduzido. */
  const animado = started && !reduced;
  /**
   * Os quatro freios num booleano só, lido pelo globo E pelo painel de fatos:
   * se o relógio não anda, o fio de progresso do painel não pode fingir que
   * anda. Antes esta expressão vivia solta no JSX do globo; tendo dois
   * leitores, ela passa a ter nome.
   */
  const andando = !paused && !reduced && !tabHidden && naTela;

  const pais = paises[ativo];
  /**
   * `useMemo` e não um `map` solto, e isto é CORREÇÃO DE DEFEITO, não zelo: o
   * `HeroGlobe` recalcula o arco num efeito que depende de `pins`, e um array
   * novo a cada render fazia o efeito rodar, chamar `setArco`, renderizar de
   * novo e rodar outra vez — laço infinito de renderização, com o navegador sem
   * sobrar quadro para pintar. O sintoma que o entregou: a animação de entrada
   * do ticket ficava `pending` para sempre (opacidade 0, card vazio na tela) e
   * a captura de tela estourava o tempo esperando um quadro estável.
   * As dependências são as três listas do dicionário, que só mudam no idioma.
   */
  const pins = useMemo(
    () =>
      paises.map((item) => ({
        code: item.code,
        city:
          hero.stage.cities.find((cidade) => cidade.code === item.code)?.city ??
          item.name,
        chip: chipDe(item, precos),
      })),
    [paises, hero.stage.cities, precos],
  );

  /**
   * O palco inteiro em uma frase, montado das MESMAS arrays que desenham os
   * pinos — nunca uma cópia à parte, que divergiria. O globo e os pinos são
   * `aria-hidden` (são ilustração), e os pontos não são focáveis: não há nada a
   * escolher, o conteúdo todo está aqui.
   */
  const resumo = `${hero.stage.srIntro} ${paises
    .map(
      (item) =>
        `${item.name}: ${metodoDe(item)}, ${item.symbol} ${precoDe(precos, item.code)}`,
    )
    .join("; ")}.`;

  return (
    <section
      ref={secao}
      id="topo"
      data-section="topo"
      className="relative flex min-h-[100svh] flex-col overflow-x-clip bg-ink-950"
    >
      <div className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:flex lg:flex-1 lg:flex-col lg:px-8 lg:pt-28 min-[1400px]:max-w-[78rem]">
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
          {/* A COLUNA DE TEXTO começa na coluna 6 de 12 — x 627 numa janela de
              1440 —, e o disco de 760px termina em x 730: a borda esquerda do
              texto entra ~100px POR CIMA do planeta, que é o pedido ("texto
              levemente por cima"). Quem garante que ele fique por cima é o
              `z-10` daqui contra o palco, que é camada de fundo; e quem garante
              que nenhum pino ou rótulo caia debaixo da leitura é a geometria do
              globo (os dois pinos europeus, os mais a leste, param em x 492, e
              os rótulos deles abrem para a ESQUERDA).
              `min-w-0` não é zelo: sem ele um item de grade pode ficar MAIOR que
              a trilha (a largura mínima automática de um item é o `min-content`
              dele), e num grid de uma coluna só — o celular — isso contamina a
              outra. */}
          <div className="relative z-10 min-w-0 lg:col-span-7 lg:col-start-6 min-[1400px]:ml-12 min-[1400px]:flex min-[1400px]:items-start min-[1400px]:gap-x-10">
          {/* A partir de 1400px o texto cede a faixa da direita ao painel de fatos
              (pedido do dono, 15/10). O h1 continua na mesma caixa e nas mesmas
              três linhas: só o lead encolhe um pouco, de 31 para 26rem. */}
          <div className="min-w-0 min-[1400px]:max-w-[23rem] min-[1400px]:shrink-0">
            {/* O mesmo `.t-kicker` de toda seção, com o traço de 24×1. Abaixo de
                `sm` a cobertura dos sete países não cabe numa linha de 13px, e
                a versão curta entra no lugar. */}
            <p className="t-kicker">
              <span className="hidden sm:inline-flex">{hero.kicker}</span>
              <span className="sm:hidden">{hero.kickerShort}</span>
            </p>

            {/* Sem `text-balance`: o balanceador igualava o comprimento das três
                linhas e empurrava "no" para junto de "automático", quebrando o
                h1 em "Venda pelo / Telegram / no automático".
                Desde 15/10 as três linhas são TRÊS BLOCOS, cada um com a
                própria janela de recorte (`.ent-linha`), porque a entrada da
                home sobe cada linha de dentro dela — e isso não mexe no LCP:
                continua UM `<h1>`, na mesma caixa de 34rem, com as mesmas três
                linhas de 0,97 de entrelinha, pintado pelo servidor. */}
            <h1 className="t-display mt-6 max-w-[34rem] text-cream">
              {hero.titleLines.map((linha, index) => (
                <span
                  key={linha}
                  className={`ent-linha ${ATRASO_LINHA[index] ?? ""}`}
                >
                  <span>{linha}</span>
                </span>
              ))}
              {/* A palavra laranja é a última linha, e fecha a escada do
                  título em 160 + 600 = 760 ms. */}
              <span className="ent-linha [--ent-atraso:160ms]">
                <span className="text-brand">{hero.titleAccent}</span>
              </span>
            </h1>

            {/* O lead vem fatiado do dicionário: os trechos em objeto são os dois
                momentos que ganham peso (o método de pagamento e a entrada no
                canal). Nada mais muda de peso na primeira dobra. */}
            <p className="t-lead ent-sobe mt-6 max-w-[31rem] text-pretty [--ent-atraso:300ms]">
              {hero.lead.map((trecho, index) =>
                typeof trecho === "string" ? (
                  <Fragment key={index}>{trecho}</Fragment>
                ) : (
                  <strong key={index} className="font-medium text-cream">
                    {trecho.strong}
                  </strong>
                ),
              )}
            </p>

            {/* Botão + link na MESMA linha nos dois tamanhos de tela: dois botões
                lado a lado não diriam qual é a ação principal, e o link empilhado
                no celular empurrava o palco para fora da primeira tela. */}
            <div className="ent-sobe mt-8 flex flex-wrap items-center gap-6 [--ent-atraso:400ms]">
              <CtaButton href="#fila-de-espera">{hero.ctaPrimary}</CtaButton>
              {/* O link tem 23px de altura de texto, e o portão pede alvo de
                  44: o pseudo-elemento de 11px em cima e embaixo leva o alvo a
                  45 sem ocupar espaço no layout nem desalinhar o sublinhado do
                  centro do botão ao lado (mesma solução do PauseButton). */}
              <TextLink
                href="#como-funciona"
                className="relative before:absolute before:inset-x-0 before:-inset-y-[11px] before:content-['']"
              >
                {hero.ctaSecondary}
              </TextLink>
            </div>
          </div>

          {/* O PAINEL DE FATOS: a informação que o dono pediu ao lado do título.
              Abaixo de 1400 ele desce para baixo dos botões; acima, senta ao lado
              do h1, alinhado ao topo dele (mt-11 = kicker + o respiro do título).
              Entra na coreografia da home como o último degrau antes dos
              benefícios. Só fatos que a página já afirma.

              A lista virou o `HeroFacts`, que percorre as seis fileiras no
              passo do relógio daqui e desenha o fato ativo logo abaixo (pedido
              do dono de 15/10: "seja mais criativo... o espaço que ficou abaixo
              dessa div pode ser preenchido"). O `<aside>`, o rótulo e a caixa
              continuam sendo deste arquivo — a largura de 13rem e a entrada de
              450ms não mudaram. */}
          <aside
            aria-label={hero.aside.title}
            className="ent-sobe mt-10 rounded-card bg-ink-900 p-5 [--ent-atraso:450ms] min-[1400px]:mt-11 min-[1400px]:w-[13rem] min-[1400px]:shrink-0"
          >
            <p className="t-label">{hero.aside.title}</p>
            <HeroFacts
              facts={hero.aside.items}
              moreLabel={hero.aside.more}
              batida={batida}
              /* A primeira batida do hero é mais longa que as outras; o fio de
                 progresso do painel precisa saber disso para não acabar antes
                 do passo. */
              duracaoMs={batida === 0 ? PRIMEIRA_ESPERA : INTERVALO}
              running={andando}
              reduced={reduced}
            />
          </aside>
          </div>
        </div>

        {/* A fileira de benefícios fecha o hero, encostada na faixa (`mt-auto`),
            na largura do container inteiro. Só a partir de `lg`: abaixo disso
            ela é o que decide se o palco cabe na primeira tela do celular, e
            some. O `relative z-10` a põe acima do planeta, que passa por baixo
            dela desde que o disco cresceu. */}
        {/* Último degrau da escada: 500 + 500 = 1.000 ms, dentro do 1,2 s que o
            dono pediu de total. */}
        <div className="ent-sobe relative z-10 mt-auto hidden grid-cols-3 gap-x-8 pt-10 pb-10 [--ent-atraso:500ms] lg:grid">
          {hero.benefits.map((benefit) => (
            <p
              key={benefit.value}
              className="max-w-[18rem] text-[13px] leading-5"
            >
              <span className="block font-semibold text-cream">
                {benefit.value}
              </span>
              <span className="mt-0.5 block text-muted">{benefit.label}</span>
            </p>
          ))}
        </div>
      </div>

      {/* O PALCO.

          No celular ele é um bloco EM FLUXO de 420px, logo depois dos botões: a
          ordem de leitura é texto → planeta, e o `<h1>` (o LCP do mobile)
          continua sendo a primeira coisa do documento.
          A partir de `lg` o mesmo nó vira camada de FUNDO da seção inteira
          (`absolute inset-0`), e é isso que deixa o planeta ocupar metade da
          janela e passar por baixo do texto. `pointer-events-none` porque ele
          cobre a seção toda: o único controle que vive aqui (o "pausar") devolve
          o ponteiro para si. */}
      <div className="pointer-events-none relative mt-12 h-[500px] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto">
        <HeroGlobe
          pins={pins}
          activeIndex={ativo}
          animated={animado}
          running={andando}
        />

        {/* O TICKET, a etiqueta de ficção e o controle do palco, num bloco só —
            e é de propósito: as três peças são a legenda do planeta, e andam
            juntas quando a largura muda.

            O bloco é ancorado pelo PÉ (`bottom`), nunca pelo topo: a altura do
            hero é a da janela, e com `top` cravado o ticket caía em cima da
            fileira de benefícios numa tela de 800px e sobrava no meio do nada
            numa de 1.200. Os 158px são a altura da fileira de benefícios mais a
            faixa, medidos — é o que põe o ticket encostado nela, por cima do
            planeta, sem nunca cruzá-la.
            A coluna muda com a largura porque o espaço livre muda: a 1440 os
            rótulos de São Paulo e Buenos Aires ocupam o pé ESQUERDO do disco, e
            o ticket vai para o lado direito dele (x 512 a 1440: a coluna do
            ticket e do rótulo do palco começa depois do chip de Buenos Aires,
            que termina em x 500 — era 442 e o rótulo cobria o chip); abaixo de 1420 não há rótulo nenhum, e ele
            volta para a esquerda, longe da coluna de texto, que ali está mais
            perto. No celular fica no pé do disco, centrado. */}
        <div className="pointer-events-auto absolute bottom-0 left-1/2 w-[340px] -translate-x-1/2 lg:w-[380px] min-[1024px]:bottom-[158px] min-[1024px]:left-[calc((100vw-min(100vw,80rem))/2+2rem+28px)] min-[1024px]:translate-x-0 min-[1280px]:left-[calc((100vw-min(100vw,80rem))/2+2rem+88px)] min-[1400px]:left-[calc((100vw-min(100vw,78rem))/2+2rem+400px)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            {/* "CHECKOUT INTERNACIONAL · SIMULAÇÃO": a ficção se declara onde o
                dado fictício está — em cima do ticket, que é quem mostra valor.
                Abaixo de 1420 quem ocupa esta linha é a `StageStatus`, que
                nomeia o país da vez (lá os rótulos dos pinos não existem). */}
            <p className="t-label ent-sobe [--ent-atraso:500ms] max-[1419px]:hidden">
              {hero.stage.label} · {ui.simulation}
            </p>
            <StageStatus
              code={pais.code}
              name={pais.name}
              chip={chipDe(pais, precos)}
            />
            {/* Rótulos de `ui`, não de `hero` — "pausar"/"retomar" é texto de
                controle repetido (o carrossel de Recursos e o de Segurança usam
                os mesmos). */}
            <PauseButton
              pressed={paused}
              onToggle={() => setPaused((valor) => !valor)}
              labels={{ pause: ui.pause, play: ui.play }}
            />
          </div>
        </div>

        {/* O palco inteiro em texto, montado no servidor. */}
        <p className="sr-only">{resumo}</p>
      </div>

      {/* Irmã do container, não filha: a faixa atravessa a tela inteira. */}
      <div className="relative z-10 mt-16 lg:mt-0">
        <IntegrationBand
          title={integrations.title}
          items={integrations.items}
        />
      </div>
    </section>
  );
}
