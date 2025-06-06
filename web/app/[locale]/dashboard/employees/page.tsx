import { setRequestLocale } from 'next-intl/server'
import { EmployeesClientContent } from './employees-client-content'

export default async function EmployeesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <EmployeesClientContent />
}
