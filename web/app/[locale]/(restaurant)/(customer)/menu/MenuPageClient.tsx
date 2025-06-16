'use client';

import { EnhancedSmartMenu } from '@/components/features/customer/menu/EnhancedSmartMenu';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { ViewType, ViewProps } from '@/components/features/customer/screens/types';

interface MenuPageClientProps {
  locale: string;
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
}

export function MenuPageClient({
  locale,
  tableId,
  sessionId,
  tableNumber
}: MenuPageClientProps) {
  const router = useRouter();

  // Get restaurant subdomain from hostname
  const restaurantId = typeof window !== 'undefined' 
    ? window.location.hostname.split('.')[0] || 'default'
    : 'default';

  // Handle navigation between views
  const handleSetView = useCallback((view: ViewType, props?: ViewProps) => {
    switch (view) {
      case 'checkout':
        router.push(`/cart?${new URLSearchParams({
          ...(tableId && { tableId }),
          ...(sessionId && { sessionId }),
          ...(tableNumber && { tableNumber })
        }).toString()}`);
        break;
      
      case 'menuitemdetail':
        if (props && 'item' in props && props.item) {
          router.push(`/menu/${props.item.id}?${new URLSearchParams({
            ...(tableId && { tableId }),
            ...(sessionId && { sessionId }),
            ...(tableNumber && { tableNumber })
          }).toString()}`);
        }
        break;
      
      case 'review':
        if (props && 'orderId' in props && props.orderId) {
          router.push(`/order/${props.orderId}?${new URLSearchParams({
            ...(tableId && { tableId }),
            ...(sessionId && { sessionId }),
            ...(tableNumber && { tableNumber })
          }).toString()}`);
        }
        break;
      
      case 'history':
        if (props && 'sessionId' in props && props.sessionId) {
          router.push(`/history?${new URLSearchParams({
            sessionId: props.sessionId,
            ...(tableId && { tableId }),
            ...(tableNumber && { tableNumber })
          }).toString()}`);
        }
        break;
      
      default:
        console.log('Navigation to view:', view, props);
        break;
    }
  }, [router, tableId, sessionId, tableNumber]);

  return (
    <EnhancedSmartMenu
      locale={locale}
      brandColor="#3b82f6" // Default brand color, can be customized
      canAddItems={true}
      setView={handleSetView}
      tableId={tableId}
      sessionId={sessionId}
      tableNumber={tableNumber}
      restaurantName="Our Restaurant"
      restaurantId={restaurantId}
      searchPlaceholder="Search our delicious menu..."
    />
  );
}
