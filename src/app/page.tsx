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
  ShieldCheck,
  Check,
  ArrowRight,
  BarChart3,
  Sparkles,
  CreditCard,
  Radar,
} from "lucide-react";

import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/SiteHeader";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { SpotlightCard } from "@/components/SpotlightCard";
import { StepsTimeline } from "@/components/StepsTimeline";
import { DashboardPreview } from "@/components/DashboardPreview";
import { AwardsShowcase } from "@/components/AwardsShowcase";
import { FaqSection } from "@/components/FaqSection";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WoneIcon } from "@/components/WoneMark";
import { Counter } from "@/components/Counter";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import {
  HIGHLIGHTS,
  FEATURES,
  PRODUCTS,
  PAYMENT_BENEFITS,
  TRACKING_BENEFITS,
  ANALYTICS_METRICS,
  SECURITY_ITEMS,
  NAV_LINKS,
} from "@/data/content";

const ICON_MAP = {
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
} as const;

/** Cabeçalho de seção: sobrenome, título e linha de apoio, sempre no mesmo ritmo. */
function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  const centered = align === "center";
  return (
    <Reveal className={centered ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <span className="t-eyebrow text-brand">{eyebrow}</span>
      <h2 className="t-h2 mt-3 text-balance text-cream">{title}</h2>
      {description && <p className="t-lead mt-4 text-pretty">{description}</p>}
    </Reveal>
  );
}

