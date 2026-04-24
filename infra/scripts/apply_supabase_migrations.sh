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

validate_supabase_db_url() {
  local project_ref
  project_ref="$(detect_supabase_db_url_project_ref "${SUPABASE_DB_URL}")"

  if [[ -n "${SUPABASE_PROJECT_ID:-}" && -n "${project_ref}" && "${project_ref}" != "${SUPABASE_PROJECT_ID}" ]]; then
    echo "SUPABASE_DB_URL points to project ref '${project_ref}', but SUPABASE_PROJECT_ID is '${SUPABASE_PROJECT_ID}'." >&2
    echo "Update the GitHub environment secrets so the database URL and Edge Function project ref target the same Supabase project." >&2
    exit 1
  fi

  if [[ "${SUPABASE_DB_URL}" == *"pooler.supabase.com"* ]]; then
    echo "SUPABASE_DB_URL uses a Supabase shared pooler connection."
    echo "If Supabase reports 'FATAL: (ENOTFOUND) tenant/user ... not found', recopy the Session pooler URL from the target project's Connect panel and verify its project ref and region."
  fi

  if [[ "${SUPABASE_DB_URL}" == *"pooler.supabase.com:6543"* ]]; then
    echo "Warning: transaction pooler port 6543 is optimized for short-lived app queries. Use direct Postgres or the Session pooler on port 5432 for schema migrations." >&2
  fi
}

validate_supabase_db_url

echo "Applying forward-only Supabase migrations to target database."
echo "Expected target: a live or blank project database that should follow supabase/migrations/ history."
