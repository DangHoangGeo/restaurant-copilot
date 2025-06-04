CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid REFERENCES restaurants(id),
  user_id uuid REFERENCES users(id),
  level text CHECK (level IN ('INFO','WARN','ERROR','DEBUG')),
  endpoint text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
