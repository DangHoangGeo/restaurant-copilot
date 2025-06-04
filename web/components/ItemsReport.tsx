"use client";

import React, { useState, useMemo } from 'react';
import type { ItemsReportDataItem } from '../app/[locale]/dashboard/reports/page'; // Import type
import { ChevronUp, ChevronDown, ChevronsUpDown, FileDown } from 'lucide-react';

interface ItemsReportProps {
  itemsData: ItemsReportDataItem[];
  locale: string;
}

type SortableKeys = 'localizedName' | 'total_sold' | 'total_revenue' | 'avg_rating';

interface SortConfig {
  key: SortableKeys | null;
  direction: 'ascending' | 'descending';
}

// Helper function to get localized item name
const getLocalizedItemName = (item: ItemsReportDataItem, currentLocale: string): string => {
  if (currentLocale === 'ja' && item.name_ja) return item.name_ja;
  if (currentLocale === 'vi' && item.name_vi) return item.name_vi;
  if (item.name_en) return item.name_en; // Default to English
  return `Item ID: ${item.item_id}`; // Fallback if no name is available
};

// Helper for currency formatting (can be shared)
const formatCurrency = (amount: number | null | undefined, locale: string): string => {
  if (amount === null || amount === undefined) return 'N/A';
  let currency = 'USD';
  let displayLocale = 'en-US';
  if (locale === 'ja') { currency = 'JPY'; displayLocale = 'ja-JP'; }
  else if (locale === 'vi') { currency = 'VND'; displayLocale = 'vi-VN'; }

  try {
    return new Intl.NumberFormat(displayLocale, { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  } catch (e) {
    return `${amount.toFixed(0)} ${currency}`;
  }
};

export default function ItemsReport({ itemsData, locale }: ItemsReportProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'total_revenue', direction: 'descending' });

  const processedItems = useMemo(() => {
    return itemsData.map(item => ({
      ...item,
      localizedName: getLocalizedItemName(item, locale),
    }));
  }, [itemsData, locale]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...processedItems];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];

        // Handle null or undefined for avg_rating, pushing them to the bottom
        if (sortConfig.key === 'avg_rating') {
            valA = valA === null || valA === undefined ? -Infinity : valA;
            valB = valB === null || valB === undefined ? -Infinity : valB;
        }


        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [processedItems, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableKeys) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown size={16} className="ml-1 opacity-40" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ChevronUp size={16} className="ml-1" />;
    }
    return <ChevronDown size={16} className="ml-1" />;
  };

  const exportToCSV = () => {
    if (sortedItems.length === 0) {
      alert("No data to export.");
      return;
    }
    const headers = ["Item Name", "Total Sold", "Total Revenue", "Average Rating"];
    const rows = sortedItems.map(item =>
      [
        `"${item.localizedName.replace(/"/g, '""')}"`, // Handle quotes in name
        item.total_sold,
        item.total_revenue,
        item.avg_rating !== null && item.avg_rating !== undefined ? item.avg_rating.toFixed(2) : 'N/A'
      ].join(',')
    );
    const csvString = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `items_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const thClass = "px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200";
  const tdClass = "px-5 py-4 border-b border-gray-200 bg-white text-sm";

  if (!itemsData || itemsData.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 bg-white rounded-lg shadow">
        No item performance data available.
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex justify-end mb-4">
        <button
          onClick={exportToCSV}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 border border-indigo-300 flex items-center"
        >
          <FileDown size={18} className="mr-2" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className={thClass} onClick={() => requestSort('localizedName')}>
                <div className="flex items-center">Item Name {getSortIcon('localizedName')}</div>
              </th>
              <th className={thClass} onClick={() => requestSort('total_sold')}>
                <div className="flex items-center">Total Sold {getSortIcon('total_sold')}</div>
              </th>
              <th className={thClass} onClick={() => requestSort('total_revenue')}>
                <div className="flex items-center">Total Revenue {getSortIcon('total_revenue')}</div>
              </th>
              <th className={thClass} onClick={() => requestSort('avg_rating')}>
                <div className="flex items-center">Avg. Rating {getSortIcon('avg_rating')}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.item_id} className="hover:bg-gray-50">
                <td className={tdClass}>
                  <p className="text-gray-900 whitespace-no-wrap">{item.localizedName}</p>
                </td>
                <td className={tdClass}>
                  <p className="text-gray-900 whitespace-no-wrap text-center">{item.total_sold.toLocaleString()}</p>
                </td>
                <td className={tdClass}>
                  <p className="text-gray-900 whitespace-no-wrap text-right">{formatCurrency(item.total_revenue, locale)}</p>
                </td>
                <td className={tdClass}>
                  <p className="text-gray-900 whitespace-no-wrap text-center">
                    {item.avg_rating !== null && item.avg_rating !== undefined ? item.avg_rating.toFixed(2) : 'N/A'}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
