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
  <p><strong>If ${name} disputes your record,</strong> you'll both get a chance to share your side and any evidence in a short debate. Then the DNounce community reviews both sides and votes within 48 hours on who they side with. The vote result is final and shown publicly.</p>
  <p><strong>Who is the community?</strong><br/>Other DNounce members who aren't involved in the record. They read both sides, look at the evidence, and vote. Neither you nor ${name} can vote on your own record. Voters are also rated on how fair and consistent their votes are, so careless or biased voting hurts their own standing.</p>
  <p style="margin:28px 0;">
    <a href="${link}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block;">Share Your Experience &rarr;</a>
  </p>
  <p style="color:#6b7280;">It takes about 3 minutes.</p>
  <p>&mdash; The DNounce Team</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:12px;color:#9ca3af;">You're receiving this because ${name} entered your contact information. If you don't know them, you can ignore this message.</p>
</div>`;
}

async function findUserIdBy(column: "email" | "phone", value: string) {
  if (!value) return null;
  const { data } = await supabaseAdmin
    .from("user_accountdetails")
    .select("user_id")
    .eq(column, value)
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate the requester
    const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authToken) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authToken);
    if (authErr || !user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { selectedUserId, firstName, lastName, email, phone, relationship } = await req.json();
    const cleanEmail = (email ?? "").trim().toLowerCase();
    const cleanPhone = (phone ?? "").replace(/\D/g, "");
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    const phoneValid = cleanPhone.length === 10;

    // 2. Relationship must be a real option from the table
    const { data: relType } = await supabaseAdmin
      .from("relationship_types")
      .select("id")
      .eq("id", relationship ?? "")
      .maybeSingle();
    if (!relType) return NextResponse.json({ error: "Please choose how you know them." }, { status: 400 });

    // 3. Requester's subject profile
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("subject_uuid, name")
      .eq("owner_auth_user_id", user.id)
      .maybeSingle();
    if (!subject) return NextResponse.json({ error: "We couldn't find your profile. Please finish setting up your account." }, { status: 400 });

    // 4. Rate limit: 10 requests per 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("record_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_auth_user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json({ error: "You've reached today's limit of 10 requests. Try again tomorrow." }, { status: 429 });
    }

    // 5. Work out who the request goes to
    let contributorAuthUserId: string | null = null;
    let toFirstName = "";
    let toLastName: string | null = null;
    let toEmail: string | null = null;
    let toPhone: string | null = null;

    if (selectedUserId) {
      // PATH A: an existing DNounce user was selected
      if (selectedUserId === user.id) {
        return NextResponse.json({ error: "You can't request a record from yourself." }, { status: 400 });
      }
      if (!emailValid && !phoneValid) {
        return NextResponse.json({ error: "Please enter their email or phone number." }, { status: 400 });
      }

      const { data: acct } = await supabaseAdmin
        .from("user_accountdetails")
        .select("user_id, first_name, last_name, email, phone")
        .eq("user_id", selectedUserId)
        .maybeSingle();
      if (!acct) return NextResponse.json({ error: "We couldn't find that DNounce member." }, { status: 400 });

      // Whatever was typed must belong to the selected person
      const acctEmail = (acct.email ?? "").trim().toLowerCase();
      const acctPhone = (acct.phone ?? "").replace(/\D/g, "");
      if (emailValid && cleanEmail !== acctEmail) {
        return NextResponse.json({ error: "That email doesn't belong to the person you selected." }, { status: 400 });
      }
      if (phoneValid && cleanPhone !== acctPhone) {
        return NextResponse.json({ error: "That phone number doesn't belong to the person you selected." }, { status: 400 });
      }

      contributorAuthUserId = acct.user_id;
      toFirstName = acct.first_name || "there";
      toLastName = acct.last_name || null;
      toEmail = acctEmail || null;          // looked up server-side, never shown to the requester
      toPhone = acctPhone || null;
    } else {
      // PATH B: a new person
      const cleanFirst = (firstName ?? "").trim();
      if (!cleanFirst) return NextResponse.json({ error: "First name is required." }, { status: 400 });
      if (!emailValid) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
      if (!phoneValid) return NextResponse.json({ error: "Please enter a 10-digit phone number." }, { status: 400 });

      const emailUserId = await findUserIdBy("email", cleanEmail);
      const phoneUserId = await findUserIdBy("phone", cleanPhone);

      if (emailUserId === user.id || phoneUserId === user.id) {
        return NextResponse.json({ error: "You can't request a record from yourself." }, { status: 400 });
      }
      // Contact info that belongs to an existing member must go through selection
      if (emailUserId || phoneUserId) {
        if (emailUserId && phoneUserId && emailUserId !== phoneUserId) {
          return NextResponse.json({ error: "This email and phone number belong to different DNounce accounts." }, { status: 400 });
        }
        return NextResponse.json({ error: "This contact info belongs to a DNounce member. Select them from the list above." }, { status: 400 });
      }

      toFirstName = cleanFirst;
      toLastName = (lastName ?? "").trim() || null;
      toEmail = cleanEmail;
      toPhone = cleanPhone;
    }

    // 6. Save the request
    const { data: request, error: insertErr } = await supabaseAdmin
      .from("record_requests")
      .insert({
        subject_uuid: subject.subject_uuid,
        requester_auth_user_id: user.id,
        contributor_auth_user_id: contributorAuthUserId,
        contributor_first_name: toFirstName,
        contributor_last_name: toLastName,
        contributor_email: toEmail,
        contributor_phone: toPhone,
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
    if (toEmail) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "DNounce <notifications@dnounce.com>",
            to: [toEmail],
            subject: `${requesterName} asked you to share your experience`,
            html: buildEmailHtml(toFirstName, requesterName, link),
          }),
        });
        emailSent = res.ok;
        if (!res.ok) console.error("Resend error:", await res.text());
      } catch (e) {
        console.error("Resend error:", e);
      }
    }

    return NextResponse.json({ success: true, link, emailSent });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
