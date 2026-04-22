import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function assertInternalAccess(req: Request) {
  const configuredSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');

  if (!configuredSecret) {
    return;
  }

  const authHeader = req.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  const presentedSecret =
    req.headers.get('x-internal-function-secret') ??
    bearerToken ??
    new URL(req.url).searchParams.get('secret');

  if (presentedSecret !== configuredSecret) {
    throw new Error('Unauthorized');
  }
}

function getTargetDate(rawDate: string | null): string {
  if (rawDate) return rawDate;

  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const nowJst = new Date(Date.now() + jstOffsetMs);
  const yesterdayJst = new Date(nowJst.getTime() - 24 * 60 * 60 * 1000);
  return yesterdayJst.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    assertInternalAccess(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const url = new URL(req.url);
    const targetDate = getTargetDate(url.searchParams.get('date'));

    const { data: processedCount, error: snapshotError } = await supabase.rpc(
      'calculate_all_usage_snapshots',
      { target_date: targetDate },
    );

    if (snapshotError) {
      throw new Error(`calculate_all_usage_snapshots failed: ${snapshotError.message}`);
    }

    const { data: usageSummary, error: usageSummaryError } = await supabase.rpc(
      'get_platform_usage_summary',
      { target_date: targetDate },
    );

    if (usageSummaryError) {
      throw new Error(`get_platform_usage_summary failed: ${usageSummaryError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        targetDate,
        processedCount,
        usageSummary,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
