CREATE TABLE IF NOT EXISTS gateway_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_group TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gateway_failures_created
  ON gateway_failures(created_at DESC);
