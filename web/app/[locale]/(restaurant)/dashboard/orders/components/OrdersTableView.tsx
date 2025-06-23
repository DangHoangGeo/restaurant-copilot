"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Order } from "../types";

interface OrdersTableViewProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  locale: string;
}

export function OrdersTableView({ 
  orders, 
  onOrderClick, 
  getStatusBadgeVariant,
  locale 
}: OrdersTableViewProps) {
  const t = useTranslations("owner.orders");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('orders')} ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table')}</TableHead>
                <TableHead>{t('orderTime')}</TableHead>
                <TableHead>{t('items')}</TableHead>
                <TableHead>{t('totalAmount')}</TableHead>
                <TableHead>{t('orderStatus')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.tables?.name || 'No Table'}</TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleTimeString(locale)}
                  </TableCell>
                  <TableCell>{order.order_items.length} items</TableCell>
                  <TableCell>
                    {order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {t(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOrderClick(order.id)}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      {t('viewDetails')}
                    </Button>
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
