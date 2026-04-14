-- Migration: Fix email trigger null guard
-- Description: Skip email notifications when restaurant email is NULL to prevent
--              NOT NULL constraint violation on email_notifications.recipient_email.

CREATE OR REPLACE FUNCTION trigger_restaurant_verified_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send if restaurant just got verified and has a non-null email
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_restaurant_suspended_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL AND NEW.email IS NOT NULL THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_suspended',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'suspend_reason', NEW.suspend_reason,
        'suspended_at', NEW.suspended_at
      ),
      'Important: Your restaurant account has been suspended'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_restaurant_unsuspended_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.suspended_at IS NULL AND OLD.suspended_at IS NOT NULL AND NEW.email IS NOT NULL THEN
    PERFORM queue_email_notification(
      NEW.email,
      NEW.name,
      'restaurant_unsuspended',
      jsonb_build_object(
        'restaurant_name', NEW.name,
        'unsuspended_at', NOW()
      ),
      'Your restaurant account has been reactivated'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
