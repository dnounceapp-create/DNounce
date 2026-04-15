import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record;

    if (!notification?.user_id) {
      return new Response("No user_id", { status: 200 });
    }

    // 1. Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      notification.user_id
    );
    if (userError || !userData?.user?.email) {
      console.error("User not found:", userError);
      return new Response("User not found", { status: 200 });
    }
    const email = userData.user.email;

    // 2. Get first name
    const { data: accountData } = await supabase
      .from("user_accountdetails")
      .select("first_name")
      .eq("user_id", notification.user_id)
      .single();
    const firstName = accountData?.first_name || "there";

    // 3. Route to correct template
    let subject = notification.title;
    let html = "";

    if (notification.type === "stage_2_subject" && notification.record_id) {

      const { data: record, error: recordError } = await supabase
        .from("records")
        .select("id, record_type, relationship, contributor_display_name, contributor_identity_preference")
        .eq("id", notification.record_id)
        .single();

      if (recordError || !record) {
        console.error("Record fetch failed. record_id:", notification.record_id, "error:", JSON.stringify(recordError));
        return new Response("Record not found", { status: 200 });
      }

      const recordId = record.id;
      const recordUrl = `${APP_URL}/record/${recordId}`;
      const isEvidence = record.record_type === "evidence";
      const recordTypeLabel = isEvidence
        ? "Evidence-Based"
        : record.record_type === "opinion"
        ? "Opinion-Based"
        : "Pending Review";
      const relationship = record.relationship || "unknown";

      const showContributor = !isEvidence && !record.contributor_identity_preference;
      const contributorLabel = showContributor
        ? (record.contributor_display_name || "Somebody")
        : "Somebody";

      const relationshipLine = `"${contributorLabel}" who labeled you as a ${relationship}`;

      subject = "Action Required – DNounce Subject Alert";

      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>

          <p>You are receiving this message because a record has been submitted on DNounce about you! DNounce is our transparent, AI-powered community review platform.</p>

          <ul style="line-height: 2;">
            <li><strong>Record ID:</strong> ${recordId}</li>
            <li><strong>Record Type:</strong> ${recordTypeLabel}</li>
            <li><strong>Relationship Label:</strong> ${relationshipLine}</li>
          </ul>

          <a href="${recordUrl}" style="
            display: inline-block;
            margin: 8px 0 16px;
            padding: 8px 18px;
            background: #111;
            color: #fff;
            border-radius: 999px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.01em;
          ">View Record →</a>

          <h3 style="color: #111; margin-top: 24px;">Why "Somebody"?</h3>
          <p>For evidence-based records, DNounce protects the identity of the contributor by showing "somebody" instead of their real name. This ensures the focus remains on the evidence and not personal retaliation.</p>
          <p style="margin-top: 12px;">For opinion-based records, DNounce displays the contributor's name since the submission reflects a personal experience or viewpoint rather than hard evidence. This ensures clarity and transparency for both parties.</p>

          <h3 style="color: #111; margin-top: 24px;">Your Rights and Next Steps:</h3>
          <ol style="line-height: 2;">
            <li><strong>View the Record:</strong> Go to <a href="${recordUrl}">${recordUrl}</a> to review the details.</li>
            <li><strong>Respond with Evidence:</strong> You will have an opportunity to submit your own evidence during the record process.</li>
            <li><strong>Request Deletion:</strong> If you believe this record does not belong on your profile, you can request deletion. This will initiate a structured debate process.</li>
          </ol>

          <h3 style="color: #111; margin-top: 24px;">Transparency Note:</h3>
          <p>If you are unsure about the legitimacy of this message, you can always go directly to <a href="https://dnounce.com">dnounce.com</a> on your terms and search up your Record ID (${recordId}) to verify this notification.</p>

          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>

          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else if (notification.type === "verdict_countdown" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "⏳ Verdict drops in 24 hours";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>The community verdict on a record involving you will be announced in <strong>24 hours</strong>.</p>
          <p>Come back tomorrow to see the final decision.</p>
          <a href="${recordUrl}" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">View Record →</a>
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else if (notification.type === "verdict_announced" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "🏛️ The verdict is in — see the result";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>The community has reached a final decision on a record involving you.</p>
          <p>The verdict is now public. Click below to see the result.</p>
          <a href="${recordUrl}" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">See the Verdict →</a>
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else {
      // Generic fallback
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>${notification.body}</p>
          ${notification.record_id ? `<a href="${APP_URL}/record/${notification.record_id}" style="display:inline-block; margin-top:12px; padding:8px 18px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">View Record →</a>` : ""}
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;
    }

    // 4. Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DNounce <notifications@dnounce.com>",
        to: email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response("Resend failed", { status: 200 });
    }

    console.log(`Email sent to ${email} — type: ${notification.type}`);
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response("Internal error", { status: 200 });
  }
});