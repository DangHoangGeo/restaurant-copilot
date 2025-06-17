'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, MapPin, Receipt, ArrowLeft, Share2, Copy } from 'lucide-react';
import { useCustomerData } from '@/components/features/customer/layout/CustomerDataContext';
import type { OrderHistoryResponse, OrderItem, OrderStatus, OrderItemStatus, Topping } from './types';

interface HistoryPageClientProps {
  locale: string;
}

export function HistoryPageClient({ locale }: HistoryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurantSettings, sessionData } = useCustomerData();
  const t = useTranslations('Customer');
  
  const [historyData, setHistoryData] = useState<OrderHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get sessionId from URL params or context
  const sessionId = searchParams.get('sessionId') || sessionData.sessionId;

  useEffect(() => {
    const fetchOrderHistory = async () => {
      if (!sessionId || !restaurantSettings?.id) {
        setError('Session or restaurant information not found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams({ sessionId });
        params.append('restaurantId', restaurantSettings.id);

        const response = await fetch(
          `/api/v1/customer/orders/session-info?${params.toString()}`
        );
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch order history');
        }

        if (data.success) {
          setHistoryData(data);
        } else {
          throw new Error(data.error || 'Failed to load order history');
        }
      } catch (err) {
        console.error('Error fetching order history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderHistory();
  }, [sessionId, restaurantSettings?.id]);

  const copyPasscode = async () => {
    // Since the session-info API doesn't return session details,
    // we'll copy the sessionId instead
    if (sessionId) {
      try {
        await navigator.clipboard.writeText(sessionId);
        setTimeout(() => {}, 2000); // placeholder for future implementation
      } catch (err) {
        console.error('Failed to copy session ID:', err);
      }
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'preparing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'canceled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getItemStatusColor = (status: OrderItemStatus): string => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'preparing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'served': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getMenuItemName = (item: OrderItem) => {
    switch (locale) {
      case 'ja': return item.name_ja || item.name_en;
      case 'vi': return item.name_vi || item.name_en;
      default: return item.name_en;
    }
  };

  const getSizeName = (item: OrderItem) => {
    if (!item.menu_item_sizes) return null;
    
    switch (locale) {
      case 'ja': return item.menu_item_sizes.name_ja || item.menu_item_sizes.name_en;
      case 'vi': return item.menu_item_sizes.name_vi || item.menu_item_sizes.name_en;
      default: return item.menu_item_sizes.name_en;
    }
  };

  const getToppingName = (topping: Topping) => {
    switch (locale) {
      case 'ja': return topping.name_ja || topping.name_en;
      case 'vi': return topping.name_vi || topping.name_en;
      default: return topping.name_en;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              {t('history.error_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || t('history.error_message')}
            </p>
            <Button onClick={() => {
              const menuUrl = new URLSearchParams();
              if (sessionId) menuUrl.set('sessionId', sessionId);
              router.push(`/${locale}/menu?${menuUrl.toString()}`);
            }}>
              {t('history.back_to_menu')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const menuUrl = new URLSearchParams();
              if (sessionId) menuUrl.set('sessionId', sessionId);
              router.push(`/${locale}/menu?${menuUrl.toString()}`);
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('history.back_to_menu')}
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">{t('history.title')}</h1>

      {/* Session Information */}
      {historyData.order && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t('history.current_session')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {historyData.order?.table_name || 'Unknown Table'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{t('history.guests', { count: historyData.order?.guest_count || 1 })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{t('history.started_at', { 
                    date: formatDate(historyData.order?.created_at || new Date().toISOString()),
                    time: formatTime(historyData.order?.created_at || new Date().toISOString())
                  })}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{t('history.session_id')}</p>
                    <p className="font-mono font-bold text-lg">{sessionId}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPasscode}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {t('history.copy')}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('history.session_total')}</p>
                    <p className="font-bold text-lg">
                      ¥{historyData.order?.total_amount || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('history.total_items')}</p>
                    <p className="font-semibold">
                      {historyData.order?.items?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('history.orders_title')}</h2>

        {!historyData.order ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                <p>{t('history.no_orders')}</p>
                <Button 
                  className="mt-4"
                  onClick={() => router.push(`/${locale}/menu${sessionId ? `?sessionId=${sessionId}` : ''}`)}
                >
                  {t('history.start_ordering')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
            <Card key={historyData.order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {t('history.order_title', { 
                      time: formatTime(historyData.order.created_at),
                      date: formatDate(historyData.order.created_at)
                    })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(historyData.order.status as OrderStatus)}>
                      {t(`history.status.${historyData.order.status}`)}
                    </Badge>
                    <span className="font-semibold">¥{historyData.order.total_amount}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(historyData.order.items || []).map((item, index) => (
                    <div key={item.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium">{getMenuItemName(item)}</h4>
                              
                              {/* Size and Toppings */}
                              {(item.menu_item_sizes || (item.toppings && item.toppings.length > 0)) && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {item.menu_item_sizes && (
                                    <p>{t('history.size')}: {getSizeName(item)}</p>
                                  )}
                                  {item.toppings && item.toppings.length > 0 && (
                                    <p>{t('history.toppings')}: {item.toppings.map(getToppingName).join(', ')}</p>
                                  )}
                                </div>
                              )}
                              
                              {/* Notes */}
                              {item.notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {t('history.notes')}: {item.notes}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={getItemStatusColor(item.status as OrderItemStatus)}>
                                  {t(`history.item_status.${item.status}`)}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {formatTime(item.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">×{item.quantity}</p>
                          <p className="text-sm font-semibold">¥{item.total || (item.price_at_order || item.unit_price) * item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/menu${sessionId ? `?sessionId=${sessionId}` : ''}`)}
          className="flex items-center gap-2"
        >
          {t('history.add_more_items')}
        </Button>
        
        <Button
          variant="outline"
          onClick={copyPasscode}
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          {t('history.share_session')}
        </Button>
      </div>
    </div>
  );
}
