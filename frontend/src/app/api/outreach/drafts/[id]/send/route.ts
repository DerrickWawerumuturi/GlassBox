import { NextResponse } from "next/server";
import { outreachDatabase, requireOutreachAdmin } from "@/lib/outreach-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendSendResponse = { id?: string; message?: string };
type OutreachDraft = {
  idempotency_key: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  text_body: string;
  html_body: string;
  prospect_id: number;
  prospect_campaign: string | null;
  utm_url: string | null;
};

type TransactionQuery = {
  unsafe(query: string, parameters?: any[]): Promise<any[]>;
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireOutreachAdmin();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid draft id" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 503 });

  const sql = outreachDatabase();
  let draft: OutreachDraft | undefined;
  try {
    draft = await sql.begin(async (transaction) => {
      const tx = transaction as unknown as TransactionQuery;
      const rows = await tx.unsafe(
        `SELECT d.*, p.organisation, p.contact_email AS current_contact_email,
                p.opted_out_at, p.status AS prospect_status, p.campaign AS prospect_campaign,
                p.utm_url
         FROM public.outreach_email_drafts d
         JOIN public.outreach_prospects p ON p.id = d.prospect_id
         WHERE d.id = $1
         FOR UPDATE OF d, p`,
        [id],
      );
      const row = rows[0] as (OutreachDraft & {
        status: string;
        sending_started_at: Date | string | null;
        current_contact_email: string | null;
        opted_out_at: Date | string | null;
        prospect_status: string;
      }) | undefined;
      if (!row) throw new Error("DRAFT_NOT_FOUND");
      if (row.status === "sent") throw new Error("ALREADY_SENT");
      if (row.sending_started_at &&
          Date.now() - new Date(row.sending_started_at).getTime() > 23 * 60 * 60 * 1000 &&
          row.status !== "sent") {
        throw new Error("RECONCILIATION_REQUIRED");
      }
      if (row.status !== "approved" &&
          !(row.status === "sending" && row.sending_started_at &&
            Date.now() - new Date(row.sending_started_at).getTime() > 5 * 60 * 1000)) {
        throw new Error("NOT_APPROVED_OR_ALREADY_SENDING");
      }

      const recipient = row.recipient_email.trim().toLowerCase();
      const currentRecipient = String(row.current_contact_email ?? "").trim().toLowerCase();
      if (recipient !== currentRecipient) throw new Error("RECIPIENT_CHANGED");
      if (row.opted_out_at || row.prospect_status === "opted_out") throw new Error("PROSPECT_OPTED_OUT");

      const claimedRows = await tx.unsafe(
        `UPDATE public.outreach_email_drafts
         SET status = 'sending', sending_started_at = now(), updated_at = now(), last_error = NULL
         WHERE id = $1
         RETURNING *`,
        [id],
      );
      // UPDATE ... RETURNING * contains only draft columns. Preserve the joined
      // prospect campaign and UTM fields selected above for the post-send write.
      return { ...row, ...claimedRows[0] } as OutreachDraft;
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "DRAFT_NOT_FOUND" ? 404 : 409;
    const messages: Record<string, string> = {
      DRAFT_NOT_FOUND: "Draft not found",
      ALREADY_SENT: "This draft has already been sent",
      NOT_APPROVED_OR_ALREADY_SENDING: "Draft must be approved and not currently sending",
      RECONCILIATION_REQUIRED: "This send attempt is older than Resend's 24-hour idempotency window. Reconcile the delivery status before retrying.",
      RECIPIENT_CHANGED: "The prospect email changed after this draft was created. Create and approve a fresh draft.",
      PROSPECT_OPTED_OUT: "This prospect has opted out and cannot be contacted",
    };
    if (messages[code]) return NextResponse.json({ error: messages[code] }, { status });
    console.error("Unable to claim outreach draft", error);
    return NextResponse.json({ error: "Unable to prepare outreach email" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": draft.idempotency_key,
      },
      body: JSON.stringify({
        from: draft.sender_email,
        to: [draft.recipient_email],
        subject: draft.subject,
        text: draft.text_body,
        html: draft.html_body,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const result = await response.json().catch(() => ({})) as ResendSendResponse;
    if (!response.ok || !result.id) {
      const detail = typeof result.message === "string" ? result.message.slice(0, 500) : `Resend returned HTTP ${response.status}`;
      await sql`
        UPDATE public.outreach_email_drafts
        SET status = 'approved', last_error = ${detail}, updated_at = now()
        WHERE id = ${id} AND status = 'sending'
      `;
      return NextResponse.json({ error: "Resend could not send this email", detail }, { status: 502 });
    }

    const resendEmailId = result.id;
    await sql.begin(async (transaction) => {
      const tx = transaction as unknown as TransactionQuery;
      await tx.unsafe(
        `UPDATE public.outreach_email_drafts
         SET status = 'sent', resend_email_id = $1, sent_at = now(),
             updated_at = now(), last_error = NULL
         WHERE id = $2`,
        [resendEmailId, id],
      );
      await tx.unsafe(
        `INSERT INTO public.outreach_messages
          (prospect_id, resend_email_id, recipient_email, sender_email, subject,
           campaign, utm_url, status, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', now())
         ON CONFLICT (resend_email_id) DO NOTHING`,
        [
          draft!.prospect_id,
          resendEmailId,
          draft!.recipient_email,
          draft!.sender_email,
          draft!.subject,
          draft!.prospect_campaign ?? null,
          draft!.utm_url ?? null,
        ],
      );
      await tx.unsafe(
        `UPDATE public.outreach_messages m
         SET status = CASE
               WHEN EXISTS (SELECT 1 FROM public.resend_webhook_events e WHERE e.resend_email_id = $1 AND e.event_type = 'email.complained') THEN 'complained'
               WHEN EXISTS (SELECT 1 FROM public.resend_webhook_events e WHERE e.resend_email_id = $1 AND e.event_type IN ('email.bounced', 'email.failed', 'email.suppressed')) THEN 'bounced'
               WHEN EXISTS (SELECT 1 FROM public.resend_webhook_events e WHERE e.resend_email_id = $1 AND e.event_type = 'email.delivered') THEN 'delivered'
               ELSE 'sent'
             END,
             delivered_at = (SELECT min(e.received_at) FROM public.resend_webhook_events e WHERE e.resend_email_id = $1 AND e.event_type = 'email.delivered'),
             bounced_at = (SELECT min(e.received_at) FROM public.resend_webhook_events e WHERE e.resend_email_id = $1 AND e.event_type IN ('email.bounced', 'email.failed', 'email.suppressed')),
             complained_at = (SELECT min(e.received_at) FROM public.resend_webhook_events e WHERE e.resend_email_id = $1 AND e.event_type = 'email.complained')
         WHERE m.resend_email_id = $1`,
        [resendEmailId],
      );
      await tx.unsafe(
        `UPDATE public.outreach_prospects
         SET status = 'contacted', last_contacted_at = now(), updated_at = now()
         WHERE id = $1`,
        [draft!.prospect_id],
      );
      await tx.unsafe(
        `UPDATE public.outreach_prospects p
         SET opted_out_at = COALESCE(p.opted_out_at, now()), status = 'opted_out', updated_at = now()
         WHERE EXISTS (
           SELECT 1 FROM public.resend_webhook_events e
           WHERE e.resend_email_id = $1 AND e.event_type = 'email.complained'
         ) AND p.id = $2`,
        [resendEmailId, draft!.prospect_id],
      );
    });

    return NextResponse.json({ ok: true, resendEmailId, status: "sent" });
  } catch (error) {
    console.error("Outreach email send failed", error);
    const detail = error instanceof Error ? error.message.slice(0, 300) : "Unknown sending error";
    await sql`
      UPDATE public.outreach_email_drafts
      SET status = 'approved', last_error = ${detail}, updated_at = now()
      WHERE id = ${id} AND status = 'sending'
    `.catch((dbError) => console.error("Failed to restore outreach draft after send error", dbError));
    return NextResponse.json({ error: "Email send failed; it remains approved for a safe retry" }, { status: 502 });
  } finally {
    await sql.end({ timeout: 2 });
  }
}
