import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Shared pieces so every email looks and sounds the same.
const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">${label}</a>`;
const signOff = `<p style="margin-top: 32px;">— The DNounce team</p>`;
const footer = (href: string) =>
  `<p style="margin-top: 32px; font-size: 12px; color: #999;"><a href="${href}" style="color: #999;">Change which emails you get</a></p>`;
const wrap = (inner: string) =>
  `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.6;">${inner}</div>`;

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
        .select("id, category, contributor_display_name, contributor_identity_preference")
        .eq("id", notification.record_id)
        .single();

      if (recordError || !record) {
        console.error("Record fetch failed. record_id:", notification.record_id, "error:", JSON.stringify(recordError));
        return new Response("Record not found", { status: 200 });
      }

      const recordId = record.id;
      const recordUrl = `${APP_URL}/record/${recordId}`;
      const category = record.category || "unknown";

      // Contributor names are shown as "First L." on every new and claimed record.
      // Only old records explicitly set to hide the name (preference === false) stay hidden.
      const showContributor =
        record.contributor_identity_preference !== false && !!record.contributor_display_name;
      const contributorLabel = showContributor
        ? record.contributor_display_name
        : "A DNounce member";

      const writer = showContributor ? contributorLabel : "Someone";

      subject = `${writer} wrote a record about you`;
      html = wrap(`
        <p>Hi ${firstName},</p>
        <p>${writer} shared an experience about you on DNounce${category !== "unknown" ? ` (as a ${category})` : ""}. Only you can see it for the next 24 hours — then it goes public.</p>
        ${button(recordUrl, "Read the record →")}
        <p><strong>What you can do</strong></p>
        <ul>
          <li>Read it now, privately.</li>
          <li>Once it's public, reply — or challenge it if you see things differently. If you challenge it, you and ${writer} each get 3 days to share your side, then the community weighs in.</li>
        </ul>
        <p>Whatever happens, the record stays up and shows where people landed.</p>
        <p style="font-size: 13px; color: #666;">Not sure this email is real? Go to <a href="https://dnounce.com">dnounce.com</a> yourself and search for record ${recordId}.</p>
        ${signOff}
        ${footer(`${APP_URL}/dashboard/settings/notifications`)}
      `);

    } else if (notification.type === "verdict_countdown" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "Results tomorrow";
      html = wrap(`
        <p>Hi ${firstName},</p>
        <p>The results on a record you're part of come out tomorrow. Check back then to see where people landed.</p>
        ${button(recordUrl, "See the record →")}
        ${signOff}
        ${footer(`${APP_URL}/dashboard/settings/notifications`)}
      `);

    } else if (notification.type === "verdict_announced" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "The results are in";
      html = wrap(`
        <p>Hi ${firstName},</p>
        <p>The community has weighed in on a record you're part of. See where people landed — the record stays up either way.</p>
        ${button(recordUrl, "See the results →")}
        ${signOff}
        ${footer(`${APP_URL}/dashboard/settings/notifications`)}
      `);

    } else if (notification.type === "verdict_community_unlock" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      subject = "You can join the conversation again";
      html = wrap(`
        <p>Hi ${firstName},</p>
        <p>It's been a week since the results came out. You can now post and reply in the record's community section.</p>
        ${button(recordUrl, "Go to the record →")}
        ${signOff}
        ${footer(`${APP_URL}/dashboard/settings/notifications`)}
      `);

    } else if (notification.type === "stage_4_contributor" && notification.record_id) {
      const recordUrl = `${APP_URL}/record/${notification.record_id}`;
      // The database writes the title with the person's name ("Sam S. challenged your record").
      subject = notification.title || "Your record was challenged";
      html = wrap(`
        <p>Hi ${firstName},</p>
        <p>${notification.body || "The person your record is about sees things differently and challenged it."}</p>
        <p><strong>What happens next</strong></p>
        <ol>
          <li><strong>In 24 hours</strong>, you both get 3 days to share your side, with evidence if you have it.</li>
          <li><strong>Then the community votes</strong> for 2 days on who they side with.</li>
          <li><strong>A week later</strong>, the results show on the record.</li>
        </ol>
        <p>Your record stays up whatever happens. Now's a good time to gather anything that backs up your side.</p>
        ${button(recordUrl, "See your record →")}
        ${signOff}
        ${footer(`${APP_URL}/dashboard/settings/notifications`)}
      `);

    } else if (notification.type === "claim_approved") {
      subject = "Your profile is yours";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <p>Hi ${firstName},</p>
          <p>Good news — your profile on DNounce is now yours.</p>
          <p>You can now:</p>
          <ul style="line-height: 2;">
            <li>Update your profile information</li>
            <li>Reply to records about you, or challenge them</li>
            <li>Manage your public page</li>
          </ul>
          <a href="${APP_URL}/dashboard/myrecords" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">Go to Dashboard →</a>
          ${signOff}
          ${footer(`${APP_URL}/dashboard/settings/notifications`)}
        </div>
      `;

    } else if (notification.type === "claim_rejected") {
      subject = "About your profile claim";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <p>Hi ${firstName},</p>
          <p>We couldn't approve your profile claim this time.</p>
          <p><strong>Reason:</strong> ${notification.body || "No reason provided."}</p>
          <p>If you think we got it wrong, or you have more to show us, reach out and we'll take another look.</p>
          <a href="${APP_URL}/dashboard/settings/support" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">Contact Support →</a>
          ${signOff}
          ${footer(`${APP_URL}/dashboard/settings/notifications`)}
        </div>
      `;

    } else if (notification.type === "trial_ending") {
      subject = "Your free trial ends in 3 days";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <p>Hi ${firstName},</p>
          <p>${notification.body}</p>
          <p>If you enjoy DNounce, no action is needed — you'll be charged automatically when your trial ends.</p>
          <p>If you'd like to cancel before being charged, you can do so from your dashboard.</p>
          <a href="${APP_URL}/dashboard/settings/billing" style="display:inline-block; margin:16px 0; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">Manage Subscription →</a>
          ${signOff}
          ${footer(`${APP_URL}/dashboard/settings/notifications`)}
        </div>
      `;

    } else {
      // Generic fallback — uses notification title and body as-is
      const recordUrl = notification.record_id ? `${APP_URL}/record/${notification.record_id}` : null;
      subject = notification.title || "A DNounce update";
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
          <p>Hi ${firstName},</p>
          <p>${notification.body || "You have a new notification on DNounce."}</p>
          ${recordUrl ? `<a href="${recordUrl}" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#111; color:#fff; border-radius:999px; text-decoration:none; font-size:13px; font-weight:600;">View Record →</a>` : ""}
          ${signOff}
          ${footer(`${APP_URL}/dashboard/settings/notifications`)}
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