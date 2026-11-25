'use client';

import React, { useState } from 'react';
import { FAQS } from '@/lib/constants';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10 scroll-mt-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">KNOWLEDGE BASE</span>
        <h2 className="font-pixel text-2xl sm:text-3xl text-[#DFDFD4] drop-shadow-[4px_4px_0px_#212121]">
          FREQUENTLY ASKED QUESTIONS
        </h2>
        <p className="font-mono text-xs sm:text-sm text-[#DFDFD4] mt-3">
          Transparent answers regarding project scope, architecture, and roadmap.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="arcade-panel overflow-hidden bg-[#DFDFD4]/85 backdrop-blur-md"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 transition-colors hover:bg-[#B8CBC3]/30"
                aria-expanded={isOpen}
              >
                <span className="font-pixel text-xs sm:text-sm text-[#212121] flex items-center gap-3">
                  <span className="text-[#07514C]">0{idx + 1}.</span>
                  <span>{faq.question}</span>
                </span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-[#07514C] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#212121] flex-shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 border-t-2 border-[#212121]/20 font-mono text-xs sm:text-sm text-[#212121]/90 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

