"use client";
import React, { useState, useEffect, ReactNode, useContext } from 'react';
import Image from 'next/image';
import {
  ChevronRight, PlayCircle, Users, MessageSquare, BarChart2, QrCode, Menu as MenuIcon, Zap, ShieldCheck, ArrowRight, Plus, Minus, Globe, Sun, Moon, Building,
  ThumbsUp, Clock, Smile, Coffee, Phone, Lightbulb, DollarSign, TrendingUp, CalendarDays, Server, Palette, PlusCircle
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import "../globals.css";

// --- Theme Context (can be shared or separate for landing) ---
// For simplicity, assuming the same ThemeContext is available
interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContextLanding = React.createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const ThemeProviderLanding = ({ children } : {children: ReactNode}) => {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Landing page might have its own brand color or use a default
    document.documentElement.style.setProperty('--brand-color-landing', '#019AB1'); // Example: Indigo
  }, [theme]);
  return <ThemeContextLanding.Provider value={{ theme, toggleTheme }}>{children}</ThemeContextLanding.Provider>;
};
const useThemeLanding = () => useContext(ThemeContextLanding);


// --- Reusable UI Components (can be from your existing mokup.tsx or defined here) ---
// Assuming Icon, Button, Card are available. If not, they'd be defined similarly.
const Icon = ({ name: IconComponent, size = 20, className = "" }: { name: React.ComponentType<{ size?: number; className?: string }>, size?: number, className?: string }) => {
  if (!IconComponent) return <Smile size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
};

const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', iconLeft, iconRight, type = 'button', disabled = false, href, ...props }: { children: ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link', size?: 'sm' | 'md' | 'lg' | 'xl', className?: string, iconLeft?: React.ComponentType<{ size?: number; className?: string }> | null, iconRight?: React.ComponentType<{ size?: number; className?: string }> | null, type?: 'button' | 'submit' | 'reset', disabled?: boolean, href?: string }) => {
  const baseStyle = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out inline-flex items-center justify-center shadow-md hover:shadow-lg";
  // Landing page specific primary color
  const primaryColorClass = "bg-sky-500 hover:opacity-90 text-slate-900 dark:text-white focus:ring-sky-500";
  const variantStyles = {
    primary: `${primaryColorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `bg-transparent border-2 border-sky-500 text-sky-500 hover:bg-sky-500/10 focus:ring-sky-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    ghost: `bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400 dark:hover:bg-slate-700 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    link: `text-sky-500 hover:underline focus:outline-none focus:ring-1 focus:ring-sky-500 p-0 shadow-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  const sizeStyles = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-3 text-lg", xl: "px-8 py-3.5 text-xl" };
  
  const commonProps = { onClick, type, disabled, className: `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`, ...props };

  if (href) {
    return <a href={href} {...commonProps}>{iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 16 : 20} className="mr-2" />}{children}{iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 20} className="ml-2" />}</a>;
  }
  return <button {...commonProps}>{iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 16 : 20} className="mr-2" />}{children}{iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 20} className="ml-2" />}</button>;
};

const Card = ({ children, className = '', noPadding = false } : { children: ReactNode, className?: string, noPadding?: boolean }) => (
  <div className={`bg-white dark:bg-slate-800 shadow-lg rounded-2xl ${noPadding ? '' : 'p-6 sm:p-8'} ${className}`}>
    {children}
  </div>
);

const LanguageSwitcherLanding = () => {
  const router = useRouter();
  const currentLocale = useLocale();
  const locales = [ { code: 'en', name: 'English', flag: '🇺🇸' }, { code: 'ja', name: '日本語', flag: '🇯🇵' }, { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }];
  const [isOpen, setIsOpen] = useState(false);

  const switchLocale = (localeCode: string) => {
    router.push(`/${localeCode}`); // Navigate to the new locale
    setIsOpen(false);
  };
  const selectedLocale = locales.find(l => l.code === currentLocale) || locales[0];

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="flex items-center !shadow-none" iconLeft={null} iconRight={ChevronRight} href="#">
        <span className="mr-1 sm:mr-2">{selectedLocale.flag}</span>
        <span className="hidden sm:inline">{selectedLocale.name}</span>
        
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-700 rounded-xl shadow-lg py-1 z-50">
          {locales.map(locale => ( <button key={locale.code} onClick={() => switchLocale(locale.code)} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600" role="menuitem"> <span className="mr-2">{locale.flag}</span> {locale.name} </button> ))}
        </div>
      )}
    </div>
  );
};

