'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useParams } from 'next/navigation';

// Define a type for your order data structure
export interface RecentOrder {
  id: string;
  customerName?: string; // Or table name
  itemsCount: number;
  totalAmount: number;
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'canceled';
  createdAt: Date;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
  isLoading?: boolean;
}

export function RecentOrdersTable({ orders, isLoading = false }: RecentOrdersTableProps) {
  const t = useTranslations('owner.dashboard');
  const tCommon = useTranslations('common');
  const { locale = 'en' } = useParams();

  const getStatusBadgeVariant = (status: RecentOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'new': return 'default'; // Or 'outline' with primary color
      case 'preparing': return 'secondary';
      case 'ready': return 'default'; // Greenish, shadcn default can be customized
      case 'completed': return 'outline';
      case 'canceled': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('recent_orders.no_recent_orders')}</p>
        </CardContent>
      </Card>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' });
  const currencyFormatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'JPY' });

  return (
    <Card className="lg:col-span-2 py-4">
      <CardHeader>
        <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <ScrollArea className="h-[300px] w-full">
            <Table className="min-w-[280px] sm:min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%] min-w-[120px] sm:min-w-[150px]">{t('recent_orders.table_header_order')}</TableHead>
                  <TableHead className="w-[15%] min-w-[60px] sm:min-w-[80px] hidden sm:table-cell">{t('recent_orders.table_header_items')}</TableHead>
                  <TableHead className="w-[25%] text-right min-w-[70px] sm:min-w-[100px]">{t('recent_orders.table_header_total')}</TableHead>
                  <TableHead className="w-[25%] min-w-[90px] sm:min-w-[100px]">{t('recent_orders.table_header_status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  // Extract table name and order code from customerName
                  const getDisplayInfo = () => {
                    const customerName = order.customerName || '';
                    
                    
                    return { 
                      tableName: customerName || `Table ${order.id.substring(0, 6)}`, 
                      orderCode: order.id.substring(0, 6) 
                    };
                  };

                  const { tableName, orderCode } = getDisplayInfo();

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="w-[35%] min-w-[120px] sm:min-w-[150px] pr-2">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <span className="font-medium text-sm truncate">{tableName}</span>
                            <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">#{orderCode}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span>{dateFormatter.format(new Date(order.createdAt))}</span>
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            <span>{order.itemsCount} items</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[15%] min-w-[60px] sm:min-w-[80px] hidden sm:table-cell text-center">{order.itemsCount}</TableCell>
                      <TableCell className="w-[25%] text-right min-w-[70px] sm:min-w-[100px] pr-2">
                        <div className="text-sm font-medium">
                          {currencyFormatter.format(order.totalAmount)}
                        </div>
                      </TableCell>
                      <TableCell className="w-[25%] min-w-[90px] sm:min-w-[100px]">
                        <Badge 
                          variant={getStatusBadgeVariant(order.status)} 
                          className="capitalize text-xs px-2 py-1 whitespace-nowrap"
                        >
                          {tCommon(`order_status.${order.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
