"use client";
import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Coffee, Building, Lightbulb, ThumbsUp, ShieldCheck, Server, Globe } from 'lucide-react';
import { Card } from './Card';
import { Icon } from './Icon';

export const SocialProofSection = () => {
  const t = useTranslations('LandingPage');
  const logos = [
    { name: "Foodie Weekly", icon: Coffee },
    { name: "Restaurant Tech Today", icon: Building },
    { name: "StartupGrind", icon: Lightbulb },
    { name: "LocalEats Award", icon: ThumbsUp },
  ];
  const testimonials = [
    { quote: "social_proof.testimonial1.quote", name: "Maria R.", role: "Owner, The Cozy Corner", image: "/coorder-ai.png" },
    { quote: "social_proof.testimonial2.quote", name: "Kenji T.", role: "Chef, Sushi Express", image: "/coorder-ai.png" },
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-slate-100 dark:bg-slate-800/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-sm font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
          {t('social_proof.trusted_by')}
        </h3>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-12 justify-items-center items-center">
          {logos.map(logo => (
            <div key={logo.name} className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity">
              <Icon name={logo.icon} size={24} className="text-slate-500 dark:text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">{logo.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-8 lg:gap-12">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="relative">
              <blockquote className="relative z-10">
                <p className="text-lg text-slate-700 dark:text-slate-200">{t(testimonial.quote)}</p>
                <footer className="mt-6 flex items-center">
                  <Image src={testimonial.image} alt={testimonial.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                  <div className="ml-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{testimonial.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                  </div>
                </footer>
              </blockquote>
            </Card>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-slate-500 dark:text-slate-400">
            <span className="flex items-center"><Icon name={ShieldCheck} className="mr-2 text-green-500"/> {t('social_proof.security_badge1')}</span>
            <span className="flex items-center"><Icon name={Server} className="mr-2 text-blue-500"/> {t('social_proof.security_badge2')}</span>
            <span className="flex items-center"><Icon name={Globe} className="mr-2 text-indigo-500"/> {t('social_proof.security_badge3')}</span>
        </div>
      </div>
    </section>
  );
};
