"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQS } from "@/data/content";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="border border-zinc-800 bg-zinc-900/50 rounded-xl overflow-hidden transition-colors"
          >
            <button
              onClick={() => toggle(index)}
              className="w-full py-5 px-6 text-left flex justify-between items-center gap-4 hover:bg-zinc-800/40 transition-colors"
            >
              <span className="font-medium text-zinc-100">{faq.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-blue-400" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-6 pb-5 text-sm text-zinc-400 border-t border-zinc-800/60 pt-4 leading-relaxed">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}