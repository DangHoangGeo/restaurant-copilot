-- Canonical extensions for a fresh Supabase project.
-- Keep this file idempotent so CI can safely re-apply it.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
