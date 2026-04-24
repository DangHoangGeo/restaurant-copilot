#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

resolve_supabase_cli() {
  if command -v supabase >/dev/null 2>&1; then
    SUPABASE_CLI=(supabase)
  else
    SUPABASE_CLI=(npx --yes supabase@latest)
  fi
}

require_env "SUPABASE_DB_URL"
resolve_supabase_cli

detect_supabase_db_url_project_ref() {
  local url="$1"
  local project_ref=""

  if [[ "${url}" =~ @db\.([a-z0-9]{20})\.supabase\.co ]]; then
    project_ref="${BASH_REMATCH[1]}"
  fi

  if [[ "${url}" =~ ^postgres(ql)?://([^:/@]+) ]]; then
    local username="${BASH_REMATCH[2]}"
    if [[ "${username}" =~ ^postgres\.([a-z0-9]{20})$ ]]; then
      project_ref="${BASH_REMATCH[1]}"
    fi
  fi

  printf '%s' "${project_ref}"
}

detect_supabase_db_url_host() {
  local url="$1"
  local host=""

  if [[ "${url}" =~ @([^:/?#]+) ]]; then
    host="${BASH_REMATCH[1]}"
  fi

  printf '%s' "${host}"
}

detect_supabase_db_url_port() {
  local url="$1"
  local port=""

  if [[ "${url}" =~ @[^:/?#]+:([0-9]+) ]]; then
    port="${BASH_REMATCH[1]}"
  fi

  printf '%s' "${port}"
}

validate_supabase_db_url() {
  local project_ref
  local host
  local port
  project_ref="$(detect_supabase_db_url_project_ref "${SUPABASE_DB_URL}")"
  host="$(detect_supabase_db_url_host "${SUPABASE_DB_URL}")"
  port="$(detect_supabase_db_url_port "${SUPABASE_DB_URL}")"

  if [[ -n "${SUPABASE_PROJECT_ID:-}" && -n "${project_ref}" && "${project_ref}" != "${SUPABASE_PROJECT_ID}" ]]; then
    echo "SUPABASE_DB_URL points to project ref '${project_ref}', but SUPABASE_PROJECT_ID is '${SUPABASE_PROJECT_ID}'." >&2
    echo "Update the GitHub environment secrets so the database URL and Edge Function project ref target the same Supabase project." >&2
    exit 1
  fi

  if [[ "${SUPABASE_DB_URL}" == *"pooler.supabase.com"* ]]; then
    echo "SUPABASE_DB_URL uses a Supabase shared pooler connection."

    if [[ -z "${project_ref}" ]]; then
      echo "Shared pooler migrations require a username formatted as 'postgres.<project-ref>'." >&2
      echo "Copy the Session pooler connection string from the target project's Connect panel and store it in SUPABASE_DB_URL." >&2
      exit 1
    fi

    if [[ "${port}" == "6543" ]]; then
      echo "SUPABASE_DB_URL points to the transaction pooler on port 6543." >&2
      echo "Use direct Postgres or the Session pooler on port 5432 for schema migrations." >&2
      exit 1
    fi

    if [[ -n "${SUPABASE_PROJECT_ID:-}" ]]; then
      echo "Verified shared pooler username project ref matches SUPABASE_PROJECT_ID."
    fi

    echo "If Supabase reports 'FATAL: (ENOTFOUND) tenant/user ... not found', recopy the Session pooler URL from the target project's Connect panel and verify its project ref and region."
  fi

  if [[ "${host}" == db.*.supabase.co && "${port}" == "6543" ]]; then
    echo "SUPABASE_DB_URL points to a transaction pooler on port 6543." >&2
    echo "Use direct Postgres or the Session pooler on port 5432 for schema migrations." >&2
    exit 1
  fi
}

validate_supabase_db_url

echo "Applying forward-only Supabase migrations to target database."
echo "Expected target: a live or blank project database that should follow supabase/migrations/ history."

cd "${ROOT_DIR}"
"${SUPABASE_CLI[@]}" db push --db-url "${SUPABASE_DB_URL}" --include-all --yes
