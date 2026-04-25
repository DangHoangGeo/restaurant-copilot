"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './Button';

export const CallToActionSection = () => {
  const t = useTranslations('landing');
  
  return (
    <section className="bg-[#c8773e] py-16 text-[#fff7e9] sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-[#fff7e9] sm:text-4xl">
          {t('cta_section.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#f6e8d3]">
          {t('cta_section.subtitle')}
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Button href="/signup" variant="primary" size="xl" >
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
