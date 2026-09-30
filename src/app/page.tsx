"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { SpotlightCard } from "@/components/SpotlightCard";
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
  CheckCircle2,
  Lock,
  ArrowRight,
  BarChart3,
  Globe2,
} from "lucide-react";
import {
  NAV_LINKS,
  HOW_IT_WORKS,
  FEATURES,
  PAYMENT_BENEFITS,
  TRACKING_BENEFITS,
  ANALYTICS_METRICS,
  SECURITY_ITEMS,
} from "@/data/content";
import { FaqSection } from "@/components/FaqSection";

const ICON_MAP: Record<string, React.ReactNode> = {
  ShoppingBag: <ShoppingBag className="w-5 h-5 text-[#FF7700]" />,
  TrendingUp: <TrendingUp className="w-5 h-5 text-[#FF7700]" />,
  Boxes: <Boxes className="w-5 h-5 text-[#FF7700]" />,
  Calendar: <Calendar className="w-5 h-5 text-[#FF7700]" />,
  RefreshCw: <RefreshCw className="w-5 h-5 text-[#FF7700]" />,
  Sliders: <Sliders className="w-5 h-5 text-[#FF7700]" />,
  TestTube: <TestTube className="w-5 h-5 text-[#FF7700]" />,
  Megaphone: <Megaphone className="w-5 h-5 text-[#FF7700]" />,
  Zap: <Zap className="w-5 h-5 text-[#FF7700]" />,
  Bot: <Bot className="w-5 h-5 text-[#FF7700]" />,
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200">
      {/* 1. Header Fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo oficial substituindo o texto antigo */}
            <a href="#" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Wone"
                width={130}
                height={36}
                priority
                className="h-8 w-auto object-contain"
              />
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors">
              Entrar
            </button>
            <a
              href="#fila-de-espera"
              className="text-sm font-semibold bg-[#FF7700] hover:bg-[#e06900] text-black px-4 py-2 rounded-lg transition-colors shadow-lg shadow-[#FF7700]/10"
            >
              Preencher fila de espera
            </a>
          </div>
        </div>
      </header>


      {/* 2. Hero Section */}
      <section className="pt-36 pb-20 px-6 max-w-7xl mx-auto text-center relative overflow-hidden">
        {/* Glow de fundo subtil da marca */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#FF7700]/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10">
          {/* Selo */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#FF7700]/30 bg-[#FF7700]/10 text-[#FF7700] text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7700] animate-pulse" />
            Plataforma de vendas para Telegram
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight text-white">
            Automatize suas vendas no Telegram, do primeiro contato à entrega do acesso
          </h1>

          {/* Subtítulo */}
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Funil de vendas, PIX e cartão, upsell, remarketing e entrega automática em canais e grupos privados. Tudo em uma só plataforma.
          </p>

          {/* Botões de Ação */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#fila-de-espera"
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#FF7700] hover:bg-[#e06900] font-semibold text-black transition-all shadow-lg shadow-[#FF7700]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Preencher fila de espera
            </a>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto px-6 py-3.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 font-medium text-zinc-300 transition-colors"
            >
              Ver como funciona
            </a>
          </div>

          {/* Linha de Confiança */}
          <p className="mt-8 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Integrado com PIX · Cartão · Meta · TikTok · UTMify
          </p>

         {/* Mockup Real do Hero */}
          <div className="mt-12 max-w-2xl mx-auto rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-2 sm:p-4 shadow-2xl relative overflow-hidden group">
            {/* Glow alaranjado a incidir sobre o mockup */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#FF7700]/20 blur-[80px] pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden bg-[#161616] flex items-center justify-center">
              <Image
                src="/hero-mockup.png"
                alt="Wone Bot no telemóvel"
                width={800}
                height={600}
                className="w-full max-h-[480px] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Como funciona */}
      <section id="como-funciona" className="py-24 px-6 border-t border-zinc-900">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Do bot à primeira venda em 4 passos
            </h2>
            <p className="mt-3 text-zinc-400">
              Sem planilha, sem copiar e colar link, sem ficar de plantão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex flex-col justify-between"
              >
                <div>
                  <span className="text-3xl font-black text-[#FF7700] block mb-4">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* 4. Os Dois Produtos */}
      <section className="py-24 px-6 border-t border-zinc-900 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Dois jeitos de montar seu funil
            </h2>
            <p className="mt-3 text-zinc-400">
              Escolha o caminho que combina com você. Dá para usar os dois na mesma conta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1 */}
            <SpotlightCard className="p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#FF7700]">
                  O funil pronto. É só preencher.
                </span>
                <h3 className="text-2xl font-bold text-white mt-2 mb-3">Wone Estático</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Boas-vindas, planos, order bump, upsell, downsell, packs, pagamento, entrega e renovação, organizados em abas. Você preenche, a Wone executa.
                </p>

                <ul className="space-y-3 mb-8 text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0" />
                    Ideal para começar a vender rápido
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0" />
                    Nenhuma lógica para configurar
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0" />
                    Funil completo de venda já estruturado
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-sm font-medium transition-colors">
                Solicitar acesso
              </button>
            </SpotlightCard>

            {/* Card 2 */}
            <SpotlightCard className="p-8 flex flex-col justify-between border-[#FF7700]/40">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#FF7700]">
                  Desenhe o funil do seu jeito.
                </span>
                <h3 className="text-2xl font-bold text-white mt-2 mb-3">Wone Fluxos</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Um editor visual por blocos, onde você monta a lógica de ponta a ponta: condições, esperas, etiquetas, integrações e inteligência artificial.
                </p>

                <ul className="space-y-3 mb-8 text-sm text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0" />
                    28 tipos de bloco, incluindo 4 de IA
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0" />
                    Simulador e modo de teste no próprio painel
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0" />
                    Métricas por bloco para saber onde o lead para
                  </li>
                </ul>
              </div>

              <button className="w-full py-3 rounded-lg bg-[#FF7700] hover:bg-[#e06900] text-black font-semibold text-sm transition-colors shadow-lg shadow-[#FF7700]/10">
                Solicitar acesso
              </button>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* 5. Recursos */}
      <section id="recursos" className="py-24 px-6 border-t border-zinc-900 relative overflow-hidden">
        {/* Glow de fundo subtil */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#FF7700]/5 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Tudo o que seu funil precisa para vender mais
            </h2>
            <p className="mt-3 text-zinc-400">
              Os recursos que fazem a diferença entre uma venda e várias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((item) => (
              <SpotlightCard
                key={item.title}
                spotlightColor="rgba(255, 119, 0, 0.18)"
                className="hover:border-[#FF7700]/50 transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF7700]/10 border border-[#FF7700]/20 flex items-center justify-center mb-4">
                  {ICON_MAP[item.icon]}
                </div>
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#FFFFE3]">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Pagamentos e Rastreamento */}
      <section id="pagamentos" className="py-24 px-6 border-t border-zinc-900 bg-zinc-950/40 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[300px] bg-[#FF7700]/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Receba de forma segura e saiba de onde vem cada venda
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bloco Pagamentos */}
            <SpotlightCard
              spotlightColor="rgba(255, 119, 0, 0.15)"
              className="p-8 border-zinc-800 bg-zinc-900/30 hover:border-[#FF7700]/40 transition-colors"
            >
              <h3 className="text-xl font-bold text-white mb-2">Pagamentos</h3>
              <p className="text-sm text-[#FF7700] font-medium mb-6">
                PIX, cartão e venda internacional na mesma plataforma.
              </p>
              <ul className="space-y-4">
                {PAYMENT_BENEFITS.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </SpotlightCard>

            {/* Bloco Rastreamento */}
            <SpotlightCard
              spotlightColor="rgba(255, 119, 0, 0.15)"
              className="p-8 border-zinc-800 bg-zinc-900/30 hover:border-[#FF7700]/40 transition-colors"
            >
              <h3 className="text-xl font-bold text-white mb-2">Rastreamento</h3>
              <p className="text-sm text-[#FF7700] font-medium mb-6">
                Do clique no anúncio até a venda confirmada.
              </p>
              <ul className="space-y-4">
                {TRACKING_BENEFITS.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-[#FF7700] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* 7. Análises */}
      <section className="py-24 px-6 border-t border-zinc-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
                Decida com números, não com achismo
              </h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Um painel que mostra o que funciona e o que precisa de ajuste.
              </p>
              <ul className="space-y-4">
                {ANALYTICS_METRICS.map((metric, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                    <BarChart3 className="w-4 h-4 text-[#FF7700] shrink-0 mt-0.5" />
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mockup do Dashboard */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <span className="text-xs uppercase text-zinc-400 font-semibold tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF7700]" />
                  Visão Geral do Painel
                </span>
                <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Tempo Real
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-[#FF7700]/30 transition-colors">
                  <span className="text-xs text-zinc-400">Conversão PIX</span>
                  <p className="text-2xl font-bold text-[#FFFFE3] mt-1">78.4%</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-[#FF7700]/30 transition-colors">
                  <span className="text-xs text-zinc-400">Recuperação</span>
                  <p className="text-2xl font-bold text-[#FFFFE3] mt-1">24.2%</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-[#FF7700]/30 transition-colors">
                <span className="text-xs text-zinc-400">Fluxos Ativos</span>
                <p className="text-xl font-bold text-[#FFFFE3] mt-1">12 Bots Operando</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Segurança */}
      <section className="py-20 px-6 border-t border-zinc-900 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">Seu negócio protegido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SECURITY_ITEMS.map((item, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                <ShieldCheck className="w-6 h-6 text-blue-400 mb-3" />
                <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section id="faq" className="py-24 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-white text-center mb-12">
            Perguntas frequentes
          </h2>
          <FaqSection />
        </div>
      </section>

      {/* 10. CTA Final */}
      <section id="fila-de-espera" className="py-24 px-6 border-t border-zinc-900 bg-zinc-950 relative overflow-hidden">
        {/* Glow de fundo laranja */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#FF7700]/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto text-center p-10 sm:p-14 rounded-3xl border border-[#FF7700]/25 bg-gradient-to-b from-[#FF7700]/10 via-zinc-950/80 to-zinc-950 relative z-10 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Pronto para vender no automático?
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Conecte seu bot, monte seu funil e deixe a Wone cuidar da cobrança e da entrega enquanto você foca no seu conteúdo.
          </p>
          <a
            href="#fila-de-espera"
            className="px-8 py-4 rounded-xl bg-[#FF7700] hover:bg-[#e06900] font-bold text-black transition-all shadow-lg shadow-[#FF7700]/25 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
          >
            Preencher fila de espera
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </a>
          <p className="mt-4 text-xs text-zinc-500 font-medium">
            O acesso à plataforma é liberado por convite.
          </p>
        </div>
      </section>

      {/* 11. Rodapé */}
      <footer className="py-12 px-6 border-t border-zinc-900 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-zinc-400 font-medium">
            Wone. Vendas e entrega de acesso automáticas para o Telegram.
          </p>
          <p>© 2026 Wone. Todos os direitos reservados.</p>
        </div>
        <div className="max-w-7xl mx-auto mt-4 text-center sm:text-left text-zinc-600">
          Aviso legal: A Wone é uma plataforma independente e não é afiliada, endossada ou patrocinada pelo Telegram.
        </div>
      </footer>
    </div>
  );
}