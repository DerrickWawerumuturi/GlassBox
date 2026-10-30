-- Controlled, auditable university outreach drafts.
-- The application creates drafts, requires explicit approval, then sends through Resend.
CREATE TABLE IF NOT EXISTS public.outreach_email_drafts (
  id BIGSERIAL PRIMARY KEY,
  prospect_id BIGINT NOT NULL REFERENCES public.outreach_prospects(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  text_body TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'sending', 'sent', 'failed', 'cancelled')),
  idempotency_key TEXT NOT NULL UNIQUE,
  resend_email_id TEXT UNIQUE,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  sending_started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_email_drafts_status_created_idx
  ON public.outreach_email_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_email_drafts_prospect_idx
  ON public.outreach_email_drafts (prospect_id, created_at DESC);
