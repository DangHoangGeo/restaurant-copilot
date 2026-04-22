import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CUSTOMER_SESSION_CODE_ALPHABET,
  CUSTOMER_SESSION_CODE_LENGTH,
  sanitizeCustomerSessionCodeInput,
} from "@/shared/customer-session";

const ACTIVE_CUSTOMER_ORDER_STATUSES = ["new", "serving"] as const;

export interface CustomerSessionOrderRow {
  id: string;
  restaurant_id: string;
  table_id: string;
  session_id: string;
  guest_count: number;
  status: string;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  tables?: { name?: string | null } | { name?: string | null }[] | null;
}

function getCustomerSessionSecret(): string {
  const secret =
    process.env.CUSTOMER_SESSION_CODE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing customer session code secret");
  }

  return secret;
}

function encodeDigestWithAlphabet(digest: Buffer, length: number): string {
  let output = "";
  let bitBuffer = 0;
  let bitCount = 0;

  for (const byte of digest) {
    bitBuffer = (bitBuffer << 8) | byte;
    bitCount += 8;

    while (bitCount >= 5 && output.length < length) {
      output += CUSTOMER_SESSION_CODE_ALPHABET[(bitBuffer >>> (bitCount - 5)) & 31];
      bitCount -= 5;
    }

    if (output.length === length) {
      return output;
    }
  }

  if (bitCount > 0 && output.length < length) {
    output += CUSTOMER_SESSION_CODE_ALPHABET[(bitBuffer << (5 - bitCount)) & 31];
  }

  return output.padEnd(length, CUSTOMER_SESSION_CODE_ALPHABET[0]);
}

export function isCustomerSessionActiveStatus(status: string | null | undefined): boolean {
  return ACTIVE_CUSTOMER_ORDER_STATUSES.includes(
    (status ?? "") as (typeof ACTIVE_CUSTOMER_ORDER_STATUSES)[number],
  );
}

export function createCustomerSessionCode(
  sessionId: string,
  restaurantId: string,
): string {
  const digest = createHmac("sha256", getCustomerSessionSecret())
    .update(`${restaurantId}:${sessionId}`)
    .digest();

  return encodeDigestWithAlphabet(digest, CUSTOMER_SESSION_CODE_LENGTH);
}

export function verifyCustomerSessionCode(params: {
  sessionId: string;
  restaurantId: string;
  candidateCode: string;
}): boolean {
  const normalized = sanitizeCustomerSessionCodeInput(params.candidateCode);
  if (normalized.length !== CUSTOMER_SESSION_CODE_LENGTH) {
    return false;
  }

  const expected = createCustomerSessionCode(params.sessionId, params.restaurantId);
  return timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
}

async function getActiveCustomerOrderForTable(params: {
  restaurantId: string;
  tableId: string;
}): Promise<CustomerSessionOrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      restaurant_id,
      table_id,
      session_id,
      guest_count,
      status,
      total_amount,
      created_at,
      updated_at,
      tables(name)
    `,
    )
    .eq("restaurant_id", params.restaurantId)
    .eq("table_id", params.tableId)
    .in("status", [...ACTIVE_CUSTOMER_ORDER_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CustomerSessionOrderRow;
}

export async function getCustomerSessionOrder(params: {
  sessionId: string;
  restaurantId: string;
}): Promise<CustomerSessionOrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      restaurant_id,
      table_id,
      session_id,
      guest_count,
      status,
      total_amount,
      created_at,
      updated_at,
      tables(name)
    `,
    )
    .eq("session_id", params.sessionId)
    .eq("restaurant_id", params.restaurantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CustomerSessionOrderRow;
}

export async function createCustomerOrderSession(params: {
  restaurantId: string;
  tableId: string;
  guestCount: number;
}): Promise<CustomerSessionOrderRow & { createdNew: boolean }> {
  const existingOrder = await getActiveCustomerOrderForTable(params);
  if (existingOrder) {
    return {
      ...existingOrder,
      createdNew: false,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert([
      {
        restaurant_id: params.restaurantId,
        table_id: params.tableId,
        session_id: randomUUID(),
        status: "new",
        total_amount: 0,
        guest_count: params.guestCount,
      },
    ])
    .select(
      `
      id,
      restaurant_id,
      table_id,
      session_id,
      guest_count,
      status,
      total_amount,
      created_at,
      updated_at,
      tables(name)
    `,
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      const racedOrder = await getActiveCustomerOrderForTable(params);
      if (racedOrder) {
        return {
          ...racedOrder,
          createdNew: false,
        };
      }
    }

    throw error;
  }

  return {
    ...(data as CustomerSessionOrderRow),
    createdNew: true,
  };
}

export async function appendItemsToCustomerSession(params: {
  restaurantId: string;
  sessionId: string;
  items: unknown[];
}): Promise<{ order_id: string; total_amount: number; updated_at: string }> {
  const { data, error } = await supabaseAdmin
    .rpc("append_items_to_order_session", {
      p_restaurant_id: params.restaurantId,
      p_session_id: params.sessionId,
      p_items: params.items,
    })
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to append items to session");
  }

  return data as { order_id: string; total_amount: number; updated_at: string };
}

export async function getCustomerSessionInfo(params: {
  sessionId: string;
  restaurantId: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin.rpc("get_order_session_info", {
    p_session_id: params.sessionId,
    p_restaurant_id: params.restaurantId,
  });

  if (error || !data) {
    throw error ?? new Error("Order session not found");
  }

  return {
    ...(data as Record<string, unknown>),
    session_code: createCustomerSessionCode(params.sessionId, params.restaurantId),
  };
}
