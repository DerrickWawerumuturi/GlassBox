import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import postgres from "postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    [key: string]: unknown;
  };
};

function database() {
  const url = process.env.OUTREACH_DATABASE_URL;
  if (!url) throw new Error("OUTREACH_DATABASE_URL is not configured");
  return postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10 });
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();
  let event: ResendEvent;
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  try {
    const timestamp = Number(headers["svix-timestamp"]);
    const messageId = headers["svix-id"];
    const signatureHeader = headers["svix-signature"];
    if (!messageId || !Number.isFinite(timestamp) || !signatureHeader) throw new Error("Missing Svix headers");
    if (Math.abs(Date.now() / 1000 - timestamp) > 300) throw new Error("Stale webhook timestamp");

    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signedContent = `${messageId}.${headers["svix-timestamp"]}.${payload}`;
    const expected = createHmac("sha256", secretBytes).update(signedContent).digest();
    const valid = signatureHeader.split(" ").some((part) => {
      const [version, encoded] = part.split(",", 2);
      if (version !== "v1" || !encoded) return false;
      const supplied = Buffer.from(encoded, "base64");
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    });
    if (!valid) throw new Error("Signature mismatch");
    event = JSON.parse(payload) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const svixId = headers["svix-id"];
  const emailId = event.data?.email_id;
  if (!svixId || !event.type) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const recipients = event.data?.to;
  const recipient = Array.isArray(recipients) ? recipients[0] : recipients ?? null;
  const sql = database();

  try {
    const inserted = await sql`
      INSERT INTO public.resend_webhook_events
        (svix_id, event_type, resend_email_id, recipient_email, event_created_at, payload)
      VALUES
        (${svixId}, ${event.type}, ${emailId ?? null}, ${recipient}, ${event.created_at ? new Date(event.created_at) : null}, ${sql.json(event)})
      ON CONFLICT (svix_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length === 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (emailId) {
      switch (event.type) {
        case "email.sent":
          await sql`UPDATE public.outreach_messages SET status = 'sent' WHERE resend_email_id = ${emailId}`;
          break;
        case "email.delivered":
          await sql`UPDATE public.outreach_messages SET status = 'delivered', delivered_at = COALESCE(delivered_at, now()) WHERE resend_email_id = ${emailId}`;
          break;
        case "email.bounced":
        case "email.failed":
        case "email.suppressed":
          await sql`UPDATE public.outreach_messages SET status = ${event.type.replace("email.", "")} , bounced_at = COALESCE(bounced_at, now()) WHERE resend_email_id = ${emailId}`;
          break;
        case "email.complained":
          await sql`UPDATE public.outreach_messages SET status = 'complained', complained_at = COALESCE(complained_at, now()) WHERE resend_email_id = ${emailId}`;
          await sql`
            UPDATE public.outreach_prospects p
            SET opted_out_at = COALESCE(p.opted_out_at, now()), status = 'opted_out', updated_at = now()
            FROM public.outreach_messages m
            WHERE m.resend_email_id = ${emailId} AND m.prospect_id = p.id
          `;
          break;
        case "email.opened":
          await sql`UPDATE public.outreach_messages SET opened_at = COALESCE(opened_at, now()) WHERE resend_email_id = ${emailId}`;
          break;
        case "email.clicked":
          await sql`UPDATE public.outreach_messages SET last_clicked_at = now(), unique_click_count = unique_click_count + 1 WHERE resend_email_id = ${emailId}`;
          break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend webhook persistence failed", error);
    return NextResponse.json({ error: "Event persistence failed" }, { status: 500 });
  } finally {
    await sql.end({ timeout: 2 });
  }
}
