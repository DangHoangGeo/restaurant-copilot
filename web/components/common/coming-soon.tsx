'use client';

import { useTranslations } from 'next-intl';
import { Wrench } from 'lucide-react';

interface ComingSoonProps {
  featureName?: string;
}

export function ComingSoon({ featureName }: ComingSoonProps) {
  const t = useTranslations('Common'); // Assuming 'Common' namespace for general messages

  return (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
      <Wrench className="h-12 w-12 mb-4 text-primary" />
      <p className="text-lg font-semibold">{t('coming_soon.title')}</p>
      {featureName && (
        <p className="text-sm mt-2">
          {t('coming_soon.description', { feature: t(featureName) })}
        </p>
      )}
      {!featureName && (
        <p className="text-sm mt-2">
          {t('coming_soon.generic_description')}
        </p>
      )}
    </div>
  );
}
