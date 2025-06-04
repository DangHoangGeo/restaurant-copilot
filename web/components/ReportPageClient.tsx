"use client";

import React, { useState } from 'react';
import DashboardCards from './DashboardCards';
import SalesReport from './SalesReport';
import ItemsReport from './ItemsReport'; // New import
import type { ReportPageData } from '../app/[locale]/dashboard/reports/page'; // Import type

interface ReportPageClientProps {
  initialReportData: ReportPageData;
  restaurantId: string;
  locale: string;
}

type TabKey = 'cards' | 'sales' | 'items' | 'feedback_analysis';

// Updated tabConfig to include Items Report
const tabConfig: { key: TabKey, label: string }[] = [
  { key: 'cards', label: 'Dashboard Overview' },
  { key: 'sales', label: 'Sales Reports' },
  { key: 'items', label: 'Menu Item Performance' },
  // { key: 'feedback_analysis', label: 'Customer Feedback' }, // Example for future
];

export default function ReportPageClient({ initialReportData, restaurantId, locale }: ReportPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('cards');

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'cards':
        return (
          <DashboardCards
            totalSales={initialReportData.totalSalesToday}
            activeOrdersCount={initialReportData.activeOrdersCount}
            topSellerName={initialReportData.topSellerNameToday}
            lowStockCount={initialReportData.lowStockCount}
            locale={locale}
          />
        );
      case 'sales':
        return (
          <SalesReport
            initialDailySales={initialReportData.dailySales7Days}
            initialCategorySales={initialReportData.categorySales7Days}
            restaurantId={restaurantId}
            locale={locale}
          />
        );
      case 'items': // New case for Items Report
        return (
          <ItemsReport
            itemsData={initialReportData.itemsReportData}
            locale={locale}
            // restaurantId={restaurantId} // Pass if ItemsReport needs it for client-side actions
          />
        );
      // case 'feedback_analysis':
      //   return <div>Customer Feedback Analysis (Coming Soon)</div>;
      default:
        return <p>Please select a report type.</p>;
    }
  };

  const baseTabClass = "px-4 py-3 font-medium text-sm rounded-t-lg transition-colors duration-150 ease-in-out focus:outline-none";
  const activeTabClass = "bg-indigo-600 text-white shadow-md";
  const inactiveTabClass = "text-gray-600 hover:bg-indigo-100 hover:text-indigo-700";

  return (
    <div>
      <div className="mb-8 border-b border-gray-300">
        <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
          {tabConfig.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${baseTabClass} ${activeTab === tab.key ? activeTabClass : inactiveTabClass}`}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        {tabConfig.find(t => t.key === activeTab)?.label || "Reports"}
      </h1>

      <div>
        {renderActiveTabContent()}
      </div>
    </div>
  );
}
