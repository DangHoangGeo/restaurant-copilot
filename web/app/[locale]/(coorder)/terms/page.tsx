import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import TermsContent from './terms-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  
  return {
    title: t('terms.metadata.title'),
    description: t('terms.metadata.description'),
  };
}

export default function TermsOfServicePage() {
  return <TermsContent />;
}
