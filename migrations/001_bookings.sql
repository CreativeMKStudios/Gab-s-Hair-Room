CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
