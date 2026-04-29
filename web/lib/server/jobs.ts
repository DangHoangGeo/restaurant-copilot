import "server-only";

import { Client } from "@upstash/qstash";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runSubscriptionRenewals } from "@/lib/server/billing/renewals";

export type BackgroundJobType =
  | "receipt.confirmation"
  | "ai.menu_suggestions"
  | "analytics.snapshot_rebuild"
  | "inventory.low_stock_notifications"
  | "audit.write"
  | "billing.trial_expiry_check";

export type BackgroundJobPayload = {
  jobId?: string;
  restaurantId?: string;
  orderId?: string;
  organizationId?: string;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
};

export type DispatchJobResult =
  | { status: "queued"; messageId?: string }
  | { status: "skipped"; reason: string };

export type BackgroundJobRunResult = {
  status: "completed";
  jobType: BackgroundJobType;
  details?: Record<string, unknown>;
};

let qstashClient: Client | null = null;

function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null;

  qstashClient ??= new Client({ token: process.env.QSTASH_TOKEN });
  return qstashClient;
}

function getAppBaseUrl(): string | null {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return null;
}

export function isBackgroundJobsConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && getAppBaseUrl());
}

export async function dispatchBackgroundJob(
  jobType: BackgroundJobType,
  payload: BackgroundJobPayload,
): Promise<DispatchJobResult> {
  const client = getQStashClient();
  const appBaseUrl = getAppBaseUrl();

  if (!client || !appBaseUrl) {
    await logger.warn("background-jobs", "Background job dispatch skipped", {
      jobType,
      reason: "QSTASH_TOKEN and NEXT_PUBLIC_APP_URL or VERCEL_URL are required",
      restaurantId: payload.restaurantId,
      organizationId: payload.organizationId,
    });

    return {
      status: "skipped",
      reason: "QSTASH_TOKEN and NEXT_PUBLIC_APP_URL or VERCEL_URL are required",
    };
  }

  const result = await client.publishJSON({
    url: `${appBaseUrl}/api/v1/internal/jobs/${jobType}`,
    body: {
      ...payload,
      jobType,
    },
    retries: 3,
    headers: {
      "x-job-type": jobType,
    },
  });

  return {
    status: "queued",
    messageId: result.messageId,
  };
}

export async function logJobFailure(
  jobType: BackgroundJobType,
  payload: BackgroundJobPayload,
  error: unknown,
): Promise<void> {
  await logger.error(
    "background-jobs",
    "Background job failed",
    {
      source: "job",
      jobType,
      jobId: payload.jobId,
      organizationId: payload.organizationId,
      orderId: payload.orderId,
      error: error instanceof Error ? error.message : String(error),
      metadata: payload.metadata,
    },
    payload.restaurantId,
    payload.triggeredBy,
  );
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function runBackgroundJob(
  jobType: BackgroundJobType,
  payload: BackgroundJobPayload,
): Promise<BackgroundJobRunResult> {
  switch (jobType) {
    case "analytics.snapshot_rebuild": {
      if (!payload.restaurantId) {
        throw new Error("analytics.snapshot_rebuild requires restaurantId");
      }

      const snapshotDate =
        getMetadataString(payload.metadata, "date") ??
        new Date().toISOString().slice(0, 10);

      const { data, error } = await supabaseAdmin.rpc("refresh_analytics_snapshot", {
        p_restaurant_id: payload.restaurantId,
        p_date: snapshotDate,
      });

      if (error) throw new Error(error.message);

      return {
        status: "completed",
        jobType,
        details: { snapshot: data },
      };
    }

    case "inventory.low_stock_notifications": {
      if (!payload.restaurantId) {
        throw new Error("inventory.low_stock_notifications requires restaurantId");
      }

      const { data, error } = await supabaseAdmin
        .from("inventory_items")
        .select("id, stock_level, threshold")
        .eq("restaurant_id", payload.restaurantId)
        .not("stock_level", "is", null)
        .not("threshold", "is", null);

      if (error) throw new Error(error.message);

      const lowStockItems = (data ?? []).filter((item) => {
        const stockLevel = Number(item.stock_level ?? 0);
        const threshold = Number(item.threshold ?? 0);
        return stockLevel <= threshold;
      }).length;

      await logger.info(
        "background-jobs",
        "Low-stock notification scan completed",
        { source: "job", jobType, lowStockItems },
        payload.restaurantId,
        payload.triggeredBy,
      );

      return {
        status: "completed",
        jobType,
        details: { lowStockItems },
      };
    }

    case "billing.trial_expiry_check": {
      const summary = await runSubscriptionRenewals();
      return {
        status: "completed",
        jobType,
        details: { summary },
      };
    }

    case "audit.write": {
      if (!payload.restaurantId) {
        throw new Error("audit.write requires restaurantId");
      }

      const action = getMetadataString(payload.metadata, "action");
      const tableName = getMetadataString(payload.metadata, "tableName");
      const recordId = getMetadataString(payload.metadata, "recordId");

      if (!action || !tableName || !recordId) {
        throw new Error("audit.write requires metadata.action, tableName, and recordId");
      }

      if (payload.jobId) {
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("audit_logs")
          .select("id")
          .eq("restaurant_id", payload.restaurantId)
          .eq("record_id", recordId)
          .contains("changes", { jobId: payload.jobId })
          .maybeSingle();

        if (existingError) throw new Error(existingError.message);
        if (existing) {
          return {
            status: "completed",
            jobType,
            details: { idempotent: true, auditLogId: existing.id },
          };
        }
      }

      const { data, error } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          restaurant_id: payload.restaurantId,
          user_id: payload.triggeredBy ?? null,
          action,
          table_name: tableName,
          record_id: recordId,
          changes: {
            ...(payload.metadata ?? {}),
            jobId: payload.jobId ?? null,
          },
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      return {
        status: "completed",
        jobType,
        details: { auditLogId: data.id },
      };
    }

    case "receipt.confirmation":
    case "ai.menu_suggestions": {
      await logger.info(
        "background-jobs",
        "Deferred side effect acknowledged",
        { source: "job", jobType, jobId: payload.jobId, metadata: payload.metadata },
        payload.restaurantId,
        payload.triggeredBy,
      );

      return {
        status: "completed",
        jobType,
        details: { deferred: true },
      };
    }
  }
}
