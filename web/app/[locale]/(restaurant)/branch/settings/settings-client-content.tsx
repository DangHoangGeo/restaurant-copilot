"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurantSettings } from "@/contexts/RestaurantContext";
import { useParams } from "next/navigation";
import { FEATURE_FLAGS } from "@/config/feature-flags";
import Link from "next/link";
import SettingsForm from "./settings-form";
import { buildBranchPath } from "@/lib/branch-paths";

// Loading skeleton component
function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </header>

      <div className="space-y-6">
        <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="p-6 border rounded-lg space-y-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error state component
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const tCommon = useTranslations("common");

  return (
    <div className="p-8 text-center">
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{tCommon("errors.fetchErrorTitle")}</AlertTitle>
        <AlertDescription className="mb-4">{error}</AlertDescription>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {tCommon("retry")}
        </Button>
      </Alert>
    </div>
  );
}

interface SettingsClientContentProps {
  locale: string;
}

export function SettingsClientContent({ locale }: SettingsClientContentProps) {
  const t = useTranslations("owner.settings");
  const tCommon = useTranslations("common");
  const params = useParams();
  const currentLocale = (params.locale as string) || "en";
  const branchId = typeof params.branchId === "string" ? params.branchId : null;

  // Use restaurant settings from context instead of fetching independently
  const {
    restaurantSettings,
    isLoading,
    error,
    refetchSettings,
    needsOnboarding,
  } = useRestaurantSettings();

  // Show onboarding prompt if not yet onboarded
  if (FEATURE_FLAGS.onboarding && needsOnboarding && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader className="pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Complete Your Setup First
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Before configuring your restaurant settings, please complete the
              initial onboarding process. This will help us set up your basic
              restaurant profile and generate initial content.
            </p>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-4">
              <Link
                href={buildBranchPath(currentLocale, branchId, "onboarding")}
              >
                <Button size="lg" className="w-full">
                  Complete Onboarding
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                This will only take a few minutes and includes AI assistance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Early return for loading state
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  // Early return for error state
  if (error) {
    return <ErrorState error={error} onRetry={refetchSettings} />;
  }

  // Early return for no settings found
  if (!restaurantSettings) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.noSettingsFoundTitle")}</AlertTitle>
          <AlertDescription>
            {tCommon("errors.noSettingsFoundMessage")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </header>

      <SettingsForm initialSettings={restaurantSettings} locale={locale} />
    </>
  );
}
