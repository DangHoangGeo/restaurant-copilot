// Supabase Edge Function: Trial Expiration Notifications
// Scheduled via Supabase cron to run daily.
//
// DISABLED — Phase 0 fix
// This function calls the following database RPCs which do not exist in the current schema:
//   - send_trial_expiration_warnings
//   - process_expired_trials
//   - check_sla_breaches
//   - auto_escalate_tickets
//   - get_trial_statistics
//
// These RPCs belong to a platform-level SaaS trial management system that has not
// been built yet. Re-enable and implement the RPCs when the subscription and support
// ticket system is added (post Phase 3).
//
// Until then, this function returns immediately with a disabled status so the
// Supabase cron scheduler does not log repeated RPC-not-found errors.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  // Intentionally unused — kept so the import is not flagged by the bundler.
  const _supabaseUrl = Deno.env.get('SUPABASE_URL');
  const _supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  void createClient; // imported but not called until RPCs are implemented

  console.log('trial-notifications: function is disabled (required RPCs not yet implemented)');

  return new Response(
    JSON.stringify({
      success: false,
      disabled: true,
      reason:
        'Required RPCs (send_trial_expiration_warnings, process_expired_trials, ' +
        'check_sla_breaches, auto_escalate_tickets, get_trial_statistics) ' +
        'are not implemented. Enable this function after the subscription management phase.',
    }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 }
  );
});
