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
        .select("id, record_type, anonymity_status, category, contributor_display_name, contributor_identity_preference")
        .eq("id", notification.record_id)
        .single();

      if (recordError || !record) {
        console.error("Record fetch failed. record_id:", notification.record_id, "error:", JSON.stringify(recordError));
        return new Response("Record not found", { status: 200 });
      }

      const recordId = record.id;
      const recordUrl = `${APP_URL}/record/${recordId}`;
      const isEvidence = record.anonymity_status === "Anonymity Granted";
      const recordTypeLabel = isEvidence
        ? "Anonymity Granted"
        : record.anonymity_status === "Anonymity Not Granted"
        ? "Anonymity Not Granted"
        : "Pending Review";
      const category = record.category || "unknown";

      const showContributor = !isEvidence && !record.contributor_identity_preference;
      const contributorLabel = showContributor
        ? (record.contributor_display_name || "Somebody")
        : "Somebody";

      const contributorIsHidden = contributorLabel === "Somebody";
      const relationshipLine = `"${contributorLabel}" labeled you as a ${category}`;

      subject = "Action Required – DNounce Subject Alert";

      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>

          <p>You are receiving this message because a record has been submitted on DNounce about you! DNounce is where real reputations are built. People share their experiences — good, bad, and everything in between — subjects respond with their side, and the community verifies what's true.</p>

          <ul style="line-height: 2;">
            <li><strong>Record ID:</strong> ${recordId}</li>
            <li><strong>Record Type:</strong> ${recordTypeLabel}</li>
            <li><strong>Submitted by:</strong> ${relationshipLine}</li>
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

          ${contributorIsHidden ? `
          <h3 style="color: #111; margin-top: 24px;">Why "Somebody"?</h3>
          <p>This record was classified as Anonymity Granted, which means DNounce has structurally protected the contributor's identity. Their name is not available to DNounce, you, or anyone else — including under legal compulsion. The focus is on the content of the record, not who filed it.</p>
          ` : ""}

          <h3 style="color: #111; margin-top: 24px;">Your Rights and Next Steps:</h3>
          <ol style="line-height: 2;">
            <li><strong>View the Record:</strong> Go to <a href="${recordUrl}">${recordUrl}</a> to review the details.</li>
            <li><strong>Respond with Evidence:</strong> You will have an opportunity to submit your own evidence during the record process.</li>
            <li><strong>Request Deletion:</strong> If you believe this record does not belong on your profile, you can request deletion. This will initiate a structured debate process.</li>
          </ol>

          <h3 style="color: #111; margin-top: 24px;">Transparency Note:</h3>
          <p>If you are unsure about the legitimacy of this message, you can always go directly to <a href="https://dnounce.com">dnounce.com</a> and search your Record ID (${recordId}) to verify this notification.</p>

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

    } else if (notification.type === "verdict_community_unlock" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "You can now engage with this record";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>The 7-day post-verdict window has passed. You can now engage with this record — post a community statement, reply to others, and participate in the discussion.</p>
          <a href="${recordUrl}" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">View Record →</a>
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else if (notification.type === "stage_4_contributor" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "Action Required — Your Record Has Been Disputed";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>The subject of a record you submitted has formally disputed it and requested deletion.</p>
          <p>Here's what happens next:</p>
          <ol style="line-height: 2;">
            <li><strong>Debate opens in 24 hours.</strong> You'll have a 72-hour window to defend your record with evidence and respond to the subject's side.</li>
            <li><strong>Community voting follows.</strong> After the debate, the community votes to keep or delete the record.</strong></li>
            <li><strong>Verdict announced.</strong> The final outcome is announced 7 days after voting ends.</li>
          </ol>
          <p>We recommend reviewing your record and gathering any supporting evidence before the debate opens.</p>
          <a href="${recordUrl}" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">View Record →</a>
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else if (notification.type === "claim_approved") {
      subject = "Your Profile Claim Was Approved";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>Great news — your profile claim has been approved. You now own your subject profile on DNounce.</p>
          <p>As the profile owner you can:</p>
          <ul style="line-height: 2;">
            <li>Update your profile information</li>
            <li>Respond to records submitted about you</li>
            <li>Manage your public reputation page</li>
          </ul>
          <a href="${APP_URL}/dashboard/myrecords" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">Go to Dashboard →</a>
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else if (notification.type === "claim_rejected") {
      subject = "Update on Your Profile Claim";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>After review, we were unable to approve your profile claim at this time.</p>
          <p><strong>Reason:</strong> ${notification.body || "No reason provided."}</p>
          <p>If you believe this decision was made in error or you have additional documentation to support your claim, please contact our support team.</p>
          <a href="${APP_URL}/dashboard/settings/support" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">Contact Support →</a>
          <p style="margin-top: 32px;">Sincerely,<br/><strong>The DNounce Team</strong></p>
          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            <a href="${APP_URL}/dashboard/settings/notifications" style="color: #999;">Manage notification preferences</a>
          </p>
        </div>
      `;

    } else {
      // Generic fallback — uses notification title and body as-is
      const recordUrl = notification.record_id ? `${APP_URL}/record/${notification.record_id}` : null;
      subject = notification.title || "A DNounce update";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <h2 style="color: #111;">Hello ${firstName},</h2>
          <p>${notification.body || "You have a new notification on DNounce."}</p>
          ${recordUrl ? `<a href="${recordUrl}" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">View Record →</a>` : ""}
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