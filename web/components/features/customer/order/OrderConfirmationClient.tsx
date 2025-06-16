"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingStates } from '@/components/features/customer/common/LoadingStates';
import { 
  CheckCircle, 
  Clock, 
  ChefHat, 
  CheckSquare, 
  XCircle,
  Plus,
  Users,
  Share2,
  Copy,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getLocalizedText } from '@/lib/utils';
import { useLocale } from 'next-intl';

interface OrderItem {
  id: string;
  quantity: number;
  notes: string | null;
  status: string;
  priceAtOrder: number;
  createdAt: string;
  menuItem: {
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    description_en?: string;
    description_ja?: string;
    description_vi?: string;
    price: number;
    imageUrl?: string;
    category: {
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    } | null;
  };
  selectedSize: {
    id: string;
    sizeKey: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  } | null;
  selectedToppings: Array<{
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
    price: number;
  }>;
}

interface OrderDetails {
  id: string;
  sessionId: string;
  status: string;
  totalAmount: number;
  guestCount: number;
  createdAt: string;
  updatedAt: string;
  table: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

interface OrderConfirmationClientProps {
  orderId: string;
}

export function OrderConfirmationClient({ orderId }: OrderConfirmationClientProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  
  const tableId = searchParams.get('tableId');
  const sessionId = searchParams.get('sessionId');
  const tableNumber = searchParams.get('tableNumber');

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/customer/orders/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.order);
        setError(null);
        
        // Start polling if order is still being prepared
        if (data.order.status === 'new' || data.order.status === 'preparing') {
          setIsPolling(true);
        } else {
          setIsPolling(false);
        }
      } else {
        setError(data.error || 'Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initial fetch
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Polling for real-time updates
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      fetchOrderDetails();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [isPolling, fetchOrderDetails]);

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'preparing': return 'secondary';
      case 'ready': return 'outline';
      case 'completed': return 'default';
      case 'canceled': return 'destructive';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4" />;
      case 'preparing': return <ChefHat className="h-4 w-4" />;
      case 'ready': return <CheckSquare className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'canceled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Get status display text
  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'new': return 'Order Received';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'completed': return 'Completed';
      case 'canceled': return 'Canceled';
      default: return status;
    }
  };

  // Handle navigation to menu
  const handleAddMoreItems = () => {
    const menuUrl = new URLSearchParams();
    if (tableId) menuUrl.set('tableId', tableId);
    if (sessionId) menuUrl.set('sessionId', sessionId);
    if (tableNumber) menuUrl.set('tableNumber', tableNumber);
    
    router.push(`/menu?${menuUrl.toString()}`);
  };

  // Handle sharing session passcode
  const handleShareSession = async () => {
    if (!order?.sessionId) return;
    
    const passcode = order.sessionId.substring(0, 4).toUpperCase();
    const shareText = `Join our table! Use passcode: ${passcode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Our Table',
          text: shareText,
        });
      } catch {
        // Fallback to clipboard
        copyPasscode();
      }
    } else {
      copyPasscode();
    }
  };

  const copyPasscode = async () => {
    if (!order?.sessionId) return;
    
    const passcode = order.sessionId.substring(0, 4).toUpperCase();
    
    try {
      await navigator.clipboard.writeText(passcode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-32"></div>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            </CardHeader>
            <CardContent>
              <LoadingStates type="list" count={4} />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <LoadingStates type="list" count={3} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <LoadingStates type="list" count={2} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/menu')} className="bg-primary text-white">
              Return to Menu
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold mb-2">Order Confirmation</h1>
          <p className="text-slate-600">Order #{order.id.substring(0, 8).toUpperCase()}</p>
        </motion.div>

        {/* Order Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  Order Status
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {getStatusDisplayText(order.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    order.status === 'new' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium">Received</p>
                </div>
                <div className="text-center">
                  <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium">Preparing</p>
                </div>
                <div className="text-center">
                  <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    order.status === 'ready' || order.status === 'completed'
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium">Ready</p>
                </div>
              </div>
              {isPolling && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-500">
                    Status updates automatically • Last updated: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => {
                  const itemName = getLocalizedText({
                    name_en: item.menuItem.name_en,
                    name_ja: item.menuItem.name_ja,
                    name_vi: item.menuItem.name_vi
                  }, locale);

                  return (
                    <div key={item.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{itemName}</h4>
                          <div className="text-sm text-slate-600 space-y-1">
                            {item.selectedSize && (
                              <p>Size: {getLocalizedText({
                                name_en: item.selectedSize.name_en,
                                name_ja: item.selectedSize.name_ja,
                                name_vi: item.selectedSize.name_vi
                              }, locale)}</p>
                            )}
                            {item.selectedToppings.length > 0 && (
                              <p>Toppings: {item.selectedToppings.map(topping => 
                                getLocalizedText({
                                  name_en: topping.name_en,
                                  name_ja: topping.name_ja,
                                  name_vi: topping.name_vi
                                }, locale)
                              ).join(', ')}</p>
                            )}
                            {item.notes && (
                              <p className="italic">Note: {item.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold">¥{item.priceAtOrder.toFixed(0)}</p>
                          <p className="text-sm text-slate-600">Qty: {item.quantity}</p>
                          <Badge 
                            variant={getStatusBadgeVariant(item.status)} 
                            className="mt-1"
                          >
                            {getStatusDisplayText(item.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>¥{order.totalAmount.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Session & Table Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Table Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Table:</span>
                  <span className="font-medium">{order.table.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Guests:</span>
                  <span className="font-medium">{order.guestCount} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ordered:</span>
                  <span className="font-medium">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Session Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Share this passcode with others at your table to join the session:
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-100 px-3 py-2 rounded font-bold text-lg flex-1 text-center">
                    {order.sessionId.substring(0, 4).toUpperCase()}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPasscode}
                    className="shrink-0"
                  >
                    {copySuccess ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareSession}
                  className="w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Passcode
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={handleAddMoreItems}
            className="bg-primary text-white hover:bg-primary/90"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More Items
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push('/history')}
            size="lg"
          >
            View Order History
          </Button>
        </motion.div>

        {/* Payment Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Payment Information
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Payment will be processed at the table when your order is complete. 
                  Cash and card payments are accepted.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
