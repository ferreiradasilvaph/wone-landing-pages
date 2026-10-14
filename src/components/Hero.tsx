"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { useContent } from "@/i18n";
import { useOnScreen } from "@/lib/useOnScreen";
import { CtaButton } from "./CtaButton";
import { chipDe, metodoDe, precoDe } from "./hero/paises";
import { HeroGlobe } from "./hero/HeroGlobe";
import { StageStatus } from "./hero/StageStatus";
import { IntegrationBand } from "./IntegrationBand";
import { PauseButton } from "./PauseButton";
import { PhoneMockup } from "./PhoneMockup";
import { TextLink } from "./TextLink";

/**
 * O relógio do palco, em passos inteiros.
 *
 * `país = Math.floor(passo / 3) % 4` e `batida = passo % 3`: um passo é uma
 * batida do chat, três batidas são uma venda, quatro vendas são a volta pelos
 * quatro países. UM contador para as duas coisas que se movem (o telefone e o
 * ponto aceso no globo) é o que garante que elas nunca discordem.
 */
const PASSO_INICIAL = 2;
/**
 * Quanto cada batida fica na tela, pela batida em que o relógio ESTÁ: a oferta
 * 1,6 s, o "aprovado" 1,2 s, o convite 2,2 s. Dá oferta em 0 s, aprovado em
 * 1,6 s, convite em 2,8 s e o país seguinte em 5,0 s.
 */
const DURACOES = [1600, 1200, 2200];
/**
 * A primeira espera é maior: o primeiro render já mostra a venda do Brasil
 * COMPLETA (as três batidas pintadas, regra 1 — o hero não anima na entrada),
 * então quem chega precisa de tempo para ler a tela inteira antes de ela trocar
 * de país.
 */
const PRIMEIRA_ESPERA = 2600;

/**
 * Abertura da página: o texto nas colunas 1–6 e, nas 7–12, o PALCO — o globo
 * pontilhado sangrando até a borda da tela, com o telefone em pé na frente
 * dele.
 *
 * É o pedido do dono de 14/10, literal: "melhore a imagem do celular, e coloque
 * junto a página principal, uma prévia do checkout internacional (mostrando um
 * mapa sul americano, como o da página da Dotfy que pedi pra você se basear)" —
 * e, no fim do dia, "no lugar do mini mapa, um globo terrestre criado a partir
 * da linguagem do globo da demo de 4 países, mais atraente".
 * Os quatro países da Wone são os únicos pontos acesos, cada um com a cidade e
 * o chip de método · valor na moeda local; o telefone mostra a venda do país
 * que está aceso. Nenhum valor é novo: tudo vem de `payments.table.countries` e
 * de `highlights.demos.checkout.prices`, as mesmas chaves da tabela de
 * Pagamentos.
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
 * `true` DENTRO do primeiro avanço do relógio, 2,6 s depois da montagem.
 *
 * Sem `motion/react` em nada deste hero: o pacote custava 42,2 kB transferidos
 * no caminho crítico, e tirá-lo valeu 12 pontos no Lighthouse mobile (etapa 6).
 * O movimento que sobrou é `@keyframes` de CSS.
 *
 * A seção é `flex flex-col` com 100svh de PISO (`min-h`, não `h`) por causa da
 * fileira de benefícios (`mt-auto`) e da faixa de integrações: é o que as cola
 * na base sem altura cravada. Desde 14/10 ela PASSA desse piso no desktop — o
 * telefone de 620px levou o palco a 656 e o hero a ~1.000px a 1440×900 —, e é
 * exatamente o que o dono pediu ao pedir o aparelho mais alto "e
 * subsequentemente a seção onde ele se encontra, para manter suas proporções".
 */
