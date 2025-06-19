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
    <section className="py-16 sm:py-20 lg:py-28 bg-slate-50 dark:bg-slate-800/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('faq.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('faq.subtitle')}
          </p>
        </div>
        <div className="max-w-3xl mx-auto mt-12">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-2xl mb-4 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-150"
              >
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t(faq.q)}</h3>
                <Icon name={openFaq === idx ? Minus : Plus} size={20} className="text-[--brand-color-landing]" />
              </button>
              {openFaq === idx && (
                <div className="p-5 sm:p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-300">{t(faq.a)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
