-- Migration: SLA Tracking and Auto-Escalation
-- Description: Support ticket SLA management and automatic escalation
-- Phase: 3 - Workflows & Automation

-- Create SLA configuration table
CREATE TABLE IF NOT EXISTS sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_priority TEXT NOT NULL CHECK (ticket_priority IN ('low', 'medium', 'high', 'urgent')),
  first_response_hours INTEGER NOT NULL,
  resolution_hours INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_priority)
);

-- Seed default SLA targets
INSERT INTO sla_config (ticket_priority, first_response_hours, resolution_hours)
VALUES
  ('low', 48, 168),      -- 2 days response, 7 days resolution
  ('medium', 24, 72),    -- 1 day response, 3 days resolution
  ('high', 8, 24),       -- 8 hours response, 24 hours resolution
  ('urgent', 2, 8)       -- 2 hours response, 8 hours resolution
ON CONFLICT (ticket_priority) DO NOTHING;

-- Trigger to set SLA targets when ticket is created
CREATE OR REPLACE FUNCTION set_ticket_sla_targets()
RETURNS TRIGGER AS $$
DECLARE
  sla_settings RECORD;
BEGIN
  -- Get SLA settings for this priority
  SELECT * INTO sla_settings
  FROM sla_config
  WHERE ticket_priority = NEW.priority;

  IF FOUND THEN
    -- Set resolution SLA target
    NEW.resolution_sla_target := NEW.created_at + (sla_settings.resolution_hours || ' hours')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_sla_targets_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_sla_targets();

-- Trigger to update SLA targets when priority changes
CREATE OR REPLACE FUNCTION update_ticket_sla_targets()
RETURNS TRIGGER AS $$
DECLARE
  sla_settings RECORD;
BEGIN
  -- Only update if priority changed
  IF NEW.priority != OLD.priority THEN
    -- Get new SLA settings
    SELECT * INTO sla_settings
    FROM sla_config
    WHERE ticket_priority = NEW.priority;

    IF FOUND THEN
      -- Recalculate resolution SLA based on new priority
      NEW.resolution_sla_target := OLD.created_at + (sla_settings.resolution_hours || ' hours')::INTERVAL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_sla_targets_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (NEW.priority IS DISTINCT FROM OLD.priority)
  EXECUTE FUNCTION update_ticket_sla_targets();

-- Function to check and flag SLA breaches
CREATE OR REPLACE FUNCTION check_sla_breaches()
RETURNS TABLE (
  ticket_id UUID,
  ticket_number INTEGER,
  breach_type TEXT,
  breach_time INTERVAL
) AS $$
DECLARE
  ticket_record RECORD;
  sla_settings RECORD;
  first_response_deadline TIMESTAMPTZ;
BEGIN
  FOR ticket_record IN
    SELECT
      st.id,
      st.ticket_number,
      st.priority,
      st.status,
      st.created_at,
      st.first_response_at,
      st.first_response_sla_breach,
      st.resolution_sla_target,
      st.resolution_sla_breach,
      st.resolved_at
    FROM support_tickets st
    WHERE st.status NOT IN ('resolved', 'closed')
  LOOP
    -- Get SLA settings for this priority
    SELECT * INTO sla_settings
    FROM sla_config
    WHERE ticket_priority = ticket_record.priority;

    IF FOUND THEN
      -- Check first response SLA
      IF ticket_record.first_response_at IS NULL THEN
        first_response_deadline := ticket_record.created_at + (sla_settings.first_response_hours || ' hours')::INTERVAL;

        IF NOW() > first_response_deadline AND NOT ticket_record.first_response_sla_breach THEN
          -- Flag first response SLA breach
          UPDATE support_tickets
          SET first_response_sla_breach = true
          WHERE id = ticket_record.id;

          ticket_id := ticket_record.id;
          ticket_number := ticket_record.ticket_number;
          breach_type := 'first_response';
          breach_time := NOW() - first_response_deadline;

          RETURN NEXT;
        END IF;
      END IF;

      -- Check resolution SLA
      IF ticket_record.resolved_at IS NULL AND ticket_record.resolution_sla_target IS NOT NULL THEN
        IF NOW() > ticket_record.resolution_sla_target AND NOT ticket_record.resolution_sla_breach THEN
          -- Flag resolution SLA breach
          UPDATE support_tickets
          SET resolution_sla_breach = true
          WHERE id = ticket_record.id;

          ticket_id := ticket_record.id;
          ticket_number := ticket_record.ticket_number;
          breach_type := 'resolution';
          breach_time := NOW() - ticket_record.resolution_sla_target;

          RETURN NEXT;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-escalate tickets
