import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { EmployeePortalLayout } from "./employee-portal-layout";

export default async function EmployeeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUserFromRequest();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (!user.restaurantId) {
    redirect(`/${locale}/login`);
  }

  return (
    <EmployeePortalLayout locale={locale} userEmail={user.email ?? ""}>
      {children}
    </EmployeePortalLayout>
  );
}
