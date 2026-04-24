-- Skip restaurant approval email notifications when the branch has no email.
--
-- Purpose:
-- - Platform approval verifies linked restaurants.
-- - Some signup-created branches currently have restaurants.email = null.
-- - email_notifications.recipient_email is NOT NULL, so the trigger must not
--   enqueue an email without a recipient.
--
-- Rollout:
-- - Replaces trigger function only; no data rewrite.
--
-- Verification:
-- - Updating a restaurant from is_verified=false to true with email=null succeeds.

CREATE OR REPLACE FUNCTION public.trigger_restaurant_verified_email()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only send if restaurant just got verified and has a recipient email.
  IF NEW.is_verified = true
    AND (OLD.is_verified = false OR OLD.is_verified IS NULL)
    AND NEW.email IS NOT NULL
  THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_approved',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'subdomain', NEW.subdomain,
        'verification_date', NEW.verified_at
      ),
      'Your restaurant has been approved!'
    );
  END IF;

  RETURN NEW;
END;
$function$;
