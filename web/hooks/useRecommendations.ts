'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface RecommendationParams {
  userId?: string;
  sessionId?: string;
  tableId?: string;
  timeOfDay: string;
  weather?: string;
  previousOrders?: string[];
  currentCartItems?: string[];
  restaurantId?: string;
  guestCount?: number;
  timezone?: string | null;
  availableMenuItems?: Array<{
    id: string;
    name_en?: string;
    name_ja?: string; 
    name_vi?: string;
    description_en?: string;
    description_ja?: string;
    description_vi?: string;
    categoryId: string;
    tags?: string[];
    prep_station?: "food" | "drink" | "other";
  }>;
}

interface RecommendationResponse {
  items: string[];
  reasons: Record<string, string>;
  confidence: number;
  categories: string[];
}

const fetchRecommendations = async (params: RecommendationParams): Promise<RecommendationResponse> => {
  if (!params.restaurantId) {
    // Fallback to time-based recommendations if no restaurant ID
    return getTimeBasedRecommendations(params);
  }

  try {
    const response = await fetch('/api/v1/customer/menu/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: params.restaurantId,
        timeOfDay: params.timeOfDay,
        timezone: params.timezone || undefined,
        guestCount: params.guestCount || 1,
        currentCartItems: params.currentCartItems || [],
        availableMenuItems: (params.availableMenuItems || []).map((item) => ({
          id: item.id,
          tags: item.tags || [],
          prep_station: item.prep_station,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to load customer recommendations');
    }

    const recommendations = (await response.json()) as RecommendationResponse;
    if (recommendations.items.length > 0) {
      return recommendations;
    }

    return getTimeBasedRecommendations(params);
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return getTimeBasedRecommendations(params);
  }
};

// Fallback time-based recommendations
const getTimeBasedRecommendations = (params: RecommendationParams): RecommendationResponse => {
  const timeBasedKeywords = {
    breakfast: ['coffee', 'tea', 'pastry', 'egg', 'toast', 'pancake', 'cereal', 'morning'],
    lunch: ['sandwich', 'salad', 'soup', 'bowl', 'wrap', 'burger', 'quick', 'noodle', 'pho'],
    afternoon: ['snack', 'light', 'tea', 'coffee', 'sweet'],
    dinner: ['main', 'pasta', 'rice', 'meat', 'fish', 'steak', 'dinner', 'beef', 'chicken'],
    late: ['snack', 'light', 'drink', 'dessert', 'simple']
  };

  const keywords = timeBasedKeywords[params.timeOfDay as keyof typeof timeBasedKeywords] || [];
  const timeTags = new Set([
    params.timeOfDay,
    ...keywords,
    ...(params.timeOfDay === 'lunch' ? ['set_menu', 'main_dish', 'quick'] : []),
    ...(params.timeOfDay === 'dinner' ? ['set_menu', 'main_dish', 'sharing'] : []),
  ]);
  
  // If we have menu items available, filter by keywords and return actual IDs
  if (params.availableMenuItems && params.availableMenuItems.length > 0) {
    const matchingItems = params.availableMenuItems
      .filter(item => {
        const searchText = `${item.name_en || ''} ${item.name_ja || ''} ${item.name_vi || ''} ${item.description_en || ''}`.toLowerCase();
        const tags = new Set((item.tags || []).map((tag) => tag.toLowerCase()));
        const matchesTime = Array.from(timeTags).some((keyword) =>
          tags.has(keyword.toLowerCase()) ||
          searchText.includes(keyword.toLowerCase())
        );
        const matchesGuestCount =
          (params.guestCount || 1) >= 4 &&
          (tags.has('sharing') || tags.has('set_menu'));
        return matchesTime || matchesGuestCount;
      })
      .slice(0, 6) // Limit to 6 recommendations
      .map(item => item.id);

    const reasons = matchingItems.reduce((acc, itemId) => {
      const item = params.availableMenuItems!.find(i => i.id === itemId);
      return {
        ...acc,
        [itemId]: `Perfect for ${params.timeOfDay}${item ? ` - ${item.name_en || item.name_ja || item.name_vi || 'this item'}` : ''}`
      };
    }, {});

    return {
      items: matchingItems,
      reasons,
      confidence: 0.7,
      categories: ['time_based', 'menu_matched']
    };
  }
  
  // Fallback to empty recommendations if no menu items provided
  return {
    items: [],
    reasons: {},
    confidence: 0.6,
    categories: ['time_based', 'fallback']
  };
};

export function useRecommendations(params: RecommendationParams) {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['recommendations', params.sessionId, params.timeOfDay, params.guestCount, params.currentCartItems, params.restaurantId],
    queryFn: () => fetchRecommendations(params),
    staleTime: 2 * 60 * 1000, // 2 minutes - recommendations can be more dynamic
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });

  const recommendedItems = useMemo(() => data?.items || [], [data?.items]);
  const recommendationReasons = useMemo(() => data?.reasons || {}, [data?.reasons]);

  return {
    recommendedItems,
    recommendationReasons,
    confidence: data?.confidence || 0,
    categories: data?.categories || [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  };
}
