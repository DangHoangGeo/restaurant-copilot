-- Purpose: move employee bank account numbers out of plaintext storage.
-- Rollout assumptions:
-- - pgcrypto is enabled.
-- - Before applying this migration to an environment with existing plaintext
--   bank account numbers, configure one of:
--   1. app.employee_bank_encryption_key database setting, or
--   2. Supabase Vault secret named employee_bank_account_key.
-- Verification:
-- - Existing bank_account_number values are encrypted into bytea storage.
-- - public.get_employee_bank_account(employee_id) returns plaintext only for
--   service-role or owner/manager callers.

CREATE OR REPLACE FUNCTION public.get_employee_bank_encryption_key()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  key_value text;
BEGIN
  key_value := NULLIF(current_setting('app.employee_bank_encryption_key', true), '');

  IF key_value IS NOT NULL THEN
    RETURN key_value;
  END IF;

  IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
    BEGIN
      EXECUTE
        'SELECT decrypted_secret::text FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
      INTO key_value
      USING 'employee_bank_account_key';
    EXCEPTION
      WHEN undefined_table OR undefined_column OR insufficient_privilege THEN
        key_value := NULL;
    END;
  END IF;

  RETURN NULLIF(key_value, '');
END;
$function$;

COMMENT ON FUNCTION public.get_employee_bank_encryption_key() IS
  'Resolve the encryption key for employee bank account data from app settings or Supabase Vault';

CREATE OR REPLACE FUNCTION public.encrypt_employee_bank_account_number(p_account_number text)
 RETURNS bytea
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key text;
BEGIN
  IF p_account_number IS NULL OR btrim(p_account_number) = '' THEN
    RETURN NULL;
  END IF;

  encryption_key := public.get_employee_bank_encryption_key();
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Employee bank account encryption key is not configured'
      USING ERRCODE = '22023';
  END IF;

  RETURN pgp_sym_encrypt(
    p_account_number,
    encryption_key,
    'cipher-algo=aes256, compress-algo=1'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_employee_bank_account_number(p_account_number_encrypted bytea)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key text;
BEGIN
  IF p_account_number_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  encryption_key := public.get_employee_bank_encryption_key();
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Employee bank account encryption key is not configured'
      USING ERRCODE = '22023';
  END IF;

  RETURN pgp_sym_decrypt(p_account_number_encrypted, encryption_key);
END;
$function$;

ALTER TABLE public.employee_private_profiles
  ADD COLUMN IF NOT EXISTS bank_account_number_encrypted bytea;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employee_private_profiles'
      AND column_name = 'bank_account_number'
  ) THEN
    UPDATE public.employee_private_profiles
    SET bank_account_number_encrypted = public.encrypt_employee_bank_account_number(bank_account_number)
    WHERE bank_account_number IS NOT NULL
      AND bank_account_number_encrypted IS NULL;
  END IF;
END $$;

ALTER TABLE public.employee_private_profiles
  DROP COLUMN IF EXISTS bank_account_number;

COMMENT ON COLUMN public.employee_private_profiles.bank_account_number_encrypted IS
  'Encrypted employee bank account number. Decrypt only through authorized helper functions.';

CREATE OR REPLACE FUNCTION public.get_employee_bank_account(p_employee_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_restaurant_id uuid;
  encrypted_account_number bytea;
BEGIN
  SELECT restaurant_id, bank_account_number_encrypted
  INTO profile_restaurant_id, encrypted_account_number
  FROM public.employee_private_profiles
  WHERE employee_id = p_employee_id;

  IF NOT FOUND OR encrypted_account_number IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (
    public.is_service_role()
    OR public.user_has_restaurant_role(profile_restaurant_id, ARRAY['owner'::text, 'manager'::text])
  ) THEN
    RAISE EXCEPTION 'Not authorized to read employee bank account data'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.decrypt_employee_bank_account_number(encrypted_account_number);
END;
$function$;

COMMENT ON FUNCTION public.get_employee_bank_account(uuid) IS
  'Return a decrypted employee bank account number only for service-role or authorized branch managers';

CREATE OR REPLACE FUNCTION public.set_employee_bank_account(p_employee_id uuid, p_account_number text, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  employee_restaurant_id uuid;
  encrypted_account_number bytea;
BEGIN
  SELECT restaurant_id
  INTO employee_restaurant_id
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_service_role()
    OR public.user_has_restaurant_role(employee_restaurant_id, ARRAY['owner'::text, 'manager'::text])
  ) THEN
    RAISE EXCEPTION 'Not authorized to update employee bank account data'
      USING ERRCODE = '42501';
  END IF;

  encrypted_account_number := public.encrypt_employee_bank_account_number(p_account_number);

  INSERT INTO public.employee_private_profiles (
    employee_id,
    restaurant_id,
    bank_account_number_encrypted,
    updated_by,
    updated_at
  )
  VALUES (
    p_employee_id,
    employee_restaurant_id,
    encrypted_account_number,
    COALESCE(p_updated_by, auth.uid()),
    now()
  )
  ON CONFLICT (employee_id) DO UPDATE
  SET
    bank_account_number_encrypted = EXCLUDED.bank_account_number_encrypted,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END;
$function$;

COMMENT ON FUNCTION public.set_employee_bank_account(uuid, text, uuid) IS
  'Encrypt and store an employee bank account number through an authorized server or manager action';

GRANT EXECUTE ON FUNCTION public.get_employee_bank_account(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_employee_bank_account(uuid, text, uuid) TO authenticated, service_role;
