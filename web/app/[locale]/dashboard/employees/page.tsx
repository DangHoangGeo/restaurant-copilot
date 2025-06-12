import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSubdomainFromHost } from "@/lib/utils";
import { EmployeesClientContent } from "./employees-client-content";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  shifts: Record<string, string | null>;
}

interface ScheduleItem {
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
}

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const host = (await headers()).get("host") || "";
  const subdomain = getSubdomainFromHost(host);
  const t = await getTranslations({ locale, namespace: "AdminEmployees" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  const user = await getUserFromRequest();
  let restaurantId: string | null = null;
  let errorGettingId: string | null = null;
  if (user && user.subdomain !== subdomain) {
    errorGettingId = t("Settings.Page.errors.noSubdomainDetected");
  }
  restaurantId = user?.restaurantId || null;

  let initialEmployees: Employee[] = [];
  let fetchError: string | null = null;

  if (user && user.restaurantId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select(
          "id, role, users(id, email, name), schedules(weekday, start_time, end_time)",
        )
        .eq("restaurant_id", user.restaurantId);

      if (error) throw error;

      if (data) {
        const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        initialEmployees = data.map((emp) => {
          const shifts: Record<string, string | null> = {
            Mon: null,
            Tue: null,
            Wed: null,
            Thu: null,
            Fri: null,
            Sat: null,
            Sun: null,
          };
          (emp.schedules as ScheduleItem[] | null)?.forEach((s: ScheduleItem) => {
            const day = dayMap[(s.weekday ?? 1) - 1] as keyof typeof shifts;
            if (day) {
              shifts[day] =
                `${s.start_time?.slice(0, 5)}-${s.end_time?.slice(0, 5)}`;
            }
          });
          return {
            id: emp.id,
            name: emp.users[0]?.name ?? "",
            email: emp.users[0]?.email ?? "",
            role: emp.role,
            shifts,
          } as Employee;
        });

        // No need to set fetchError for empty array - let client component handle empty state
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      fetchError =
        error instanceof Error ? error.message : t("errors.data_fetch_error");
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
          {t("AdminNav.admin_employees_title")}
        </h1>
      </header>

      {errorGettingId && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {tCommon("errors.noRestaurantIdTitle")}
          </AlertTitle>
          <AlertDescription>{errorGettingId}</AlertDescription>
        </Alert>
      )}

      {!errorGettingId && !restaurantId && !fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {tCommon("errors.noRestaurantIdTitle")}
          </AlertTitle>
          <AlertDescription>
            {tCommon("errors.noRestaurantIdMessage")}
          </AlertDescription>
        </Alert>
      )}

      {restaurantId && fetchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Settings.Page.errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {restaurantId && !fetchError && (
        <EmployeesClientContent initialData={initialEmployees} />
      )}
    </div>
  );
}
