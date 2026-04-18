"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, DollarSign, TrendingUp, List } from "lucide-react";
import { useTranslations } from "next-intl";

interface OrdersStatsHeaderProps {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export function OrdersStatsHeader({
  totalOrders,
  totalRevenue,
  avgOrderValue
}: OrdersStatsHeaderProps) {
  const t = useTranslations("owner.orders");

  // Calculate pending orders count for staff perspective
  const pendingCount = totalOrders; // This could be refined to show only new/serving orders

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4">
      {/* Mobile: Show 2 key stats in one row */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center">
            <ShoppingCart className="h-4 w-4 sm:h-8 sm:w-8 text-blue-600" />
            <div className="ml-2 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('totalOrders')}</p>
              <p className="text-sm sm:text-2xl font-bold">{totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center">
            <List className="h-4 w-4 sm:h-8 sm:w-8 text-orange-600" />
            <div className="ml-2 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">{t('pendingOrders')}</p>
              <p className="text-sm sm:text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Desktop: Show additional stats */}
      <Card className="hidden lg:block">
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
      
      <Card className="hidden lg:block">
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
    </div>
  );
}
