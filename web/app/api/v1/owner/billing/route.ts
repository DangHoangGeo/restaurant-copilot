import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  description: string | null;
}

export interface BillingSubscription {
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'paused' | 'expired';
  currentPeriodEnd: string;
  trialEnd: string | null;
  trialStart: string | null;
}

export interface BillingResponse {
  plan: BillingPlan;
  subscription: BillingSubscription;
}

export async function GET() {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantId = user.restaurantId;

    // Query tenant_subscriptions joined with subscription_plans
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from('tenant_subscriptions')
      .select(`
        id,
        status,
        billing_cycle,
        current_period_end,
        trial_starts_at,
        trial_ends_at,
        subscription_plans:plan_id (
          id,
          name,
          description,
          price_monthly,
          price_yearly,
          features
        )
      `)
      .eq('restaurant_id', restaurantId)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      throw subscriptionError;
    }

    // Default free/trial tier if no subscription found
    if (!subscriptionData) {
      const defaultResponse: BillingResponse = {
        plan: {
          id: 'free',
          name: 'Free Trial',
          price: 0,
          billingCycle: 'monthly',
          features: ['basic_order_management', 'basic_customer_support'],
          description: 'Try CoOrder.ai for free',
        },
        subscription: {
          status: 'trial',
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          trialStart: new Date().toISOString(),
        },
      };
      return NextResponse.json(defaultResponse);
    }

    // Build response from subscription data
    const plan = subscriptionData.subscription_plans as any;
    const billingCycle = (subscriptionData.billing_cycle || 'monthly') as 'monthly' | 'yearly';
    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

    const response: BillingResponse = {
      plan: {
        id: plan.id,
        name: plan.name,
        price,
        billingCycle,
        features: plan.features || [],
        description: plan.description,
      },
      subscription: {
        status: subscriptionData.status as any,
        currentPeriodEnd: subscriptionData.current_period_end,
        trialEnd: subscriptionData.trial_ends_at,
        trialStart: subscriptionData.trial_starts_at,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching billing information:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    );
  }
}
