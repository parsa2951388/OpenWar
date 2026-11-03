-- Add replay-detection history and browser binding for OAuth transactions.
-- Existing guest tokens/cookies remain valid; this migration is additive.

BEGIN;

ALTER TABLE auth_oauth_transactions
  ADD COLUMN IF NOT EXISTS persistent_id UUID,
  ADD COLUMN IF NOT EXISTS browser_binding_hash BYTEA,
  ADD COLUMN IF NOT EXISTS provider_profile JSONB;

CREATE TABLE IF NOT EXISTS auth_refresh_token_history (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  token_hash BYTEA NOT NULL UNIQUE
    CHECK (octet_length(token_hash) = 32),
  token_generation INTEGER NOT NULL CHECK (token_generation >= 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  UNIQUE (session_id, token_generation)
);

CREATE INDEX IF NOT EXISTS auth_refresh_token_history_session_idx
  ON auth_refresh_token_history (session_id, token_generation DESC);

ALTER TABLE auth_account_identities
  ADD COLUMN IF NOT EXISTS provider_profile JSONB;

INSERT INTO schema_migrations (version)
VALUES ('0002_auth_session_replay_and_oauth_binding')
ON CONFLICT (version) DO NOTHING;

COMMIT;
