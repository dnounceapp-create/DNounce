import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, authErrorResponse } from "@/lib/apiAuth";

/**
 * Admin: pre-built profiles (private until claimed).
 * GET   -> everyone, with status and claim code
 * PATCH { id, status?, email?, nickname?, notes? } -> update one person after a call
 */
function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const STATUSES = ["not_contacted", "contacted", "invited", "claimed", "declined", "do_not_contact"];

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await service()
    .from("prospect_profiles")
    .select("id, first_name, last_name, company_name, nickname, phone, email, neighborhood, trade, source_url, status, claim_code, claimed_subject_id, notes, updated_at")
    .order("last_name")
    .order("first_name")
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prospects: data ?? [] });
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string") {
    // "claimed" only happens when the person claims it themselves.
    if (!STATUSES.includes(body.status) || body.status === "claimed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  for (const f of ["email", "nickname", "notes"] as const) {
    if (typeof body[f] === "string") {
      const v = (body[f] as string).trim();
      if (f === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
      }
      update[f] = v ? (f === "email" ? v.toLowerCase() : v) : null;
    }
  }

  const db = service();
  const { data: current } = await db.from("prospect_profiles").select("status").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (current.status === "claimed" && "status" in update) {
    return NextResponse.json({ error: "Already claimed; the status can't be changed." }, { status: 409 });
  }

  const { data, error } = await db.from("prospect_profiles").update(update).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prospect: data });
}
