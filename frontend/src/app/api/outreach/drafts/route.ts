import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  outreachDatabase,
  plainTextToHtml,
  requireOutreachAdmin,
} from "@/lib/outreach-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const access = await requireOutreachAdmin();
  if ("response" in access) return access.response;

  const sql = outreachDatabase();
  try {
    const [prospects, drafts] = await Promise.all([
      sql`
        SELECT id, organisation, category, country, website, contact_name,
               contact_role, contact_email, source_url, verification_notes,
               fit_rationale, personalisation_angle, campaign, priority, status,
               last_contacted_at, follow_up_at, opted_out_at
        FROM public.outreach_prospects
        ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                 created_at DESC
        LIMIT 200
      `,
      sql`
        SELECT d.id, d.prospect_id, p.organisation, d.recipient_email,
               d.sender_email, d.subject, d.text_body, d.status,
               d.resend_email_id, d.approved_at, d.sent_at, d.last_error,
               d.created_at, d.updated_at
        FROM public.outreach_email_drafts d
        JOIN public.outreach_prospects p ON p.id = d.prospect_id
        ORDER BY d.created_at DESC
        LIMIT 200
      `,
    ]);
    return NextResponse.json({ prospects, drafts });
  } catch (error) {
    console.error("Outreach draft listing failed", error);
    return NextResponse.json({ error: "Unable to load outreach records" }, { status: 500 });
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function POST(request: Request) {
  const access = await requireOutreachAdmin();
  if ("response" in access) return access.response;

  let body: { prospectId?: unknown; subject?: unknown; textBody?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prospectId = Number(body.prospectId);
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const textBody = typeof body.textBody === "string" ? body.textBody.trim() : "";
  if (!Number.isSafeInteger(prospectId) || prospectId < 1 ||
      !subject || subject.length > 180 || !textBody || textBody.length > 20000) {
    return NextResponse.json({ error: "A valid prospectId, subject and textBody are required" }, { status: 400 });
  }

  const senderEmail = process.env.OUTREACH_FROM_EMAIL?.trim();
  if (!senderEmail || !EMAIL_PATTERN.test(senderEmail)) {
    return NextResponse.json({ error: "OUTREACH_FROM_EMAIL is not configured with a valid sender" }, { status: 503 });
  }

  const sql = outreachDatabase();
  try {
    const [prospect] = await sql`
      SELECT id, organisation, contact_email, status, opted_out_at
      FROM public.outreach_prospects
      WHERE id = ${prospectId}
      LIMIT 1
    `;
    if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    const recipient = String(prospect.contact_email ?? "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(recipient)) {
      return NextResponse.json({ error: "Prospect has no valid, verified contact email" }, { status: 422 });
    }
    if (prospect.opted_out_at || prospect.status === "opted_out") {
      return NextResponse.json({ error: "This prospect has opted out and cannot be contacted" }, { status: 409 });
    }

    const [draft] = await sql`
      INSERT INTO public.outreach_email_drafts
        (prospect_id, recipient_email, sender_email, subject, text_body, html_body,
         status, idempotency_key, created_by)
      VALUES
        (${prospectId}, ${recipient}, ${senderEmail}, ${subject}, ${textBody},
         ${plainTextToHtml(textBody)}, 'pending_approval',
         ${`glassbox-outreach-${randomUUID()}`}, ${access.email})
      RETURNING id, prospect_id, recipient_email, sender_email, subject, status, created_at
    `;
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("Outreach draft creation failed", error);
    return NextResponse.json({ error: "Unable to create outreach draft" }, { status: 500 });
  } finally {
    await sql.end({ timeout: 2 });
  }
}
