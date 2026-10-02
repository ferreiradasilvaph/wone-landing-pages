"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ShoppingBag,
  TrendingUp,
  Boxes,
  Calendar,
  RefreshCw,
  Sliders,
  TestTube,
  Megaphone,
  Zap,
  Bot,
  Check,
  ArrowRight,
  CreditCard,
  Radar,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

import { useContent } from "@/i18n";
import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/SiteHeader";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { SpotlightCard } from "@/components/SpotlightCard";
import { StepsTimeline } from "@/components/StepsTimeline";
import { Highlights } from "@/components/Highlights";
import { FeatureCard } from "@/components/FeatureCard";
import { TrackingFlow } from "@/components/TrackingFlow";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { SecurityCarousel } from "@/components/SecurityCarousel";
import { AwardsShowcase } from "@/components/AwardsShowcase";
import { FaqSection } from "@/components/FaqSection";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WoneIcon } from "@/components/WoneMark";
import { FlagMark } from "@/components/FlagMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";

const FEATURE_ICONS: Record<string, LucideIcon> = {
  ShoppingBag,
  TrendingUp,
  Boxes,
  Calendar,
  RefreshCw,
  Sliders,
  TestTube,
  Megaphone,
  Zap,
  Bot,
};

/** Cabeçalho de seção: sobrenome, título e linha de apoio, no mesmo ritmo. */
function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="t-eyebrow text-brand">{eyebrow}</span>
      <h2 className="t-h2 mt-3 text-balance text-cream">
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-gradient">{accent}</span>
          </>
        )}
      </h2>
      {description && <p className="t-lead mt-4 text-pretty">{description}</p>}
    </Reveal>
  );
}

