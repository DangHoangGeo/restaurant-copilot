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

function getTargetDate(req: Request): string {
  const url = new URL(req.url);
  const explicitDate = url.searchParams.get('date');

  if (explicitDate) {
    return explicitDate;
  }

  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    assertInternalAccess(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const targetDate = getTargetDate(req);
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('bookings')
      .update({
        customer_name: null,
        customer_contact: null,
        customer_phone: null,
        customer_email: null,
        customer_note: null,
        updated_at: new Date().toISOString(),
      })
      .lte('pii_expires_at', targetDate)
      .or(
        [
          'customer_name.not.is.null',
          'customer_contact.not.is.null',
          'customer_phone.not.is.null',
          'customer_email.not.is.null',
          'customer_note.not.is.null',
        ].join(','),
      )
      .select('id');

    if (error) {
      throw new Error(`Booking PII purge failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        targetDate,
        purgedCount: data?.length ?? 0,
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
