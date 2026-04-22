"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, LogIn, LogOut, Loader2, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

// The restaurant QR code encodes a URL like:
// /en/employee/checkin?token=<restaurant_token>
// The employee scans it, lands here, and enters their 4-6 char code.

export function CheckinClient() {
  const searchParams = useSearchParams();
  const restaurantToken = searchParams.get("token") ?? "";

  const [code, setCode] = useState("");
  const [scanType, setScanType] = useState<"check_in" | "check_out">("check_in");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ message: string; work_date: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantToken) {
      toast.error("Missing restaurant QR token. Please scan the restaurant QR code.");
      return;
    }
    if (code.length < 4) {
      toast.error("Please enter your full employee code (4-6 characters)");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/attendance/code-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_token: restaurantToken,
          employee_code: code.toUpperCase(),
          scan_type: scanType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record attendance");
      setLastResult({ message: data.message, work_date: data.work_date });
      setCode("");
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record attendance");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <QrCode className="h-12 w-12 mx-auto mb-3 text-primary" />
        <h1 className="text-2xl font-bold">Clock In / Out</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your personal code to record attendance
        </p>
      </div>

      {lastResult && (
        <Card className="rounded-xl bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">{lastResult.message}</p>
              <p className="text-xs text-green-700 dark:text-green-300">{lastResult.work_date}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!restaurantToken && (
        <Card className="rounded-xl border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
              Please scan the restaurant QR code first, then enter your employee code here.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Scan type */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScanType("check_in")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors ${
                  scanType === "check_in"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <LogIn className="h-4 w-4" />
                Check In
              </button>
              <button
                type="button"
                onClick={() => setScanType("check_out")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors ${
                  scanType === "check_out"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <LogOut className="h-4 w-4" />
                Check Out
              </button>
            </div>

            {/* Code input */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-code">Your Employee Code</Label>
              <Input
                id="emp-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB123"
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest h-14"
                autoComplete="off"
                autoCapitalize="characters"
              />
              <p className="text-xs text-muted-foreground text-center">
                4-6 character code assigned by your manager
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading || code.length < 4 || !restaurantToken}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</>
              ) : (
                <>{scanType === "check_in" ? <LogIn className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
                  {scanType === "check_in" ? "Check In" : "Check Out"}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
