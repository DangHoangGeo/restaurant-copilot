import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
// Assuming a toast notification system is in place, e.g., react-hot-toast or similar
// import toast from 'react-hot-toast';

interface RecommendationsWidgetProps {
  restaurantId: string;
}

interface TopSeller {
  menu_item_id: string;
  name: string; // This name is already localized by the RPC, or is the default.
  total_sold: number;
}

const RecommendationsWidget: React.FC<RecommendationsWidgetProps> = ({ restaurantId }) => {
  const t = useTranslations('owner.reports.recommendations');

  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!restaurantId) {
      setTopSellers([]);
      setError(null);
      setApplySuccess(false);
      setApplyError(null);
      return;
    }

    const fetchTopSellers = async () => {
      setIsLoading(true);
      setError(null);
      setApplySuccess(false);
      setApplyError(null);
      try {
        const response = await fetch('/api/v1/owner/dashboard/popular-items', {
          method: 'GET',
          credentials: 'same-origin',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Failed to fetch popular items (status: ${response.status})`);
        }

        setTopSellers((result || []).slice(0, 3));
      } catch (error) {
        setError(t('errorFetching', { error: (error as Error).message }));
        setTopSellers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopSellers();
  }, [restaurantId, t]); // Added t to dependency array as it's used in effect

  const handleApplyRecommendations = async () => {
    if (!restaurantId) {
      setApplyError(t('missingRestaurantIdApply'));
      // toast.error(t('missingRestaurantIdApply'));
      return;
    }

    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(false);

    try {
      const response = await fetch('/api/v1/owner/recommendations/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ restaurantId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to apply recommendations (status: ${response.status})`);
      }

      if (result.success) {
        setApplySuccess(true);
        // toast.success(t('applySuccess'));
      } else {
        throw new Error(result.error || "Failed to apply recommendations (no success flag).");
      }
    } catch (error) {
      setApplyError(t('applyError', { error: (error as Error).message }));
      // toast.error(t('applyError', { error: e.message }));
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">{t('title')}</h2>

      {isLoading && <p>{t('loading')}</p>}
      {error && <p className="text-red-500">{error}</p>} {/* Error message is already translated */}

      {!isLoading && !error && topSellers.length === 0 && restaurantId && (
        <p>{t('noData')}</p>
      )}

      {!restaurantId && !isLoading && (
        <p>{t('missingRestaurantId')}</p>
      )}

      {!isLoading && !error && topSellers.length > 0 && (
        <>
          <ul className="space-y-2 mb-4">
            {topSellers.map((item) => (
              <li key={item.menu_item_id} className="flex justify-between">
                <span>{item.name}</span> {/* Item name comes from DB, assumed localized or default */}
                <span className="font-medium">{t('soldLabel')} {item.total_sold}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={handleApplyRecommendations}
            disabled={isApplying || !restaurantId || topSellers.length === 0} // Also disable if no sellers to apply
          >
            {isApplying ? t('applyingButton') : t('applyButton')}
          </Button>
          {applySuccess && <p className="text-green-500 mt-2">{t('applySuccess')}</p>}
          {applyError && <p className="text-red-500 mt-2">{applyError}</p>} {/* Error message is already translated */}
        </>
      )}
    </div>
  );
};

export default RecommendationsWidget;
