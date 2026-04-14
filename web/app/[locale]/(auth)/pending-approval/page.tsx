"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingApprovalPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const isSuspended = reason === "suspended";

  const t = useTranslations("auth.pendingApproval");
  const locale = useLocale();

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div className={`flex items-center justify-center w-16 h-16 rounded-full ${isSuspended ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
        {isSuspended ? (
          <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
        ) : (
          <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isSuspended ? t("suspendedTitle") : t("pendingTitle")}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {isSuspended ? t("suspendedMessage") : t("pendingMessage")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
        {isSuspended && (
          <Button
            asChild
            variant="outline"
            className="flex-1 border-slate-300 dark:border-slate-600"
          >
            <a href="mailto:support@coorder.ai">{t("contactSupport")}</a>
          </Button>
        )}
        <Button
          asChild
          className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white ${!isSuspended ? "w-full" : ""}`}
        >
          <Link href={`/${locale}/login`}>{t("backToLogin")}</Link>
        </Button>
      </div>
    </div>
  );
}
