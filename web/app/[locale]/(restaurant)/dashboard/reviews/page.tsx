import { setRequestLocale } from 'next-intl/server'
import { ReviewsClientContent } from './reviews-client-content'
import { FEATURE_FLAGS } from '@/config/feature-flags'
import { ComingSoon } from '@/components/common/coming-soon'

export default async function ReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  if (!FEATURE_FLAGS.onlineReviews) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <ComingSoon featureName="title" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <ReviewsClientContent />
    </div>
  );
}
