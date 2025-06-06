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
  const t = useTranslations('AdminDashboard');
  const tCommon = useTranslations('Common');
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
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">{t('recent_orders.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('recent_orders.table_header_order')}</TableHead>
                <TableHead>{t('recent_orders.table_header_items')}</TableHead>
                <TableHead className="text-right">{t('recent_orders.table_header_total')}</TableHead>
                <TableHead>{t('recent_orders.table_header_status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.customerName || `Order #${order.id.substring(0, 6)}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(order.createdAt))}
                    </div>
                  </TableCell>
                  <TableCell>{order.itemsCount}</TableCell>
                  <TableCell className="text-right">
                    {currencyFormatter.format(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                      {tCommon(`order_status.${order.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
