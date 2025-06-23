import { setRequestLocale } from "next-intl/server";
import EmployeesClientContent from "./employees-client-content";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <EmployeesClientContent />
    </div>
  );
}
