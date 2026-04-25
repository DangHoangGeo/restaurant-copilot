"use client";
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Minus } from 'lucide-react';
import { Icon } from './Icon';

export const FaqSection = () => {
  const t = useTranslations('landing');
  const faqs = [
    { q: "faq.item1.q", a: "faq.item1.a" },
    { q: "faq.item2.q", a: "faq.item2.a" },
    { q: "faq.item3.q", a: "faq.item3.a" },
    { q: "faq.item4.q", a: "faq.item4.a" },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(0); // Open first FAQ by default

  return (
    <section className="bg-[#14100b] py-16 text-[#f6e8d3] sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#fff7e9] sm:text-4xl">
            {t('faq.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#c9b7a0]">
            {t('faq.subtitle')}
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          {faqs.map((faq, idx) => (
            <div key={idx} className="mb-4 overflow-hidden rounded-lg border border-[#f1dcc4]/14 bg-[#fff7e9]/6">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors duration-150 hover:bg-[#fff7e9]/8 sm:p-6"
              >
                <h3 className="text-lg font-semibold text-[#fff7e9]">{t(faq.q)}</h3>
                <Icon name={openFaq === idx ? Minus : Plus} size={20} className="text-[#e9a35e]" />
              </button>
              {openFaq === idx && (
                <div className="border-t border-[#f1dcc4]/12 bg-[#080705]/18 p-5 sm:p-6">
                  <p className="text-[#c9b7a0]">{t(faq.a)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
