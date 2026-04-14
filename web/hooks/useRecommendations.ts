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
  availableMenuItems?: Array<{
    id: string;
    name_en?: string;
    name_ja?: string; 
    name_vi?: string;
    description_en?: string;
    description_ja?: string;
    description_vi?: string;
    categoryId: string;
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
    // For now, we'll use a simplified approach since the AI recommendations RPC
    // is designed for admin use (apply_recommendations) not customer recommendations
    // In the future, you could create a dedicated customer recommendations API
    
    // Try to get popular items from the existing reports API (if accessible)
    // This is a simplified approach - in production you'd want a dedicated endpoint
    
    // For now, fallback to time-based recommendations with restaurant context
    const recommendations = getTimeBasedRecommendations(params);
    
    // Add restaurant-specific confidence boost
    return {
      ...recommendations,
      confidence: 0.75, // Higher confidence than pure fallback
      categories: ['contextual', 'time_based']
    };
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
  
  // If we have menu items available, filter by keywords and return actual IDs
  if (params.availableMenuItems && params.availableMenuItems.length > 0) {
    const matchingItems = params.availableMenuItems
      .filter(item => {
        const searchText = `${item.name_en || ''} ${item.name_ja || ''} ${item.name_vi || ''} ${item.description_en || ''}`.toLowerCase();
        return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
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
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['recommendations', params.sessionId, params.timeOfDay, params.restaurantId],
    queryFn: () => fetchRecommendations(params),
    staleTime: 2 * 60 * 1000, // 2 minutes - recommendations can be more dynamic
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const recommendedItems = useMemo(() => data?.items || [], [data?.items]);
  const recommendationReasons = useMemo(() => data?.reasons || {}, [data?.reasons]);

  return {
    recommendedItems,
    recommendationReasons,
    confidence: data?.confidence || 0,
    categories: data?.categories || [],
    isLoading,
    isError,
    error,
    refetch
  };
}
