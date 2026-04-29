import { createClient } from "@supabase/supabase-js";

const primarySupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const readReplicaSupabaseUrl = process.env.SUPABASE_READ_REPLICA_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!primarySupabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase read client environment variables.");
}

const readSupabaseUrl = readReplicaSupabaseUrl ?? primarySupabaseUrl;

function isRestRequest(input: RequestInfo | URL): boolean {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  return rawUrl.includes("/rest/v1/");
}

function getRequestMethod(init?: RequestInit): string {
  return (init?.method ?? "GET").toUpperCase();
}

async function readOnlyFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = getRequestMethod(init);

  if (isRestRequest(input) && method !== "GET" && method !== "HEAD") {
    throw new Error(
      `Supabase read client blocked ${method}. Use the primary Supabase client for writes.`,
    );
  }

  return fetch(input, init);
}

export const supabaseReadAdmin = createClient(readSupabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: readOnlyFetch,
  },
});

export function isReadReplicaConfigured(): boolean {
  return Boolean(readReplicaSupabaseUrl);
}

export function getReadReplicaSourceLabel(): "read-replica" | "primary-fallback" {
  return readReplicaSupabaseUrl ? "read-replica" : "primary-fallback";
}
