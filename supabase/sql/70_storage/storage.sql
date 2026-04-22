-- 70_storage/storage.sql
-- Canonical storage bucket and object access rules.

\echo '70_storage/storage.sql'

CREATE OR REPLACE FUNCTION public.storage_object_restaurant_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN split_part(object_name, '/', 1) = 'restaurants'
      AND split_part(object_name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    THEN split_part(object_name, '/', 2)::uuid
    ELSE NULL
  END;
$function$;

CREATE OR REPLACE FUNCTION public.storage_object_organization_id(object_name text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT CASE
    WHEN split_part(object_name, '/', 1) = 'organizations'
      AND split_part(object_name, '/', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
    THEN split_part(object_name, '/', 2)::uuid
    ELSE NULL
  END;
$function$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-uploads', 'restaurant-uploads', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

DROP POLICY IF EXISTS "Users can view own restaurant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own restaurant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own restaurant files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own restaurant files" ON storage.objects;

CREATE POLICY "Users can view own restaurant files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );

CREATE POLICY "Users can upload to own restaurant folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );

CREATE POLICY "Users can update own restaurant files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );

CREATE POLICY "Users can delete own restaurant files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'restaurant-uploads'
    AND (
      (
        public.storage_object_restaurant_id(name) IS NOT NULL
        AND (
          public.storage_object_restaurant_id(name) = public.get_user_restaurant_id()
          OR public.is_org_member_for_restaurant(public.storage_object_restaurant_id(name))
        )
      )
      OR (
        public.storage_object_organization_id(name) IS NOT NULL
        AND public.is_org_member(public.storage_object_organization_id(name))
      )
    )
  );
