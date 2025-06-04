import { Button } from "shadcn-ui/button";
import { Sparkles, Globe, Smartphone, Users, ShieldCheck, Languages, QrCode, BarChart3, Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from '@/i18n/navigation';
 
export default function HomePage() {
  const t = useTranslations('HomePage');
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex flex-col items-center justify-center px-4 py-12 animate-fadein">
      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center mb-16">
        <div className="flex justify-center mb-6 animate-bounceIn">
          <Sparkles className="w-14 h-14 text-blue-500 drop-shadow-lg" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-blue-700 dark:text-blue-300 tracking-tight animate-slideInDown">
          {t('heroTitle')}
        </h1>
        <p className="text-lg sm:text-xl mb-8 text-slate-700 dark:text-slate-200 animate-fadeIn">
          {t('heroSubtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-2 animate-fadeIn">
          <Link href="/signup">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-lg px-8 py-4">
              {t('cta')}
            </Button>
          </Link>
          <a href="#features">
            <Button variant="outline" size="lg" className="text-blue-700 border-blue-300 dark:text-blue-200 dark:border-blue-700 px-8 py-4">
              {t('seeFeatures')}
            </Button>
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 animate-fadeInUp"></section>
        <FeatureCard icon={<Globe />} title={t('featureMultiTenantTitle')} desc={t('featureMultiTenantDesc')} />