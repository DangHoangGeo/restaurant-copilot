import { setRequestLocale } from 'next-intl/server'
import { TablesClientContent } from './tables-client-content'

export default async function TablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <TablesClientContent />
    </div>
  );
}