CREATE OR REPLACE FUNCTION auto_escalate_tickets()
RETURNS TABLE (
  ticket_id UUID,
  old_priority TEXT,
  new_priority TEXT,
  escalation_reason TEXT
) AS $$
DECLARE
  ticket_record RECORD;
  new_priority_value TEXT;
BEGIN
  FOR ticket_record IN
    SELECT
      st.id,
      st.priority,
      st.status,
      st.resolution_sla_breach,
      st.first_response_sla_breach,
      st.created_at
    FROM support_tickets st
    WHERE st.status NOT IN ('resolved', 'closed')
    AND (st.resolution_sla_breach = true OR st.first_response_sla_breach = true)
  LOOP
    -- Escalate priority
    new_priority_value := CASE ticket_record.priority
      WHEN 'low' THEN 'medium'
      WHEN 'medium' THEN 'high'
      WHEN 'high' THEN 'urgent'
      ELSE 'urgent'
    END;

    -- Only escalate if priority can be increased
    IF new_priority_value != ticket_record.priority THEN
      UPDATE support_tickets
      SET priority = new_priority_value
      WHERE id = ticket_record.id;

      -- Create internal note about escalation
      INSERT INTO support_ticket_messages (
        ticket_id,
        message,
        posted_by_type,
        is_internal_note
      ) VALUES (
        ticket_record.id,
        'Ticket automatically escalated from ' || ticket_record.priority || ' to ' || new_priority_value || ' due to SLA breach.',
        'system',
        true
      );

      ticket_id := ticket_record.id;
      old_priority := ticket_record.priority;
      new_priority := new_priority_value;
      escalation_reason := 'sla_breach';

      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get SLA performance metrics
CREATE OR REPLACE FUNCTION get_sla_performance(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_tickets INTEGER,
  first_response_on_time INTEGER,
  first_response_breached INTEGER,
  first_response_rate NUMERIC,
  resolution_on_time INTEGER,
  resolution_breached INTEGER,
  resolution_rate NUMERIC,
  avg_first_response_hours NUMERIC,
  avg_resolution_hours NUMERIC
) AS $$
DECLARE
  v_total INTEGER;
  v_fr_on_time INTEGER;
  v_fr_breach INTEGER;
  v_res_on_time INTEGER;
  v_res_breach INTEGER;
BEGIN
  -- Total tickets in period
  SELECT COUNT(*) INTO v_total
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;

  -- First response stats
  SELECT COUNT(*) INTO v_fr_on_time
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_sla_breach = false
  AND first_response_at IS NOT NULL;

  SELECT COUNT(*) INTO v_fr_breach
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_sla_breach = true;

  -- Resolution stats
  SELECT COUNT(*) INTO v_res_on_time
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolution_sla_breach = false
  AND resolved_at IS NOT NULL;

  SELECT COUNT(*) INTO v_res_breach
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolution_sla_breach = true;

  -- Return results
  total_tickets := v_total;
  first_response_on_time := v_fr_on_time;
  first_response_breached := v_fr_breach;
  first_response_rate := CASE WHEN (v_fr_on_time + v_fr_breach) > 0
    THEN (v_fr_on_time::NUMERIC / (v_fr_on_time + v_fr_breach)::NUMERIC) * 100
    ELSE 0
  END;

  resolution_on_time := v_res_on_time;
  resolution_breached := v_res_breach;
  resolution_rate := CASE WHEN (v_res_on_time + v_res_breach) > 0
    THEN (v_res_on_time::NUMERIC / (v_res_on_time + v_res_breach)::NUMERIC) * 100
    ELSE 0
  END;

  -- Average times
  SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0) INTO avg_first_response_hours
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND first_response_at IS NOT NULL;

  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) INTO avg_resolution_hours
  FROM support_tickets
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  AND resolved_at IS NOT NULL;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE sla_config IS 'SLA targets for support tickets by priority level';
COMMENT ON FUNCTION check_sla_breaches IS 'Check for SLA breaches and flag tickets';
COMMENT ON FUNCTION auto_escalate_tickets IS 'Automatically escalate tickets that have breached SLA';
COMMENT ON FUNCTION get_sla_performance IS 'Get SLA performance metrics for dashboard';
