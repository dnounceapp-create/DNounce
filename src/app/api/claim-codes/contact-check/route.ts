import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Signed-in only. Answers yes/no: is this phone or email already stored as a subject's contact info?
// Never returns the stored values.
export async function POST(req: Request) {
  try {
    const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authToken) return NextResponse.json({ phoneInUse: false, emailInUse: false }, { status: 401 });
    const { data: { user } } = await supabaseAdmin.auth.getUser(authToken);
    if (!user) return NextResponse.json({ phoneInUse: false, emailInUse: false }, { status: 401 });

    const { phone, email } = await req.json();
    const cleanPhone = String(phone ?? "").replace(/\D/g, "");
    const cleanEmail = String(email ?? "").trim().toLowerCase();

    let phoneInUse = false;
    let emailInUse = false;

    if (cleanPhone) {
      const { data } = await supabaseAdmin.from("record_claim_codes").select("id").eq("subject_phone", cleanPhone).limit(1);
      phoneInUse = (data ?? []).length > 0;
    }
    if (cleanEmail) {
      const { data } = await supabaseAdmin.from("record_claim_codes").select("id").eq("subject_email", cleanEmail).limit(1);
      emailInUse = (data ?? []).length > 0;
    }

    return NextResponse.json({ phoneInUse, emailInUse });
  } catch {
    return NextResponse.json({ phoneInUse: false, emailInUse: false }, { status: 500 });
  }
}
