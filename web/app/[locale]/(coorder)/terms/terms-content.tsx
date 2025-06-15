'use client';

import { useTranslations } from 'next-intl';

export default function TermsContent() {
  const t = useTranslations('legal.terms');

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 print:min-h-auto print:bg-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {t('title')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
              {t('lastUpdated', { date: 'January 1, 2024' })}
            </p>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors duration-200 print:hidden"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t('printButton')}
            </button>
          </div>

          {/* Table of Contents */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8 print:bg-white print:no-rounded print:no-shadow">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Table of Contents
              </h2>
              <nav className="space-y-2">
                <a href="#acceptance" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.acceptance')}
                </a>
                <a href="#description" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.description')}
                </a>
                <a href="#registration" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.registration')}
                </a>
                <a href="#subscriptions" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.subscriptions')}
                </a>
                <a href="#usage" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.usage')}
                </a>
                <a href="#intellectual" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.intellectual')}
                </a>
                <a href="#privacy" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.privacy')}
                </a>
                <a href="#termination" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.termination')}
                </a>
                <a href="#liability" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.liability')}
                </a>
                <a href="#governing" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.governing')}
                </a>
                <a href="#changes" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.changes')}
                </a>
                <a href="#contact" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.contact')}
                </a>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 print:bg-white print:no-rounded print:no-shadow">
            <div className="p-8 md:p-12">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                
                {/* Acceptance of Terms */}
                <section id="acceptance" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.acceptance.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.acceptance.content')}
                  </p>
                </section>

                {/* Description of Service */}
                <section id="description" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.description.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.description.content')}
                  </p>
                </section>

                {/* Account Registration */}
                <section id="registration" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.registration.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.registration.content')}
                  </p>
                </section>

                {/* Subscriptions and Payment */}
                <section id="subscriptions" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.subscriptions.title')}
                  </h2>
                  
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.subscriptions.subtitle')}
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.subscriptions.plans.description')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300 mb-6">
                    <li>{t('sections.subscriptions.plans.free')}</li>
                    <li>{t('sections.subscriptions.plans.basic')}</li>
                    <li>{t('sections.subscriptions.plans.premium')}</li>
                  </ul>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {t('sections.subscriptions.billing.title')}
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 mb-6">
                    {t('sections.subscriptions.billing.content')}
                  </p>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {t('sections.subscriptions.cancellation.title')}
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300">
                    {t('sections.subscriptions.cancellation.content')}
                  </p>
                </section>

                {/* Acceptable Use */}
                <section id="usage" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.usage.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.usage.content')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                    <li>{t('sections.usage.restrictions.0')}</li>
                    <li>{t('sections.usage.restrictions.1')}</li>
                    <li>{t('sections.usage.restrictions.2')}</li>
                    <li>{t('sections.usage.restrictions.3')}</li>
                    <li>{t('sections.usage.restrictions.4')}</li>
                  </ul>
                </section>

                {/* Intellectual Property */}
                <section id="intellectual" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.intellectual.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.intellectual.content')}
                  </p>
                </section>

                {/* Privacy and Data */}
                <section id="privacy" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.privacy.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.privacy.content')}
                  </p>
                </section>

                {/* Termination */}
                <section id="termination" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.termination.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.termination.content')}
                  </p>
                </section>

                {/* Disclaimer of Warranties */}
                <section id="liability" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.liability.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.liability.content')}
                  </p>
                </section>

                {/* Governing Law */}
                <section id="governing" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.governing.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.governing.content')}
                  </p>
                </section>

                {/* Changes to Terms */}
                <section id="changes" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.changes.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.changes.content')}
                  </p>
                </section>

                {/* Contact Information */}
                <section id="contact" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.contact.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.contact.content')}
                  </p>
                  <div className="space-y-2 text-slate-700 dark:text-slate-300">
                    <p>{t('sections.contact.email')}</p>
                    <p>{t('sections.contact.address')}</p>
                    <p>{t('sections.contact.phone')}</p>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
