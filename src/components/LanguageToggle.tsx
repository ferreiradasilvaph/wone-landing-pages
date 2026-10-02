"use client";

import { motion } from "motion/react";
import { useLanguage, type Locale } from "@/i18n";

const OPTIONS: { code: Locale; label: string }[] = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
];

/**
 * Alternador de idioma. A pílula ativa desliza entre as duas opções com
 * `layoutId`, o mesmo recurso usado no menu do header.
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={`inline-flex items-center rounded-full border border-line bg-ink-900/60 p-0.5 ${className}`}
    >
      {OPTIONS.map((option) => {
        const isActive = locale === option.code;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => setLocale(option.code)}
            aria-pressed={isActive}
            className={`relative cursor-pointer rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
              isActive ? "text-ink-950" : "text-muted hover:text-cream"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
