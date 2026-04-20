"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, QrCode, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buildBranchPath } from "@/lib/branch-paths";

export function QuickActions() {
  const t = useTranslations("owner.dashboard");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const branchId = typeof params.branchId === "string" ? params.branchId : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("quick_actions.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="default" className="w-full justify-start" asChild>
          <Link
            href={`${buildBranchPath(locale, branchId, "menu")}?action=addItem`}
          >
            <PlusCircle className="mr-2 h-4 w-4" />{" "}
            {t("quick_actions.add_menu_item")}
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link
            href={`${buildBranchPath(locale, branchId, "tables")}?action=generateQr`}
          >
            <QrCode className="mr-2 h-4 w-4" /> {t("quick_actions.generate_qr")}
          </Link>
        </Button>
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link
            href={`${buildBranchPath(locale, branchId, "employees")}?action=addEmployee`}
          >
            <UserPlus className="mr-2 h-4 w-4" />{" "}
            {t("quick_actions.add_employee")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
