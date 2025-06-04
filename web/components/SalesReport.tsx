"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector // Added Sector for active pie chart shape
} from 'recharts';
import type { DailySale, CategorySale } from '../app/[locale]/dashboard/reports/page'; // Import types

interface SalesReportProps {
  initialDailySales: DailySale[];
  initialCategorySales: CategorySale[];
  restaurantId: string; // For potential future client-side fetching
  locale: string; // For formatting
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC0CB', '#A52A2A'];

// Helper for currency formatting (basic example, could be imported from a shared util)
const formatCurrencyForChart = (amount: number, locale: string) => {
  let currency = 'USD';
  if (locale === 'ja') currency = 'JPY';
  else if (locale === 'vi') currency = 'VND';
  // For charts, sometimes just the number is fine, or a very short currency symbol.
  // This is a simplified version.
  return amount; // Recharts handles number formatting well, or use a formatter prop on YAxis.
};

// Helper to format date for XAxis (e.g., "MMM dd" or "dd/MM")
const formatDateForXAxis = (dateString: string, locale: string) => {
  const date = new Date(dateString + 'T00:00:00'); // Ensure date is parsed as local, not UTC, by adding time
  // Basic example, Intl.DateTimeFormat is more robust
  if (locale === 'ja') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

// Custom active shape for Pie chart (optional, for better interaction)
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontWeight="bold">
        {payload.category_name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector // Outer ring for emphasis
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`Sales: ${value.toLocaleString()}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate: ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


export default function SalesReport({
  initialDailySales,
  initialCategorySales,
  restaurantId, // Available for client-side fetching if implemented
  locale,
}: SalesReportProps) {
  const [currentRange, setCurrentRange] = useState<'7days' | '30days'>('7days');
  // For this subtask, we use initial data. Real refetching would update these states.
  const [displayDailySales, setDisplayDailySales] = useState<DailySale[]>(initialDailySales);
  const [displayCategorySales, setDisplayCategorySales] = useState<CategorySale[]>(initialCategorySales);
  const [activePieIndex, setActivePieIndex] = useState<number>(0);


  // Memoize chart data to prevent re-computation on every render unless dependencies change
  const processedDailySales = useMemo(() =>
    displayDailySales.map(item => ({
      ...item,
      // Ensure date is just the date part for consistent grouping if timezones were an issue
      date: item.date.split('T')[0],
      // Formatted date for display on XAxis
      formattedDate: formatDateForXAxis(item.date, locale),
    })), [displayDailySales, locale]);

  const processedCategorySales = useMemo(() =>
    displayCategorySales.map((item, index) => ({
      ...item,
      name: item.category_name, // Recharts Pie typically uses 'name' and 'value'
      value: item.total_sales,
      fill: COLORS[index % COLORS.length], // Assign color
    })), [displayCategorySales]);


  const handleRangeChange = async (range: '7days' | '30days') => {
    setCurrentRange(range);
    console.log(`Range changed to: ${range}. Restaurant ID: ${restaurantId}`);
    // **Placeholder for data refetching logic**
    // In a full implementation, you would make an API call here:
    // e.g., const newData = await fetchSalesData(restaurantId, range);
    // setDisplayDailySales(newData.dailySales);
    // setDisplayCategorySales(newData.categorySales);
    // For now, if range changes from default, we'll show a message or clear data.
    if (range !== '7days') { // Assuming '7days' is the initial default
      // setDisplayDailySales([]); // Option: Clear or show placeholder
      // setDisplayCategorySales([]);
      console.warn("Displaying initial 7-day data. Refetch logic for other ranges is not implemented in this subtask.");
      // To simulate, you might revert to initial if you had fetched both, or show nothing.
      // For now, we just log. The current data will remain displayed.
    } else {
        setDisplayDailySales(initialDailySales); // Revert to initial if "7days" is re-selected
        setDisplayCategorySales(initialCategorySales);
    }
  };

  const onPieEnter = (_: any, index: number) => {
    setActivePieIndex(index);
  };

  const exportToCSV = () => {
    if (displayDailySales.length === 0) {
      alert("No daily sales data to export.");
      return;
    }
    const headers = ["Date", "Total Sales"];
    const rows = displayDailySales.map(item => [item.date, item.total_sales].join(','));
    const csvString = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `daily_sales_${currentRange}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const chartCardClass = "bg-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => handleRangeChange('7days')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${currentRange === '7days' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handleRangeChange('30days')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${currentRange === '30days' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Last 30 Days
          </button>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 border border-indigo-300"
        >
          Export Daily Sales (CSV)
        </button>
      </div>

      {/* Daily Sales Bar Chart */}
      <div className={chartCardClass}>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Sales ({currentRange === '7days' ? 'Last 7 Days' : 'Last 30 Days'})</h3>
        {processedDailySales.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={processedDailySales} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="formattedDate" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrencyForChart(value, locale).toLocaleString()} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), "Total Sales"]}
                labelStyle={{ color: '#333' }}
                itemStyle={{ color: '#0088FE' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Bar dataKey="total_sales" fill="#3B82F6" name="Total Sales" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-10">No daily sales data available for this period.</p>
        )}
      </div>

      {/* Category Sales Pie Chart */}
      <div className={chartCardClass}>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Sales by Category ({currentRange === '7days' ? 'Last 7 Days' : 'Last 30 Days'})</h3>
        {processedCategorySales.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                activeIndex={activePieIndex}
                activeShape={renderActiveShape}
                data={processedCategorySales}
                cx="50%"
                cy="50%"
                innerRadius={80} // Makes it a donut chart
                outerRadius={120}
                fill="#8884d8" // Default fill, overridden by Cell
                dataKey="value"
                onMouseEnter={onPieEnter}
                paddingAngle={2}
              >
                {processedCategorySales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
              <Tooltip formatter={(value: number, name: string) => [value.toLocaleString(), name]} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-10">No category sales data available for this period.</p>
        )}
      </div>
    </div>
  );
}
