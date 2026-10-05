"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";
import { useContent } from "@/i18n";
import { WoneIcon } from "./WoneMark";
import { LanguageToggle } from "./LanguageToggle";

/**
 * Header fixo que muda de peso conforme a página rola: transparente no topo do
 * hero, sólido e com fio de luz depois. Acompanha a seção visível e traz o
 * menu móvel que faltava nas larguras abaixo de `md`.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const { nav, hero } = useContent();

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Marca no menu a seção que está ocupando a faixa central da tela.
  useEffect(() => {
    const sections = nav.map((link) =>
      document.querySelector<HTMLElement>(link.href),
    ).filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(`#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [nav]);

  // Trava a rolagem do fundo enquanto o menu móvel está aberto.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-colors duration-500 ${
          scrolled
            ? "border-b border-line bg-ink-950 sm:bg-ink-950/80 sm:backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-6">
          <a
            href="#topo"
            aria-label="Wone, ir para o topo"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <WoneIcon className="h-7 w-auto sm:h-8" />
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((link) => {
              const isActive = activeId === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                    isActive ? "text-cream" : "text-muted hover:text-cream"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-brand/14"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />

            <a
              href="#fila-de-espera"
              className="btn-brand hidden rounded-full px-5 py-2 text-sm font-semibold sm:inline-flex"
            >
              {hero.ctaPrimary}
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-cream transition-colors hover:bg-ink-750 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Progresso de leitura, colado na base do header */}
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="h-px origin-left bg-gradient-to-r from-brand via-brand-soft to-brand"
        />
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
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
              {nav.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-base text-cream/80 transition-colors hover:bg-brand/10 hover:text-cream"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#fila-de-espera"
                onClick={() => setMenuOpen(false)}
                className="btn-brand mt-2 rounded-xl px-5 py-3 text-center text-sm font-semibold"
              >
                {hero.ctaPrimary}
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
