'use client'

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RotateCcw, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import type { BillingResponse } from "@/app/api/v1/owner/billing/route";

// Loading skeleton component
function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </header>

      <div className="space-y-6">
        <div className="p-6 border rounded-lg space-y-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="p-6 border rounded-lg space-y-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const tCommon = useTranslations('common')

  return (
    <div className="p-8 text-center">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{tCommon("errors.fetchErrorTitle")}</AlertTitle>
        <AlertDescription className="mb-4">{error}</AlertDescription>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {tCommon('retry')}
        </Button>
      </Alert>
    </div>
  )
}

interface BillingClientContentProps {
  locale: string
}

export function BillingClientContent({ locale }: BillingClientContentProps) {
  const t = useTranslations('owner.billing');
  const tCommon = useTranslations('common');
  const params = useParams();
  const currentLocale = (params.locale as string) || 'en';

  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/v1/owner/billing');

      if (!response.ok) {
        throw new Error('Failed to fetch billing information');
      }

      const data = await response.json();
      setBilling(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'past_due':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'paused':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string): string => {
    return t(`status.${status}`) || status;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(currentLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number, currency = 'USD'): string => {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency,
    }).format(price);
  };

  const getDaysRemaining = (dateString: string | null): number => {
    if (!dateString) return 0;
    const endDate = new Date(dateString);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Early return for loading state
  if (isLoading) {
    return <BillingSkeleton />
  }

  // Early return for error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchBillingInfo} />
  }

  // Early return if no billing data
  if (!billing) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.noDataFoundTitle")}</AlertTitle>
          <AlertDescription>{tCommon("errors.noDataFoundMessage")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const isTrialStatus = billing.subscription.status === 'trial';
  const isPastDue = billing.subscription.status === 'past_due';
  const trialDaysRemaining = isTrialStatus ? getDaysRemaining(billing.subscription.trialEnd) : 0;
  const periodDaysRemaining = getDaysRemaining(billing.subscription.currentPeriodEnd);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t("subtitle")}
        </p>
      </header>

      {/* Trial warning banner */}
      {isTrialStatus && (
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            {t("trial.banner_title")}
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            {t("trial.banner_description", { days: trialDaysRemaining })}
          </AlertDescription>
        </Alert>
      )}

      {/* Past due warning */}
      {isPastDue && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("status.past_due_title")}
          </AlertTitle>
          <AlertDescription className="mb-4">
            {t("status.past_due_description")}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("current_plan.title")}</CardTitle>
            <Badge className={getStatusColor(billing.subscription.status)}>
              {getStatusLabel(billing.subscription.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("current_plan.plan_name")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {billing.plan.name}
              </p>
              {billing.plan.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {billing.plan.description}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("current_plan.price")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatPrice(billing.plan.price)}
                <span className="text-lg text-gray-500 dark:text-gray-400">
                  {" "}/{t(`billing_cycle.${billing.plan.billingCycle}`)}
                </span>
              </p>
            </div>
          </div>

          {/* Period dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
            {isTrialStatus ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t("trial.start_date")}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {formatDate(billing.subscription.trialStart)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t("trial.end_date")}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {formatDate(billing.subscription.trialEnd)}
                    {trialDaysRemaining > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                        ({trialDaysRemaining} {t("trial.days_remaining")})
                      </span>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t("current_plan.period_end")}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {formatDate(billing.subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t("current_plan.days_until_renewal")}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {periodDaysRemaining} {t("current_plan.days")}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      {billing.plan.features && billing.plan.features.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("features.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {billing.plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(`features.${feature}`)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade CTA */}
      {billing.subscription.status === 'trial' || billing.subscription.status === 'active' ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("upgrade.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("upgrade.description")}
            </p>
            <Button asChild>
              <a href={`mailto:support@coorder.ai?subject=Upgrade%20Plan%20Request`}>
                {t("upgrade.cta")}
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("billing_history.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("billing_history.description")}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <a href={`mailto:support@coorder.ai?subject=Billing%20Invoice%20Request`}>
              {t("billing_history.contact_support")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
