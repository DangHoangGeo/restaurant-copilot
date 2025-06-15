'use client';

import { useTranslations } from 'next-intl';

export default function PrivacyContent() {
  const t = useTranslations('legal.privacy');

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
                <a href="#overview" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.overview')}
                </a>
                <a href="#collection" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.collection')}
                </a>
                <a href="#usage" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.usage')}
                </a>
                <a href="#sharing" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.sharing')}
                </a>
                <a href="#security" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.security')}
                </a>
                <a href="#retention" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.retention')}
                </a>
                <a href="#rights" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.rights')}
                </a>
                <a href="#cookies" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.cookies')}
                </a>
                <a href="#international" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.international')}
                </a>
                <a href="#children" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  {t('navigation.children')}
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
                
                {/* Overview */}
                <section id="overview" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.overview.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.overview.content')}
                  </p>
                </section>

                {/* Information We Collect */}
                <section id="collection" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.collection.title')}
                  </h2>
                  
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.collection.subtitle')}
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300 mb-6">
                    <li>{t('sections.collection.direct.account')}</li>
                    <li>{t('sections.collection.direct.restaurant')}</li>
                    <li>{t('sections.collection.direct.payment')}</li>
                    <li>{t('sections.collection.direct.content')}</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.collection.automatic.title')}
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                    <li>{t('sections.collection.automatic.usage')}</li>
                    <li>{t('sections.collection.automatic.device')}</li>
                    <li>{t('sections.collection.automatic.location')}</li>
                    <li>{t('sections.collection.automatic.cookies')}</li>
                  </ul>
                </section>

                {/* How We Use Information */}
                <section id="usage" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.usage.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.usage.content')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                    <li>{t('sections.usage.purposes.0')}</li>
                    <li>{t('sections.usage.purposes.1')}</li>
                    <li>{t('sections.usage.purposes.2')}</li>
                    <li>{t('sections.usage.purposes.3')}</li>
                    <li>{t('sections.usage.purposes.4')}</li>
                    <li>{t('sections.usage.purposes.5')}</li>
                    <li>{t('sections.usage.purposes.6')}</li>
                  </ul>
                </section>

                {/* Information Sharing */}
                <section id="sharing" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.sharing.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.sharing.content')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                    <li>{t('sections.sharing.circumstances.0')}</li>
                    <li>{t('sections.sharing.circumstances.1')}</li>
                    <li>{t('sections.sharing.circumstances.2')}</li>
                    <li>{t('sections.sharing.circumstances.3')}</li>
                  </ul>
                </section>

                {/* Data Security */}
                <section id="security" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.security.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.security.content')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                    <li>{t('sections.security.measures.0')}</li>
                    <li>{t('sections.security.measures.1')}</li>
                    <li>{t('sections.security.measures.2')}</li>
                    <li>{t('sections.security.measures.3')}</li>
                  </ul>
                </section>

                {/* Data Retention */}
                <section id="retention" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.retention.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.retention.content')}
                  </p>
                </section>

                {/* Your Rights */}
                <section id="rights" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.rights.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    {t('sections.rights.content')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300 mb-4">
                    <li>{t('sections.rights.list.0')}</li>
                    <li>{t('sections.rights.list.1')}</li>
                    <li>{t('sections.rights.list.2')}</li>
                    <li>{t('sections.rights.list.3')}</li>
                    <li>{t('sections.rights.list.4')}</li>
                    <li>{t('sections.rights.list.5')}</li>
                  </ul>
                  <p className="text-slate-700 dark:text-slate-300">
                    {t('sections.rights.exercise')}
                  </p>
                </section>

                {/* Cookies and Tracking */}
                <section id="cookies" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.cookies.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.cookies.content')}
                  </p>
                </section>

                {/* International Transfers */}
                <section id="international" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.international.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.international.content')}
                  </p>
                </section>

                {/* Children's Privacy */}
                <section id="children" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.children.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.children.content')}
                  </p>
                </section>

                {/* Changes to This Policy */}
                <section id="changes" className="mb-12">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    {t('sections.changes.title')}
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t('sections.changes.content')}
                  </p>
                </section>

                {/* Contact Us */}
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
                    <p>{t('sections.contact.dpo')}</p>
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
