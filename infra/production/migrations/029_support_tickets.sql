-- Migration: Support Tickets
-- Description: Creates support_tickets and support_ticket_messages tables for customer support
-- Phase: 0 - Foundations

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ticket_number SERIAL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('billing', 'technical', 'feature_request', 'bug_report', 'account', 'general')),
  status TEXT NOT NULL CHECK (status IN ('new', 'investigating', 'waiting_customer', 'resolved', 'closed')) DEFAULT 'new',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',

  -- Submitter information
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_role TEXT,

  -- Assignment
  assigned_to UUID REFERENCES platform_admins(id),
  assigned_at TIMESTAMPTZ,

  -- SLA tracking
  first_response_at TIMESTAMPTZ,
  first_response_sla_breach BOOLEAN DEFAULT false,
  resolution_sla_target TIMESTAMPTZ,
  resolution_sla_breach BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  resolution_notes TEXT,

  UNIQUE(ticket_number)
);

-- Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  posted_by_type TEXT NOT NULL CHECK (posted_by_type IN ('restaurant', 'platform_admin', 'system')),
  posted_by UUID REFERENCES auth.users(id),
  poster_name TEXT,
  is_internal_note BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES auth.users(id)
);

-- Create indexes for support_tickets
CREATE INDEX idx_support_tickets_restaurant_id ON support_tickets(restaurant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_sla_breach ON support_tickets(resolution_sla_breach, status) WHERE status NOT IN ('resolved', 'closed');

-- Create indexes for support_ticket_messages
CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id, created_at);
CREATE INDEX idx_support_ticket_messages_posted_by ON support_ticket_messages(posted_by);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Restaurants can read their own tickets
CREATE POLICY support_tickets_restaurant_read ON support_tickets
  FOR SELECT
  USING (restaurant_id = (auth.jwt()->>'restaurant_id')::UUID);

-- RLS Policy: Restaurants can create tickets
CREATE POLICY support_tickets_restaurant_insert ON support_tickets
  FOR INSERT
  WITH CHECK (restaurant_id = (auth.jwt()->>'restaurant_id')::UUID);

-- RLS Policy: Platform admins can read all tickets
CREATE POLICY support_tickets_platform_admin_all ON support_tickets
  FOR ALL
  USING (is_platform_admin());

-- RLS Policy: Restaurants can read messages for their tickets
CREATE POLICY support_ticket_messages_restaurant_read ON support_ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND st.restaurant_id = (auth.jwt()->>'restaurant_id')::UUID
    )
    AND is_internal_note = false
  );

-- RLS Policy: Restaurants can create messages for their tickets
CREATE POLICY support_ticket_messages_restaurant_insert ON support_ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND st.restaurant_id = (auth.jwt()->>'restaurant_id')::UUID
    )
  );

-- RLS Policy: Platform admins can do everything with messages
CREATE POLICY support_ticket_messages_platform_admin_all ON support_ticket_messages
  FOR ALL
  USING (is_platform_admin());

-- Create updated_at trigger for tickets
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Trigger to set first_response_at when platform admin first replies
CREATE OR REPLACE FUNCTION set_first_response_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.posted_by_type = 'platform_admin' THEN
    UPDATE support_tickets
    SET first_response_at = COALESCE(first_response_at, NEW.created_at)
    WHERE id = NEW.ticket_id
    AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_ticket_messages_first_response
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_first_response_timestamp();

-- Helper function to get ticket summary
CREATE OR REPLACE FUNCTION get_support_ticket_summary(rest_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_tickets BIGINT,
  new_tickets BIGINT,
  investigating_tickets BIGINT,
  waiting_customer_tickets BIGINT,
  resolved_tickets BIGINT,
  closed_tickets BIGINT,
  sla_breached_tickets BIGINT,
  avg_resolution_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE status = 'new') as new_tickets,
    COUNT(*) FILTER (WHERE status = 'investigating') as investigating_tickets,
    COUNT(*) FILTER (WHERE status = 'waiting_customer') as waiting_customer_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
    COUNT(*) FILTER (WHERE resolution_sla_breach = true) as sla_breached_tickets,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_hours
  FROM support_tickets
  WHERE rest_id IS NULL OR restaurant_id = rest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE support_tickets IS 'Customer support tickets from restaurant tenants';
COMMENT ON TABLE support_ticket_messages IS 'Threaded messages within support tickets';
COMMENT ON FUNCTION get_support_ticket_summary IS 'Get summary statistics for support tickets';
