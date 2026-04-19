import {
  logPlatformAction,
  platformApiError,
  platformApiResponse,
  requirePlatformAdmin,
} from "@/lib/platform-admin";
import { runSubscriptionRenewals } from "@/lib/server/billing/renewals";

export async function POST() {
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  const summary = await runSubscriptionRenewals();

  if (summary.failed > 0 && summary.renewed === 0 && summary.processed === 0) {
    return platformApiError(
      summary.results[0]?.error ?? "Failed to run subscription renewals",
      500,
    );
  }

  await logPlatformAction("run_subscription_renewals", "tenant_subscription", undefined, undefined, {
    processed: summary.processed,
    renewed: summary.renewed,
    failed: summary.failed,
    runAt: summary.runAt,
  });

  return platformApiResponse({
    success: true,
    message: "Subscription renewals completed",
    data: summary,
  });
}
