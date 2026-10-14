import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authToken) return NextResponse.json({ ok: false }, { status: 401 });
    const { data: { user } } = await supabaseAdmin.auth.getUser(authToken);
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });

    const { data: request } = await supabaseAdmin
      .from("record_requests")
      .select("id, subject_uuid, requester_auth_user_id, status")
      .eq("token", token)
      .maybeSingle();

    if (!request) return NextResponse.json({ ok: false }, { status: 404 });
    if (request.status === "completed") return NextResponse.json({ ok: true });
    if (request.requester_auth_user_id === user.id) return NextResponse.json({ ok: false }, { status: 403 });

    // Verify this user just filed a record about this subject.
    // Checked here only — the record is never linked to the request, which protects anonymity.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("records")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", request.subject_uuid)
      .eq("created_by", user.id)
      .gte("created_at", since);

    if (!count) return NextResponse.json({ ok: false }, { status: 400 });

    await supabaseAdmin
      .from("record_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", request.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
