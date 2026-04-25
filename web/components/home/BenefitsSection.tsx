"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, Clock, TrendingUp, Smile, Users, Lightbulb } from 'lucide-react';
import { Icon } from './Icon';

export const BenefitsSection = () => {
  const t = useTranslations('landing');
  const benefits = [
    { icon: DollarSign, text: "benefits.item1" },
    { icon: Clock, text: "benefits.item2" },
    { icon: TrendingUp, text: "benefits.item3" },
    { icon: Smile, text: "benefits.item4" },
    { icon: Users, text: "benefits.item5" },
    { icon: Lightbulb, text: "benefits.item6" },
  ];

  return (
    <section className="bg-[#fff7e9] py-16 text-[#17110b] sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#17110b] sm:text-4xl">
            {t('benefits.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6d5a45]">
            {t('benefits.subtitle')}
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-lg border border-[#17110b]/10 bg-white/55 p-6">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#c8773e]/12">
                  <Icon name={benefit.icon} size={24} className="text-[#c8773e]" />
                </div>
              </div>
              <div>
                <p className="text-lg text-[#372719]">{t(benefit.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
