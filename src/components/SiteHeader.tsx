"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Menu, X } from "lucide-react";
import { useContent } from "@/i18n";
import { CtaButton } from "./CtaButton";
import { WoneIcon } from "./WoneMark";
import { LanguageToggle } from "./LanguageToggle";

/** Quanto dura a travessia do menu móvel, em ms — o mesmo número do CSS. */
const MENU_MS = 250;

/**
 * A LOGO REINICIA A HOME — pedido do dono de 15/10: "a logo leva para '/' e
 * REPETE tudo".
 *
 * O `href` é `/` de verdade, em `<a>` cru e não em `next/link`: vindo de outra
 * rota, é uma navegação de documento inteiro, o script do `<head>` roda outra
 * vez e a coreografia acontece igual ao F5 e à URL digitada — os três casos que
 * o dono exigiu idênticos.
 *
 * Estando JÁ na home, recarregar a página inteira para ver uma animação de 1,2 s
 * seria um desperdício visível (tela branca, fontes, hidratação). Então aqui se
 * faz à mão o que o recarregamento faria, na mesma ordem:
 *   1. a âncora velha sai da URL (`#faq` e companhia), sem empilhar histórico;
 *   2. a tela TELETRANSPORTA para o topo — o `scroll-behavior` da raiz é
 *      desligado durante o salto, para nem a rolagem suave da página nem uma
 *      que esteja em voo deixarem percurso visível (ver abaixo);
 *   3. a classe `wone-entrando` sai, o `offsetHeight` força o reflow (sem ele o
 *      navegador agrupa remoção e adição no mesmo quadro e NADA reinicia) e a
 *      classe volta: as animações de CSS recomeçam do zero;
 *   4. `wone:entrada` avisa o `Hero`, que REMONTA o hero inteiro com uma `key`
 *      nova (fila de países, globo, cena 3D): é o pedaço da coreografia que não
 *      é CSS, e desde 20/10 ele recomeça do zero como num F5 — antes só a onda
 *      de pontos se refazia e o tour seguia de onde estava (ver `Hero`).
 *
 * Com movimento reduzido, só o passo 1 e 2: quem pediu menos movimento não
 * ganha animação nenhuma por clicar na logo.
 */
function reiniciarEntrada(evento: MouseEvent<HTMLAnchorElement>) {
  /* Clique com modificador ou botão do meio é "abrir em outra aba": não é nosso
     assunto, e o navegador faz o certo com o `href` real. */
  if (
    evento.defaultPrevented ||
    evento.metaKey ||
    evento.ctrlKey ||
    evento.shiftKey ||
    evento.altKey ||
    evento.button !== 0
  ) {
    return;
  }
  if (window.location.pathname !== "/") return;

  evento.preventDefault();
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const raiz = document.documentElement;

  /* TELETRANSPORTE, e não rolagem — pedido do dono de 15/10, literal: "quando eu
     clicar na logo em qualquer sessão, não quero que scrolle tudo para cima,
     quero que teleporte para a página inicial do hero".
     `behavior: "instant"` sozinho não bastava, e o motivo é o `html` ter
     `scroll-behavior: smooth` (globals.css): com uma rolagem suave EM VOO — quem
     clica na logo logo depois de um item do nav —, o salto instantâneo cancelava
     a animação mas o navegador ainda devolvia alguns pixels no quadro seguinte
     (6 px num teste, 124 noutro, dependendo de onde ela estava).
     O remédio é desligar a suavidade NA RAIZ enquanto o salto acontece: com
     `scroll-behavior: auto` no `style` do `<html>`, o `scrollTo(0, 0)` é
     síncrono, aborta qualquer rolagem programada e não tem como ser
     reinterpretado como animação. Três empurrões — um agora, um no quadro
     seguinte e um no outro, que é quando a classe de entrada já voltou e o
     layout já se refez — e só então o estilo volta ao que era, para a rolagem
     suave dos itens do nav continuar suave. Nunca `behavior: "smooth"` aqui. */
  const suavidade = raiz.style.scrollBehavior;
  raiz.style.scrollBehavior = "auto";
  /* O `offsetHeight` aqui não é zelo, é o que faz o salto ser NO MESMO QUADRO.
     Medido no navegador: escrever o `scroll-behavior: auto` e chamar o
     `scrollTo` na linha seguinte não adianta — o estilo ainda não foi
     recalculado, o motor lê o `smooth` antigo e agenda uma animação (o
     `scrollY` lido logo depois ainda era 5.000 de 5.000). Com o reflow forçado
     entre os dois, a mesma chamada devolve 0 na hora. */
  void raiz.offsetHeight;
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      raiz.style.scrollBehavior = suavidade;
    });
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  raiz.classList.remove("wone-entrando");
  void raiz.offsetHeight;
  raiz.classList.add("wone-entrando");
  raiz.dataset.entrada = String(Math.round(performance.now()));
  document.dispatchEvent(new CustomEvent("wone:entrada"));
}

