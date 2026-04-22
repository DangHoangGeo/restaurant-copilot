import { redirect } from "next/navigation";

export default async function EmployeePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/employee/schedule`);
}
