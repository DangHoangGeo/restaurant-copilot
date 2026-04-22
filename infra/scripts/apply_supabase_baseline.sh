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

require_env "SUPABASE_DB_URL"

echo "Applying canonical Supabase bootstrap to target database."
echo "Expected target: a blank or reset Supabase project database."

cd "${ROOT_DIR}"
psql "${SUPABASE_DB_URL}" -v ON_ERROR_STOP=1 -f supabase/bootstrap.sql
