import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/Hero";
import { Highlights } from "@/components/Highlights";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { PaymentsSection } from "@/components/sections/PaymentsSection";
import { SecuritySection } from "@/components/sections/SecuritySection";
import { AwardsPrefaceSection } from "@/components/sections/AwardsPrefaceSection";
import { AwardsSection } from "@/components/sections/AwardsSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { WaitlistSection } from "@/components/sections/WaitlistSection";

/**
 * A página é só a ordem das seções.
 *
 * Cada uma leva o próprio cabeçalho, o próprio fundo e o próprio ritmo (pelo
 * `Section`), e por isso este arquivo não tem mais uma linha de layout: o
 * `SectionHeading` centralizado que se repetia onze vezes, os `Reveal` em volta
 * de cada bloco e os cards montados aqui dentro saíram todos.
 *
 * Também não é mais um componente de cliente: nada aqui lê estado ou
 * dicionário, então o arquivo não entra no JavaScript enviado ao navegador.
 *
 * A ordem dos fundos é a alternância da página, e só se lê aqui: ink-950 (hero)
 * → --floor (o prefácio da vitrine) → ink-850 → ink-950 → ink-850 → ink-950 →
 * ink-850 → ink-800 (o bloco invertido) → --floor (a vitrine) → ink-950 →
 * ink-850 → ink-950 (rodapé).
 * Nenhuma régua entre seções: a fronteira é a troca de tom. O chão quente
 * aparece duas vezes, e só nessas duas: o prefácio e a vitrine são a mesma
 * coisa dita em dois lugares, e o fundo é o que diz isso sem uma palavra.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        {/* O prefácio da vitrine, pedido do dono em 15/10 para o espaço abaixo
            dos botões do hero: a promessa mais aspiracional da página (os
            troféus) dita em quatro marcos, já no chão quente da vitrine. Sem
            item no nav — prefácio não compete com o destino. */}
        <AwardsPrefaceSection />
        <Highlights />
        <HowItWorksSection />
        <FeaturesSection />
        <PaymentsSection />
        <AnalyticsSection />
        <SecuritySection />
        <AwardsSection />
        <FaqSection />
        <WaitlistSection />
      </main>
      <SiteFooter />
    </>
  );
}
