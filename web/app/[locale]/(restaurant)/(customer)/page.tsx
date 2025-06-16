import { redirect } from 'next/navigation';

export default function CustomerHomePage({ params: { locale } }: { params: { locale: string } }) {
  // Redirect to menu page
  redirect(`/${locale}/menu`);
}
