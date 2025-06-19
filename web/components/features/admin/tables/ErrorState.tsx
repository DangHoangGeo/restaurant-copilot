"use client";

import { RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  error: string
  onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations("common");
  
  return (
    <div className="p-8 text-center">
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-md">
        <h3 className="font-semibold text-lg mb-2">{t('alert.error.title')}</h3>
        <p className="mb-4">{error}</p>
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          {t('retry')}
        </Button>
      </div>
    </div>
  );
}
