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

echo "Applying forward-only Supabase migrations to target database."
echo "Expected target: a live or blank project database that should follow supabase/migrations/ history."

cd "${ROOT_DIR}"
"${SUPABASE_CLI[@]}" db push --db-url "${SUPABASE_DB_URL}" --include-all --yes
