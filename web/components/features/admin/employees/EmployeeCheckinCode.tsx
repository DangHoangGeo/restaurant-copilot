"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Hash, RefreshCw, Loader2 } from "lucide-react";

interface CheckinCredential {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  employeeId: string;
  employeeName: string;
}

export default function EmployeeCheckinCode({ employeeId, employeeName }: Props) {
  const [credential, setCredential] = useState<CheckinCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCode = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/owner/employees/${employeeId}/checkin-code`);
      const data = await res.json();
      setCredential(data.credential ?? null);
    } catch {
      toast.error("Failed to load checkin code");
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  const handleGenerate = async () => {
    if (
      credential &&
      !confirm("Generate a new code? The old code will stop working immediately.")
    ) return;

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/v1/owner/employees/${employeeId}/checkin-code`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate code");
      setCredential(data.credential);
      toast.success("New checkin code generated. Give this code to the employee.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {employeeName} uses this 5-character code at the restaurant check-in kiosk.
        They scan the restaurant QR and then enter this code.
      </p>

      {credential ? (
        <div className="text-center py-6 bg-muted/40 rounded-xl space-y-2">
          <Hash className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-4xl font-mono font-bold tracking-widest text-primary">
            {credential.code}
          </p>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(credential.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Hash className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No code assigned yet</p>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full"
        variant={credential ? "outline" : "default"}
      >
        {isGenerating ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
        ) : (
          <><RefreshCw className="mr-2 h-4 w-4" /> {credential ? "Generate New Code" : "Generate Code"}</>
        )}
      </Button>

      {credential && (
        <p className="text-xs text-muted-foreground text-center">
          Generating a new code immediately invalidates the current one.
        </p>
      )}
    </div>
  );
}
