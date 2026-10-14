"use client";

import { useEffect, useState, type MouseEvent } from "react";
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
 *   2. a tela vai ao topo SEM rolagem suave — o pedido é "rola ao topo e
 *      reinicia", e uma rolagem de 3 s competindo com a coreografia de 1,2 s
 *      mostraria o título subindo em algum ponto do meio da página;
 *   3. a classe `wone-entrando` sai, o `offsetHeight` força o reflow (sem ele o
 *      navegador agrupa remoção e adição no mesmo quadro e NADA reinicia) e a
 *      classe volta: as animações de CSS recomeçam do zero;
 *   4. `wone:entrada` avisa o globo, que é o único pedaço da coreografia que
 *      não é CSS — ele refaz a onda de pontos (ver `HeroGlobe`).
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
  window.scrollTo({ top: 0, behavior: "instant" });
  /* Duas vezes, e o segundo no quadro seguinte: a página tem
     `scroll-behavior: smooth`, e quem clica na logo logo depois de um item do
     nav tem uma rolagem suave EM VOO. Medido no navegador: o salto instantâneo
     a cancela, mas ela ainda deixa alguns pixels no quadro seguinte (6 px num
     teste, 124 noutro, dependendo de onde a animação estava). O segundo empurrão
     fecha isso, e é o mesmo remédio que o script do `<head>` usa no `load`. */
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));

  const raiz = document.documentElement;
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
 * A barra de progresso de leitura saiu: era o único elemento da página, fora do
 * palco 3D, acoplado à rolagem, e pagava um `useSpring` por quadro para
 * desenhar um fio de 1px que ninguém lê.
 *
 * A pílula `layoutId` do item ativo também saiu. O estado do nav é só cor —
 * creme para a seção à vista, muted para as outras —, que é o que a referência
 * faz e o que evita um segundo laranja ao lado do CTA.
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        className={`transition-colors duration-500 ${
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

          <nav className="hidden items-center gap-6 md:flex">
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
