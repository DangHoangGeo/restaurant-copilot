'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react'

const MOCK_MENU_CATEGORIES_BASE = [{ items: [{ id: 'item1', name: { en: 'Sample Item' } as Record<string, string> }] }]

export function ReportsClientContent() {
  const t = useTranslations()
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const [activeTab, setActiveTab] = useState<'sales' | 'items' | 'feedback'>('sales')

  const SummaryCard = ({ title, value, icon: IconComponent, color }: { title: string; value: string | number; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(title)}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-2.5 rounded-full bg-${color}-100 dark:bg-${color}-900`}>
          <IconComponent className={`text-${color}-600 dark:text-${color}-400`} size={20} />
        </div>
      </div>
    </Card>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales':
        return (
          <Card className="p-4">
            <p className="text-sm">{t('AdminReports.sales.daily_revenue_chart_placeholder')}</p>
          </Card>
        )
      case 'items':
        return (
          <Card className="p-4">
            <p className="text-sm">{t('AdminReports.items.title')}</p>
          </Card>
        )
      case 'feedback':
        return (
          <Card className="p-4">
            <p className="text-sm">{t('AdminReports.feedback.title')}</p>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('AdminNav.admin_reports_title')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="AdminReports.summary.total_sales_today" value={1280.5} icon={DollarSign} color="blue" />
        <SummaryCard title="AdminReports.summary.active_orders_count" value="8" icon={ShoppingCart} color="indigo" />
        <SummaryCard title="AdminReports.summary.top_selling_item_today" value={MOCK_MENU_CATEGORIES_BASE[0].items[0].name[locale] || 'Item'} icon={TrendingUp} color="emerald" />
        <SummaryCard title="AdminReports.summary.low_stock_alerts_count" value="3" icon={AlertTriangle} color="amber" />
      </div>
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        {(['sales','items','feedback'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 -mb-px font-medium text-sm ${activeTab===tab?'border-b-2 border-[--brand-color] text-[--brand-color]':'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>{t(`AdminReports.tabs.${tab}`)}</button>
        ))}
      </div>
      {renderTabContent()}
      <Card className="mt-8 p-4">
        <h3 className="text-lg font-semibold mb-3">{t('AdminReports.recommendations.title')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('AdminReports.recommendations.description_7_days')}</p>
        <ul className="space-y-1 text-sm">
          <li><span>{MOCK_MENU_CATEGORIES_BASE[0].items[0].name[locale] || 'Item'}</span> <span className="font-medium">10 {t('Common.sold')}</span></li>
        </ul>
        <Button variant="primary" className="mt-4 w-full sm:w-auto">
          <Sparkles className="mr-2" />
          {t('AdminReports.recommendations.apply_button')}</Button>
      </Card>
    </div>
  )
}
