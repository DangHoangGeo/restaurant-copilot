"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, Clock, TrendingUp, Smile, Users, Lightbulb } from 'lucide-react';
import { Icon } from './Icon';

export const BenefitsSection = () => {
  const t = useTranslations('LandingPage');
  const benefits = [
    { icon: DollarSign, text: "benefits.item1" },
    { icon: Clock, text: "benefits.item2" },
    { icon: TrendingUp, text: "benefits.item3" },
    { icon: Smile, text: "benefits.item4" },
    { icon: Users, text: "benefits.item5" },
    { icon: Lightbulb, text: "benefits.item6" },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('benefits.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('benefits.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center space-x-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[--brand-color-landing]/10">
                  <Icon name={benefit.icon} size={24} className="text-[--brand-color-landing]" />
                </div>
              </div>
              <div>
                <p className="text-lg text-slate-700 dark:text-slate-200">{t(benefit.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
