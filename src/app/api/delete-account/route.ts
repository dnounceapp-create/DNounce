import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireSession, authErrorResponse } from "@/lib/apiAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Deletes the CALLER's own account, and only that.
// The request body is not read at all: any userId sent by the client is ignored.
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireSession(req);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(caller.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
