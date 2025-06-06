import { setRequestLocale } from 'next-intl/server'
import { ReportsClientContent } from './reports-client-content'

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ReportsClientContent />
}
