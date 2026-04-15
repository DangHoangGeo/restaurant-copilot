'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Users, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface Customer {
  customer_name: string
  order_count: number
  total_spent: number
  last_visit: string
  first_visit: string
}

interface CustomerSummary {
  totalCustomers: number
  totalRevenue: number
  averageSpendPerCustomer: number
  regularCustomers: number
  returningCustomers: number
}

function getCustomerStatus(orderCount: number): { label: string; color: string } {
  if (orderCount >= 3) {
    return { label: 'Regular', color: 'bg-green-100 text-green-800' }
  }
  if (orderCount === 2) {
    return { label: 'Returning', color: 'bg-blue-100 text-blue-800' }
  }
  return { label: 'New', color: 'bg-gray-100 text-gray-800' }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function CustomersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="h-24 animate-pulse bg-gray-200" />
        ))}
      </div>
      {/* Table skeleton */}
      <Card className="p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 animate-pulse bg-gray-200 rounded" />
          ))}
        </div>
      </Card>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations("owner.customers");

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={onRetry}
          className="ml-4 px-3 py-1 bg-red-700 text-white rounded hover:bg-red-800 text-sm"
        >
          {t('retry')}
        </button>
      </AlertDescription>
    </Alert>
  )
}

export function CustomersClientContent() {
  const t = useTranslations("owner.customers");
  const [customers, setCustomers] = useState<Customer[]>([])
  const [summary, setSummary] = useState<CustomerSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/owner/customers', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        setCustomers(data.data.customers || [])
        setSummary(data.data.summary || null)
      } else {
        throw new Error('Failed to load customer data')
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load customers'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  if (isLoading) {
    return <CustomersSkeleton />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadCustomers} />
  }

  const hasCustomers = customers.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('description')}</p>
        </div>
        <Users className="h-10 w-10 text-blue-600 opacity-20" />
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {t('stats.total_customers')}
                </p>
                <p className="text-2xl font-bold mt-1">{summary.totalCustomers}</p>
              </div>
              <Users className="h-5 w-5 text-blue-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {t('stats.total_revenue')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {t('stats.average_spend')}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(summary.averageSpendPerCustomer)}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-purple-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {t('stats.returning_customers')}
                </p>
                <p className="text-2xl font-bold mt-1">{summary.returningCustomers}</p>
              </div>
              <Users className="h-5 w-5 text-orange-600 opacity-50" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {t('stats.regular_customers')}
                </p>
                <p className="text-2xl font-bold mt-1">{summary.regularCustomers}</p>
              </div>
              <Users className="h-5 w-5 text-red-600 opacity-50" />
            </div>
          </Card>
        </div>
      )}

      {/* Customers Table */}
      <Card>
        {!hasCustomers ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
            <p className="text-gray-600 text-lg">{t('empty_state')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    {t('table.customer_name')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    {t('table.orders')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    {t('table.total_spent')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    {t('table.avg_order')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    {t('table.last_visit')}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    {t('table.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((customer, index) => {
                  const status = getCustomerStatus(customer.order_count)
                  const avgOrder = customer.total_spent / customer.order_count

                  return (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {customer.customer_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.order_count}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(customer.total_spent)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatCurrency(avgOrder)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(customer.last_visit)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
