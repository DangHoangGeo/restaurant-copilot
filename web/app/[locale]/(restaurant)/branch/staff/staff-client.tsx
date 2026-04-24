"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Building2,
  Search,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgEmployee } from "@/shared/types/organization";

interface StaffClientProps {
  initialEmployees?: OrgEmployee[];
  showHeader?: boolean;
}

export default function StaffClient({
  initialEmployees,
  showHeader = true,
}: StaffClientProps) {
  const t = useTranslations("owner.staff");

  const [employees, setEmployees] = useState<OrgEmployee[]>(initialEmployees ?? []);
  const [loading, setLoading] = useState(initialEmployees ? false : true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/owner/organization/employees");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("loadError"));
        return;
      }
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (initialEmployees) {
      setEmployees(initialEmployees);
      setLoading(false);
    }
  }, [initialEmployees]);

  useEffect(() => {
    if (initialEmployees) return;
    fetchEmployees();
  }, [fetchEmployees, initialEmployees]);

  // Derive unique branch list for filter
  const branches: Array<{ id: string; name: string; subdomain: string }> = Array.from(
    new Map(
      employees.map((e) => [
        e.restaurant_id,
        { id: e.restaurant_id, name: e.restaurant_name, subdomain: e.restaurant_subdomain },
      ])
    ).values()
  );

  const filtered = employees.filter((e: OrgEmployee) => {
    const matchesBranch =
      branchFilter === "all" || e.restaurant_id === branchFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.job_title.toLowerCase().includes(q);
    return matchesBranch && matchesSearch;
  });

  // Group by branch for display
  const grouped = filtered.reduce<Record<string, OrgEmployee[]>>(
    (acc: Record<string, OrgEmployee[]>, emp: OrgEmployee) => {
      (acc[emp.restaurant_id] ??= []).push(emp);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {showHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#AB6E3C] text-white shadow-sm shadow-[#AB6E3C]/25">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#2E2117] dark:text-[#F7F1E9]">
                {t("pageTitle")}
              </h1>
              {!loading && (
                <p className="text-sm text-[#8B6E5A] dark:text-[#B89078]">
                  {t("totalCount", { count: employees.length })}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[#AB6E3C]/10 bg-[#FEFAF6] p-3 shadow-sm shadow-[#AB6E3C]/5 sm:flex-row dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AB6E3C]/60" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="h-11 rounded-xl border-[#AB6E3C]/15 bg-[#FAF3EA] pl-9 text-[#2E2117] placeholder:text-[#8B6E5A]/60 focus-visible:ring-[#AB6E3C]/35 dark:border-[#AB6E3C]/20 dark:bg-[#170F0C] dark:text-[#F7F1E9] dark:placeholder:text-[#B89078]/60"
          />
        </div>

        {branches.length > 1 && (
          <Select
            value={branchFilter}
            onValueChange={setBranchFilter}
          >
            <SelectTrigger className="h-11 rounded-xl border-[#AB6E3C]/15 bg-[#FAF3EA] text-[#2E2117] focus:ring-[#AB6E3C]/35 sm:w-64 dark:border-[#AB6E3C]/20 dark:bg-[#170F0C] dark:text-[#F7F1E9]">
              <Building2 className="mr-2 h-4 w-4 text-[#AB6E3C]/60" />
              <SelectValue placeholder={t("allBranches")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allBranches")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <Card className="border-[#AB6E3C]/10 bg-[#FEFAF6] shadow-sm shadow-[#AB6E3C]/5 dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85">
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#AB6E3C]" />
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="border-dashed border-[#AB6E3C]/20 bg-[#FEFAF6]/70 shadow-none dark:border-[#AB6E3C]/25 dark:bg-[#251810]/60">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[#AB6E3C]/40" />
            <p className="text-sm text-[#8B6E5A] dark:text-[#B89078]">
              {search || branchFilter !== "all" ? t("noResults") : t("noEmployees")}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading &&
        !error &&
        Object.entries(grouped).map(([restaurantId, emps]) => {
          const branch = branches.find((b) => b.id === restaurantId);
          return (
            <section
              key={restaurantId}
              className="overflow-hidden rounded-2xl border border-[#AB6E3C]/10 bg-[#FEFAF6] shadow-sm shadow-[#AB6E3C]/5 dark:border-[#AB6E3C]/15 dark:bg-[#251810]/85"
            >
              <div className="flex items-center gap-2 border-b border-[#AB6E3C]/10 bg-[#F5EAD8]/70 px-4 py-3 dark:border-[#AB6E3C]/15 dark:bg-[#170F0C]/60">
                <Building2 className="h-4 w-4 shrink-0 text-[#AB6E3C]" />
                <span className="min-w-0 truncate text-sm font-semibold text-[#2E2117] dark:text-[#F7F1E9]">
                  {branch?.name ?? restaurantId}
                </span>
                <span className="hidden text-xs text-[#8B6E5A] sm:inline dark:text-[#B89078]">
                  {branch?.subdomain}
                </span>
                <span className="ml-auto rounded-full bg-[#AB6E3C]/10 px-2.5 py-1 text-xs font-medium text-[#8B6E5A] dark:text-[#B89078]">
                  {t("employeeCount", { count: emps.length })}
                </span>
              </div>

              <div className="divide-y divide-[#AB6E3C]/10 dark:divide-[#AB6E3C]/15">
                {emps.map((emp) => (
                  <div
                    key={emp.employee_id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#2E2117] dark:text-[#F7F1E9]">
                        {emp.name}
                      </p>
                      <p className="truncate text-xs text-[#8B6E5A] dark:text-[#B89078]">
                        {emp.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#36B080]/10 px-2.5 py-1 text-xs font-medium text-[#2F8E68] dark:text-[#63D09D]">
                      {emp.job_title}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
