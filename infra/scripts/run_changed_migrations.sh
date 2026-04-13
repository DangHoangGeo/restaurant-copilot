#!/usr/bin/env bash

set -euo pipefail

readonly ZERO_SHA="0000000000000000000000000000000000000000"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_env "SUPABASE_DB_URL"
require_env "MIGRATION_HEAD_SHA"

base_sha="${MIGRATION_BASE_SHA:-}"
head_sha="${MIGRATION_HEAD_SHA}"

if [[ -z "${base_sha}" || "${base_sha}" == "${ZERO_SHA}" ]]; then
  base_sha="$(git rev-list --max-parents=0 "${head_sha}" | tail -n 1)"
fi

mapfile -t changed_existing_migrations < <(
  git diff --name-only --diff-filter=MRD "${base_sha}" "${head_sha}" -- infra/migrations \
    | sort -V
)

if (( ${#changed_existing_migrations[@]} > 0 )); then
  echo "Refusing to run because existing migration files were modified, renamed, or deleted:" >&2
  printf ' - %s\n' "${changed_existing_migrations[@]}" >&2
  echo "Create a new SQL migration file under infra/migrations instead of rewriting an applied one." >&2
  exit 1
fi

mapfile -t added_migrations < <(
  git diff --name-only --diff-filter=A "${base_sha}" "${head_sha}" -- infra/migrations \
    | sort -V
)

if (( ${#added_migrations[@]} == 0 )); then
  echo "No new SQL migrations were added in this push."
  exit 0
fi

psql "${SUPABASE_DB_URL}" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.github_action_migrations (
  filename text PRIMARY KEY,
  applied_commit_sha text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for file in "${added_migrations[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Migration file does not exist: ${file}" >&2
    exit 1
  fi

  already_applied="$(
    psql "${SUPABASE_DB_URL}" \
      -v ON_ERROR_STOP=1 \
      -v filename="${file}" \
      -Atqc "SELECT 1 FROM public.github_action_migrations WHERE filename = :'filename' LIMIT 1;"
  )"

  if [[ "${already_applied}" == "1" ]]; then
    echo "Skipping already applied migration: ${file}"
    continue
  fi

  echo "Applying migration: ${file}"
  psql "${SUPABASE_DB_URL}" -v ON_ERROR_STOP=1 -f "${file}"

  psql "${SUPABASE_DB_URL}" \
    -v ON_ERROR_STOP=1 \
    -v filename="${file}" \
    -v commit_sha="${head_sha}" \
    -c "INSERT INTO public.github_action_migrations (filename, applied_commit_sha) VALUES (:'filename', :'commit_sha');"
done
