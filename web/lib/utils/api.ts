/**
 * API utilities for making requests to the restaurant API
 * Provides consistent error handling and response parsing
 */

import { Category } from '@/shared/types/menu';

/**
 * Helper function to extract error message from API response
 */
export const extractErrorMessage = (errorData: unknown, fallbackMessage: string): string => {
  if (typeof errorData === 'object' && errorData !== null) {
    const error = errorData as Record<string, unknown>;
    if (typeof error.error === 'object' && error.error !== null) {
      const nestedError = error.error as Record<string, unknown>;
      if (typeof nestedError.message === 'string') {
        return nestedError.message;
      }
    }
    if (typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallbackMessage;
};

/**
 * Fetch categories with all nested data using the new API format
 * Supports both new API response format and legacy format for backward compatibility
 */
export const fetchCategoriesWithIncludes = async (): Promise<Category[]> => {
  const url = new URL('/api/v1/owner/categories', window.location.origin);
  url.searchParams.set('page', '1');
  url.searchParams.set('pageSize', '1000'); // Get all categories
  url.searchParams.set('include', 'items,sizes,toppings,counts'); // Include all nested data
  
  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, 'Failed to fetch categories'));
  }

  const responseData = await response.json();
  
  // Handle both new API format and legacy format for backward compatibility
  if (responseData.success && responseData.data) {
    // New API format
    return responseData.data.categories || [];
  } else if (responseData.categories) {
    // Legacy format fallback
    return responseData.categories || [];
  } else {
    throw new Error('Unexpected response format');
  }
};

/**
 * Generic API request handler with consistent error handling
 */
export const apiRequest = async <T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, {
    headers: { 
      'Content-Type': 'application/json',
      ...options.headers 
    },
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, `Request failed with status ${response.status}`));
  }

  return response.json();
};
