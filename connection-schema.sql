CREATE TABLE IF NOT EXISTS telegram_connections (
  id TEXT PRIMARY KEY,
  poll_hash TEXT NOT NULL,
  expires INTEGER NOT NULL,
  identity TEXT
);
CREATE INDEX IF NOT EXISTS telegram_connections_expiry ON telegram_connections(expires);
