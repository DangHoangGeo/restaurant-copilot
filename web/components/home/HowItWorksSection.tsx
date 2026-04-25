"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { PlusCircle, QrCode, Smartphone, BarChart2 } from 'lucide-react';
import { Icon } from './Icon';

export const HowItWorksSection = () => {
  const t = useTranslations('landing');
  const steps = [
    { number: 1, icon: PlusCircle, title: "howitworks.step1.title", description: "howitworks.step1.description" },
    { number: 2, icon: QrCode, title: "howitworks.step2.title", description: "howitworks.step2.description" },
    { number: 3, icon: Smartphone, title: "howitworks.step3.title", description: "howitworks.step3.description" },
    { number: 4, icon: BarChart2, title: "howitworks.step4.title", description: "howitworks.step4.description" },
  ];

  return (
    <section className="bg-[#f6e8d3] py-16 text-[#17110b] sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#17110b] sm:text-4xl">
            {t('howitworks.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#6d5a45]">
            {t('howitworks.subtitle')}
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <div key={idx} className="text-center">
              <div className="relative">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#c8773e] text-xl font-bold text-[#fff7e9]">
                  {step.number}
                </div>
                <div className="absolute left-1/2 top-8 -translate-x-1/2">
                  <Icon name={step.icon} size={24} className="text-[#fff7e9]" />
                </div>
                {idx < steps.length - 1 && (
                  <div className="absolute left-full top-8 hidden h-0.5 w-full translate-x-4 bg-[#c8773e]/30 lg:block" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-[#17110b]">{t(step.title)}</h3>
              <p className="mt-2 text-[#6d5a45]">{t(step.description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
