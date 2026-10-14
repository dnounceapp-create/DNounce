import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = "https://www.dnounce.com";
const DAILY_LIMIT = 10;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(firstName: string, requesterName: string, link: string) {
  const name = escapeHtml(requesterName);
  const first = escapeHtml(firstName);
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;line-height:1.6;">
  <p>Hi ${first},</p>
  <p><strong>${name}</strong> asked you to share your experience with them on DNounce, a community review platform where both sides are heard.</p>
  <p>Your record can be positive, negative, or anywhere in between. ${name} won't be able to edit or remove what you write, and you can choose to stay anonymous.</p>
  <p><strong>If ${name} disputes your record,</strong> you'll both get a chance to share your side and any evidence in a short debate. Then the DNounce community reviews both sides and votes within 48 hours on who they side with. The verdict is final and shown publicly.</p>
  <p><strong>Who is the community?</strong><br/>Other DNounce members who aren't involved in the record. They read both sides, look at the evidence, and vote. Neither you nor ${name} can vote on your own record. Voters are also rated on how fair and consistent their votes are, so careless or biased voting hurts their own standing.</p>
  <p style="margin:28px 0;">
    <a href="${link}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block;">Share Your Experience &rarr;</a>
  </p>
  <p style="color:#6b7280;">It takes about 3 minutes.</p>
  <p>&mdash; The DNounce Team</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:12px;color:#9ca3af;">You're receiving this because ${name} entered your email. If you don't know them, you can ignore this message.</p>
</div>`;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate the requester
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    // 2. Validate input
    const { firstName, lastName, email, phone, relationship } = await req.json();
    const cleanFirst = (firstName ?? "").trim();
    const cleanLast = (lastName ?? "").trim();
    const cleanEmail = (email ?? "").trim().toLowerCase();
    const cleanPhone = (phone ?? "").replace(/\D/g, "");

    if (!cleanFirst) return NextResponse.json({ error: "First name is required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    if (cleanPhone.length !== 10) return NextResponse.json({ error: "Please enter a 10-digit phone number." }, { status: 400 });
    const { data: relType } = await supabaseAdmin
      .from("relationship_types")
      .select("id")
      .eq("id", relationship ?? "")
      .maybeSingle();
    if (!relType) return NextResponse.json({ error: "Please choose how you know them." }, { status: 400 });

    // 3. Can't request a record from yourself
    if (user.email && user.email.toLowerCase() === cleanEmail) {
      return NextResponse.json({ error: "You can't request a record from yourself." }, { status: 400 });
    }
    const { data: ownPhone } = await supabaseAdmin
      .from("user_accountdetails")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle();
    if (ownPhone?.phone && ownPhone.phone.replace(/\D/g, "") === cleanPhone) {
      return NextResponse.json({ error: "You can't request a record from yourself." }, { status: 400 });
    }

    // 4. Find the requester's subject profile
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("subject_uuid, name")
      .eq("owner_auth_user_id", user.id)
      .maybeSingle();
    if (!subject) return NextResponse.json({ error: "We couldn't find your profile. Please finish setting up your account." }, { status: 400 });

    // 5. Rate limit: 10 requests per 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("record_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_auth_user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json({ error: "You've reached today's limit of 10 requests. Try again tomorrow." }, { status: 429 });
    }

    // 6. Save the request
    const { data: request, error: insertErr } = await supabaseAdmin
      .from("record_requests")
      .insert({
        subject_uuid: subject.subject_uuid,
        requester_auth_user_id: user.id,
        contributor_first_name: cleanFirst,
        contributor_last_name: cleanLast || null,
        contributor_email: cleanEmail,
        contributor_phone: cleanPhone,
        relationship,
      })
      .select("token")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "You've already sent a request to this person." }, { status: 409 });
      }
      return NextResponse.json({ error: "Couldn't save your request. Please try again." }, { status: 500 });
    }

    const link = `${SITE_URL}/request/${request.token}`;

    // 7. Send the email (same method as the send-notifications edge function)
    const requesterName = subject.name || "A DNounce member";
    let emailSent = false;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "DNounce <notifications@dnounce.com>",
          to: [cleanEmail],
          subject: `${requesterName} asked you to share your experience`,
          html: buildEmailHtml(cleanFirst, requesterName, link),
        }),
      });
      emailSent = res.ok;
      if (!res.ok) console.error("Resend error:", await res.text());
    } catch (e) {
      console.error("Resend error:", e);
    }

    // The link is returned either way, so the subject can still share it themselves
    return NextResponse.json({ success: true, link, emailSent });
  } catch (err: any) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
