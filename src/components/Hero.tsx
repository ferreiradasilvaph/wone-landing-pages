"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { useContent } from "@/i18n";
import { useOnScreen } from "@/lib/useOnScreen";
import { CtaButton } from "./CtaButton";
import { FlagMark } from "./FlagMark";
import { chipDe, metodoDe, precoDe } from "./hero/paises";
import { HeroGlobe } from "./hero/HeroGlobe";
import { StageStatus } from "./hero/StageStatus";
import { IntegrationBand } from "./IntegrationBand";
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
  /** Só depois do primeiro avanço do relógio é que alguma coisa pode animar. */
  const [started, setStarted] = useState(false);
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
    if (reduced || tabHidden || !naTela) return;

    let cancelado = false;
    let timer = 0;

    const agenda = (espera: number) => {
      timer = window.setTimeout(() => {
        if (cancelado) return;
        ativoRef.current = (ativoRef.current + 1) % paises.length;
        setAtivo(ativoRef.current);
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
  }, [reduced, tabHidden, naTela, paises.length]);

  /** Só anima depois do primeiro avanço, e nunca com movimento reduzido. */
  const animado = started && !reduced;
  /**
   * Os quatro freios num booleano só, lido pelo globo E pelo painel de fatos:
   * se o relógio não anda, o fio de progresso do painel não pode fingir que
   * anda. Antes esta expressão vivia solta no JSX do globo; tendo dois
   * leitores, ela passa a ter nome.
   */
  const andando = !reduced && !tabHidden && naTela;

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
        `${item.name}: ${metodoDe(item)}, ${precoDe(precos, item.code)}`,
    )
    .join("; ")}.`;

  return (
    <section
      ref={secao}
      id="topo"
      data-section="topo"
      className="hero-cena relative flex min-h-[100svh] flex-col overflow-x-clip bg-ink-950"
    >
      {/* `hero-cena` é quem declara `--globo` (ver `hero.css`): o lado do globo
          em cada degrau de largura, lido pela caixa do planeta E pela trilha da
          grade de 1400+. Uma conta, dois leitores — e por isso eles não podem
          divergir. */}
      {/* 80rem, como TODA seção da página — o `min-[1400px]:max-w-[88rem]` saiu
          em 16/10. Ele existia desde 15/10 para o globo poder ir mais à
          esquerda, e cobrava um preço que o dono não tinha comprado: acima de
          1400 o hero media 128px a mais que o resto, e o PÉ dele (a linha de
          controle e a fileira de fatos) começava em x 43 enquanto o logo do
          cabeçalho e o kicker de todas as outras seções começavam em 107. Duas
          margens esquerdas na mesma página.
          O pedido "globo mais à esquerda" continua atendido, e melhor: o disco
          deixou de ser medido pelo container e passou a SANGRAR para fora dele,
          por `--sangria` em `hero.css`. O que era desalinho virou escolha. */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:flex lg:flex-1 lg:flex-col lg:px-8 lg:pt-28">
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
          {/* A LINHA DA CENA.

              Entre 1024 e 1399 ela continua sendo a coluna 6–12 da grade de
              12: o globo ocupa a metade esquerda e o texto entra alguns pixels
              por cima do disco, como era.
              A partir de 1400 ela vira a cena inteira (`.hero-linha`, em
              `hero.css`): três trilhas — o lugar do globo, o corredor do texto
              e o painel —, da borda esquerda à borda direita do conteúdo. O
              texto deixa de encostar no planeta. O que o separa do globo e do
              painel são os 40px de `--respiro`, e SÓ eles: medido de 1400 a
              2560, as três trilhas dão [464, 464, 208] em qualquer largura (o
              container satura em 80rem já aos 1344 de janela) e o bloco de
              texto preenche a do meio de borda a borda — zero de ar lateral
              dentro da própria trilha. Os "64px de cada lado" que este
              comentário prometia eram da régua de 88rem, onde a trilha do meio
              media 592 contra os mesmos 464 de texto.
              O GLOBO SANGRA para fora da coluna (`--sangria`, em `hero.css`) —
              é o que concilia "globo mais à esquerda" com uma régua só para a
              página inteira.
              `min-w-0` não é zelo: sem ele um item de grade pode ficar MAIOR que
              a trilha (a largura mínima automática de um item é o `min-content`
              dele), e num grid de uma coluna só — o celular — isso contamina a
              outra. */}
          <div className="hero-linha relative z-10 min-w-0 lg:col-span-7 lg:col-start-6">
          {/* O BLOCO DE TEXTO. Centrado na trilha do meio a partir de 1400, com
              29rem de teto: é a medida que segura "Telegram no" numa linha só
              com o título de 80px (444px medidos no navegador). O lead fica em
              26rem para não esticar a linha de leitura junto. */}
          <div className="hero-texto min-w-0">
            {/* O BLOCO DE ABERTURA: o kicker e, abaixo dele, a cobertura em
                BANDEIRAS.

                Era uma linha só — "Cobrança, entrega e rastreio · Brasil,
                América Latina e Europa" — que precisava de 563px e tinha 464:
                quebrava em duas sempre, com "LATINA E EUROPA" sozinha na
                segunda. O dono viu o que isso é: "está parecendo muito
                espremida".

                A correção não foi dar mais largura (não há: a trilha do texto é
                cravada em 29rem para o título manter três linhas), foi trocar a
                SEGUNDA METADE por dado. A cobertura deixou de ser uma string
                pontilhada e passou a ser as sete bandeiras — que é a mesma
                informação, ocupa o bloco de verdade, e não repete o globo: lá os
                países passam um por vez, aqui estão os sete ao mesmo tempo.
                É também o que resgata a fileira de bandeiras que morreu com o
                painel "O que vem com a Wone".

                Abaixo de `sm` só o kicker curto: sete bandeiras mais a frase não
                cabem numa linha de celular. */}
            <p className="t-kicker">{hero.kickerShort}</p>

            <div className="mt-3 hidden flex-wrap items-center gap-x-3 gap-y-2 sm:flex">
              <span className="flex items-center gap-1.5">
                {paises.map((pais) => (
                  <FlagMark key={pais.code} code={pais.code} className="h-4 w-6" />
                ))}
              </span>
              <span className="text-[13px] leading-5 text-muted">{hero.kickerReach}</span>
            </div>

            {/* Sem `text-balance`: o balanceador igualava o comprimento das três
                linhas e empurrava "no" para junto de "automático", quebrando o
                h1 em "Venda pelo / Telegram / no automático".
                Desde 15/10 as três linhas são TRÊS BLOCOS, cada um com a
                própria janela de recorte (`.ent-linha`), porque a entrada da
                home sobe cada linha de dentro dela — e isso não mexe no LCP:
                continua UM `<h1>`, na mesma caixa de 34rem, com as mesmas três
                linhas de 0,97 de entrelinha, pintado pelo servidor. */}
            <h1 className="t-display hero-titulo mt-6 max-w-[34rem] text-cream">
              {hero.titleLines.map((linha, index) => (
                <span
                  key={linha}
                  className={`ent-linha ${ATRASO_LINHA[index] ?? ""}`}
                >
                  <span>{linha}</span>
                </span>
              ))}
              {/* A palavra laranja é a última linha, e fecha a escada do
                  título em 160 + 600 = 760 ms — que é exatamente onde o
                  SUBLINHADO (`.hero-sublinha`, em `hero.css`) começa a ser
                  desenhado, da esquerda para a direita, em 900ms. O traço é
                  pseudo-elemento: não entra na caixa do texto e não toca no
                  `<h1>`, que é o LCP do celular. */}
              <span className="ent-linha [--ent-atraso:160ms]">
                <span className="hero-sublinha text-brand">
                  {hero.titleAccent}
                </span>
              </span>
            </h1>

            {/* O lead vem fatiado do dicionário: os trechos em objeto são os dois
                momentos que ganham peso (o método de pagamento e a entrada no
                canal). Nada mais muda de peso na primeira dobra. */}
            <p className="t-lead ent-sobe mt-6 max-w-[31rem] text-pretty [--ent-atraso:300ms] min-[1400px]:max-w-[26rem]">
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

          </div>
        </div>

        {/* A fileira de benefícios fecha o hero, encostada na faixa (`mt-auto`).
            Só a partir de `lg`: abaixo disso ela é o que decide se o palco cabe
            na primeira tela do celular, e some.

            A PARTIR DE 1400 ELA SAI DE CIMA DO PLANETA (`.hero-pe`, em
            `hero.css`): vira uma pilha na metade DIREITA, alinhada ao texto.
            Até 16/10 ela atravessava o container inteiro e o planeta passava
            por baixo — o que funcionava enquanto o disco era pequeno, e deixou
            de funcionar quando o dono pediu "o globo tem de estar cobrindo
            metade da tela": a primeira coluna ("7 países / Moeda local: real,
            pesos, dólar, euro e libra") ficava ilegível sobre o limbo.
            Tirar a fileira de lá é o que libera a ALTURA do disco: o teto saiu
            de `100svh - 300` para `100svh - 140`, e numa janela de 752 o
            planeta foi de 452 para 612px. */}
        {/* Último degrau da escada: 500 + 500 = 1.000 ms, dentro do 1,2 s que o
            dono pediu de total. */}
        <div className="hero-pe ent-sobe relative z-10 mt-auto hidden grid-cols-3 gap-x-8 pt-10 pb-10 [--ent-atraso:500ms] lg:grid">
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

        {/* A LINHA DE CONTROLE do palco: a etiqueta de ficção, o status do país
            da vez e o "pausar", num bloco só — as três são a legenda do
            planeta, e andam juntas quando a largura muda.

            A geometria mora em `.hero-controle` (`hero.css`), junto com a da
            caixa do globo: as duas leem a MESMA borda de conteúdo, e desde
            15/10 compartilham a borda esquerda com a primeira coluna de
            benefícios — três peças, uma régua. Ela é ancorada pelo PÉ
            (`bottom: 158px`, a fileira de benefícios mais a faixa, medidos) e
            nunca pelo topo: a altura do hero é a da janela, e com `top` cravado
            ela caía sobre a fileira numa tela de 800px.
            Nenhum rótulo de pino disputa esse espaço: a 1440 os chips de São
            Paulo e Buenos Aires terminam em y 596, e a linha começa em 695. */}
        <div className="hero-controle pointer-events-auto">
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
