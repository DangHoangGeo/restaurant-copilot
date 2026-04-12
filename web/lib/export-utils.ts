import { format } from 'date-fns';

// Data type definitions for reports
interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
  averageOrderValue: number;
}

interface ItemDataPoint {
  id: string;
  name: string;
  category: string;
  totalSold: number;
  revenue: number;
  avgRating: number;
  reviewCount: number;
  costPerItem: number;
  profitMargin: number | null;
  popularityRank: number;
  lastOrderDate: string;
  imageUrl?: string;
}

interface CategoryDataPoint {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// Types for export data
export interface ExportData {
  [key: string]: string | number | Date;
}

export interface ExportOptions {
  filename?: string;
  title?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// CSV Export functionality
export class CSVExporter {
  static exportToCSV(data: ExportData[], options: ExportOptions = {}) {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const { filename = 'export', title, dateRange } = options;
    
    // Create CSV content
    let csvContent = '';
    
    // Add title and date range if provided
    if (title) {
      csvContent += `${title}\n`;
      if (dateRange) {
        csvContent += `Period: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}\n`;
      }
      csvContent += `Generated: ${format(new Date(), 'PPPp')}\n\n`;
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    csvContent += headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value?.toString() || '';
      });
      csvContent += values.join(',') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

// PDF Export functionality (using jsPDF)
export class PDFExporter {
  static async exportToPDF(data: ExportData[], options: ExportOptions = {}) {
    // Dynamic import to reduce bundle size
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const { filename = 'export', title, dateRange } = options;
    
    const doc = new jsPDF();
    
    // Add title
    if (title) {
      doc.setFontSize(20);
      doc.text(title, 14, 22);
      
      // Add date range
      if (dateRange) {
        doc.setFontSize(12);
        doc.text(
          `Period: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`,
          14,
          32
        );
      }
      
      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'PPPp')}`, 14, 42);
    }
    
    // Prepare table data
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => row[header]?.toString() || ''));
    
    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: title ? 50 : 20,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 20, left: 14, right: 14, bottom: 20 },
    });
    
    // Save the PDF
    doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}

// Utility functions for formatting data for export
export const formatDataForExport = {
  salesData: (data: SalesDataPoint[], currency = 'JPY') => {
    return data.map(item => ({
      Date: format(new Date(item.date), 'yyyy-MM-dd'),
      Sales: new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.sales),
      Orders: item.orders,
      'Average Order Value': new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.averageOrderValue || 0),
    }));
  },

  itemsData: (data: ItemDataPoint[], currency = 'JPY') => {
    return data.map(item => ({
      'Item Name': item.name,
      Category: item.category,
      'Total Sold': item.totalSold,
      Revenue: new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.revenue),
      'Average Rating': item.avgRating?.toFixed(1) || 'N/A',
      'Review Count': item.reviewCount || 0,
      'Profit Margin (%)': item.profitMargin?.toFixed(1) || 'N/A',
      'Popularity Rank': item.popularityRank || 'N/A',
      'Last Order Date': item.lastOrderDate 
        ? format(new Date(item.lastOrderDate), 'yyyy-MM-dd') 
        : 'N/A',
    }));
  },

  categoryData: (data: CategoryDataPoint[], currency = 'JPY') => {
    return data.map(item => ({
      Category: item.name,
      Revenue: new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.value),
      'Percentage (%)': item.percentage?.toFixed(1) || '0.0',
    }));
  },

  revenueReport: (data: { 
    date: string; 
    totalRevenue?: number; 
    foodSales?: number; 
    beverageSales?: number; 
    otherSales?: number; 
    totalOrders?: number; 
    averageOrderValue?: number; 
  }[], currency = 'JPY') => {
    return data.map(item => ({
      Date: format(new Date(item.date), 'yyyy-MM-dd'),
      'Total Revenue': new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.totalRevenue || 0),
      'Food Sales': new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.foodSales || 0),
      'Beverage Sales': new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.beverageSales || 0),
      'Other Sales': new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.otherSales || 0),
      'Total Orders': item.totalOrders || 0,
      'Average Order Value': new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency,
      }).format(item.averageOrderValue || 0),
    }));
  },
};

// Export service for different report types
export class ReportExportService {
  static async exportSalesReport(
    data: SalesDataPoint[],
    format: 'csv' | 'pdf',
    dateRange: { from: Date; to: Date },
    currency = 'JPY'
  ) {
    const formattedData = formatDataForExport.salesData(data, currency);
    const options: ExportOptions = {
      filename: 'sales_report',
      title: 'Sales Report',
      dateRange,
    };

    if (format === 'csv') {
      CSVExporter.exportToCSV(formattedData, options);
    } else {
      await PDFExporter.exportToPDF(formattedData, options);
    }
  }

  static async exportItemsReport(
    data: ItemDataPoint[],
    format: 'csv' | 'pdf',
    dateRange: { from: Date; to: Date },
    currency = 'JPY'
  ) {
    const formattedData = formatDataForExport.itemsData(data, currency);
    const options: ExportOptions = {
      filename: 'items_report',
      title: 'Items Performance Report',
      dateRange,
    };

    if (format === 'csv') {
      CSVExporter.exportToCSV(formattedData, options);
    } else {
      await PDFExporter.exportToPDF(formattedData, options);
    }
  }

  static async exportCategoryReport(
    data: CategoryDataPoint[],
    format: 'csv' | 'pdf',
    dateRange: { from: Date; to: Date },
    currency = 'JPY'
  ) {
    const formattedData = formatDataForExport.categoryData(data, currency);
    const options: ExportOptions = {
      filename: 'category_report',
      title: 'Category Performance Report',
      dateRange,
    };

    if (format === 'csv') {
      CSVExporter.exportToCSV(formattedData, options);
    } else {
      await PDFExporter.exportToPDF(formattedData, options);
    }
  }
}
