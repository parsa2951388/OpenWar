-- Open War authentication foundation.
-- PostgreSQL 18-compatible. Application-generated UUIDs; no extensions required.
-- This migration is intentionally additive: existing guest JWTs and player IDs
-- remain valid until the account service explicitly upgrades a guest session.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id UUID PRIMARY KEY,
  email TEXT,
  email_normalized TEXT,
  password_hash TEXT,
  email_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'locked', 'disabled', 'deletion_pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_authenticated_at TIMESTAMPTZ,
  CHECK ((email IS NULL) = (email_normalized IS NULL))
);

-- Application normalizes email before insert/update (trim + Unicode NFC +
-- case-fold policy). A partial unique index permits OAuth-only accounts
-- whose provider does not return an email address.
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_email_normalized_uq
  ON auth_accounts (email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_account_identities (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT,
  provider_email_verified BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject),
  UNIQUE (account_id, provider)
);

CREATE INDEX IF NOT EXISTS auth_account_identities_account_idx
  ON auth_account_identities (account_id);

-- A permanent account adopts the current guest persistent ID on first
-- registration/link. This keeps player history, settings and public profile
-- references stable across the guest-to-account transition.
CREATE TABLE IF NOT EXISTS auth_account_players (
  account_id UUID PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
  persistent_id UUID NOT NULL UNIQUE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  token_family_id UUID NOT NULL,
  refresh_token_hash BYTEA NOT NULL UNIQUE
    CHECK (octet_length(refresh_token_hash) = 32),
  token_generation INTEGER NOT NULL DEFAULT 0 CHECK (token_generation >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  user_agent TEXT,
  created_ip_hash BYTEA
);

CREATE INDEX IF NOT EXISTS auth_sessions_account_active_idx
  ON auth_sessions (account_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON auth_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_email_challenges (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL
    CHECK (purpose IN ('verify_email', 'reset_password', 'change_email')),
  token_hash BYTEA NOT NULL UNIQUE
    CHECK (octet_length(token_hash) = 32),
  target_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_email_challenges_active_idx
  ON auth_email_challenges (account_id, purpose, expires_at DESC)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_oauth_transactions (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'link')),
  account_id UUID REFERENCES auth_accounts(id) ON DELETE CASCADE,
  state_hash BYTEA NOT NULL UNIQUE
    CHECK (octet_length(state_hash) = 32),
  nonce_hash BYTEA NOT NULL
    CHECK (octet_length(nonce_hash) = 32),
  code_verifier_ciphertext BYTEA,
  return_path TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CHECK (
    (purpose = 'login' AND account_id IS NULL) OR
    (purpose = 'link' AND account_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS auth_oauth_transactions_expiry_idx
  ON auth_oauth_transactions (expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id UUID REFERENCES auth_accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS auth_audit_events_account_time_idx
  ON auth_audit_events (account_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS auth_audit_events_time_idx
  ON auth_audit_events (occurred_at);

INSERT INTO schema_migrations (version)
VALUES ('0001_authentication_foundation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
