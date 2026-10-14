import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function escapeLike(s: string) {
  return s.replace(/[%_]/g, (ch) => `\\${ch}`);
}

export async function POST(req: Request) {
  try {
    const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authToken) return NextResponse.json({ users: [] }, { status: 401 });
    const { data: { user } } = await supabaseAdmin.auth.getUser(authToken);
    if (!user) return NextResponse.json({ users: [] }, { status: 401 });

    const { email, phone } = await req.json();
    const cleanEmail = (email ?? "").trim().toLowerCase();
    const cleanPhone = (phone ?? "").replace(/\D/g, "");

    // Same "starts with" search as the submit page, with a 3-character minimum
    const userIds = new Set<string>();

    if (cleanPhone.length >= 3) {
      const { data } = await supabaseAdmin
        .from("user_accountdetails")
        .select("user_id")
        .ilike("phone", `${escapeLike(cleanPhone)}%`)
        .limit(5);
      (data ?? []).forEach((r) => userIds.add(r.user_id));
    }

    if (cleanEmail.length >= 3) {
      const { data } = await supabaseAdmin
        .from("user_accountdetails")
        .select("user_id")
        .ilike("email", `${escapeLike(cleanEmail)}%`)
        .limit(5);
      (data ?? []).forEach((r) => userIds.add(r.user_id));
    }

    // Never suggest the subject themselves
    userIds.delete(user.id);
    if (userIds.size === 0) return NextResponse.json({ users: [] });

    const { data: accts } = await supabaseAdmin
      .from("user_accountdetails")
      .select("user_id, first_name, last_name, avatar_url, location")
      .in("user_id", Array.from(userIds).slice(0, 5));

    // Safe display info only, never email or phone
    return NextResponse.json({
      users: (accts ?? []).map((a) => ({
        user_id: a.user_id,
        first_name: a.first_name ?? "",
        last_name: a.last_name ?? "",
        avatar_url: a.avatar_url ?? null,
        location: a.location ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ users: [] }, { status: 500 });
  }
}