function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3.5">
      {items.map((text) => (
        <li key={text} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
            <Check className="h-3 w-3 text-brand stroke-[3]" />
          </span>
          <span className="text-sm leading-relaxed text-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="relative">
      <InteractiveBackground />
      <SiteHeader />

      <main>
        <Hero />

        {/* Números do produto */}
        <section className="relative px-5 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="hairline mb-16" />
            <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              {HIGHLIGHTS.map((item) => (
                <RevealItem key={item.label} className="text-center lg:text-left">
                  <span className="block text-4xl font-semibold tracking-tight text-cream sm:text-5xl">
                    <Counter
                      to={item.value}
                      decimals={item.decimals}
                      suffix={item.suffix}
                    />
                  </span>
                  <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-relaxed text-muted lg:mx-0">
                    {item.label}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="relative px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Passo a passo"
              title={
                <>
                  Do bot à primeira venda em{" "}
                  <span className="text-gradient">4 passos</span>
                </>
              }
              description="Sem planilha, sem conferência manual. Você configura uma vez e a operação roda sozinha."
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
              eyebrow="Dois caminhos"
              title="Dois jeitos de montar seu funil"
              description="Escolha o que combina com você. Dá para usar os dois na mesma conta."
            />

            <RevealGroup className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
              {PRODUCTS.map((product) => (
                <RevealItem key={product.name}>
                  <SpotlightCard
                    className={`flex h-full flex-col justify-between p-8 ${
                      product.featured ? "border-brand/35" : ""
                    }`}
                  >
                    {product.featured && (
                      <span className="t-eyebrow absolute top-6 right-6 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-brand">
                        Completo
                      </span>
                    )}

                    <div>
                      <span className="text-xs font-semibold tracking-wide text-brand uppercase">
                        {product.tagline}
                      </span>
                      <h3 className="t-h3 mt-2 text-cream">{product.name}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted">
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
                      Solicitar acesso
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
              eyebrow="Recursos"
              title={
                <>
                  Tudo o que seu funil precisa para{" "}
                  <span className="text-gradient">vender mais</span>
                </>
              }
              description="Os recursos que fazem a diferença entre uma venda e dezenas."
            />

            <RevealGroup
              stagger={0.05}
              className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {FEATURES.map((item, index) => {
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
                // São 10 recursos em 3 colunas: o último sobraria sozinho numa
                // linha, então ocupa a largura toda e vira o fecho da grade.
                const isWide = index === FEATURES.length - 1;

                return (
                  <RevealItem
                    key={item.title}
                    className={`h-full ${isWide ? "sm:col-span-2 lg:col-span-3" : ""}`}
                  >
                    <SpotlightCard
                      className={isWide ? "h-full border-brand/25 p-8" : "h-full"}
                    >
                      <div
                        className={
                          isWide
                            ? "flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7"
                            : ""
                        }
                      >
                        <span
                          className={`flex shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand transition-transform duration-500 group-hover/card:scale-110 ${
                            isWide ? "h-14 w-14" : "mb-5 h-11 w-11"
                          }`}
                        >
                          <Icon className={isWide ? "h-6 w-6" : "h-5 w-5"} />
                        </span>
                        <div>
                          <h3
                            className={`font-display font-semibold text-cream ${
                              isWide ? "text-xl" : "text-base"
                            }`}
                          >
                            {item.title}
                          </h3>
                          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </SpotlightCard>
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
              eyebrow="Pagamentos e rastreio"
              title="Receba com segurança e saiba de onde vem cada venda"
              description="O dinheiro cai na sua conta e cada clique no anúncio volta como dado para a sua campanha."
            />

            {/* Banner do criativo ao caixa */}
            <Reveal className="mt-14">
              <div className="relative aspect-16/9 w-full overflow-hidden rounded-3xl border border-line shadow-2xl sm:aspect-2/1">
                <Image
                  src="/images/mockup-feed-smartphone.jpg"
                  alt="Criativo da Wone exibido no feed do Instagram em um smartphone"
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-transparent" />
                <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center p-6 sm:p-12">
                  <span className="t-eyebrow text-brand">Do criativo ao caixa</span>
                  <p className="font-display mt-3 text-xl leading-tight font-semibold text-balance text-cream sm:text-3xl">
                    Cada clique no anúncio volta como dado servidor a servidor.
                  </p>
                </div>
              </div>
            </Reveal>

            <RevealGroup className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RevealItem className="h-full">
                <SpotlightCard className="h-full p-8">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <h3 className="t-h3 text-cream">Pagamentos</h3>
                  <p className="mt-2 mb-7 text-sm font-medium text-brand">
                    PIX Copia e Cola, fallback de gateways e checkout internacional.
                  </p>
                  <BenefitList items={PAYMENT_BENEFITS} />
                </SpotlightCard>
              </RevealItem>

              <RevealItem className="h-full">
                <SpotlightCard className="h-full p-8">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                    <Radar className="h-5 w-5" />
                  </span>
                  <h3 className="t-h3 text-cream">Rastreamento</h3>
                  <p className="mt-2 mb-7 text-sm font-medium text-brand">
                    Do clique no anúncio até a venda confirmada e o pós-checkout.
                  </p>
                  <BenefitList items={TRACKING_BENEFITS} />
                </SpotlightCard>
              </RevealItem>
            </RevealGroup>
          </div>
        </section>

        {/* Análises */}
        <section className="relative px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <SectionHeading
                  align="left"
                  eyebrow="Análises"
                  title={
                    <>
                      Decida com números, não com{" "}
                      <span className="text-gradient">achismo</span>
                    </>
                  }
                  description="Um painel que mostra a saúde da sua comunidade VIP em tempo real."
                />
                <Reveal delay={0.1} className="mt-8">
                  <ul className="space-y-3.5">
                    {ANALYTICS_METRICS.map((metric) => (
                      <li key={metric} className="flex items-start gap-3">
                        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span className="text-sm leading-relaxed text-muted">
                          {metric}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>

              <Reveal from="left">
                <DashboardPreview />
              </Reveal>
            </div>

            <Reveal className="mt-20">
              <figure>
                <div className="relative aspect-16/9 w-full overflow-hidden rounded-3xl border border-line bg-ink-950 shadow-2xl">
                  <Image
                    src="/images/mockup-flutuante.jpg"
                    alt="Três cartões da Wone: a era dos robozinhos acabou, as 3 métricas de uma operação saudável e onde o tráfego está morrendo"
                    fill
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-4 text-center text-xs text-faint">
                  Start → PIX gerado → PIX pago. O resto é ruído.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* Segurança */}
        <section className="relative border-y border-line bg-ink-900/40 px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Segurança"
              title="Sua operação blindada"
              description="Conteúdo protegido, acesso controlado e credenciais guardadas em cofre."
            />

            <RevealGroup className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SECURITY_ITEMS.map((item) => (
                <RevealItem key={item.title} className="h-full">
                  <SpotlightCard className="h-full">
                    <ShieldCheck className="mb-4 h-6 w-6 text-brand" />
                    <h3 className="font-display text-sm font-semibold text-cream">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </SpotlightCard>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative px-5 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Dúvidas" title="Perguntas frequentes" />
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
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 -right-20 -z-10 hidden h-[34rem] w-96 -translate-y-1/2 opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)] lg:block"
          >
            <Image
              src="/images/placa-wone-1m.png"
              alt=""
              fill
              sizes="384px"
              className="object-contain"
            />
          </div>

          <div className="mx-auto max-w-5xl">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-xs font-semibold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                Milestone Awards
              </span>
              <h2 className="t-h2 mt-5 text-balance text-cream">
                Premiações &amp; <span className="text-gradient">reconhecimento</span>
              </h2>
              <p className="t-lead mt-4 text-pretty">
                A cada novo patamar de faturamento no Telegram, o troféu oficial e os
                itens comemorativos exclusivos chegam na sua casa.
              </p>
            </Reveal>

            <AwardsShowcase />
          </div>
        </section>

        {/* CTA final com o formulário da fila de espera */}
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

              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
                <div>
                  <h2 className="t-h2 text-balance text-cream">
                    Pronto para colocar sua comunidade no{" "}
                    <span className="text-gradient">piloto automático</span>?
                  </h2>
                  <p className="t-lead mt-5 text-pretty">
                    Conecte seu bot, monte seu funil e deixe a infraestrutura Wone
                    cuidar da cobrança, do remarketing e da revogação de acessos.
                  </p>

                  <div className="mt-8">
                    <BenefitList
                      items={[
                        "Sem cartão para entrar na fila",
                        "Convites liberados em levas, por ordem de inscrição",
                        "Você recebe o acesso por e-mail",
                      ]}
                    />
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
          <div className="flex flex-col justify-between gap-10 sm:flex-row sm:items-start">
            <div className="max-w-xs">
              <WoneIcon className="h-8 w-auto" />
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Infraestrutura autônoma de monetização para Telegram.
              </p>
            </div>

            <nav aria-label="Rodapé" className="flex flex-col gap-3">
              <span className="t-eyebrow text-faint">Navegar</span>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-cream"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="max-w-xs">
              <span className="t-eyebrow text-faint">Acesso</span>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                A plataforma é liberada progressivamente por convite.
              </p>
              <a
                href="#fila-de-espera"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-soft"
              >
                Entrar na lista
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-line py-7 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Wone Bot. Todos os direitos reservados.</p>
            <p className="max-w-xl sm:text-right">
              A Wone é uma plataforma SaaS independente e não possui vínculo corporativo
              ou endosso do Telegram.
            </p>
          </div>
        </div>

        {/* Marca d'água: o logotipo cortado pela borda inferior */}
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
