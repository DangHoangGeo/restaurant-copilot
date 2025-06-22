"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChefHat, Clock, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Order, OrderItem } from "../types";

interface OrdersListViewProps {
  orders: Order[];
  onItemStatusUpdate: (itemId: string, newStatus: string) => Promise<void>;
  getItemStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  locale: string;
}

export function OrdersListView({ 
  orders, 
  onItemStatusUpdate, 
  getItemStatusBadgeVariant,
  locale 
}: OrdersListViewProps) {
  const t = useTranslations("owner.orders");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('orderItems')} ({orders.reduce((sum, order) => sum + order.order_items.length, 0)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table')}</TableHead>
                <TableHead>{t('orderTime')}</TableHead>
                <TableHead>{t('itemName')}</TableHead>
                <TableHead>{t('size')}</TableHead>
                <TableHead>{t('toppings')}</TableHead>
                <TableHead>{t('quantity')}</TableHead>
                <TableHead>{t('notes')}</TableHead>
                <TableHead>{t('itemStatus')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.flatMap(order =>
                order.order_items.map((item: OrderItem) => (
                  <TableRow key={`${order.id}-${item.id}`}>
                    <TableCell>{order.tables?.name || 'No Table'}</TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleTimeString(locale)}
                    </TableCell>
                    <TableCell>
                      {/* Use the new menu_item structure from RPC function */}
                      {item.menu_item ? (
                        locale === 'en' ? item.menu_item.name_en :
                        locale === 'ja' ? item.menu_item.name_ja :
                        locale === 'vi' ? item.menu_item.name_vi :
                        item.menu_item.name_en
                      ) : (
                        /* Fallback to legacy structure */
                        locale === 'en' ? item.menu_items?.name_en :
                        locale === 'ja' ? item.menu_items?.name_ja :
                        locale === 'vi' ? item.menu_items?.name_vi :
                        item.menu_items?.name_en || 'Unknown Item'
                      )}
                    </TableCell>
                    <TableCell>
                      {item.menu_item_sizes ? (
                        locale === 'en' ? item.menu_item_sizes.name_en :
                        locale === 'ja' ? item.menu_item_sizes.name_ja :
                        locale === 'vi' ? item.menu_item_sizes.name_vi :
                        item.menu_item_sizes.name_en
                      ) : '-'}
                    </TableCell>
                    <TableCell className="max-w-32">
                      {item.toppings && item.toppings.length > 0 ? (
                        <div className="text-sm space-y-1">
                          {item.toppings.map((topping) => (
                            <div key={topping.id} className="flex items-center justify-between">
                              <span className="text-xs">
                                {locale === 'en' ? topping.name_en :
                                 locale === 'ja' ? topping.name_ja :
                                 locale === 'vi' ? topping.name_vi :
                                 topping.name_en}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="max-w-32 truncate">
                      {item.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getItemStatusBadgeVariant(item.status)}>
                        {t(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {item.status === "ordered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onItemStatusUpdate(item.id, "preparing")}
                          >
                            <ChefHat className="h-3 w-3" />
                          </Button>
                        )}
                        {item.status === "preparing" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onItemStatusUpdate(item.id, "ready")}
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                        )}
                        {item.status === "ready" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onItemStatusUpdate(item.id, "served")}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
