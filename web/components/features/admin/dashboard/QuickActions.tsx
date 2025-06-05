'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, QrCode, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export function QuickActions() {
  const t = useTranslations('AdminDashboard');
  const params = useParams();
  const locale = params.locale as string || 'en';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('quick_actions.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="default" className="w-full justify-start" asChild>
          <Link href={`/${locale}/dashboard/menu?action=addItem`}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('quick_actions.add_menu_item')}
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link href={`/${locale}/dashboard/tables?action=generateQr`}>
            <QrCode className="mr-2 h-4 w-4" /> {t('quick_actions.generate_qr')}
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link href={`/${locale}/dashboard/employees?action=addEmployee`}>
            <UserPlus className="mr-2 h-4 w-4" /> {t('quick_actions.add_employee')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
