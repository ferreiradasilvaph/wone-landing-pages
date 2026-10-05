"use client";

import { useState } from "react";
import {
  BarChart3,
  Filter,
  Users,
  Percent,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { useContent } from "@/i18n";
import { DashboardPreview } from "./DashboardPreview";
import { Reveal } from "./Reveal";

const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Filter,
  Users,
  Percent,
  Receipt,
};

/**
 * Métricas à esquerda, painel à direita. Cada métrica é um botão que troca o
 * painel — a lista deixa de ser enumeração e vira o controle do dashboard.
 */
export function AnalyticsSection() {
  const { analytics } = useContent();
  const [activeId, setActiveId] = useState(analytics.views[0].id);

  return (
    <section className="relative px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal className="max-w-xl">
              <span className="t-eyebrow text-brand">{analytics.eyebrow}</span>
              <h2 className="t-h2 mt-3 text-balance text-cream">
                {analytics.title} {analytics.titleAccent}
              </h2>
              <p className="t-lead mt-4 text-pretty">{analytics.description}</p>
            </Reveal>

            <Reveal delay={0.1} className="mt-8">
              <p className="t-eyebrow mb-4 text-faint">{analytics.hint}</p>

              {/* Precisa ser div, não ul: um role="tablist" só admite filhos
                  com role="tab", e o <li> no meio reprovava duas auditorias de
                  ARIA de peso 10 cada (aria-required-children no tablist e
                  aria-required-parent nos botões). O visual não muda: space-y-2
                  virou flex-col com gap-2. */}
              <div
                role="tablist"
                aria-label={analytics.eyebrow}
                className="flex flex-col gap-2"
              >
                {analytics.views.map((view) => {
                  const Icon = ICONS[view.icon] ?? BarChart3;
                  const isActive = view.id === activeId;

                  // Selecionado = fundo um tom acima, texto creme e uma
                  // barra de 2px à esquerda. O contorno laranja inteiro saiu,
                  // e com ele o border-transparent que só existia para o item
                  // não pular 1px ao ser escolhido.
                  return (
                    <button
                      key={view.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveId(view.id)}
                      className={`group relative flex w-full cursor-pointer items-start gap-3 overflow-hidden rounded-xl p-3.5 text-left transition-colors duration-300 ${
                        isActive ? "bg-ink-800" : "hover:bg-ink-900/60"
                      }`}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                        />
                      )}
                      {/* Ícone solto: discreto em repouso, laranja no ativo */}
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center transition-colors duration-300 ${
                          isActive ? "text-brand" : "text-faint group-hover:text-brand"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span
                        className={`pt-1.5 text-sm leading-snug transition-colors duration-300 ${
                          isActive ? "text-cream" : "text-muted"
                        }`}
                      >
                        {view.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Reveal>
          </div>

          <Reveal from="left">
            <DashboardPreview viewId={activeId} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