// --- Landing Page Sections ---

const LandingPageHeader = ({ locale }: { locale: string }) => {
  const { theme, toggleTheme } = useThemeLanding();
  const t = useTranslations('LandingPage');
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center" aria-label={t('header.logo_aria_label')}>
            <Image src="/coorder-ai.png" alt="coorder.ai" width={40} height={40} className="w-10 h-10" />
            <span className="ml-2 text-2xl font-bold text-slate-800 dark:text-slate-100">coorder<span className="text-[--brand-color-landing]">.ai</span></span>
          </a>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <LanguageSwitcherLanding />
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="!shadow-none" aria-label={t('theme.toggle')} iconLeft={null} iconRight={null} href="#">
              <Icon name={theme === 'light' ? Moon : Sun} />
            </Button>
            <Button href={locale+"/login"} variant="ghost" size="sm" className="hidden sm:inline-flex !shadow-none" onClick={() => {}} iconLeft={null} iconRight={null}>{t('header.login')}</Button>
            <Button href={locale+"/signup"} variant="primary" size="sm" onClick={() => {}} iconLeft={null} iconRight={null}>{t('header.signup')}</Button>
          </div>
        </div>
      </div>
    </header>
  );
};

const HeroSection = () => {
  const t = useTranslations('LandingPage');
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const aiFeatures = [
    { 
      title: "AI Menu Analysis", 
      description: "Smart recommendations based on customer preferences",
      icon: "🧠",
      color: "from-blue-500 to-purple-600"
    },
    { 
      title: "Real-time Ordering", 
      description: "Instant order processing with AI optimization",
      icon: "⚡",
      color: "from-green-500 to-blue-500"
    },
    { 
      title: "Smart Analytics", 
      description: "Predictive insights for better business decisions",
      icon: "📊",
      color: "from-purple-500 to-pink-500"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % aiFeatures.length);
        setIsAnimating(false);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900/30 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white !leading-tight">
              {t('hero.headline_part1')} <span className="text-[--brand-color-landing]">{t('hero.headline_part2')}</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0">
              {t('hero.subheadline')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button href="#signup" variant="primary" size="xl" iconRight={ArrowRight} onClick={() => {}} iconLeft={null}>
                {t('hero.cta.signup')}
              </Button>
              <Button href="#demo" variant="outline" size="xl" iconLeft={PlayCircle} onClick={() => {}} iconRight={null}>
                {t('hero.cta.demo')}
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('hero.cta.subtext')}</p>
          </div>
          
          {/* AI System Illustration */}
          <div className="relative">
            {/* Main SVG Logo with Animation */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg 
                  width="300" 
                  height="96" 
                  viewBox="0 0 300 96" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="animate-pulse"
                >
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:"#00B5D9", stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:"#0047AB", stopOpacity:1}} />
                    </linearGradient>
                  </defs>
                  <g transform="translate(0, 0)">
                    <circle 
                      cx="36" 
                      cy="48" 
                      r="30" 
                      fill="url(#grad1)" 
                      opacity="0.8"
                      className="animate-ping"
                      style={{animationDuration: '2s'}}
                    />
                    <circle 
                      cx="54" 
                      cy="48" 
                      r="30" 
                      fill="url(#grad1)"
                      className="animate-bounce"
                      style={{animationDuration: '3s'}}
                    />
                  </g>
                  <text 
                    x="96" 
                    y="60" 
                    fontFamily="Arial, sans-serif" 
                    fontSize="36" 
                    fill="currentColor" 
                    fontWeight="600"
                    className="text-slate-800 dark:text-white"
                  >
                    coorder.ai
                  </text>
                </svg>
                
                {/* Floating AI particles */}
                <div className="absolute -top-4 -left-4 w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="absolute -top-2 -right-6 w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute -bottom-3 -left-6 w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
                <div className="absolute -bottom-4 -right-4 w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
              </div>
            </div>

            {/* Interactive AI Features Display */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">AI System Active</h3>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>

              {/* Animated Feature Card */}
              <div 
                className={`transition-all duration-500 transform ${
                  isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                }`}
              >
                <div className={`p-4 rounded-xl bg-gradient-to-r ${aiFeatures[currentFeature].color} text-white mb-4`}>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{aiFeatures[currentFeature].icon}</span>
                    <div>
                      <h4 className="font-semibold">{aiFeatures[currentFeature].title}</h4>
                      <p className="text-sm opacity-90">{aiFeatures[currentFeature].description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress indicators */}
              <div className="flex space-x-2 justify-center">
                {aiFeatures.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentFeature 
                        ? 'bg-[--brand-color-landing] w-6' 
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              {/* Simulated data stream */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Orders processed today</span>
                  <span className="font-mono text-green-600">1,247</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>AI recommendations accepted</span>
                  <span className="font-mono text-blue-600">94%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Average order time</span>
                  <span className="font-mono text-purple-600">2.3min</span>
                </div>
              </div>

              {/* Animated progress bars */}
              <div className="mt-3 space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full animate-pulse" style={{width: '87%'}}></div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{width: '94%', animationDelay: '0.5s'}}></div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                  <div className="bg-purple-500 h-1 rounded-full animate-pulse" style={{width: '76%', animationDelay: '1s'}}></div>
                </div>
              </div>
            </div>

            {/* Background decorative elements */}
            <div className="absolute -bottom-4 -right-4 -z-10 w-32 h-32 bg-[--brand-color-landing]/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -top-8 -left-8 -z-10 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
            
            {/* Floating connection lines */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -z-10">
              <svg width="400" height="300" className="opacity-20">
                <line x1="50" y1="50" x2="350" y2="100" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse"/>
                <line x1="100" y1="200" x2="300" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{animationDelay: '0.5s'}}/>
                <line x1="50" y1="250" x2="350" y2="200" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse" style={{animationDelay: '1s'}}/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SocialProofSection = () => {
  const t = useTranslations('LandingPage');
  const logos = [
    { name: "Foodie Weekly", icon: Coffee },
    { name: "Restaurant Tech Today", icon: Building },
    { name: "StartupGrind", icon: Lightbulb },
    { name: "LocalEats Award", icon: ThumbsUp },
  ];
  const testimonials = [
    { quote: "social_proof.testimonial1.quote", name: "Maria R.", role: "Owner, The Cozy Corner", image: "/myorder-dashboard.jpg" },
    { quote: "social_proof.testimonial2.quote", name: "Kenji T.", role: "Chef, Sushi Express", image: "/myorder-dashboard.jpg" },
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
              <Icon name={MessageSquare} size={32} className="absolute top-6 left-6 text-[--brand-color-landing]/20 dark:text-[--brand-color-landing]/30" />
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

const FeaturesSection = () => {
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

const HowItWorksSection = () => {
  const t = useTranslations('LandingPage');
  const steps = [
    { number: 1, icon: PlusCircle, title: "howitworks.step1.title", description: "howitworks.step1.description" },
    { number: 2, icon: Palette, title: "howitworks.step2.title", description: "howitworks.step2.description" },
    { number: 3, icon: Zap, title: "howitworks.step3.title", description: "howitworks.step3.description" },
  ];
  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-slate-50 dark:bg-slate-800/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('howitworks.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            {t('howitworks.subtitle')}
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-8 relative">
          {/* Dashed line connector for desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2">
            <svg width="100%" height="2px" className="opacity-30">
                <line x1="0" y1="1" x2="100%" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8"/>
            </svg>
          </div>
          {steps.map(step => (
            <div key={step.number} className="relative text-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[--brand-color-landing] text-white mx-auto mb-6 text-2xl font-bold">
                {step.number}
              </div>
              <Icon name={step.icon} size={40} className="text-[--brand-color-landing] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t(step.title)}</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{t(step.description)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BenefitsSection = () => {
  const t = useTranslations('LandingPage');
  const benefits = [
    { icon: DollarSign, text: "benefits.item1" },
    { icon: Clock, text: "benefits.item2" },
    { icon: TrendingUp, text: "benefits.item3" },
    { icon: Smile, text: "benefits.item4" },
    { icon: Users, text: "benefits.item5" },
    { icon: Lightbulb, text: "benefits.item6" },
  ];
  return (
    <section className="py-16 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('benefits.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('benefits.subtitle')}
          </p>
        </div>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {benefits.map(benefit => (
            <div key={t(benefit.text)} className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mr-4">
                <Icon name={benefit.icon} size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-lg text-slate-700 dark:text-slate-200">{t(benefit.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FaqSection = () => {
  const t = useTranslations('LandingPage');
  const faqs = [
    { q: "faq.item1.q", a: "faq.item1.a" },
    { q: "faq.item2.q", a: "faq.item2.a" },
    { q: "faq.item3.q", a: "faq.item3.a" },
    { q: "faq.item4.q", a: "faq.item4.a" },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(0); // Open first FAQ by default

  return (
    <section className="py-16 sm:py-20 lg:py-28 bg-slate-50 dark:bg-slate-800/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {t('faq.title')}
          </h2>
        </div>
        <div className="mt-12 max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex justify-between items-center w-full p-5 sm:p-6 text-left font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:outline-none"
                aria-expanded={openFaq === idx}
              >
                <span>{t(faq.q)}</span>
                <Icon name={openFaq === idx ? Minus : Plus} size={20} className="text-[--brand-color-landing]" />
              </button>
              {openFaq === idx && (
                <div className="p-5 sm:p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-300">{t(faq.a)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CallToActionSection = () => {
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

const FooterSection = () => {
  const t = useTranslations('LandingPage');
  const footerLinks = {
    product: [ {name: "footer.links.features", href: "#features"}, {name: "footer.links.pricing", href: "#pricing"}, {name: "footer.links.integrations", href: "#integrations"} ],
    company: [ {name: "footer.links.about_us", href: "#about"}, {name: "footer.links.careers", href: "#careers"}, {name: "footer.links.blog", href: "#blog"} ],
    support: [ {name: "footer.links.help_center", href: "#help"}, {name: "footer.links.contact_us", href: "#contact"}, {name: "footer.links.status", href: "#status"} ],
  };
  return (
    <footer className="py-12 sm:py-16 bg-slate-100 dark:bg-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
             <a href="#" className="flex items-center" aria-label={t('header.logo_aria_label')}>
                <Image src="/coorder-ai.png" alt="coorder.ai" width={40} height={40} className="w-10 h-10" />
                <span className="ml-2 text-2xl font-bold text-slate-800 dark:text-slate-100">coorder<span className="text-[--brand-color-landing]">.ai</span></span>
            </a>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('footer.links.product_title')}</h5>
            <ul className="space-y-2">
              {footerLinks.product.map(link => <li key={link.name}><a href={link.href} className="text-slate-500 dark:text-slate-400 hover:text-[--brand-color-landing] text-sm">{t(link.name)}</a></li>)}
            </ul>
          </div>
           <div>
            <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('footer.links.company_title')}</h5>
            <ul className="space-y-2">
              {footerLinks.company.map(link => <li key={link.name}><a href={link.href} className="text-slate-500 dark:text-slate-400 hover:text-[--brand-color-landing] text-sm">{t(link.name)}</a></li>)}
            </ul>
          </div>
           <div>
            <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('footer.links.support_title')}</h5>
            <ul className="space-y-2">
              {footerLinks.support.map(link => <li key={link.name}><a href={link.href} className="text-slate-500 dark:text-slate-400 hover:text-[--brand-color-landing] text-sm">{t(link.name)}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-200 dark:border-slate-700 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} CoOrder.ai {t('common.all_rights_reserved')}
          </p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a href="#privacy" className="text-sm text-slate-500 dark:text-slate-400 hover:text-[--brand-color-landing]">{t('footer.privacy_policy')}</a>
            <a href="#terms" className="text-sm text-slate-500 dark:text-slate-400 hover:text-[--brand-color-landing]">{t('footer.terms_of_service')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};



// Main Landing Page Component
function Page() {
  const searchParams = useSearchParams();
  const subdomain = searchParams.get('restaurant');
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (subdomain) {
      router.replace(`/${locale}/customer`);
    }
  }, [subdomain, locale, router]);

  if (subdomain) {
    return null;
  }

  // Original generic landing page content
  return (
    <ThemeProviderLanding>
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen font-sans antialiased">
        <LandingPageHeader locale={locale} />
        <main>
          <HeroSection />
          <SocialProofSection />
          <FeaturesSection />
          <HowItWorksSection />
          <BenefitsSection />
          <FaqSection />
          <CallToActionSection />
        </main>
        <FooterSection />
      </div>
    </ThemeProviderLanding>
  );
}

export default Page;