export function Hero() {
  const { hero, integrations, payments, highlights, ui } = useContent();

  const paises = payments.table.countries;
  const precos = highlights.demos.checkout.prices;

  /**
   * Um passo só para o telefone e para o globo. Nasce em 2 — a última batida do
   * Brasil — no servidor E no primeiro render do cliente: o HTML sai com a
   * oferta, o "pagamento aprovado" e o convite já pintados, e o ponto de São
   * Paulo aceso. Nada em `opacity: 0`, nada animando, nada esperando o React.
   */
  const [passo, setPasso] = useState(PASSO_INICIAL);
  const passoRef = useRef(PASSO_INICIAL);
  /** Só depois do primeiro avanço do relógio é que alguma coisa pode animar. */
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  /**
   * A preferência de movimento JAMAIS decide o primeiro render: ela vem do
   * `matchMedia` lido dentro de efeito, nasce `false` no servidor e no primeiro
   * render do cliente, então o HTML sai igual com e sem ela. Com movimento
   * reduzido o relógio simplesmente não começa, e o palco congela no Brasil
   * completo — nada de tela vazia para quem pediu menos movimento.
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
   * andando, trocando de país a cada 5 s e renderizando o telefone e o mapa
   * para ninguém. O `IntersectionObserver` é o mesmo gancho das outras seis
   * seções (`useOnScreen`, que substituiu o `useInView` do motion), com
   * `threshold` 0: basta um pixel do hero à vista para o relógio voltar a
   * andar, e ele retoma do país em que parou (o passo vive num `ref`).
   *
   * Nasce `false` nos dois lados e só vira `true` quando o observador dispara,
   * logo depois da montagem: o primeiro render continua sendo o Brasil
   * completo, pintado no servidor, sem nada esperando JavaScript.
   */
  const secao = useRef<HTMLElement>(null);
  const naTela = useOnScreen(secao);

  /**
   * O relógio: um `setTimeout` encadeado que avança o passo e se reagenda com a
   * duração da batida em que acabou de entrar.
   *
   * `setStarted(true)` acontece no MESMO avanço, e não na montagem: no instante
   * em que ele vira `true` o país também muda, então os blocos que ganham a
   * classe de entrada são nós novos — os que já estavam pintados na primeira
   * tela nunca animam.
   *
   * O passo vive também num `ref` porque o efeito só se refaz quando um dos
   * quatro freios muda; ao retomar, ele segue do país em que parou.
   */
  useEffect(() => {
    if (paused || reduced || tabHidden || !naTela) return;

    let cancelado = false;
    let timer = 0;

    const agenda = (espera: number) => {
      timer = window.setTimeout(() => {
        if (cancelado) return;
        passoRef.current += 1;
        setPasso(passoRef.current);
        setStarted(true);
        agenda(DURACOES[passoRef.current % DURACOES.length]);
      }, espera);
    };

    agenda(
      passoRef.current === PASSO_INICIAL
        ? PRIMEIRA_ESPERA
        : DURACOES[passoRef.current % DURACOES.length],
    );

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [paused, reduced, tabHidden, naTela]);

  const ativo = Math.floor(passo / DURACOES.length) % paises.length;
  const batida = passo % DURACOES.length;
  /** Só anima depois do primeiro avanço, e nunca com movimento reduzido. */
  const animado = started && !reduced;

  const pais = paises[ativo];
  const pins = paises.map((item) => ({
    code: item.code,
    city: hero.stage.cities.find((cidade) => cidade.code === item.code)?.city ?? item.name,
    chip: chipDe(item, precos),
  }));

  /**
   * O palco inteiro em uma frase, montado das MESMAS arrays que desenham os
   * pings — nunca uma cópia à parte, que divergiria. O globo e os pinos são
   * `aria-hidden` (são ilustração), e os pontos não são focáveis: não há nada a
   * escolher, o conteúdo todo está aqui.
   */
  const resumo = `${hero.stage.srIntro} ${paises
    .map((item) => `${item.name}: ${metodoDe(item)}, ${item.symbol} ${precoDe(precos, item.code)}`)
    .join("; ")}.`;

  return (
    <section
      ref={secao}
      id="topo"
      data-section="topo"
      className="flex min-h-[100svh] flex-col overflow-x-clip bg-ink-950"
    >
      {/* Conteúdo ancorado no alto, como a régua do hero pede (kicker em y≈112 a
          1440×900). Dividir a folga entre o alto e o pé (`lg:my-auto` aqui) foi
          medido e abre 122px de vão entre o header e o kicker — dois buracos no
          lugar de um, e o texto deixa de encostar no topo da tela. */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:flex lg:flex-1 lg:flex-col lg:px-8 lg:pt-28">
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
          {/* Seis colunas, não sete: o palco precisa das outras seis para o mapa
              nascer onde o telefone não está. O `<h1>` não muda de caixa — o
              `max-w-[34rem]` (544px) já era mais estreito que as seis colunas
              (592px), então as três linhas quebram no mesmo lugar e o elemento
              de LCP continua sendo o mesmo retângulo.
              `min-w-0` nas duas colunas, e não é zelo: sem ele um item de grade
              pode ficar MAIOR que a trilha (a largura mínima automática de um
              item é o `min-content` dele), e num grid de uma coluna só — o
              celular — isso contamina a outra. Medido a 412: quando a linha de
              status mostrava a Argentina, o chip mais largo dos quatro
              ("Cartão local · $ 38.000") esticava a coluna de 370 para 398, o
              `<h1>` passava a caber em duas linhas em vez de três e a página
              inteira subia 41px — CLS 0,097 a cada volta pela Argentina,
              justamente no elemento de LCP. Com `min-w-0` quem manda é a
              trilha, e quem cede é o chip (ele tem `truncate`). */}
          <div className="min-w-0 lg:col-span-6">
            {/* O mesmo `.t-kicker` de toda seção, com o traço de 24×1. Abaixo de
                `sm` a cobertura dos quatro países não cabe numa linha de 13px, e
                a versão curta entra no lugar. */}
            <p className="t-kicker">
              <span className="hidden sm:inline-flex">{hero.kicker}</span>
              <span className="sm:hidden">{hero.kickerShort}</span>
            </p>

            {/* Sem `text-balance`: o balanceador igualava o comprimento das três
                linhas e empurrava "no" para junto de "automático", quebrando o
                h1 em "Venda pelo / Telegram / no automático". */}
            <h1 className="t-display mt-6 max-w-[34rem] text-cream">
              {hero.titleStart} <span className="text-brand">{hero.titleAccent}</span>
            </h1>

            {/* O lead vem fatiado do dicionário: os trechos em objeto são os dois
                momentos que ganham peso (o método de pagamento e a entrada no
                canal). Nada mais muda de peso na primeira dobra. */}
            <p className="t-lead mt-6 max-w-[31rem] text-pretty">
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
                no celular empurrava o aparelho para fora da primeira tela. */}
            <div className="mt-8 flex flex-wrap items-center gap-6">
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

          <div className="min-w-0 lg:col-span-6">
            {/* O PALCO. A altura é a do APARELHO, em pixels cravados — não mais
                um `clamp` de `100svh`.
                O dono pediu, em 14/10, "aumente o celular em tamanho (altura) e
                subsequentemente a seção onde ele se encontra para manter suas
                proporções": com o teto de viewport o palco parava em 560 e o
                telefone de 620 estouraria para fora dele. Então a conta se
                inverteu — quem manda agora é o aparelho, e a seção cresce atrás
                dele. A 1440×900 o hero fecha em ~1.000px em vez de 900: ele
                continua com `min-h-[100svh]` de PISO, e passar disso é o
                pedido, não um defeito.
                564 = 560 do aparelho + 4 de respiro; 656 = 620 + 17 do rótulo
                do palco + 19 de vão até a moldura, que é quando o rótulo
                aparece. No celular não há altura cravada — quem a dá é o
                telefone em fluxo, e o globo fica atrás dele. */}
            <div className="relative lg:h-[564px] xl:h-[656px]">
              {/* O GLOBO. Entrou em 14/10 no lugar do mini mapa pontilhado,
                  a pedido do dono: "no lugar do mini mapa, um globo terrestre
                  criado a partir da linguagem do globo da demo de 4 países,
                  mais atraente". Os quatro freios do relógio daqui de cima
                  também param o laço de desenho dele — um relógio só, e nenhum
                  quadro desenhado para ninguém. */}
              <HeroGlobe
                pins={pins}
                activeIndex={ativo}
                animated={animado}
                running={!paused && !reduced && !tabHidden && naTela}
              />

              {/* "CHECKOUT INTERNACIONAL · SIMULAÇÃO": a ficção se declara no
                  palco, como se declara dentro do aparelho. Só a partir de `xl`
                  — a 1024 o telefone ocupa quase todo o palco e não sobra linha
                  livre acima dele (lá a palavra "Simulação" continua visível no
                  cabeçalho do chat). */}
              <p className="t-label absolute top-0 left-0 hidden xl:block">
                {hero.stage.label} · {ui.simulation}
              </p>

              {/* O palco inteiro em texto, montado no servidor. */}
              <p className="sr-only">{resumo}</p>

              {/* `relative` no celular, e não estático: a camada do mapa é
                  absoluta, e elemento posicionado pinta acima de conteúdo em
                  fluxo — sem isto o mapa cobriria a tela do aparelho. A partir
                  de `lg` o telefone encosta na base do palco, à esquerda. */}
              <div className="relative flex justify-center lg:absolute lg:bottom-0 lg:left-0 lg:justify-start">
                <PhoneMockup index={ativo} beat={batida} started={animado} />
              </div>
            </div>

            {/* Linha de controle: quem nomeia o país abaixo de 1420px e o único
                controle do palco. Rótulos de `ui`, não de `hero` —
                "pausar"/"retomar" é texto de controle repetido (o carrossel de
                Recursos e o de Segurança usam os mesmos). */}
            <div className="mt-3 flex items-center justify-between gap-3 min-[1420px]:justify-end">
              <StageStatus code={pais.code} name={pais.name} chip={chipDe(pais, precos)} />
              <PauseButton
                pressed={paused}
                onToggle={() => setPaused((valor) => !valor)}
                labels={{ pause: ui.pause, play: ui.play }}
              />
            </div>
          </div>
        </div>

        {/* A fileira de benefícios fecha o hero, encostada na faixa (`mt-auto`),
            na largura do container inteiro — não mais embaixo dos CTAs, onde
            deixava 244px de preto entre o fim do conteúdo e a faixa.
            Só a partir de `lg`: abaixo disso ela é o que decide se o chat do
            cliente cabe na primeira tela do celular (~80px), e some. */}
        <div className="mt-auto hidden grid-cols-3 gap-x-8 pt-10 pb-10 lg:grid">
          {hero.benefits.map((benefit) => (
            <p key={benefit.value} className="max-w-[18rem] text-[13px] leading-5">
              <span className="block font-semibold text-cream">{benefit.value}</span>
              <span className="mt-0.5 block text-muted">{benefit.label}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Irmã do container, não filha: a faixa atravessa a tela inteira. */}
      <div className="mt-16 lg:mt-0">
        <IntegrationBand title={integrations.title} items={integrations.items} />
      </div>
    </section>
  );
}
