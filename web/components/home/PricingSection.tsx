"use client";
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Zap, Users, TrendingUp, Shield } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { PRICING_PLANS, PRICING_CONFIG } from '@/config/pricing';

interface PricingSectionProps {
  className?: string;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ className = '' }) => {
  const t = useTranslations('LandingPage.pricing');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: PRICING_CONFIG.currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getFeatureIcon = (featureKey: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      basic_order_management: <Users className="w-4 h-4" />,
      ai_analytics_basic: <TrendingUp className="w-4 h-4" />,
      basic_customer_support: <Shield className="w-4 h-4" />,
      advanced_order_management: <Users className="w-4 h-4" />,
      enhanced_ai_analytics: <TrendingUp className="w-4 h-4" />,
      priority_customer_support: <Shield className="w-4 h-4" />,
      external_platform_integrations: <Zap className="w-4 h-4" />,
      full_feature_access: <Star className="w-4 h-4" />,
      comprehensive_ai_optimization: <TrendingUp className="w-4 h-4" />,
      dedicated_ai_support: <Shield className="w-4 h-4" />,
      multi_location_management: <Users className="w-4 h-4" />
    };
    return iconMap[featureKey] || <Check className="w-4 h-4" />;
  };

  const handlePlanSelection = (planId: string) => {
    // Store selected plan in localStorage for signup flow
    localStorage.setItem('selectedPlan', planId);
    localStorage.setItem('selectedBillingCycle', billingCycle);
    
    // Navigate to signup with plan parameter
    window.location.href = `/signup?plan=${planId}&billing=${billingCycle}`;
  };

  return (
    <section className={`py-16 sm:py-20 lg:py-28 bg-slate-50 dark:bg-slate-800/50 ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {t('title')}
          </motion.h2>
          <motion.p 
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            {t('subtitle')}
          </motion.p>

          {/* Billing Toggle */}
          <motion.div 
            className="inline-flex bg-white dark:bg-slate-700 rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-600"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-[--brand-color-landing] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('billing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 relative ${
                billingCycle === 'yearly'
                  ? 'bg-[--brand-color-landing] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('billing.yearly')}
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                {t('billing.save_20')}
              </span>
            </button>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PRICING_PLANS.map((plan, index) => {
            const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
            const monthlyPrice = billingCycle === 'yearly' ? plan.price.yearly / 12 : plan.price.monthly;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative ${plan.highlighted ? 'lg:scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-[--brand-color-landing] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      {t('popular')}
                    </span>
                  </div>
                )}

                <Card 
                  className={`h-full p-8 relative overflow-hidden ${
                    plan.highlighted 
                      ? 'border-2 border-[--brand-color-landing] shadow-2xl' 
                      : 'border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl'
                  } transition-all duration-300`}
                >
                  {/* Background Pattern */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                    <div className="w-full h-full bg-[--brand-color-landing] rounded-full transform translate-x-16 -translate-y-16"></div>
                  </div>

                  <div className="relative z-10">
                    {/* Plan Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        {t(`plans.${plan.id}.title`)}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
                        {t(`plans.${plan.id}.description`)}
                      </p>
                      
                      {/* Pricing */}
                      <div className="mb-6">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                            {formatPrice(monthlyPrice)}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300 text-sm">
                            /{t('billing.per_month')}
                          </span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {t('billing.billed_yearly')} ({formatPrice(price)})
                          </p>
                        )}
                        {plan.maxCustomersPerDay && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {t('up_to_customers', { count: plan.maxCustomersPerDay })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: (index * 0.1) + (featureIndex * 0.05) }}
                          viewport={{ once: true }}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                            <div className="text-green-600 dark:text-green-400">
                              {getFeatureIcon(feature)}
                            </div>
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 text-sm">
                            {t(`features.${feature}`)}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handlePlanSelection(plan.id)}
                      variant={plan.highlighted ? "primary" : "outline"}
                      size="lg"
                      className="w-full"
                      iconRight={plan.id === 'enterprise' ? undefined : ArrowRight}
                    >
                      {t(`cta.${plan.buttonText || 'choose_plan'}`)}
                    </Button>

                    {/* Trial Info */}
                    {plan.id !== 'enterprise' && (
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
                        {t('trial_info', { days: PRICING_CONFIG.trialDays })}
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            {t('bottom_cta.title')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              href="/signup"
              variant="outline"
              iconLeft={Star}
            >
              {t('bottom_cta.start_free')}
            </Button>
            <span className="text-slate-400 dark:text-slate-500">
              {t('bottom_cta.or')}
            </span>
            <Button 
              href="/contact"
              variant="ghost"
            >
              {t('bottom_cta.contact_sales')}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
