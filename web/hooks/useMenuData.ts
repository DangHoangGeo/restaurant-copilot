'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Category } from '@/shared/types/menu';

interface MenuDataParams {
  restaurantId?: string;
  locale: string;
  sessionId?: string;
  tableId?: string;
}

interface MenuDataResponse {
  categories: Category[];
  popularItems: string[];
  recommendations: string[];
  lastUpdated: string;
}

interface MenuDataParams {
  restaurantId?: string;
  locale: string;
  sessionId?: string;
  tableId?: string;
}

interface MenuDataResponse {
  categories: Category[];
  popularItems: string[];
  recommendations: string[];
  lastUpdated: string;
}

// Trim menu data for performance - remove heavy fields until detail view
const trimMenuItems = (categories: Category[]): Category[] => {
  return categories.map(category => ({
    ...category,
    menu_items: category.menu_items.map(item => ({
      ...item,
      // Keep only essential fields, remove heavy ones
      description_en: item.description_en ? item.description_en.substring(0, 100) + '...' : undefined,
      description_ja: item.description_ja ? item.description_ja.substring(0, 100) + '...' : undefined,
      description_vi: item.description_vi ? item.description_vi.substring(0, 100) + '...' : undefined,
    }))
  }));
};

// Fetch menu data using existing API endpoints
const fetchMenuData = async (params: MenuDataParams): Promise<MenuDataResponse> => {
  const { restaurantId } = params;
  
  try {
    // Construct query parameters for the menu API
    const searchParams = new URLSearchParams();
    
    if (restaurantId) {
      // If we have restaurantId, use it directly as subdomain for now
      // In real scenarios, you'd need to map restaurantId to subdomain
      searchParams.set('subdomain', restaurantId);
    }
    
    // Use the existing customer menu API
    const menuResponse = await fetch(`/api/v1/customer/menu?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!menuResponse.ok) {
      throw new Error(`Failed to fetch menu: ${menuResponse.status} ${menuResponse.statusText}`);
    }

    const menuData = await menuResponse.json();
    
    // Transform the API response to match our expected format
    const categories: Category[] = menuData.categories || [];
    
    // Extract all available menu items for recommendations
    const allMenuItems = categories.flatMap(cat => 
      cat.menu_items?.filter(item => item.available) || []
    );

    // Get popular items (items with higher ratings/reviews)
    const popularItems = allMenuItems
      .filter(item => (item.averageRating || 0) > 4.0)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, 8)
      .map(item => item.id);

    // Get recommendations (for now, use items with recent activity or fallback to popular)
    const recommendations = popularItems.slice(0, 6); // Subset of popular items

    return {
      categories,
      popularItems,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch menu data:', error);
    throw error;
  }
};

export function useMenuData(params: MenuDataParams) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['menu', params.restaurantId, params.locale, params.sessionId],
    queryFn: () => fetchMenuData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch menu item details
  const prefetchItemDetails = async (itemId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['menu-item', itemId],
      queryFn: () => fetchItemDetails(itemId),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Optimized categories with trimmed data
  const optimizedCategories = useMemo(() => {
    if (!data?.categories) return [];
    return trimMenuItems(data.categories);
  }, [data?.categories]);

  console.log('Menu data loaded:', {
	categories: optimizedCategories,
  });

  return {
    categories: optimizedCategories,
    popularItems: data?.popularItems || [],
    recommendations: data?.recommendations || [],
    lastUpdated: data?.lastUpdated,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    prefetchItemDetails
  };
}

// Separate hook for item details (loaded on demand)
const fetchItemDetails = async (itemId: string) => {
  try {
    // For now, we'll return basic structure as the API doesn't have item details endpoint yet
    // In future, this could call `/api/v1/customer/menu/items/${itemId}`
    const response = await fetch(`/api/v1/customer/menu/items/${itemId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        ...data,
        sizes: data.menu_item_sizes || [],
        toppings: data.menu_item_toppings || [],
        fullDescription: data.description_en || data.description_ja || data.description_vi || '',
        nutritionInfo: {},
        allergens: data.tags?.filter((tag: string) => tag.startsWith('allergen:')) || []
      };
    } else {
      // Fallback for now if endpoint doesn't exist
      return {
        id: itemId,
        sizes: [],
        toppings: [],
        fullDescription: '',
        nutritionInfo: {},
        allergens: []
      };
    }
  } catch (error) {
    console.warn('Item details API not available, using fallback:', error);
    return {
      id: itemId,
      sizes: [],
      toppings: [],
      fullDescription: '',
      nutritionInfo: {},
      allergens: []
    };
  }
};

export function useMenuItemDetails(itemId: string | null) {
  return useQuery({
    queryKey: ['menu-item', itemId],
    queryFn: () => fetchItemDetails(itemId!),
    enabled: !!itemId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
