"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QrCode, RefreshCw, Loader2, AlertTriangle, Download } from "lucide-react";
import QRCodeLib from "qrcode";

interface QRData {
  id: string;
  token: string;
  expires_at: string | null;
  created_at: string;
}

function getCheckinUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/employee/checkin?token=${token}`;
}

export default function RestaurantQRManager() {
  const [qr, setQr] = useState<QRData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchQR = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/owner/restaurant-qr");
      const data = await res.json();
      setQr(data.qr ?? null);
      if (data.qr?.token) {
        const url = getCheckinUrl(data.qr.token);
        const dataUrl = await QRCodeLib.toDataURL(url, { width: 280, margin: 2, color: { dark: "#111827" } });
        setQrDataUrl(dataUrl);
      }
    } catch {
      toast.error("Failed to load restaurant QR code");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  const handleRotate = async () => {
    if (!confirm("Rotate QR code? All employees will need to re-scan. Old QR becomes invalid.")) return;
    setIsRotating(true);
    try {
      const res = await fetch("/api/v1/owner/restaurant-qr", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rotate QR");
      setQr(data.qr);
      const url = getCheckinUrl(data.qr.token);
      const dataUrl = await QRCodeLib.toDataURL(url, { width: 280, margin: 2, color: { dark: "#111827" } });
      setQrDataUrl(dataUrl);
      toast.success("Restaurant QR code rotated. Print and display the new code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate QR");
    } finally {
      setIsRotating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "restaurant-checkin-qr.png";
    a.click();
  };

  const isExpired = qr?.expires_at ? new Date(qr.expires_at) < new Date() : false;
  const expiresLabel = qr?.expires_at
    ? new Date(qr.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "No expiry set";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <div>
        <h2 className="text-lg font-semibold">Restaurant Check-in QR</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Print and display this QR in your branch. Employees scan it to clock in/out.
        </p>
      </div>

      {!qr ? (
        <Card className="rounded-xl text-center">
          <CardContent className="py-10 flex flex-col items-center gap-4">
            <QrCode className="h-12 w-12 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No QR code generated yet</p>
            <Button onClick={handleRotate} disabled={isRotating}>
              {isRotating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Generate QR Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className={`rounded-xl ${isExpired ? "border-orange-300 dark:border-orange-700" : "border-primary/30"}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Branch Check-in QR</CardTitle>
                {isExpired && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              </div>
              <CardDescription className={isExpired ? "text-orange-600 dark:text-orange-400" : ""}>
                {isExpired ? "Expired — " : "Valid until "}
                {expiresLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Restaurant check-in QR" className="rounded-lg border shadow-sm" width={280} height={280} />
              ) : (
                <div className="w-[280px] h-[280px] bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-muted-foreground opacity-40" />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Display this at the counter. Employees scan it with their phone, then enter their 4-6 character code.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={!qrDataUrl}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              variant={isExpired ? "default" : "outline"}
              className="flex-1"
              onClick={handleRotate}
              disabled={isRotating}
            >
              {isRotating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isExpired ? "Renew QR" : "Rotate Monthly"}
            </Button>
          </div>

          {isExpired && (
            <Card className="rounded-xl border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  This QR has expired. Employees cannot clock in. Please rotate it now.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
