import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, authErrorResponse } from "@/lib/apiAuth";

/**
 * Admin-only access to subject email and phone.
 *
 * Logged-in users can no longer read subjects.email / subjects.phone directly,
 * so the admin records page reads and edits them through here, with the
 * service role, after requireAdmin checks admin_roles on the server.
 *
 * POST  { subjectIds: string[] }            -> { contacts: { [subject_uuid]: { email, phone } } }
 * PATCH { subject_uuid, name, nickname, organization, location, email, phone } -> { ok: true }
 */

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subjectIds } = (await req.json().catch(() => ({}))) as { subjectIds?: unknown };
  if (!Array.isArray(subjectIds)) return NextResponse.json({ error: "Missing subjectIds" }, { status: 400 });
  const ids = Array.from(new Set(subjectIds.filter((x): x is string => typeof x === "string" && x.length > 0))).slice(0, 1000);
  if (!ids.length) return NextResponse.json({ contacts: {} });

  const { data, error } = await service().from("subjects").select("subject_uuid, email, phone").in("subject_uuid", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contacts: Record<string, { email: string | null; phone: string | null }> = {};
  for (const row of data ?? []) contacts[row.subject_uuid] = { email: row.email ?? null, phone: row.phone ?? null };
  return NextResponse.json({ contacts });
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subjectUuid = typeof body.subject_uuid === "string" ? body.subject_uuid : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!subjectUuid) return NextResponse.json({ error: "Missing subject_uuid" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const opt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const { data, error } = await service()
    .from("subjects")
    .update({
      name,
      nickname: opt(body.nickname),
      organization: opt(body.organization),
      location: opt(body.location),
      email: opt(body.email),
      phone: opt(body.phone),
    })
    .eq("subject_uuid", subjectUuid)
    .select("subject_uuid");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
