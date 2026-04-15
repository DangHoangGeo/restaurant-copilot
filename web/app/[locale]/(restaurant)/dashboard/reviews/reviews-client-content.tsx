'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, AlertTriangle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface Review {
  id: string
  customer_name: string
  rating: number
  comment: string | null
  created_at: string
  order_id: string
  menu_item_id: string
}

interface Stats {
  total: number
  averageRating: number
  fiveStarCount: number
  oneTwoStarCount: number
}

// Skeleton loader
function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations("common");

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={onRetry}
          className="ml-4 px-3 py-1.5 text-sm font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {t('retry')}
        </button>
      </AlertDescription>
    </Alert>
  )
}

// Star rating display component
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
      <span className="ml-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

export function ReviewsClientContent() {
  const t = useTranslations("owner.reviews");
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReviews = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/v1/owner/reviews', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setError(err instanceof Error ? err.message : t('errors.fetch_failed'))
      toast.error('Failed to load reviews')
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  if (isLoading) return <ReviewsSkeleton />
  if (error) return <ErrorState error={error} onRetry={loadReviews} />

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
      </header>

      {/* Stats Cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Reviews */}
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t("stats.total_reviews")}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {stats.total}
            </p>
          </Card>

          {/* Average Rating */}
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t("stats.average_rating")}
            </p>
            <StarRating rating={stats.averageRating} size="md" />
          </Card>

          {/* 5-Star Count */}
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t("stats.five_star_count")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.fiveStarCount}
              </p>
              <p className="text-sm text-muted-foreground">
                {Math.round((stats.fiveStarCount / stats.total) * 100)}%
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card className="p-8 text-center">
          <Star className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            {t('empty_state.title')}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t('empty_state.description')}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left side - Customer name and date */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-foreground">
                      {review.customer_name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {formatDate(review.created_at)}
                    </Badge>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>

                {/* Right side - Rating */}
                <div className="flex-shrink-0">
                  <StarRating rating={review.rating} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
