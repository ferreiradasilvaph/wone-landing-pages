"use client";

import { Zap, Boxes, ShieldCheck, Globe, type LucideIcon } from "lucide-react";
import { useContent } from "@/i18n";
import { Counter } from "./Counter";
import { RevealGroup, RevealItem } from "./Reveal";

const ICONS: Record<string, LucideIcon> = { Zap, Boxes, ShieldCheck, Globe };

/**
 * Os quatro números do produto, cada um com o contexto que faltava.
 *
 * Antes eram só algarismos soltos ("1,2s", "28") — o lead via o número e não
 * sabia o que fazer com ele. Agora cada card diz o que o número significa.
 */
export function Highlights() {
  const { highlights } = useContent();

  return (
    <section className="relative px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="hairline mb-14" />

        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.items.map((item) => {
            const Icon = ICONS[item.icon] ?? Zap;
            return (
              <RevealItem key={item.title} className="h-full">
                <article className="surface group relative h-full overflow-hidden rounded-2xl p-6 transition-transform duration-500 hover:-translate-y-1">
                  {/* Halo que acende no hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-brand/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />

                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand transition-transform duration-500 group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </span>

                    <p className="mt-5 text-4xl font-semibold tracking-tight text-cream">
                      <Counter
                        to={item.value}
                        decimals={item.decimals}
                        suffix={item.suffix}
                      />
                    </p>

                    <h3 className="font-display mt-1 text-base font-semibold text-brand">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </div>
                </article>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
