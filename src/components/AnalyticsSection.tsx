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

              <ul
                role="tablist"
                aria-label={analytics.eyebrow}
                className="space-y-2"
              >
                {analytics.views.map((view) => {
                  const Icon = ICONS[view.icon] ?? BarChart3;
                  const isActive = view.id === activeId;

                  return (
                    <li key={view.id}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveId(view.id)}
                        className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-300 ${
                          isActive
                            ? "border-brand/40 bg-brand/8"
                            : "border-transparent hover:border-line hover:bg-ink-900/50"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-300 ${
                            isActive
                              ? "border-brand/40 bg-brand/15 text-brand"
                              : "border-line bg-ink-900 text-muted group-hover:text-brand"
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
                    </li>
                  );
                })}
              </ul>
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
