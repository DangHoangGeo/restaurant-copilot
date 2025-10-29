// Supabase Edge Function: Trial Expiration Notifications
// Scheduled via Supabase cron to run daily
// Sends warnings for expiring trials and processes expired trials

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Get Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting trial notifications process');

    // Step 1: Send warnings for trials expiring in 3 days
    console.log('Sending 3-day expiration warnings...');
    const { data: warnings3Day, error: warnings3DayError } = await supabase.rpc(
      'send_trial_expiration_warnings',
      { days_before: 3 }
    );

    if (warnings3DayError) {
      console.error('Error sending 3-day warnings:', warnings3DayError);
    } else {
      console.log(`Sent ${warnings3Day?.length || 0} 3-day warnings`);
    }

    // Step 2: Send warnings for trials expiring in 1 day
    console.log('Sending 1-day expiration warnings...');
    const { data: warnings1Day, error: warnings1DayError } = await supabase.rpc(
      'send_trial_expiration_warnings',
      { days_before: 1 }
    );

    if (warnings1DayError) {
      console.error('Error sending 1-day warnings:', warnings1DayError);
    } else {
      console.log(`Sent ${warnings1Day?.length || 0} 1-day warnings`);
    }

    // Step 3: Process expired trials
    console.log('Processing expired trials...');
    const { data: expiredTrials, error: expiredTrialsError } = await supabase.rpc(
      'process_expired_trials'
    );

    if (expiredTrialsError) {
      console.error('Error processing expired trials:', expiredTrialsError);
    } else {
      console.log(`Processed ${expiredTrials?.length || 0} expired trials`);
    }

    // Step 4: Check SLA breaches for support tickets
    console.log('Checking SLA breaches...');
    const { data: slaBreaches, error: slaBreachesError } = await supabase.rpc(
      'check_sla_breaches'
    );

    if (slaBreachesError) {
      console.error('Error checking SLA breaches:', slaBreachesError);
    } else {
      console.log(`Found ${slaBreaches?.length || 0} SLA breaches`);
    }

    // Step 5: Auto-escalate tickets
    console.log('Auto-escalating tickets...');
    const { data: escalatedTickets, error: escalateError } = await supabase.rpc(
      'auto_escalate_tickets'
    );

    if (escalateError) {
      console.error('Error escalating tickets:', escalateError);
    } else {
      console.log(`Escalated ${escalatedTickets?.length || 0} tickets`);
    }

    // Get trial statistics for summary
    const { data: trialStats } = await supabase.rpc('get_trial_statistics');

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      trial_warnings: {
        three_day: warnings3Day?.length || 0,
        one_day: warnings1Day?.length || 0
      },
      expired_trials: expiredTrials?.length || 0,
      sla_management: {
        breaches_found: slaBreaches?.length || 0,
        tickets_escalated: escalatedTickets?.length || 0
      },
      trial_statistics: trialStats?.[0] || null
    };

    console.log('Trial notifications completed successfully:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Fatal error in trial-notifications:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
