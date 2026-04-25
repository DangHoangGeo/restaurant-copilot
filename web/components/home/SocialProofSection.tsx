"use client";
import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Coffee, Building, Lightbulb, ThumbsUp, ShieldCheck, Server, Globe } from 'lucide-react';
import { Card } from './Card';
import { Icon } from './Icon';

export const SocialProofSection = () => {
  const t = useTranslations('landing');
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
    <section className="bg-[#14100b] py-12 text-[#f6e8d3] sm:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-[#c9b7a0]">
          {t('social_proof.trusted_by')}
        </h3>
        <div className="mt-8 grid grid-cols-2 items-center justify-items-center gap-x-12 gap-y-8 sm:grid-cols-4">
          {logos.map(logo => (
            <div key={logo.name} className="flex items-center gap-2 opacity-70 transition-opacity hover:opacity-100">
              <Icon name={logo.icon} size={24} className="text-[#e9a35e]" />
              <span className="font-medium text-[#c9b7a0]">{logo.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:gap-12">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="relative">
              <blockquote className="relative z-10">
                <p className="text-lg text-[#f6e8d3]">{t(testimonial.quote)}</p>
                <footer className="mt-6 flex items-center">
                  <Image src={testimonial.image} alt={testimonial.name} width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                  <div className="ml-4">
                    <p className="font-semibold text-[#fff7e9]">{testimonial.name}</p>
                    <p className="text-sm text-[#c9b7a0]">{testimonial.role}</p>
                  </div>
                </footer>
              </blockquote>
            </Card>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[#c9b7a0]">
            <span className="flex items-center"><Icon name={ShieldCheck} className="mr-2 text-[#97be73]"/> {t('social_proof.security_badge1')}</span>
            <span className="flex items-center"><Icon name={Server} className="mr-2 text-[#e9a35e]"/> {t('social_proof.security_badge2')}</span>
            <span className="flex items-center"><Icon name={Globe} className="mr-2 text-[#c8773e]"/> {t('social_proof.security_badge3')}</span>
        </div>
      </div>
    </section>
  );
};
