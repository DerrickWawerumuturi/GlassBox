import { NextResponse } from "next/server";
import { outreachDatabase, requireOutreachAdmin } from "@/lib/outreach-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireOutreachAdmin();
  if ("response" in access) return access.response;

  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid draft id" }, { status: 400 });

  const sql = outreachDatabase();
  try {
    const [draft] = await sql`
      UPDATE public.outreach_email_drafts
      SET status = 'approved', approved_by = ${access.email},
          approved_at = now(), updated_at = now(), last_error = NULL
      WHERE id = ${id} AND status = 'pending_approval'
      RETURNING id, prospect_id, recipient_email, subject, status, approved_at
    `;
    if (!draft) {
      return NextResponse.json({ error: "Draft not found or is not awaiting approval" }, { status: 409 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Outreach draft approval failed", error);
    return NextResponse.json({ error: "Unable to approve outreach draft" }, { status: 500 });
  } finally {
    await sql.end({ timeout: 2 });
  }
}
