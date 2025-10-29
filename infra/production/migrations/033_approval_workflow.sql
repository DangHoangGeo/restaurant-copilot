-- Migration: Approval Workflow Functions
-- Description: Email notifications and triggers for restaurant approval workflow
-- Phase: 3 - Workflows & Automation

-- Create email notification queue table
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  template_name TEXT NOT NULL,
  template_data JSONB DEFAULT '{}'::jsonb,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Create index for processing pending emails
CREATE INDEX idx_email_notifications_pending ON email_notifications(status, created_at)
  WHERE status = 'pending';

-- Function to queue an email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_template_name TEXT,
  p_template_data JSONB,
  p_subject TEXT
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO email_notifications (
    recipient_email,
    recipient_name,
    template_name,
    template_data,
    subject
  ) VALUES (
    p_recipient_email,
    p_recipient_name,
    p_template_name,
    p_template_data,
    p_subject
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Send welcome email when restaurant is verified
CREATE OR REPLACE FUNCTION trigger_restaurant_verified_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send if restaurant just got verified (wasn't verified before)
  IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
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

CREATE TRIGGER restaurant_verified_email_trigger
  AFTER UPDATE ON restaurants
  FOR EACH ROW
  WHEN (NEW.is_verified = true AND OLD.is_verified = false)
  EXECUTE FUNCTION trigger_restaurant_verified_email();

-- Trigger function: Send rejection email (when restaurant is deleted while unverified)
CREATE OR REPLACE FUNCTION trigger_restaurant_rejection_email()
RETURNS TRIGGER AS $$
BEGIN
  -- If restaurant was not verified and is being deleted, send rejection email
  IF OLD.is_verified = false THEN
    PERFORM queue_email_notification(
      OLD.email,
      OLD.name,
      'restaurant_rejected',
      jsonb_build_object(
        'restaurant_name', OLD.name,
        'rejection_date', NOW()
      ),
      'Update regarding your restaurant application'
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Note: Uncommenting this trigger requires explicit rejection workflow
-- CREATE TRIGGER restaurant_rejection_email_trigger
--   BEFORE DELETE ON restaurants
--   FOR EACH ROW
--   WHEN (OLD.is_verified = false)
--   EXECUTE FUNCTION trigger_restaurant_rejection_email();

-- Trigger function: Send suspension notification
CREATE OR REPLACE FUNCTION trigger_restaurant_suspended_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send if restaurant just got suspended
  IF NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL THEN
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

CREATE TRIGGER restaurant_suspended_email_trigger
  AFTER UPDATE ON restaurants
  FOR EACH ROW
  WHEN (NEW.suspended_at IS NOT NULL AND OLD.suspended_at IS NULL)
  EXECUTE FUNCTION trigger_restaurant_suspended_email();

-- Trigger function: Send unsuspension notification
CREATE OR REPLACE FUNCTION trigger_restaurant_unsuspended_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send if restaurant just got unsuspended
  IF NEW.suspended_at IS NULL AND OLD.suspended_at IS NOT NULL THEN
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

CREATE TRIGGER restaurant_unsuspended_email_trigger
  AFTER UPDATE ON restaurants
  FOR EACH ROW
  WHEN (NEW.suspended_at IS NULL AND OLD.suspended_at IS NOT NULL)
  EXECUTE FUNCTION trigger_restaurant_unsuspended_email();

-- Helper function to manually reject a restaurant application
CREATE OR REPLACE FUNCTION reject_restaurant_application(
  rest_id UUID,
  admin_id UUID,
  rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_restaurant RECORD;
BEGIN
  -- Check if caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can reject applications';
  END IF;

  -- Get restaurant details
  SELECT * INTO v_restaurant
  FROM restaurants
  WHERE id = rest_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Queue rejection email
  PERFORM queue_email_notification(
    v_restaurant.email,
    v_restaurant.name,
    'restaurant_rejected',
    jsonb_build_object(
      'restaurant_name', v_restaurant.name,
      'rejection_reason', rejection_reason,
      'rejection_date', NOW()
    ),
    'Update regarding your restaurant application'
  );

  -- Log the rejection
  PERFORM log_platform_action(
    'reject_restaurant_application',
    'restaurant',
    rest_id,
    rest_id,
    jsonb_build_object('reason', rejection_reason)
  );

  -- Mark as inactive instead of deleting
  UPDATE restaurants
  SET
    is_active = false,
    platform_notes = COALESCE(platform_notes || E'\n\n', '') ||
      'Rejected: ' || rejection_reason || ' (by admin ' || admin_id::text || ' at ' || NOW()::text || ')'
  WHERE id = rest_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE email_notifications IS 'Queue for outgoing email notifications';
COMMENT ON FUNCTION queue_email_notification IS 'Queue an email notification for async sending';
COMMENT ON FUNCTION reject_restaurant_application IS 'Reject a restaurant application and send notification email';
