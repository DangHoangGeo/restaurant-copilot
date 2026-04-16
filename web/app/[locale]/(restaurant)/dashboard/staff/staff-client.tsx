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
import type { OrgEmployee } from "@/shared/types/organization";

export default function StaffClient() {
  const t = useTranslations("owner.staff");

  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchEmployees();
  }, [fetchEmployees]);

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {t("totalCount", { count: employees.length })}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {branches.length > 1 && (
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBranchFilter(e.target.value)}
              className="appearance-none rounded-md border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t("allBranches")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Building2 className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || branchFilter !== "all" ? t("noResults") : t("noEmployees")}
          </p>
        </div>
      )}

      {/* Employee table grouped by branch */}
      {!loading &&
        !error &&
        Object.entries(grouped).map(([restaurantId, emps]) => {
          const branch = branches.find((b) => b.id === restaurantId);
          return (
            <section key={restaurantId} className="rounded-xl border overflow-hidden">
              {/* Branch header */}
              <div className="flex items-center gap-2 bg-muted/40 px-4 py-2.5 border-b">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold">
                  {branch?.name ?? restaurantId}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({branch?.subdomain})
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t("employeeCount", { count: emps.length })}
                </span>
              </div>

              {/* Employee rows */}
              <div className="divide-y">
                {emps.map((emp) => (
                  <div
                    key={emp.employee_id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.email}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
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