/**
 * Header fixo de 64px: transparente sobre o hero, sólido depois de 24px de
 * rolagem. Acompanha a seção visível e traz o menu móvel.
 *
 * O FIO DE PROGRESSO E O SUBLINHADO DESLIZANTE VOLTARAM EM 18/10, com a leva 1
 * do pacote criativo — e não é o mesmo par que saiu em 14/10. O que saiu
 * naquela limpeza (e os comentários que o diziam estão no histórico) eram duas
 * peças do motion: uma barra de progresso que pagava um `useSpring` POR QUADRO
 * para desenhar 1px, e uma pílula `layoutId` por baixo do item ativo, que
 * pedia o pacote de layout do motion neste arquivo — que está na primeira
 * dobra, e cujo import punha 42,2 kB no caminho crítico do FCP.
 *
 * O que volta não custa nada disso:
 *
 *  - o fio é `transform: scaleX()` escrito DIRETO no nó, dentro do rAF que o
 *    listener de rolagem já tinha para decidir o fundo sólido. Sem estado de
 *    React (o fio nunca re-renderiza o header), sem mola, sem biblioteca: uma
 *    multiplicação e uma escrita de estilo por quadro rolado;
 *  - o sublinhado é UM elemento de 1px posicionado por `translateX` e esticado
 *    por `scaleX`, com `getBoundingClientRect` só quando a seção à vista muda
 *    (e no `resize`). Não é a pílula de antes: é um fio de 2px, da espessura
 *    do sistema, que SAI de um item e CHEGA no outro — o mesmo motivo da
 *    bolinha que a leva 1 leva para o resto da página, no menor espaço que a
 *    página tem.
 *
 * A cor do item ativo continua sendo o estado principal (creme para a seção à
 * vista, muted para as outras); o fio é o percurso entre elas.
 *
 * O MENU MÓVEL SAIU DO MOTION. Era um `AnimatePresence`, e este arquivo está na
 * primeira dobra: medido em 14/10, o import de `motion/react` aqui era um dos
 * treze que punham o pacote do motion (42,2 kB transferidos) entre os 8 scripts
 * baixados ANTES da primeira pintura, e o Lighthouse cobra esse download no FCP
 * e no LCP do h1 (FCP −0,42 s sem ele, experimento E-f1).
 *
 * O que o `AnimatePresence` fazia e um `&&` não faz é a SAÍDA: o painel precisa
 * continuar montado enquanto se desfaz. Daí o estado ter três valores em vez de
 * um booleano — `fechando` é o quarto de segundo em que o menu já não está
 * aberto e ainda está na tela. É o mesmo desenho, a mesma duração e a mesma
 * curva; quem as escreve agora é `@keyframes header-menu-in/out`.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<"fechado" | "aberto" | "fechando">("fechado");
  const [activeSection, setActiveSection] = useState("");
  const { nav, hero } = useContent();

  /** O fio de progresso de leitura, escrito por `transform` fora do React. */
  const fioRef = useRef<HTMLSpanElement>(null);
  /** O sublinhado deslizante e o trilho em que ele se mede. */
  const subRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  /** Já está embaixo de algum item? Decide se a próxima troca desliza. */
  const subNoLugar = useRef(false);

  const menuOpen = menu === "aberto";
  const fecharMenu = () => setMenu((atual) => (atual === "aberto" ? "fechando" : atual));

  /* Desmonta o painel quando a animação de saída termina. Com movimento
     reduzido a regra global zera a DURAÇÃO da animação, então o painel some na
     hora e este temporizador só retira da árvore o que já está invisível. */
  useEffect(() => {
    if (menu !== "fechando") return;
    const id = window.setTimeout(() => setMenu("fechado"), MENU_MS);
    return () => window.clearTimeout(id);
  }, [menu]);

  /**
   * Põe o sublinhado embaixo do item ativo.
   *
   * Quem diz qual é o item é o DOM, não um índice guardado à parte: o link da
   * seção à vista já leva `aria-current`, então a medida sai de uma consulta e
   * não existe um segundo estado para divergir do primeiro.
   *
   * Duas medidas (`getBoundingClientRect` do item e do nav) e duas escritas de
   * variável, e só quando a seção muda — nunca por quadro de rolagem.
   */
  const posicionaSub = useCallback(() => {
    const barra = subRef.current;
    const trilho = navRef.current;
    if (!barra || !trilho) return;

    const item = trilho.querySelector<HTMLElement>("a[aria-current]");
    const caixa = item?.getBoundingClientRect();
    /* Abaixo de `md` o nav está em `display: none` e mede zero — e no topo da
       página nenhuma seção está à vista. Nos dois casos não há item a
       sublinhar, e o fio sai de cena por opacidade (nunca por `display`: o
       percurso da próxima troca parte de onde ele está). */
    if (!caixa || caixa.width === 0) {
      barra.style.opacity = "0";
      subNoLugar.current = false;
      return;
    }

    const base = trilho.getBoundingClientRect();
    /* A PRIMEIRA APARIÇÃO NÃO DESLIZA. Sem isto o fio viria da borda esquerda
       do nav até o primeiro item ativo, um percurso que não aconteceu — o
       leitor rolou a página, não trocou de seção. Desligar a transição, medir
       e religar custa um reflow forçado, uma vez por visita. */
    if (!subNoLugar.current) barra.style.transition = "none";
    barra.style.setProperty("--x", `${(caixa.left - base.left).toFixed(1)}px`);
    barra.style.setProperty("--w", caixa.width.toFixed(1));
    barra.style.opacity = "1";
    if (!subNoLugar.current) {
      void barra.offsetWidth;
      barra.style.transition = "";
      subNoLugar.current = true;
    }
  }, []);

  /* UM LISTENER DE ROLAGEM, UM rAF, e as duas peças escritas no mesmo quadro.
     O fundo sólido já dependia da rolagem; o fio de progresso entra no mesmo
     caminho em vez de abrir um segundo (regra: um relógio por viewport).

     Coalescido: dezenas de eventos de rolagem por quadro viram UMA escrita, e
     o `frame` guardado é o que impede o enfileiramento. Passivo, porque nada
     aqui cancela a rolagem.

     `setScrolled` com o mesmo valor não re-renderiza (o React descarta a
     atualização idêntica), então o header só repinta nas duas travessias dos
     24px — o fio, que muda sempre, não passa pelo React: ele é `transform`
     escrito no nó. */
  useEffect(() => {
    let frame = 0;
    let remedir = false;

    const escreve = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);

      const fio = fioRef.current;
      if (fio) {
        /* O curso é o que SOBRA de página: altura do documento menos a janela.
           Zero (ou negativo) numa página que não rola — e aí o fio fica
           recolhido em vez de nascer cheio por divisão por zero. */
        const curso = document.documentElement.scrollHeight - window.innerHeight;
        const andado = curso > 0 ? Math.min(1, Math.max(0, window.scrollY / curso)) : 0;
        fio.style.transform = `scaleX(${andado.toFixed(4)})`;
      }

      if (remedir) {
        remedir = false;
        posicionaSub();
      }
    };

    const pede = () => {
      if (!frame) frame = requestAnimationFrame(escreve);
    };
    /* Mudou a largura, mudou o lugar do item: o sublinhado remede no mesmo
       quadro em que o fio é reescrito (a altura da janela também entra no
       curso da rolagem). */
    const naMedida = () => {
      remedir = true;
      pede();
    };

    escreve();
    window.addEventListener("scroll", pede, { passive: true });
    window.addEventListener("resize", naMedida, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", pede);
      window.removeEventListener("resize", naMedida);
    };
  }, [posicionaSub]);

  /* A troca de seção é o que move o sublinhado. `nav` entra na lista porque
     trocar de idioma troca a largura dos rótulos. */
  useEffect(() => {
    posicionaSub();
  }, [activeSection, nav, posicionaSub]);

  /* Observa `[data-section]`, não o `href` do link. O id de âncora passou a
     viver no BLOCO DO TÍTULO (com `scroll-mt-24`, para a rolagem parar abaixo
     do header), que é um pedaço pequeno no alto da seção: observá-lo marcaria o
     item ativo só nos primeiros pixels de cada seção. `data-section` fica na
     `<section>` inteira, que é o que o leitor realmente está vendo. */
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section]"),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveSection(visible.target.getAttribute("data-section") ?? "");
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Trava a rolagem do fundo enquanto o menu móvel está aberto.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    /* A promoção a camada própria (`transform-gpu` + `will-change`) não é
       enfeite: sem ela o compositor do celular pinta o header junto com o
       conteúdo que rola e, quando um canvas WebGL entra em cena e a página é
       re-camadada, a barra some junto com a rolagem. E o z-70 põe a barra acima
       do grão, que é a outra camada fixa de tela cheia da página. */
    <header className="fixed inset-x-0 top-0 z-[70] transform-gpu backface-hidden will-change-transform">
      <div
        className={`relative transition-colors duration-500 ${
          scrolled
            ? "border-b border-line bg-ink-950"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          {/* `h-11`: o alvo de toque é o link inteiro, não o desenho da marca —
              a 412px ele media 28×45 e ficava abaixo dos 44px do portão. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              o `<a>` cru é O PEDIDO ("use <a href='/'> comum, não next/link"), e
              é o que faz a logo repetir a entrada: `next/link` faria navegação
              de cliente, sem recarregar o documento, sem o script do `<head>` e
              sem coreografia. Vindo de outra rota é recarga de documento; já na
              home, o `onClick` acima faz o reinício sem pagar a recarga. */}
          <a
            href="/"
            onClick={reiniciarEntrada}
            aria-label="Wone, voltar ao início"
            className="flex h-11 shrink-0 items-center transition-opacity hover:opacity-80"
          >
            <WoneIcon className="h-7 w-auto sm:h-8" />
          </a>

          <nav ref={navRef} className="relative hidden items-center gap-6 md:flex">
            {nav.map((link) => {
              const isActive = activeSection === link.href.slice(1);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  /* `aria-current` só existe quando é verdade: o atributo com
                     valor "false" é anunciado por alguns leitores como se
                     houvesse estado ali. */
                  {...(isActive ? { "aria-current": true as const } : null)}
                  className={`text-[15px] font-medium transition-colors ${
                    isActive ? "text-cream" : "text-muted hover:text-cream"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}

            {/* O SUBLINHADO. Um nó, 1px de largura, esticado por `--w` e levado
                por `--x` (ver `.header-sub` em leva1.css). Fica DENTRO do nav:
                é ali que ele se mede, e é o que o faz desaparecer sozinho
                abaixo de `md`, onde o nav é `display: none`. */}
            <span
              ref={subRef}
              aria-hidden
              className="header-sub pointer-events-none absolute -bottom-2 left-0 h-0.5 w-px bg-brand opacity-0"
            />
          </nav>

          <div className="flex items-center gap-2">
            {/* Abaixo de `sm` a pílula PT/EN desce para o menu móvel, e não por
                gosto: medido a 412px, logo (45) + toggle (92) + CTA (169, e 179
                em inglês) + hambúrguer (44) passam dos 370px de conteúdo, e o
                rótulo do botão quebrava em duas linhas dentro da barra de 64px.
                Entre esconder o CTA (que a espec manda ficar) e mover o idioma,
                move-se o idioma: ele continua a um toque no menu e no rodapé. */}
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>

            {/* Visível em todos os tamanhos: o mesmo rótulo do hero e do submit,
                três vezes na página, é o que fixa qual é a ação do site. */}
            <CtaButton href="#fila-de-espera" size="bar" className="shrink-0 whitespace-nowrap">
              {hero.ctaPrimary}
            </CtaButton>

            <button
              type="button"
              onClick={() => setMenu((atual) => (atual === "aberto" ? "fechando" : "aberto"))}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-field bg-ink-800 text-cream transition-colors hover:bg-ink-750 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* O FIO DE PROGRESSO DE LEITURA: 2px laranja na borda de baixo da
            barra, do mesmo peso do marcador de aba ativa da Plataforma — a
            página tem uma espessura de fio, não três.

            `-bottom-px` o põe por cima da régua de 1px da barra (a mesma
            solução do marcador da Plataforma): ele cobre a linha em vez de
            somar uma segunda, e não ocupa um pixel de layout — o header
            continua com os mesmos 65px, e o CLS da leva é zero.

            Em `scaleX(0)` até a primeira rolagem: sobre o hero, onde a barra é
            transparente, um fio laranja atravessado seria uma régua no meio da
            cena de abertura. */}
        <span
          ref={fioRef}
          aria-hidden
          className="header-fio absolute inset-x-0 -bottom-px h-0.5 bg-brand"
        />
      </div>

      {menu !== "fechado" && (
        <div
          className={`border-b border-line bg-ink-950 md:hidden ${
            menuOpen ? "header-menu-in" : "header-menu-out"
          }`}
        >
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {nav.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={fecharMenu}
                className="rounded-field px-3 py-3 text-base text-cream/80 transition-colors hover:bg-ink-800 hover:text-cream"
              >
                {link.label}
              </a>
            ))}
            <CtaButton
              href="#fila-de-espera"
              size="bar"
              onClick={fecharMenu}
              className="mt-2"
            >
              {hero.ctaPrimary}
            </CtaButton>

            {/* O lugar do idioma abaixo de `sm`, onde há largura para ele. */}
            <div className="mt-4 px-3 sm:hidden">
              <LanguageToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
