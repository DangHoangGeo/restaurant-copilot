#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT_DIR = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SCRIPT_NAME = "infra/scripts/bootstrap_platform_admin.mjs";
const DEFAULT_PERMISSIONS = {
  logs: ["read"],
  users: ["read"],
  support: ["read", "write"],
  restaurants: ["read", "verify", "suspend"],
  organizations: ["read", "approve", "reject"],
  subscriptions: ["read", "update"],
  platform_admins: ["read", "write"],
};
const CONFIRMATION_VALUE = "create-platform-admin";

function printHelp() {
  console.log(`
Bootstrap the first Restaurant Copilot platform admin.

Usage:
  node ${SCRIPT_NAME}
  node ${SCRIPT_NAME} --dry-run

Required environment:
  SUPABASE_SERVICE_ROLE_KEY
  PLATFORM_BOOTSTRAP_ADMIN_EMAIL

Supabase URL environment:
  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL

For a new Auth user, provide one of:
  PLATFORM_BOOTSTRAP_ADMIN_PASSWORD
  PLATFORM_BOOTSTRAP_GENERATE_PASSWORD=true

Recommended optional environment:
  PLATFORM_BOOTSTRAP_ADMIN_FULL_NAME
  PLATFORM_BOOTSTRAP_CONFIRM=${CONFIRMATION_VALUE}

Production safety:
  Non-local Supabase URLs require PLATFORM_BOOTSTRAP_CONFIRM=${CONFIRMATION_VALUE}.
`);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  loadEnvFile(resolve(ROOT_DIR, ".env"));
  loadEnvFile(resolve(ROOT_DIR, "web/.env"));
  loadEnvFile(resolve(ROOT_DIR, "web/.env.local"));
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeSupabaseUrl(rawUrl) {
  const url = rawUrl.trim().replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be an http(s) URL",
    );
  }
  return url;
}

function isLocalSupabase(url) {
  return (
    url.startsWith("http://127.0.0.1") ||
    url.startsWith("http://localhost") ||
    url.includes(".localhost")
  );
}

function parseBoolean(value) {
  return ["1", "true", "yes", "y"].includes(String(value ?? "").toLowerCase());
}

function generatePassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

function assertPasswordIsUsable(password) {
  if (password.length < 12) {
    throw new Error(
      "PLATFORM_BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters",
    );
  }
}

