# Glassbox outreach sending setup

The outreach workflow is deliberately approval-gated. Prospect research and draft creation do not send email.

## Required Vercel environment variables

Set these on the Glassbox Vercel project for Production (and Preview only if you intend to test there):

- `RESEND_API_KEY`: a Resend API key with sending access for the verified sender domain.
- `OUTREACH_FROM_EMAIL`: verified sender, for example `Glassbox <outreach@your-verified-domain>`.
- `OUTREACH_ADMIN_EMAILS`: comma-separated allowlist of Google sign-in email addresses permitted to view, create, approve, and send outreach.
- `OUTREACH_APP_DATABASE_URL`: PostgreSQL connection string for a dedicated role with the grants listed below.
- Keep `OUTREACH_DATABASE_URL` for the webhook's least-privilege event-ingestion connection; do not reuse it for the application workflow.

Never put the Resend API key in a `NEXT_PUBLIC_*` variable or commit it to the repository. For local development, use `frontend/.env.local` and keep that file out of Git.

## Database migration and role grants

Apply `backend/src/database/migrations/022_outreach_email_drafts.sql` to the production Neon branch before deploying the new API routes.

Create a dedicated login role for `OUTREACH_APP_DATABASE_URL`. Grant it:
- SELECT on `outreach_prospects`, `outreach_messages`, and `resend_webhook_events`.
- INSERT and UPDATE on `outreach_prospects`, `outreach_messages`, and `outreach_email_drafts`.
- SELECT on `outreach_email_drafts`.
- USAGE and SELECT on the sequence backing `outreach_email_drafts.id`.

Do not grant this role access to CVs, users, jobs, or other Glassbox product data.

## API flow

1. `GET /api/outreach/drafts` — list prospects and drafts (admin allowlist only).
2. `POST /api/outreach/drafts` — create a pending-approval draft. The recipient is read from the prospect record, never accepted from the request body. Every request must include `purpose: "initial"` or `purpose: "follow_up"`.
   - Prospects with verified prior contact history must use `purpose: "follow_up"`; an initial-introduction draft is rejected.
   - Prospects marked `previously_contacted_unverified` are blocked until their history and recipient are verified.
   - A follow-up is rejected unless a prior contact timestamp or recognised contacted status exists.
3. `POST /api/outreach/drafts/:id/approve` — explicitly approve one draft.
4. `POST /api/outreach/drafts/:id/send` — send only an approved draft through Resend.

Sending uses a stable Resend idempotency key per draft. The API rechecks that the prospect's current email still matches the stored recipient and that the prospect has not opted out. Delivery events are reconciled even if Resend's webhook arrives before the send request finishes writing its message record.

## Controlled rollout

- First use Resend's `delivered@resend.dev` test address only with a dedicated test prospect.
- Confirm `email.sent` and `email.delivered` events in `resend_webhook_events` and the matching `outreach_messages` record.
- Then create and approve one real university draft. Review the exact recipient, subject, and body before calling the send endpoint.
- Do not bulk-send until the first real message is confirmed delivered.
