"use client";

import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, PackageOpen, BarChart3 } from 'lucide-react';

interface DashboardCardsProps {
  totalSales: number;
  activeOrdersCount: number;
  topSellerName: string;
  lowStockCount: number;
  locale: string; // For currency formatting
}

// Helper for currency formatting (basic example)
const formatCurrency = (amount: number, locale: string) => {
  // Determine currency based on locale or a fixed currency for the app
  let currency = 'USD'; // Default
  let displayLocale = 'en-US'; // Default

  if (locale === 'ja') {
    currency = 'JPY';
    displayLocale = 'ja-JP';
  } else if (locale === 'vi') {
    currency = 'VND';
    displayLocale = 'vi-VN';
  }
  // Add more locales and currencies as needed

  try {
    return new Intl.NumberFormat(displayLocale, { style: 'currency', currency: currency }).format(amount);
  } catch (e) {
    console.warn("Currency formatting error for locale:", locale, e);
    // Fallback to simple formatting if Intl fails for some reason
    return `${amount.toFixed(2)} ${currency}`;
  }
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: 'primary' | 'warning' | 'info' | 'success'; // For icon/text color accents
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, color = 'primary' }) => {
  const colorClasses = {
    primary: 'text-indigo-600 bg-indigo-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
    success: 'text-green-600 bg-green-100',
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow duration-300 ease-in-out">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
      {description && <p className="mt-4 text-sm text-gray-600">{description}</p>}
    </div>
  );
};


export default function DashboardCards({
  totalSales,
  activeOrdersCount,
  topSellerName,
  lowStockCount,
  locale,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Today's Total Sales"
        value={formatCurrency(totalSales, locale)}
        icon={<DollarSign size={28} />}
        description="Sum of all completed orders today."
        color="success"
      />
      <StatCard
        title="Active Orders"
        value={activeOrdersCount}
        icon={<ShoppingCart size={28} />}
        description="Orders currently pending or in progress."
        color="info"
      />
      <StatCard
        title="Top Selling Item Today"
        value={topSellerName}
        icon={<TrendingUp size={28} />}
        description={topSellerName === "N/A" ? "No sales data or item name missing." : `Most popular item based on today's sales.`}
        color="primary"
      />
      <StatCard
        title="Low Stock Alerts"
        value={lowStockCount}
        icon={<AlertTriangle size={28} />}
        description="Items needing re-stocking soon."
        color={lowStockCount > 0 ? 'warning' : 'primary'}
      />
    </div>
  );
}
