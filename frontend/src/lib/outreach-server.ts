import "server-only";

import { auth } from "@/app/auth";
import postgres from "postgres";

export async function requireOutreachAdmin() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const allowed = (process.env.OUTREACH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!email || allowed.length === 0 || !allowed.includes(email)) {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { email };
}

export function outreachDatabase() {
  const url = process.env.OUTREACH_APP_DATABASE_URL;
  if (!url) throw new Error("OUTREACH_APP_DATABASE_URL is not configured");
  return postgres(url, { max: 2, idle_timeout: 20, connect_timeout: 10 });
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
