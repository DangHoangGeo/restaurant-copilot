"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { PlusCircle, QrCode, Smartphone, BarChart2 } from 'lucide-react';
import { Icon } from './Icon';

export const HowItWorksSection = () => {
  const t = useTranslations('LandingPage');
  const steps = [
    { number: 1, icon: PlusCircle, title: "howitworks.step1.title", description: "howitworks.step1.description" },
    { number: 2, icon: QrCode, title: "howitworks.step2.title", description: "howitworks.step2.description" },
    { number: 3, icon: Smartphone, title: "howitworks.step3.title", description: "howitworks.step3.description" },
    { number: 4, icon: BarChart2, title: "howitworks.step4.title", description: "howitworks.step4.description" },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-slate-50 dark:bg-slate-800/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('howitworks.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('howitworks.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
          {steps.map((step, idx) => (
            <div key={idx} className="text-center">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[--brand-color-landing] text-white mx-auto mb-6 text-xl font-bold">
                  {step.number}
                </div>
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                  <Icon name={step.icon} size={24} className="text-white" />
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-[--brand-color-landing]/30 transform translate-x-4" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t(step.title)}</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{t(step.description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
