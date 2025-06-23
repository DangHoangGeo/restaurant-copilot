"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, DollarSign, TrendingUp, List } from "lucide-react";
import { useTranslations } from "next-intl";

interface OrdersStatsHeaderProps {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalItems: number;
}

export function OrdersStatsHeader({
  totalOrders,
  totalRevenue,
  avgOrderValue,
  totalItems
}: OrdersStatsHeaderProps) {
  const t = useTranslations("owner.orders");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('totalOrders')}</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('totalRevenue')}</p>
              <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('avgOrderValue')}</p>
              <p className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <List className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('totalItems')}</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
