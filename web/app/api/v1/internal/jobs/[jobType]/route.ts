import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  type BackgroundJobPayload,
  type BackgroundJobType,
  logJobFailure,
  runBackgroundJob,
} from "@/lib/server/jobs";

const JOB_TYPES = new Set<BackgroundJobType>([
  "receipt.confirmation",
  "ai.menu_suggestions",
  "analytics.snapshot_rebuild",
  "inventory.low_stock_notifications",
  "audit.write",
  "billing.trial_expiry_check",
]);

async function handleJob(
  request: Request,
  context: { params: Promise<{ jobType: string }> },
) {
  const { jobType: rawJobType } = await context.params;

  if (!JOB_TYPES.has(rawJobType as BackgroundJobType)) {
    return NextResponse.json({ error: "Unknown job type" }, { status: 404 });
  }

  const jobType = rawJobType as BackgroundJobType;
  const payload = (await request.json()) as BackgroundJobPayload;

  try {
    const result = await runBackgroundJob(jobType, payload);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await logJobFailure(jobType, payload, error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handleJob, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});
