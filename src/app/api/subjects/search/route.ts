import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  phone?: string | null;
  email?: string | null;
};

// escape % and _ for ilike patterns
function escapeLike(s: string) {
  return (s || "").replace(/[%_]/g, (ch) => `\\${ch}`);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const rawPhone = (body.phone || "").trim();
    const phoneDigits = rawPhone.replace(/\D/g, ""); // digits-only prefix
    const email = (body.email || "").trim().toLowerCase();

    if (!rawPhone && !email) {
      return NextResponse.json({ users: [], externals: [] });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE env vars" },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ---------- 1) DNounce users (phone/email -> user_id) ----------
    const userIds = new Set<string>();

    // ✅ PHONE prefix search (starts with) — SOURCE OF TRUTH: user_accountdetails.phone
    // We *search* user_accountdetails.phone_digits so formatting doesn't break prefix searches.
    if (rawPhone || phoneDigits) {
      const digitsPattern = phoneDigits ? `${escapeLike(phoneDigits)}%` : null;

      let q = admin
        .from("user_accountdetails")
        .select("user_id, phone")
        .limit(50);

      if (digitsPattern) {
        q = q.ilike("phone_digits", digitsPattern);
      }

      const { data: acctRows, error } = await q;

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      (acctRows || []).forEach((r) => r.user_id && userIds.add(r.user_id));
    }

    // ✅ EMAIL prefix search (starts with)
    if (email) {
      const emailPattern = `${escapeLike(email)}%`;

      const { data: emailRows, error } = await admin
        .from("user_emails")
        .select("user_id, email")
        .ilike("email", emailPattern)
        .limit(50);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      (emailRows || []).forEach((r) => r.user_id && userIds.add(r.user_id));
    }

    const ids = Array.from(userIds);

    // map user_id -> subjects.subject_uuid (so cards link to subject profile)
    let subjRows: any[] = [];
    if (ids.length > 0) {
      const { data: s, error: sErr } = await admin
        .from("subjects")
        .select(
          "subject_uuid, owner_auth_user_id, name, nickname, organization, location, avatar_url, phone, email"
        )
        .in("owner_auth_user_id", ids)
        .limit(50);

      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

      subjRows = s || [];
    }

    // hydrate nicer fields for display (name/avatar)
    let acctHydrate: any[] = [];
    if (ids.length > 0) {
      const { data: a, error: aErr } = await admin
        .from("user_accountdetails")
        .select(
          "user_id, first_name, last_name, nickname, organization, location, avatar_url, phone"
        )
        .in("user_id", ids)
        .limit(50);

      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

      acctHydrate = a || [];
    }

    const acctByUser = new Map<string, any>();
    acctHydrate.forEach((u) => u.user_id && acctByUser.set(u.user_id, u));

    const users = (subjRows || []).map((s) => {
      const u = acctByUser.get(s.owner_auth_user_id);

      const displayName =
        `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim() ||
        s.name ||
        "(Unnamed User)";

      return {
        kind: "user",
        user_id: s.owner_auth_user_id,
        subject_uuid: s.subject_uuid,
        name: displayName,
        nickname: u?.nickname ?? s.nickname ?? null,
        organization: u?.organization ?? s.organization ?? null,
        location: u?.location ?? s.location ?? null,
        avatar_url: u?.avatar_url ?? s.avatar_url ?? null,
        phone: u?.phone ?? s.phone ?? null, // ✅ from user_accountdetails.phone when available
        email: null, // not needed for UI card; add if you want
      };
    });

    // ---------- 2) External subjects (owner_auth_user_id is null) ----------
    const externals: any[] = [];

    // phone prefix (externals live in subjects.phone, so formatting issues apply here too)
    // If you also want externals to support digit-prefix matching reliably,
    // you'd need a similar digits column on subjects. Leaving your current logic intact.
    if (rawPhone || phoneDigits) {
      const rawPattern = rawPhone ? `${escapeLike(rawPhone)}%` : null;
      const digitsPattern = phoneDigits ? `${escapeLike(phoneDigits)}%` : null;

      let q = admin
        .from("subjects")
        .select("subject_uuid, name, nickname, organization, location, avatar_url, phone, email")
        .is("owner_auth_user_id", null)
        .limit(50);

      const orParts: string[] = [];
      if (rawPattern) orParts.push(`phone.ilike.${rawPattern}`);
      if (digitsPattern) orParts.push(`phone.ilike.${digitsPattern}`);

      if (orParts.length > 0) q = q.or(orParts.join(","));

      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      (data || []).forEach((s) => externals.push(s));
    }

    // email prefix
    if (email) {
      const emailPattern = `${escapeLike(email)}%`;

      const { data, error } = await admin
        .from("subjects")
        .select("subject_uuid, name, nickname, organization, location, avatar_url, phone, email")
        .is("owner_auth_user_id", null)
        .ilike("email", emailPattern)
        .limit(50);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      (data || []).forEach((s) => externals.push(s));
    }

    // de-dupe externals by subject_uuid
    const seenExt = new Set<string>();
    const externalPreviews = externals
      .filter((s) => {
        if (!s?.subject_uuid) return false;
        if (seenExt.has(s.subject_uuid)) return false;
        seenExt.add(s.subject_uuid);
        return true;
      })
      .map((s) => ({
        kind: "external",
        id: s.subject_uuid,
        name: s.name,
        nickname: s.nickname ?? null,
        organization: s.organization ?? null,
        location: s.location ?? null,
        avatar_url: s.avatar_url ?? null,
        phone: s.phone ?? null,
        email: s.email ?? null,
      }));

    return NextResponse.json({ users, externals: externalPreviews });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
