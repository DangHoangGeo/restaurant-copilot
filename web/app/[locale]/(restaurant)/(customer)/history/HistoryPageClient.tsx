'use client';

import { useEffect, useState } from 'react';
import {  useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, MapPin, Receipt, ArrowLeft, Share2, Copy, Printer } from 'lucide-react';
import { useCustomerData } from '@/components/features/customer/layout/CustomerDataContext';
import { QRCodeDialog } from '@/components/features/customer/QRCodeDialog';
import type { OrderHistoryResponse, OrderItem, OrderStatus, Topping } from './types';

interface HistoryPageClientProps {
  locale: string;
}

export function HistoryPageClient({ locale }: HistoryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurantSettings, sessionData, isLoading: contextLoading } = useCustomerData();
  const t = useTranslations('customer.orderHistory');
  
  const [historyData, setHistoryData] = useState<OrderHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Get sessionId from URL params or context
  const sessionId = searchParams.get('sessionId') || sessionData.sessionId;

  useEffect(() => {
    const fetchOrderHistory = async () => {
      // Wait for context to finish loading before checking for missing data
      if (contextLoading) {
        return;
      }

      if (!sessionId) {
        setError('Session information not found');
        setIsLoading(false);
        return;
      }

      if (!restaurantSettings?.id) {
        setError('Restaurant information not found');
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
  }, [sessionId, restaurantSettings?.id, contextLoading]);

  // Helper function to get passcode from orderId
  const getPasscode = () => {
    if (historyData?.order?.id) {
      return historyData.order.id.slice(-4);
    }
    return sessionId?.slice(-8) || '';
  };

  const copyPasscode = async () => {
    const passcode = getPasscode();
    if (passcode) {
      try {
        await navigator.clipboard.writeText(passcode);
        // Could add toast notification here in the future
      } catch (err) {
        console.error('Failed to copy passcode:', err);
      }
    }
  };

  const handlePrintReceipt = async () => {
    if (!historyData?.order) return;
    
    setIsPrinting(true);
    try {
      // Create a print-friendly version of the receipt
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${t('receipt_title', { orderId: historyData.order.id.slice(-8) })}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; }
            .order-info { margin-bottom: 20px; }
            .items { margin-bottom: 20px; }
            .item { margin-bottom: 6px; padding: 4px 0; border-bottom: 1px solid #eee; }
            .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
            .item-name { font-weight: bold; }
            .item-price { font-weight: bold; }
            .item-details { font-size: 0.9em; color: #666; margin: 2px 0; }
            .quantity-size { display: flex; align-items: center; gap: 8px; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; border-top: 2px solid #333; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurantSettings?.name || 'Restaurant'}</h1>
            <p>${restaurantSettings?.address || 'Address not available'}</p>
            <p>${restaurantSettings?.phone || 'Phone not available'}</p>
            <p>${t('receipt_title', { orderId: historyData.order.id.slice(-8) })}</p>
          </div>
          <div class="order-info">
            <p><strong>${t('table')}</strong> ${historyData.order.table_name}</p>
            <p><strong>${t('date')}</strong> ${formatDate(historyData.order.created_at)} ${formatTime(historyData.order.created_at)}</p>
          </div>
          <div class="items">
            <h3>${t('items')}</h3>
            ${(historyData.order.items || []).map(item => {
              const sizeName = getSizeName(item);
              const quantityDisplay = sizeName ? `× ${item.quantity} (${sizeName})` : `× ${item.quantity}`;
              
              return `
                <div class="item">
                  <div class="item-header">
                    <div class="item-name">${getMenuItemName(item)}</div>
                    <div class="item-price">¥${item.total || (item.price_at_order || item.unit_price) * item.quantity}</div>
                  </div>
                  <div class="quantity-size">
                    <span>${quantityDisplay}</span>
                  </div>
                  ${item.toppings && item.toppings.length > 0 ? `
                    <div class="item-details">${t('toppings')}: ${item.toppings.map(getToppingName).join(', ')}</div>
                  ` : ''}
                  ${item.notes ? `
                    <div class="item-details">${t('notes')}: ${item.notes}</div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
          <div class="total">
            <div style="margin-bottom: 8px;">
              <span>${t('subtotal')}: ¥${Math.round((historyData.order.total_amount || 0) / 1.1)}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span>${t('tax')} (10%): ¥${Math.round((historyData.order.total_amount || 0) * 0.1 / 1.1)}</span>
            </div>
            <div style="border-top: 1px solid #333; padding-top: 8px; font-size: 20px;">
              <span>${t('total')}: ¥${historyData.order.total_amount}</span>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (err) {
      console.error('Failed to print receipt:', err);
    } finally {
      setIsPrinting(false);
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

  if (isLoading || contextLoading) {
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
              {t('error_title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || t('error_message')}
            </p>
            <Button onClick={() => {
              // Only include sessionId if the session is still active (not completed)
              // When in error state, check session status from context instead of historyData
              const menuUrl = new URLSearchParams();
              // Only include sessionId if the session is still active (not completed)
              console.log('sessionData:', sessionData);
              if (sessionId && sessionData.sessionStatus === 'active') {
                menuUrl.set('sessionId', sessionId);
              }
              router.push(`/${locale}/menu?${menuUrl.toString()}`);
            }}>
              {t('back_to_menu')}
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
              // Only include sessionId if the session is still active (not completed)
              console.log('sessionData:', sessionData);
              if (sessionId && sessionData.sessionStatus === 'active') {
                menuUrl.set('sessionId', sessionId);
              }
              router.push(`/${locale}/menu?${menuUrl.toString()}`);
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back_to_menu')}
          </Button>
        </div>
        
        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRDialog(true)}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {t('share_session')}
          </Button>

          {historyData?.order?.status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintReceipt}
              disabled={isPrinting}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? t('printing_receipt') : t('print_receipt')}
            </Button>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {/* Session Information */}
      {historyData.order && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {historyData.order.status === 'completed' 
                  ? `${t('order')} #${historyData.order.id.slice(-6)}`
                  : t('current_session')
                }
              </CardTitle>
              {/* Show order status in header */}
              <Badge className={getStatusColor(historyData.order.status as OrderStatus)}>
                {t(`status.${historyData.order.status}`)}
              </Badge>
            </div>
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
                  <span>{t('guests', { count: historyData.order?.guest_count || 1 })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{t('started_at', { 
                    date: formatDate(historyData.order?.created_at || new Date().toISOString()),
                    time: formatTime(historyData.order?.created_at || new Date().toISOString())
                  })}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{t('passcode')}</p>
                    <p className="font-mono font-bold text-lg">{getPasscode()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPasscode}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {t('copy_passcode')}
                  </Button>
                </div>

                {/* Financial Breakdown */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('subtotal')}</span>
                    <span>¥{Math.round((historyData.order?.total_amount || 0) / 1.1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('tax')} (10%)</span>
                    <span>¥{Math.round((historyData.order?.total_amount || 0) * 0.1 / 1.1)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>{t('total')}</span>
                    <span>¥{historyData.order?.total_amount || 0}</span>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    {historyData.order?.items?.length || 0} {t('items_count')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t('your_order')}</h2>

        {!historyData.order ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                <p>{t('no_orders')}</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    const menuUrl = new URLSearchParams();
                    // Only include sessionId if the session is still active (not completed)
                    if (sessionId && sessionData.sessionStatus === 'active') {
                      menuUrl.set('sessionId', sessionId);
                    }
                    router.push(`/${locale}/menu?${menuUrl.toString()}`);
                  }}
                >
                  {t('start_ordering')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {(historyData.order.items || []).map((item, index) => (
                    <div key={item.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{getMenuItemName(item)}</h4>
                          
                          {/* Size and Toppings */}
                          {(item.menu_item_sizes || (item.toppings && item.toppings.length > 0)) && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {item.menu_item_sizes && (
                                <p>{t('size')}: {getSizeName(item)}</p>
                              )}
                              {item.toppings && item.toppings.length > 0 && (
                                <p>{t('toppings')}: {item.toppings.map(getToppingName).join(', ')}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Notes */}
                          {item.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {t('notes')}: {item.notes}
                            </p>
                          )}
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
      {historyData?.order?.status !== 'completed' && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              const menuUrl = new URLSearchParams();
              // Only include sessionId if the session is still active (not completed)
              if (sessionId && sessionData.sessionStatus === 'active') {
                menuUrl.set('sessionId', sessionId);
              }
              router.push(`/${locale}/menu?${menuUrl.toString()}`);
            }}
            className="flex items-center gap-2"
          >
            {t('add_more_items')}
          </Button>
        </div>
      )}

      {/* QR Code Dialog */}
      {sessionId && (
        <QRCodeDialog
          isOpen={showQRDialog}
          onClose={() => setShowQRDialog(false)}
          sessionId={sessionId}
          restaurantSubdomain={restaurantSettings?.subdomain || 'restaurant'}
        />
      )}
    </div>
  );
}
