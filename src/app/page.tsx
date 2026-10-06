"use client";

import { Check, ArrowRight, CreditCard, Radar } from "lucide-react";

import { useContent } from "@/i18n";
import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/SiteHeader";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { SpotlightCard } from "@/components/SpotlightCard";
import { StepsTimeline } from "@/components/StepsTimeline";
import { Highlights } from "@/components/Highlights";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { TrackingFlow } from "@/components/TrackingFlow";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { SecurityCarousel } from "@/components/SecurityCarousel";
import { AwardsShowcase } from "@/components/AwardsShowcase";
import { FaqSection } from "@/components/FaqSection";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WoneIcon } from "@/components/WoneMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { CheckoutBoard } from "@/components/CheckoutBoard";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { CTA } from "@/components/cta";

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
      {/* O `accent` continua separado no dicionário, mas sai no mesmo tom do
          resto do título: degradê em palavra de título saiu da página toda, e
          cor de destaque sobrou só no hero e em Premiações. */}
      <h2 className="t-h2 mt-3 text-balance text-cream">
        {title}
        {accent && <> {accent}</>}
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
          {/* Check solto: o círculo com borda em volta saiu */}
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <Check className="h-4 w-4 stroke-[3] text-brand" />
          </span>
          <span className="text-sm leading-relaxed text-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const t = useContent();

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
        <section className="relative bg-ink-900/40 px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.products.eyebrow}
              title={t.products.title}
              description={t.products.description}
            />

            <RevealGroup className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
              {t.products.items.map((product) => (
                <RevealItem key={product.name}>
                  {/* Em destaque = superfície um tom acima (`lit`), não
                      contorno laranja em volta do card. */}
                  <SpotlightCard
                    lit={product.featured}
                    className="flex h-full flex-col justify-between p-6 sm:p-8"
                  >
                    {product.featured && (
                      <span className="t-eyebrow absolute top-6 right-6 rounded-full bg-brand/10 px-2.5 py-1 text-brand">
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
                      className={`${CTA} mt-9 inline-flex w-full`}
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
            className="pointer-events-none absolute top-1/3 left-1/2 -z-10 hidden h-80 w-[48rem] -translate-x-1/2 rounded-full bg-brand/6 blur-[140px] sm:block"
          />
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.features.eyebrow}
              title={t.features.title}
              accent={t.features.titleAccent}
              description={t.features.description}
            />

            {/* Carrossel no lugar da grade: os dez recursos ocupavam quatro
                linhas de cards, e agora a secao cabe na altura de um card. */}
            <Reveal className="mt-12">
              <FeatureCarousel />
            </Reveal>
          </div>
        </section>

        {/* Pagamentos e rastreamento */}
        <section
          id="pagamentos"
          className="relative bg-ink-900/40 px-5 py-24 sm:px-6"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow={t.payments.eyebrow}
              title={t.payments.title}
              description={t.payments.description}
            />

            {/* O checkout internacional abre a seção, do tamanho da promessa */}
            <Reveal className="mt-14">
              <CheckoutBoard />
            </Reveal>

            <RevealGroup className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* As garantias do pagamento, que viviam escondidas num acordeão */}
              <RevealItem className="h-full">
                <SpotlightCard className="h-full p-6 sm:p-8">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center text-brand">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <h3 className="t-h3 text-cream">{t.payments.card.moreLabel}</h3>

                  <div className="mt-6">
                    <BenefitList items={t.payments.card.more} />
                  </div>
                </SpotlightCard>
              </RevealItem>

              {/* Rastreamento: o caminho do dado, animado */}
              <RevealItem className="h-full">
                <SpotlightCard className="h-full p-6 sm:p-8">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center text-brand">
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
        <section className="relative bg-ink-900/40 px-5 py-24 sm:px-6">
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

        {/* Premiações */}
        <section
          id="premios"
          className="relative overflow-hidden border-t border-line px-5 py-24 sm:px-6"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 hidden h-96 w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/8 blur-[150px] sm:block"
          />

          <div className="mx-auto max-w-5xl">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              {/* Era uma pílula com borda — o mesmo enfeite que saiu do hero.
                  Virou o sobrenome de seção que as outras oito já usam. */}
              <span className="t-eyebrow text-brand">{t.awards.badge}</span>
              {/* Um dos dois únicos destaques da página, em laranja sólido e
                  numa palavra só. */}
              <h2 className="t-h2 mt-3 text-balance text-cream">
                {t.awards.title}{" "}
                <span className="text-brand">{t.awards.titleAccent}</span>
              </h2>
              <p className="t-lead mt-4 text-pretty">{t.awards.description}</p>
            </Reveal>

            <AwardsShowcase />
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

        {/* CTA final */}
        <section
          id="fila-de-espera"
          className="relative overflow-hidden border-t border-line px-5 py-24 sm:px-6"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="grid-mesh absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent_75%)]" />
            <div className="absolute top-1/2 left-1/2 hidden h-80 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-[130px] sm:block" />
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
                    {t.cta.title} {t.cta.titleAccent}?
                  </h2>
                  <p className="t-lead mt-5 text-pretty">{t.cta.description}</p>
                  <div className="mt-8">
                    <BenefitList items={t.cta.bullets} />
                  </div>
                </div>

                <div className="rounded-2xl bg-ink-900/70 p-6 sm:p-7">
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
