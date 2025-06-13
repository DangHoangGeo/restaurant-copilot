"use client";
import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export const FooterSection = () => {
  const t = useTranslations('LandingPage');
  const footerLinks = {
    product: [ 
      {name: "footer.links.features", href: "#features"}, 
      {name: "footer.links.pricing", href: "#pricing"}, 
      {name: "footer.links.integrations", href: "#integrations"} 
    ],
    company: [ 
      {name: "footer.links.about_us", href: "#about"}, 
      {name: "footer.links.careers", href: "#careers"}, 
      {name: "footer.links.blog", href: "#blog"} 
    ],
    support: [ 
      {name: "footer.links.help_center", href: "#help"}, 
      {name: "footer.links.contact_us", href: "#contact"}, 
      {name: "footer.links.status", href: "#status"} 
    ],
  };

  const socialLinks = [
    { name: "GitHub", icon: Github, href: "#github" },
    { name: "Twitter", icon: Twitter, href: "#twitter" },
    { name: "LinkedIn", icon: Linkedin, href: "#linkedin" },
    { name: "Email", icon: Mail, href: "#email" },
  ];

  return (
    <footer className="py-12 sm:py-16 bg-slate-100 dark:bg-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
            <a href="#" className="flex items-center" aria-label={t('header.logo_aria_label')}>
              <Image src="/coorder-ai.png" alt="coorder.ai" width={32} height={32} className="w-8 h-8" />
              <span className="ml-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                coorder<span className="text-[--brand-color-landing]">.ai</span>
              </span>
            </a>
            <p className="mt-4 text-slate-600 dark:text-slate-300 max-w-sm">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-slate-400 hover:text-[--brand-color-landing] transition-colors duration-150"
                  aria-label={social.name}
                >
                  <social.icon size={20} />
                </a>
              ))}
            </div>
          </div>
          
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                {t(`footer.categories.${category}`)}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a 
                      href={link.href} 
                      className="text-slate-600 dark:text-slate-300 hover:text-[--brand-color-landing] transition-colors duration-150"
                    >
                      {t(link.name)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#privacy" className="text-slate-600 dark:text-slate-300 hover:text-[--brand-color-landing] text-sm transition-colors duration-150">
                {t('footer.legal.privacy')}
              </a>
              <a href="#terms" className="text-slate-600 dark:text-slate-300 hover:text-[--brand-color-landing] text-sm transition-colors duration-150">
                {t('footer.legal.terms')}
              </a>
              <a href="#cookies" className="text-slate-600 dark:text-slate-300 hover:text-[--brand-color-landing] text-sm transition-colors duration-150">
                {t('footer.legal.cookies')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
