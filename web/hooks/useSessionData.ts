'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SessionData {
  id: string;
  tableId?: string;
  tableNumber?: string;
  restaurantId: string;
  customerName?: string;
  orderHistory: string[];
  preferences: {
    dietary: string[];
    spiceLevel: number;
    allergens: string[];
  };
  currentSession: {
    startTime: string;
    lastActivity: string;
    orderCount: number;
  };
}

interface SessionParams {
  sessionId?: string;
  tableId?: string;
  restaurantId?: string;
}

const fetchSessionData = async (params: SessionParams): Promise<SessionData | null> => {
  if (!params.sessionId) return null;
  
  try {
    // Use the existing session check API
    const response = await fetch(`/api/v1/customer/session/check?sessionId=${params.sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Session not found
      }
      throw new Error(`Failed to fetch session: ${response.status} ${response.statusText}`);
    }

    const sessionResponse = await response.json();
    
    if (!sessionResponse.success || !sessionResponse.sessionData) {
      return null;
    }

    const sessionInfo = sessionResponse.sessionData;

    return {
      id: params.sessionId,
      tableId: sessionInfo.tableId || params.tableId,
      tableNumber: sessionInfo.tableNumber,
      restaurantId: params.restaurantId || 'default',
      orderHistory: [], // Could be populated from order history API
      preferences: {
        dietary: [],
        spiceLevel: 2,
        allergens: []
      },
      currentSession: {
        startTime: sessionInfo.createdAt || new Date().toISOString(),
        lastActivity: sessionInfo.updatedAt || new Date().toISOString(),
        orderCount: 0 // Could be calculated from order items
      }
    };
  } catch (error) {
    console.error('Failed to fetch session data:', error);
    return null;
  }
};

const updateSessionData = async (sessionId: string, updates: Partial<SessionData>) => {
  try {
    // For now, we'll just log the updates since there's no specific update session API
    // In the future, you could create a PATCH /api/v1/customer/session/:sessionId endpoint
    console.log('Session update requested:', { sessionId, updates });
    
    // For preferences and activity tracking, you might want to store this in localStorage
    // or create dedicated API endpoints
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update session data:', error);
    throw error;
  }
};

export function useSessionData(params: SessionParams) {
  const queryClient = useQueryClient();

  const {
    data: sessionData,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['session', params.sessionId],
    queryFn: () => fetchSessionData(params),
    enabled: !!params.sessionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  const updateSessionMutation = useMutation({
    mutationFn: (updates: Partial<SessionData>) => 
      updateSessionData(params.sessionId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', params.sessionId] });
    },
  });

  const updatePreferences = (preferences: Partial<SessionData['preferences']>) => {
    if (!sessionData) return;
    
    updateSessionMutation.mutate({
      preferences: {
        ...sessionData.preferences,
        ...preferences
      }
    });
  };

  const recordActivity = () => {
    if (!sessionData) return;
    
    updateSessionMutation.mutate({
      currentSession: {
        ...sessionData.currentSession,
        lastActivity: new Date().toISOString()
      }
    });
  };

  return {
    sessionData,
    isLoading,
    isError,
    error,
    updatePreferences,
    recordActivity,
    isUpdating: updateSessionMutation.isPending
  };
}
