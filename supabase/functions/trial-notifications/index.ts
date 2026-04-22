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

Deno.serve(async (req) => {
  try {
    assertInternalAccess(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const url = new URL(req.url);
    const daysBefore = Number(url.searchParams.get('days_before') ?? '3');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: warnings, error: warningsError } = await supabase.rpc(
      'send_trial_expiration_warnings',
      { days_before: daysBefore },
    );
    if (warningsError) {
      throw new Error(`send_trial_expiration_warnings failed: ${warningsError.message}`);
    }

    const { data: expiredTrials, error: expiredTrialsError } = await supabase.rpc(
      'process_expired_trials',
    );
    if (expiredTrialsError) {
      throw new Error(`process_expired_trials failed: ${expiredTrialsError.message}`);
    }

    const { data: slaBreaches, error: slaBreachesError } = await supabase.rpc(
      'check_sla_breaches',
    );
    if (slaBreachesError) {
      throw new Error(`check_sla_breaches failed: ${slaBreachesError.message}`);
    }

    const { data: escalations, error: escalationsError } = await supabase.rpc(
      'auto_escalate_tickets',
    );
    if (escalationsError) {
      throw new Error(`auto_escalate_tickets failed: ${escalationsError.message}`);
    }

    const { data: statistics, error: statisticsError } = await supabase.rpc(
      'get_trial_statistics',
    );
    if (statisticsError) {
      throw new Error(`get_trial_statistics failed: ${statisticsError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        daysBefore,
        warnings,
        expiredTrials,
        slaBreaches,
        escalations,
        statistics,
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
