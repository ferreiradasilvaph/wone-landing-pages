"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useContent } from "@/i18n";
import { CtaButton } from "./CtaButton";
import { WoneIcon } from "./WoneMark";
import { LanguageToggle } from "./LanguageToggle";

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
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { nav, hero } = useContent();

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
          <a
            href="#topo"
            aria-label="Wone, ir para o topo"
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
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-field bg-ink-800 text-cream transition-colors hover:bg-ink-750 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-line bg-ink-950 md:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
              {nav.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-field px-3 py-3 text-base text-cream/80 transition-colors hover:bg-ink-800 hover:text-cream"
                >
                  {link.label}
                </a>
              ))}
              <CtaButton
                href="#fila-de-espera"
                size="bar"
                onClick={() => setMenuOpen(false)}
                className="mt-2"
              >
                {hero.ctaPrimary}
              </CtaButton>

              {/* O lugar do idioma abaixo de `sm`, onde há largura para ele. */}
              <div className="mt-4 px-3 sm:hidden">
                <LanguageToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
