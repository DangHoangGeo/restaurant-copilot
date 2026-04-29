import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_ENDPOINT = 'supabase.functions.create-monthly-partitions';

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length);
}

function assertInternalAccess(req: Request) {
  const configuredSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');

  if (!configuredSecret) {
    throw new HttpError('INTERNAL_FUNCTION_SECRET is required for partition maintenance', 500);
  }

  const presentedSecret = req.headers.get('x-internal-function-secret') ?? getBearerToken(req);

  if (presentedSecret !== configuredSecret) {
    throw new HttpError('Unauthorized', 401);
  }
}

function getTargetDate(req: Request): string {
  const explicitDate = new URL(req.url).searchParams.get('date');

  if (!explicitDate) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
    throw new HttpError('date must use YYYY-MM-DD format', 400);
  }

  return explicitDate;
}

function getMonthsAhead(req: Request): number {
  const rawMonthsAhead = new URL(req.url).searchParams.get('monthsAhead');

  if (!rawMonthsAhead) {
    return 3;
  }

  const monthsAhead = Number.parseInt(rawMonthsAhead, 10);

  if (!Number.isInteger(monthsAhead) || monthsAhead < 0 || monthsAhead > 24) {
    throw new HttpError('monthsAhead must be an integer between 0 and 24', 400);
  }

  return monthsAhead;
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

async function writePartitionLog(
  supabase: SupabaseClient,
  level: 'INFO' | 'ERROR',
  message: string,
  metadata: Record<string, unknown>,
) {
  const { error } = await supabase.from('logs').insert({
    level,
    endpoint: FUNCTION_ENDPOINT,
    message,
    metadata,
  });

  if (error) {
    console.warn(`Partition maintenance log insert skipped: ${error.message}`);
  }
}

async function sendFailureAlert(message: string, metadata: Record<string, unknown>) {
  const webhookUrl =
    Deno.env.get('PARTITION_MAINTENANCE_ALERT_WEBHOOK_URL') ??
    Deno.env.get('PLATFORM_ADMIN_ALERT_WEBHOOK_URL');

  if (!webhookUrl) {
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        source: FUNCTION_ENDPOINT,
        metadata,
      }),
    });

    if (!response.ok) {
      console.warn(`Partition maintenance alert failed with status ${response.status}`);
    }
  } catch (error) {
    console.warn(
      `Partition maintenance alert failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

Deno.serve(async (req) => {
  let supabase: SupabaseClient | null = null;
  let targetDate = new Date().toISOString().slice(0, 10);
  let monthsAhead = 3;

  try {
    assertInternalAccess(req);

    targetDate = getTargetDate(req);
    monthsAhead = getMonthsAhead(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new HttpError('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', 500);
    }

    supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase.rpc('create_monthly_order_partitions', {
      p_start_date: targetDate,
      p_months_ahead: monthsAhead,
    });

    if (error) {
      throw new Error(`create_monthly_order_partitions failed: ${error.message}`);
    }

    await writePartitionLog(supabase, 'INFO', 'Monthly order partitions are ready', {
      targetDate,
      monthsAhead,
      result: data,
    });

    return jsonResponse({
      success: true,
      targetDate,
      monthsAhead,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : 500;
    const metadata = {
      targetDate,
      monthsAhead,
      error: message,
    };

    if (supabase) {
      await writePartitionLog(supabase, 'ERROR', 'Monthly order partition maintenance failed', metadata);
    }

    await sendFailureAlert('Monthly order partition maintenance failed', metadata);

    return jsonResponse(
      {
        success: false,
        error: message,
      },
      status,
    );
  }
});
