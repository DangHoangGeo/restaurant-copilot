'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const MOCK_MENU = [
  { id: 'cat1', name: { en: 'Starters' }, items: [
    { id: 'item1', name: { en: 'Spring Rolls' }, price: 5.5, imageUrl: 'https://placehold.co/300x200' },
    { id: 'item2', name: { en: 'Salad' }, price: 7.0, imageUrl: 'https://placehold.co/300x200' }
  ]},
  { id: 'cat2', name: { en: 'Mains' }, items: [
    { id: 'item3', name: { en: 'Beef Steak' }, price: 15.0, imageUrl: 'https://placehold.co/300x200' }
  ]}
]

interface RestaurantSettings {
  name: string
  logoUrl: string | null
}

export function CustomerClientContent({ restaurantSettings }: { restaurantSettings: RestaurantSettings }) {
  const t = useTranslations()
  const params = useParams()
  const locale = (params.locale as string) || 'en'

  const getText = (obj: Record<string, string> | string) =>
    typeof obj === 'object' ? obj[locale] || obj['en'] || '' : obj

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{restaurantSettings.name}</h1>
      {MOCK_MENU.map(cat => (
        <div key={cat.id} className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{getText(cat.name)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {cat.items.map(item => (
              <Card key={item.id} className="p-4 flex flex-col">
                {item.imageUrl && (
                  <Image src={item.imageUrl} alt={getText(item.name)} width={300} height={200} className="rounded-md mb-3 object-cover w-full h-40" />
                )}
                <h3 className="font-medium text-lg text-slate-800 dark:text-slate-100">{getText(item.name)}</h3>
                <p className="mt-2 text-[--brand-color] font-semibold">${item.price.toFixed(2)}</p>
                <Button className="mt-auto" size="sm">{t('CustomerHome.add_to_cart')}</Button>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
