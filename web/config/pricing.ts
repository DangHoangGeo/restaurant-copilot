// Pricing configuration for subscription plans
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  highlighted?: boolean;
  popular?: boolean;
  maxCustomersPerDay?: number;
  buttonText?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter Plan',
    description: 'Perfect for small establishments serving up to 100 customers per day',
    price: {
      monthly: 15,
      yearly: 180, // $15/month * 12 months = $180/year
    },
    maxCustomersPerDay: 100,
    features: [
      'basic_order_management',
      'ai_analytics_basic',
      'basic_customer_support'
    ],
    buttonText: 'start_free_trial'
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    description: 'Ideal for regular-sized establishments serving 100-500 customers per day',
    price: {
      monthly: 40,
      yearly: 480, // $40/month * 12 months = $480/year
    },
    maxCustomersPerDay: 500,
    features: [
      'advanced_order_management',
      'enhanced_ai_analytics',
      'priority_customer_support',
      'external_platform_integrations'
    ],
    highlighted: true,
    popular: true,
    buttonText: 'choose_plan'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'For business owners managing multiple locations',
    price: {
      monthly: 100,
      yearly: 1200, // $100/month * 12 months = $1200/year
    },
    features: [
      'full_feature_access',
      'comprehensive_ai_optimization',
      'dedicated_ai_support',
      'multi_location_management'
    ],
    buttonText: 'contact_sales'
  }
];

export const PRICING_CONFIG = {
  currency: 'USD',
  currencySymbol: '$',
  billingCycle: 'yearly', // Default billing cycle
  trialDays: 14,
  features: {
    // Feature descriptions for translation keys
    basic_order_management: 'pricing.features.basic_order_management',
    ai_analytics_basic: 'pricing.features.ai_analytics_basic',
    basic_customer_support: 'pricing.features.basic_customer_support',
    advanced_order_management: 'pricing.features.advanced_order_management',
    enhanced_ai_analytics: 'pricing.features.enhanced_ai_analytics',
    priority_customer_support: 'pricing.features.priority_customer_support',
    external_platform_integrations: 'pricing.features.external_platform_integrations',
    full_feature_access: 'pricing.features.full_feature_access',
    comprehensive_ai_optimization: 'pricing.features.comprehensive_ai_optimization',
    dedicated_ai_support: 'pricing.features.dedicated_ai_support',
    multi_location_management: 'pricing.features.multi_location_management'
  }
} as const;
