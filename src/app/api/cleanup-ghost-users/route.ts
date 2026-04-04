import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  const vercelCron = req.headers.get("authorization");
  if (
    secret !== process.env.CRON_SECRET &&
    vercelCron !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: ghostUsers, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, auth_user_id, created_at")
    .eq("onboarding_complete", false)
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!ghostUsers || ghostUsers.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const user of ghostUsers) {
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        user.auth_user_id ?? user.id
      );
      if (deleteError) {
        errors.push(`${user.id}: ${deleteError.message}`);
      } else {
        deleted++;
      }
    } catch (err: any) {
      errors.push(`${user.id}: ${err.message}`);
    }
  }

  return NextResponse.json({ ok: true, deleted, errors });
}