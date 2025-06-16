'use client'

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Restaurant } from "@/shared/types";
import SettingsForm from "./settings-form";

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
  )
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const tCommon = useTranslations('Common')
  
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

interface SettingsClientContentProps {
  locale: string
}

export function SettingsClientContent({ locale }: SettingsClientContentProps) {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');

  // Progressive loading state
  const [restaurantSettings, setRestaurantSettings] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data fetching
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/v1/restaurant/settings')
      console.log(response)
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }
      const data = await response.json()
      setRestaurantSettings(data)
    } catch (err) {
      console.error('Error fetching restaurant settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Early return for loading state
  if (isLoading) {
    return <SettingsSkeleton />
  }

  // Early return for error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchSettings} />
  }

  // Early return for no settings found
  if (!restaurantSettings) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{tCommon("errors.noSettingsFoundTitle")}</AlertTitle>
          <AlertDescription>{tCommon("errors.noSettingsFoundMessage")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("Settings.Page.title")}
        </h1>
      </header>

      <SettingsForm
        initialSettings={restaurantSettings}
        locale={locale}
      />
    </>
  )
}