function BenefitList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3.5">
      {items.map((text) => (
        <li key={text} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
            <Check className="h-3 w-3 stroke-[3] text-brand" />
          </span>
          <span className="text-sm leading-relaxed text-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const t = useContent();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="relative">
      <InteractiveBackground />
      <SiteHeader />
      <main>
        <Hero />
        <Highlights />
        {/* Como funciona */}
        <section id="como-funciona" className="relative px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.howItWorks.eyebrow}
              title={t.howItWorks.title}
              accent={t.howItWorks.titleAccent}
              description={t.howItWorks.description}
            />
            <div className="mt-20">
              <StepsTimeline />
            </div>
          </div>
        </section>

        {/* Os dois produtos */}
        <section className="relative border-y border-line bg-ink-900/40 px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.products.eyebrow}
              title={t.products.title}
              description={t.products.description}
            />

            <RevealGroup className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
              {t.products.items.map((product) => (
                <RevealItem key={product.name}>
                  <SpotlightCard
                    className={`flex h-full flex-col justify-between p-6 sm:p-8 ${
                      product.featured ? "border-brand/35" : ""
                    }`}
                  >
                    {product.featured && (
                      <span className="t-eyebrow absolute top-6 right-6 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-brand">
                        {t.products.featuredLabel}
                      </span>
                    )}

                    <div>
                      {/* Hierarquia: o nome do produto manda, a tagline apoia */}
                      <h3 className="t-h3 text-cream">{product.name}</h3>
                      <p className="t-eyebrow mt-2 text-brand">{product.tagline}</p>
                      <p className="mt-4 text-sm leading-relaxed text-muted">
                        {product.description}
                      </p>
                      <div className="mt-7">
                        <BenefitList items={product.bullets} />
                      </div>
                    </div>

                    <a
                      href="#fila-de-espera"
                      className={`mt-9 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                        product.featured ? "btn-brand" : "btn-ghost"
                      }`}
                    >
                      {t.products.cta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className="relative overflow-hidden px-5 py-24 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/3 left-1/2 -z-10 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-brand/6 blur-[140px]"
          />
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.features.eyebrow}
              title={t.features.title}
              accent={t.features.titleAccent}
              description={t.features.description}
            />

            <RevealGroup
              stagger={0.05}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {t.features.items.map((item, index) => {
                // São 10 recursos em 3 colunas: o último sobraria sozinho numa
                // linha, então ocupa a largura toda e fecha a grade.
                const isWide = index === t.features.items.length - 1;
                return (
                  <RevealItem
                    key={item.title}
                    className={`h-full ${isWide ? "sm:col-span-2 lg:col-span-3" : ""}`}
                  >
                    <FeatureCard
                      title={item.title}
                      description={item.description}
                      Icon={FEATURE_ICONS[item.icon] ?? Zap}
                      wide={isWide}
                    />
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </section>

        {/* Pagamentos e rastreamento */}
        <section
          id="pagamentos"
          className="relative border-y border-line bg-ink-900/40 px-5 py-24 sm:px-6"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.payments.eyebrow}
              title={t.payments.title}
              description={t.payments.description}
            />

            <Reveal className="mt-14">
              <div className="relative aspect-16/9 w-full overflow-hidden rounded-3xl border border-line shadow-2xl sm:aspect-2/1">
                <Image
                  src="/images/mockup-feed-smartphone.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center p-6 sm:p-12">
                  <span className="t-eyebrow text-brand">
                    {t.payments.bannerEyebrow}
                  </span>
                  <p className="font-display mt-3 text-xl leading-tight font-semibold text-balance text-cream sm:text-3xl">
                    {t.payments.bannerTitle}
                  </p>
                </div>
              </div>
            </Reveal>

            <RevealGroup className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Pagamentos: checkout internacional em primeiro plano */}
              <RevealItem className="h-full">
                <SpotlightCard className="h-full p-6 sm:p-8">
                  {/* Coluna flex: o acordeão desce para a base e o card
                      acompanha a altura do vizinho sem deixar buraco. */}
                  <div className="flex h-full flex-col">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <span className="t-eyebrow text-brand">{t.payments.card.title}</span>
                  <h3 className="t-h3 mt-2 text-cream">{t.payments.card.headline}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {t.payments.card.lead}
                  </p>

                  <ul className="mt-6 grid grid-cols-1 gap-2.5 min-[26rem]:grid-cols-2">
                    {t.payments.card.countries.map((country) => (
                      <li
                        key={country.name}
                        className="flex items-center gap-2.5 rounded-xl border border-line bg-ink-950/50 px-3 py-2.5"
                      >
                        <FlagMark code={country.code} className="h-5 w-7" />
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate text-xs font-semibold text-cream">
                            {country.name}
                          </span>
                          <span className="block truncate text-[11px] text-faint">
                            {country.method}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Demais garantias recolhidas, para não competir com a manchete */}
                  <button
                    type="button"
                    onClick={() => setMoreOpen((open) => !open)}
                    aria-expanded={moreOpen}
                    className="mt-auto flex w-full cursor-pointer items-center justify-between gap-3 border-t border-line pt-5 text-sm font-medium text-muted transition-colors hover:text-cream"
                  >
                    {t.payments.card.moreLabel}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        moreOpen ? "rotate-180 text-brand" : ""
                      }`}
                    />
                  </button>

                  {moreOpen && (
                    <div className="pt-5">
                      <BenefitList items={t.payments.card.more} />
                    </div>
                  )}
                  </div>
                </SpotlightCard>
              </RevealItem>

              {/* Rastreamento: o caminho do dado, animado */}
              <RevealItem className="h-full">
                <SpotlightCard className="h-full p-6 sm:p-8">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                    <Radar className="h-5 w-5" />
                  </span>
                  <h3 className="t-h3 text-cream">{t.payments.tracking.title}</h3>
                  <p className="mt-2 mb-7 text-sm font-medium text-brand">
                    {t.payments.tracking.lead}
                  </p>

                  <TrackingFlow />

                  <div className="mt-7 border-t border-line pt-6">
                    <BenefitList items={t.payments.tracking.benefits} />
                  </div>
                </SpotlightCard>
              </RevealItem>
            </RevealGroup>
          </div>
        </section>

        <AnalyticsSection />

        {/* Segurança */}
        <section className="relative border-y border-line bg-ink-900/40 px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.security.eyebrow}
              title={t.security.title}
              description={t.security.description}
            />
            <Reveal className="mt-14">
              <SecurityCarousel />
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
            <Reveal className="mt-14">
              <FaqSection />
            </Reveal>
          </div>
        </section>

        {/* Premiações */}
        <section
          id="premios"
          className="relative overflow-hidden border-t border-line px-5 py-24 sm:px-6"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-96 w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/8 blur-[150px]"
          />

          <div className="mx-auto max-w-5xl">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-xs font-semibold text-brand">
                {t.awards.badge}
              </span>
              <h2 className="t-h2 mt-5 text-balance text-cream">
                {t.awards.title}{" "}
                <span className="text-gradient">{t.awards.titleAccent}</span>
              </h2>
              <p className="t-lead mt-4 text-pretty">{t.awards.description}</p>
            </Reveal>

            <AwardsShowcase />
          </div>
        </section>

        {/* CTA final */}
        <section
          id="fila-de-espera"
          className="relative overflow-hidden border-t border-line px-5 py-24 sm:px-6"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="grid-mesh absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent_75%)]" />
            <div className="absolute top-1/2 left-1/2 h-80 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[130px]" />
          </div>

          <Reveal className="mx-auto max-w-5xl">
            <div className="surface relative overflow-hidden rounded-[2rem] p-7 shadow-2xl sm:p-10 lg:p-12">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent"
              />

              <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="lg:pt-4">
                  <h2 className="t-h2 text-balance text-cream">
                    {t.cta.title}{" "}
                    <span className="text-gradient">{t.cta.titleAccent}</span>?
                  </h2>
                  <p className="t-lead mt-5 text-pretty">{t.cta.description}</p>
                  <div className="mt-8">
                    <BenefitList items={t.cta.bullets} />
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-ink-950/50 p-6 sm:p-7">
                  <WaitlistForm />
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="relative overflow-hidden border-t border-line px-5 pt-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <WoneIcon className="h-8 w-auto" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                {t.footer.tagline}
              </p>
              <div className="mt-5">
                <span className="t-eyebrow mb-2 block text-faint">
                  {t.footer.language}
                </span>
                <LanguageToggle />
              </div>
            </div>

            <nav aria-label={t.footer.navigate} className="flex flex-col gap-3">
              <span className="t-eyebrow text-faint">{t.footer.navigate}</span>
              {t.nav.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-cream"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex flex-col gap-3">
              <span className="t-eyebrow text-faint">{t.footer.integrations}</span>
              {t.integrations.slice(0, 5).map((item) => (
                <span
                  key={item.name}
                  className="flex items-center gap-2 text-sm text-muted"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: item.dot }}
                  />
                  {item.name}
                </span>
              ))}
            </div>

            <div>
              <span className="t-eyebrow text-faint">{t.footer.access}</span>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {t.footer.accessBody}
              </p>
              <a
                href="#fila-de-espera"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-soft"
              >
                {t.footer.accessCta}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-line py-7 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
            <p>{t.footer.rights}</p>
            <p className="max-w-xl sm:text-right">{t.footer.legal}</p>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none mx-auto -mb-6 max-w-7xl select-none sm:-mb-10"
        >
          <span className="font-display block text-center text-[22vw] leading-[0.75] font-bold tracking-tighter text-cream/3">
            wone
          </span>
        </div>
      </footer>
    </div>
  );
}
