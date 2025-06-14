"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { Menu as MenuIcon, QrCode, CalendarDays, BarChart2, Users, Phone } from 'lucide-react';
import { Card } from './Card';
import { Icon } from './Icon';

export const FeaturesSection = () => {
  const t = useTranslations('LandingPage');
  const features = [
    { icon: MenuIcon, title: "features.menu_management.title", description: "features.menu_management.description", benefit: "features.menu_management.benefit" },
    { icon: QrCode, title: "features.qr_ordering.title", description: "features.qr_ordering.description", benefit: "features.qr_ordering.benefit" },
    { icon: CalendarDays, title: "features.booking_preordering.title", description: "features.booking_preordering.description", benefit: "features.booking_preordering.benefit" },
    { icon: BarChart2, title: "features.smart_analytics.title", description: "features.smart_analytics.description", benefit: "features.smart_analytics.benefit" },
    { icon: Users, title: "features.staff_management.title", description: "features.staff_management.description", benefit: "features.staff_management.benefit" },
    { icon: Phone, title: "features.mobile_first.title", description: "features.mobile_first.description", benefit: "features.mobile_first.benefit" },
  ];
  
  return (
    <section className="py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map(feature => (
            <Card key={t(feature.title)} className="hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[--brand-color-landing]/10 mb-6">
                <Icon name={feature.icon} size={28} className="text-[--brand-color-landing]" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t(feature.title)}</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{t(feature.description)}</p>
              <p className="mt-3 text-sm font-medium text-[--brand-color-landing]">{t(feature.benefit)}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