function parseArgs(argv) {
  const args = new Set(argv);

  if (args.has("--help") || args.has("-h")) {
    return { help: true, dryRun: false };
  }

  for (const arg of args) {
    if (arg !== "--dry-run") {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { help: false, dryRun: args.has("--dry-run") };
}

function encodeFilterValue(value) {
  return encodeURIComponent(value);
}

async function requestJson({
  supabaseUrl,
  serviceRoleKey,
  path,
  method = "GET",
  body,
  allowNotFound = false,
}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (allowNotFound && response.status === 404) {
    return null;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.message ?? payload?.error_description ?? payload?.error ?? text;
    throw new Error(
      `${method} ${path} failed (${response.status}): ${message}`,
    );
  }

  return payload;
}

async function findAuthUserByEmail(config, email) {
  const targetEmail = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const payload = await requestJson({
      ...config,
      path: `/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
    });
    const users = Array.isArray(payload?.users) ? payload.users : [];
    const match = users.find(
      (user) => String(user.email ?? "").toLowerCase() === targetEmail,
    );

    if (match) return match;
    if (users.length < perPage) return null;
    page += 1;
  }

  throw new Error(
    "Could not find user after scanning 20,000 auth users; bootstrap manually by user_id",
  );
}

async function createAuthUser(config, { email, fullName, password }) {
  const payload = await requestJson({
    ...config,
    method: "POST",
    path: "/auth/v1/admin/users",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        platform_role: "platform_admin",
      },
      app_metadata: {
        role: "platform_admin",
        platform_admin_bootstrap: true,
      },
    },
  });
  return payload?.user ?? payload;
}

async function refreshAuthUserMetadata(config, { authUser, fullName }) {
  const payload = await requestJson({
    ...config,
    method: "PUT",
    path: `/auth/v1/admin/users/${encodeURIComponent(authUser.id)}`,
    body: {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        full_name: fullName,
        platform_role: "platform_admin",
      },
      app_metadata: {
        ...(authUser.app_metadata ?? {}),
        role: "platform_admin",
        platform_admin_bootstrap: true,
      },
    },
  });
  return payload?.user ?? payload;
}

async function findPlatformAdminByUserId(config, userId) {
  const payload = await requestJson({
    ...config,
    path: `/rest/v1/platform_admins?user_id=eq.${encodeFilterValue(userId)}&select=*`,
  });
  return Array.isArray(payload) && payload.length > 0 ? payload[0] : null;
}

async function findPlatformAdminByEmail(config, email) {
  const payload = await requestJson({
    ...config,
    path: `/rest/v1/platform_admins?email=eq.${encodeFilterValue(email)}&select=*`,
  });
  return Array.isArray(payload) && payload.length > 0 ? payload[0] : null;
}

async function createPlatformAdmin(
  config,
  { userId, email, fullName, permissions },
) {
  const payload = await requestJson({
    ...config,
    method: "POST",
    path: "/rest/v1/platform_admins",
    body: {
      user_id: userId,
      email,
      full_name: fullName,
      is_active: true,
      permissions,
      created_by: userId,
      notes: `Bootstrapped by ${SCRIPT_NAME}`,
    },
  });
  if (!Array.isArray(payload) || !payload[0]) {
    throw new Error("Platform admin insert did not return a row");
  }
  return payload[0];
}

async function updatePlatformAdmin(
  config,
  { userId, email, fullName, permissions },
) {
  const payload = await requestJson({
    ...config,
    method: "PATCH",
    path: `/rest/v1/platform_admins?user_id=eq.${encodeFilterValue(userId)}`,
    body: {
      email,
      full_name: fullName,
      is_active: true,
      permissions,
      deactivated_at: null,
      deactivated_by: null,
      notes: `Reactivated or refreshed by ${SCRIPT_NAME}`,
    },
  });
  if (!Array.isArray(payload) || !payload[0]) {
    throw new Error("Platform admin update did not return a row");
  }
  return payload[0];
}

async function logBootstrap(
  config,
  { adminId, userId, email, createdAuthUser, createdPlatformAdmin },
) {
  await requestJson({
    ...config,
    method: "POST",
    path: "/rest/v1/platform_audit_logs",
    body: {
      admin_id: adminId,
      action: "bootstrap_platform_admin",
      resource_type: "platform_admin",
      resource_id: adminId,
      changes: {
        user_id: userId,
        email,
        created_auth_user: createdAuthUser,
        created_platform_admin: createdPlatformAdmin,
        script: SCRIPT_NAME,
      },
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  loadLocalEnv();

  const supabaseUrl = normalizeSupabaseUrl(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  );
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = requireEnv("PLATFORM_BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const fullName =
    process.env.PLATFORM_BOOTSTRAP_ADMIN_FULL_NAME?.trim() ||
    "Platform Administrator";
  const confirmation = process.env.PLATFORM_BOOTSTRAP_CONFIRM?.trim();
  const shouldGeneratePassword = parseBoolean(
    process.env.PLATFORM_BOOTSTRAP_GENERATE_PASSWORD,
  );
  const configuredPassword = process.env.PLATFORM_BOOTSTRAP_ADMIN_PASSWORD;
  const permissions = process.env.PLATFORM_BOOTSTRAP_ADMIN_PERMISSIONS
    ? JSON.parse(process.env.PLATFORM_BOOTSTRAP_ADMIN_PERMISSIONS)
    : DEFAULT_PERMISSIONS;

  if (!email.includes("@")) {
    throw new Error(
      "PLATFORM_BOOTSTRAP_ADMIN_EMAIL must be a valid email address",
    );
  }

  if (!isLocalSupabase(supabaseUrl) && confirmation !== CONFIRMATION_VALUE) {
    throw new Error(
      `Non-local Supabase bootstrap requires PLATFORM_BOOTSTRAP_CONFIRM=${CONFIRMATION_VALUE}`,
    );
  }

  const password =
    configuredPassword || (shouldGeneratePassword ? generatePassword() : null);

  if (args.dryRun) {
    console.log("Dry run passed. The script would:");
    console.log(`- use Supabase project URL: ${supabaseUrl}`);
    console.log(`- create or find Auth user: ${email}`);
    console.log(
      "- create, reactivate, or refresh the matching public.platform_admins row",
    );
    console.log("- write platform_audit_logs action: bootstrap_platform_admin");
    return;
  }

  const config = { supabaseUrl, serviceRoleKey };
  const existingAuthUser = await findAuthUserByEmail(config, email);

  if (!existingAuthUser) {
    if (!password) {
      throw new Error(
        "No existing Auth user found. Set PLATFORM_BOOTSTRAP_ADMIN_PASSWORD or PLATFORM_BOOTSTRAP_GENERATE_PASSWORD=true.",
      );
    }
    assertPasswordIsUsable(password);
  }

  let authUser = existingAuthUser;
  let createdAuthUser = false;

  if (!authUser) {
    authUser = await createAuthUser(config, { email, fullName, password });
    createdAuthUser = true;
  }

  const userId = authUser.id;
  if (!userId) {
    throw new Error("Supabase Auth user response did not include an id");
  }

  if (!createdAuthUser) {
    await refreshAuthUserMetadata(config, { authUser, fullName });
  }

  const adminByUserId = await findPlatformAdminByUserId(config, userId);
  const adminByEmail = adminByUserId
    ? null
    : await findPlatformAdminByEmail(config, email);

  if (adminByEmail && adminByEmail.user_id !== userId) {
    throw new Error(
      `A platform_admins row already exists for ${email} but points to a different user_id. Resolve this manually.`,
    );
  }

  const platformAdmin = adminByUserId
    ? await updatePlatformAdmin(config, {
        userId,
        email,
        fullName,
        permissions,
      })
    : await createPlatformAdmin(config, {
        userId,
        email,
        fullName,
        permissions,
      });

  await logBootstrap(config, {
    adminId: platformAdmin.id,
    userId,
    email,
    createdAuthUser,
    createdPlatformAdmin: !adminByUserId,
  });

  console.log(`Platform admin ready: ${email}`);
  console.log(`Auth user id: ${userId}`);
  console.log(`Platform admin id: ${platformAdmin.id}`);

  if (createdAuthUser && shouldGeneratePassword && !configuredPassword) {
    console.log("");
    console.log(
      "Generated temporary password. Store it securely and rotate it after first login:",
    );
    console.log(password);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
