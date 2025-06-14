"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';

export const CallToActionSection = () => {
  const t = useTranslations('LandingPage');
  
  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-[--brand-color-landing]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-700 dark:text-slate-200">
          {t('cta_section.title')}
        </h2>
        <p className="mt-4 text-lg text-slate-700 dark:text-slate-200 max-w-xl mx-auto">
          {t('cta_section.subtitle')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="#signup" variant="primary" size="xl" >
            {t('cta_section.cta.signup')}
          </Button>
          <Button href="#contact-sales" variant="outline" size="xl" >
            {t('cta_section.cta.contact_sales')}
          </Button>
        </div>
      </div>
    </section>
  );
};
