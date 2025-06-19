import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PrivacyContent from './privacy-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  
  return {
    title: t('privacy.metadata.title'),
    description: t('privacy.metadata.description'),
  };
}

export default function PrivacyPolicyPage() {
  return <PrivacyContent />;
}
