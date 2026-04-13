"use client";
// EmployeeQRPanel
//
// Displays the secure QR credential for an employee and allows managers to
// rotate it. The credential token is rendered as a QR code image using
// react-qr-code. Employees scan this with the kiosk / manager device to
// check in or out.

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, QrCode, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

interface CredentialData {
  id: string;
  employee_id: string;
  token: string;
  is_active: boolean;
  issued_at: string;
  expires_at: string | null;
}

interface EmployeeQRPanelProps {
  employeeId: string;
  employeeName: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EmployeeQRPanel({ employeeId, employeeName }: EmployeeQRPanelProps) {
  const t = useTranslations("owner.employees.qrPanel");
  const [isRotating, setIsRotating] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<{ credential: CredentialData | null }>(
    `/api/v1/owner/employees/${employeeId}/qr-credential`,
    fetcher
  );

  const credential = data?.credential ?? null;

  const handleIssue = useCallback(async () => {
    setIsRotating(true);
    try {
      const res = await fetch(`/api/v1/owner/employees/${employeeId}/qr-credential`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t("errors.issueFailed"));
      toast.success(t("notifications.issued"));
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.issueFailed"));
    } finally {
      setIsRotating(false);
    }
  }, [employeeId, t, mutate]);

  const handleRotate = useCallback(async () => {
    if (!confirm(t("confirmRotate"))) return;
    setIsRotating(true);
    try {
      const res = await fetch(`/api/v1/owner/employees/${employeeId}/qr-credential`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t("errors.rotateFailed"));
      toast.success(t("notifications.rotated"));
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.rotateFailed"));
    } finally {
      setIsRotating(false);
    }
  }, [employeeId, t, mutate]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description", { name: employeeName })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t("errors.loadFailed")}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && !credential && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("noCredential")}</p>
            <Button onClick={handleIssue} disabled={isRotating}>
              {isRotating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("actions.issue")}
            </Button>
          </div>
        )}

        {!isLoading && !error && credential && (
          <div className="flex flex-col items-center gap-4">
            {/* QR code — the token is the scannable value */}
            <div className="rounded-lg border bg-white p-4">
              <QRCode value={credential.token} size={200} />
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("issuedAt", { date: new Date(credential.issued_at).toLocaleDateString() })}
              </p>
              {credential.expires_at && (
                <p className="text-xs text-muted-foreground">
                  {t("expiresAt", { date: new Date(credential.expires_at).toLocaleDateString() })}
                </p>
              )}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {t("rotateWarning")}
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              disabled={isRotating}
              className="w-full"
            >
              {isRotating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRotating ? t("actions.rotating") : t("actions.rotate")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
