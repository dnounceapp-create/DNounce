import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = (Deno.env.get("APP_URL") || "https://www.dnounce.com").replace(/\/$/, "");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ───────────────────────────── Email design ─────────────────────────────
 * One layout for every DNounce email: logo header, colored banner with a
 * label and headline, a white card with the message, one clear button,
 * an optional "what happens next" timeline, and a consistent footer.
 * Table-based with inline styles so it renders in Gmail, Outlook and Apple Mail.
 */

type Theme = { label: string; color: string; soft: string; icon: string };

const THEMES: Record<string, Theme> = {
  record:    { label: "New record",      color: "#2563EB", soft: "#EFF6FF", icon: "📝" },
  challenge: { label: "Challenge",       color: "#D97706", soft: "#FFFBEB", icon: "⚖️" },
  bothsides: { label: "Both sides",      color: "#0891B2", soft: "#ECFEFF", icon: "💬" },
  vote:      { label: "Community vote",  color: "#7C3AED", soft: "#F5F3FF", icon: "🗳️" },
  results:   { label: "Results",         color: "#4F46E5", soft: "#EEF2FF", icon: "📣" },
  account:   { label: "Your account",    color: "#059669", soft: "#ECFDF5", icon: "✅" },
  billing:   { label: "Billing",         color: "#111827", soft: "#F3F4F6", icon: "💳" },
  badge:     { label: "New badge",       color: "#C026D3", soft: "#FDF4FF", icon: "🏅" },
  heads_up:  { label: "Heads up",        color: "#DC2626", soft: "#FEF2F2", icon: "⚠️" },
  activity:  { label: "Activity",        color: "#0EA5E9", soft: "#F0F9FF", icon: "🔔" },
};

function themeFor(type: string): Theme {
  const t = (type || "").toLowerCase();
  if (t === "stage_2_subject" || t.startsWith("stage_1") || t.startsWith("stage_2") || t.startsWith("stage_3")) return THEMES.record;
  if (t.startsWith("stage_4")) return THEMES.challenge;
  if (t.startsWith("stage_5") || t.includes("debate")) return THEMES.bothsides;
  if (t.startsWith("stage_6") || t.includes("voting")) return THEMES.vote;
  if (t.startsWith("verdict") || t.includes("decided") || t.includes("outcome") || t === "seven_day_unlock") return THEMES.results;
  if (t.startsWith("claim")) return THEMES.account;
  if (t.startsWith("trial") || t.includes("billing") || t.includes("subscription")) return THEMES.billing;
  if (t.includes("badge")) return THEMES.badge;
  if (t.includes("flagged") || t.includes("convicted")) return THEMES.heads_up;
  return THEMES.activity;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function button(href: string, label: string, color: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr><td bgcolor="${color}" style="border-radius:10px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
    </td></tr>
  </table>`;
}

function para(html: string) {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:#374151;">${html}</p>`;
}

/** A small highlighted box, e.g. "Private for 24 hours". */
function callout(html: string, theme: Theme) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
    <tr><td style="background:${theme.soft};border-left:4px solid ${theme.color};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:#1F2937;">${html}</td></tr>
  </table>`;
}

/** "What happens next" steps. The current step is highlighted. */
function timeline(steps: { title: string; text: string }[], current: number, theme: Theme) {
  const rows = steps
    .map((s, i) => {
      const done = i < current;
      const now = i === current;
      const dotBg = now ? theme.color : done ? "#9CA3AF" : "#FFFFFF";
      const dotBorder = now ? theme.color : "#D1D5DB";
      const dotText = now || done ? "#FFFFFF" : "#9CA3AF";
      return `
      <tr>
        <td width="34" valign="top" style="padding:0 0 14px;">
          <div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:${dotBg};border:1px solid ${dotBorder};text-align:center;font-family:${FONT};font-size:12px;font-weight:700;color:${dotText};">${i + 1}</div>
        </td>
        <td valign="top" style="padding:2px 0 14px;font-family:${FONT};">
          <div style="font-size:14px;font-weight:600;color:${now ? theme.color : "#111827"};">${s.title}${now ? ` <span style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${theme.color};">· Now</span>` : ""}</div>
          <div style="font-size:13px;line-height:20px;color:#6B7280;">${s.text}</div>
        </td>
      </tr>`;
    })
    .join("");
  return `
  <div style="margin:28px 0 4px;padding-top:24px;border-top:1px solid #E5E7EB;">
    <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6B7280;margin-bottom:14px;">What happens next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
  </div>`;
}

const LIFECYCLE = [
  { title: "Private preview", text: "The person it's about can read it privately for 24 hours." },
  { title: "Public", text: "The record goes public. The person it's about can challenge it once." },
  { title: "Both sides", text: "If it's challenged, both people get 3 days to share their side, with evidence." },
  { title: "Community vote", text: "For 2 days, people read both stories and pick who they side with — with a reason." },
  { title: "Results", text: "A week later, the result shows on the record. The record always stays up." },
];

function layout(opts: {
  theme: Theme;
  preheader: string;
  headline: string;
  body: string;
  firstName: string;
}) {
  const { theme, preheader, headline, body, firstName } = opts;
  const settings = `${APP_URL}/dashboard/settings/notifications`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F4F6">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

        <!-- Logo -->
        <tr><td style="padding:0 4px 20px;">
          <a href="${APP_URL}" style="text-decoration:none;">
            <img src="${APP_URL}/icons/logoicon-120x120.png" width="36" height="36" alt="" style="vertical-align:middle;border:0;border-radius:8px;">
            <span style="vertical-align:middle;margin-left:8px;font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-.3px;color:#111827;">DNounce</span>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:6px;line-height:6px;font-size:0;background:${theme.color};">&nbsp;</td></tr>
            <tr><td style="padding:32px 36px 8px;">
              <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:${theme.soft};font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${theme.color};">${theme.icon}&nbsp; ${theme.label}</div>
              <h1 style="margin:18px 0 20px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:800;letter-spacing:-.4px;color:#111827;">${headline}</h1>
              ${para(`Hi ${esc(firstName)},`)}
              ${body}
            </td></tr>
            <tr><td style="padding:8px 36px 32px;">
              <p style="margin:24px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:#374151;">Thanks for being part of DNounce,<br><strong style="color:#111827;">The DNounce Team</strong></p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Trust note -->
        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
          🔒 DNounce will never ask for your password or payment details by email. If you're unsure about a link, go to <a href="${APP_URL}" style="color:#4B5563;">dnounce.com</a> yourself and sign in.
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:20px;color:#9CA3AF;text-align:center;">
          <a href="${APP_URL}/support" style="color:#6B7280;text-decoration:none;">Help Center</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/legal#privacy" style="color:#6B7280;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/legal#terms" style="color:#6B7280;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
          <a href="${settings}" style="color:#6B7280;text-decoration:none;">Email settings</a>
          <br>You're getting this email because you have a DNounce account.
          <br>© ${year} DNounce · New York, NY
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text copy of every email (better delivery, and for mail apps that block HTML). */
function toText(headline: string, firstName: string, lines: string[], link?: { label: string; href: string }) {
  return [
    headline,
    "",
    `Hi ${firstName},`,
    "",
    ...lines,
    ...(link ? ["", `${link.label}: ${link.href}`] : []),
    "",
    "Thanks for being part of DNounce,",
    "The DNounce Team",
    "",
    `Email settings: ${APP_URL}/dashboard/settings/notifications`,
  ].join("\n");
}

/* Same wording as the site (src/lib/outcome.ts). */
const TIE_LABEL = "It's a tie — the community is split right down the middle";
function outcomeSentence(raw: string | null | undefined, writer: string, subject: string): string | null {
  const s = (raw ?? "").toLowerCase();
  if (s === "tie") return TIE_LABEL;
  if (s === "keep" || s.includes("contributor")) return `Most people sided with ${writer}`;
  if (s === "delete" || s.includes("subject")) return `Most people sided with ${subject}`;
  return null;
}

async function recordNames(recordId: string) {
  const { data } = await supabase
    .from("records")
    .select("id, category, final_outcome, contributor_display_name, contributor_identity_preference, subject:subjects(name)")
    .eq("id", recordId)
    .maybeSingle();
  const showWriter = !!data && data.contributor_identity_preference !== false && !!data.contributor_display_name;
  return {
    record: data as any,
    writer: showWriter ? String(data!.contributor_display_name) : "the writer",
    subject: ((data as any)?.subject?.name as string) || "the person it's about",
  };
}

/* ───────────────────────────── Handler ───────────────────────────── */

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record;

    if (!notification?.user_id) {
      return new Response("No user_id", { status: 200 });
    }

    // 1. Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
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

    const type: string = notification.type || "";
    const theme = themeFor(type);
    const recordUrl = notification.record_id ? `${APP_URL}/record/${notification.record_id}` : null;

    let subject = notification.title || "An update from DNounce";
    let headline = esc(subject);
    let preheader = notification.body || "";
    let body = "";
    let textLines: string[] = [];
    let link: { label: string; href: string } | undefined;

    if (type === "stage_2_subject" && notification.record_id) {
      const { record, writer } = await recordNames(notification.record_id);
      if (!record) {
        console.error("Record fetch failed. record_id:", notification.record_id);
        return new Response("Record not found", { status: 200 });
      }
      const who = writer === "the writer" ? "Someone" : writer;
      const category = record.category ? ` about your work as a ${esc(record.category)}` : "";
      subject = `${who} wrote a record about you`;
      headline = `${esc(who)} shared an experience about you`;
      preheader = "You can read it privately for the next 24 hours, before it goes public.";
      link = { label: "Read it privately", href: recordUrl! };
      body =
        para(`${esc(who)} wrote a record about you on DNounce${category}. You're the first to know.`) +
        callout(`<strong>🔒 Private for 24 hours.</strong> Only you can see it right now. After that it goes public, and you can share your side.`, theme) +
        button(recordUrl!, "Read it privately →", theme.color) +
        timeline(LIFECYCLE, 0, theme) +
        para(`<span style="font-size:13px;color:#6B7280;">Record ID: ${esc(record.id)}. To check this email is real, go to dnounce.com yourself and look the record up.</span>`);
      textLines = [
        `${who} wrote a record about you on DNounce${record.category ? ` about your work as a ${record.category}` : ""}.`,
        "Only you can see it for the next 24 hours. After that it goes public, and you can share your side or challenge it.",
        "If you challenge it, you both get 3 days to share your side, then the community votes. The record always stays up.",
      ];

    } else if (type === "stage_4_contributor" && notification.record_id) {
      subject = notification.title || "Your record was challenged";
      headline = esc(subject);
      preheader = "Both sides opens in 24 hours. Here's what to expect.";
      link = { label: "See your record", href: recordUrl! };
      body =
        para(esc(notification.body || "The person your record is about sees things differently and challenged it.")) +
        callout(`<strong>Your record stays up</strong> whatever happens. Now's a great time to gather anything that backs up your side — messages, receipts, photos.`, theme) +
        button(recordUrl!, "See your record →", theme.color) +
        timeline([
          { title: "Challenged", text: "Both sides opens in 24 hours." },
          { title: "Both sides", text: "You both get 3 days to share your side, with evidence." },
          ...LIFECYCLE.slice(3),
        ], 0, theme);
      textLines = [
        notification.body || "The person your record is about sees things differently and challenged it.",
        "In 24 hours you both get 3 days to share your side. Then the community votes for 2 days, and the result shows a week later.",
        "Your record stays up whatever happens.",
      ];

    } else if (type === "verdict_countdown" && notification.record_id) {
      subject = "Results come out tomorrow";
      headline = "The results come out tomorrow";
      preheader = "The community has voted. Here's when you'll see where people landed.";
      link = { label: "See the record", href: recordUrl! };
      body =
        para("The community vote on a record you're part of is closed, and the results go live tomorrow.") +
        callout("Set a reminder — you'll get another email the moment they're out.", theme) +
        button(recordUrl!, "See the record →", theme.color);
      textLines = ["The community vote on a record you're part of is closed. The results go live tomorrow."];

    } else if (type === "verdict_announced" && notification.record_id) {
      const { record, writer, subject: person } = await recordNames(notification.record_id);
      const result = outcomeSentence(record?.final_outcome, writer, person);
      subject = "The results are in";
      headline = "The results are in";
      preheader = result ?? "See where the community landed.";
      link = { label: "See the results", href: recordUrl! };
      body =
        para("The community has weighed in on a record you're part of.") +
        (result
          ? callout(`<div style="font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${theme.color};margin-bottom:4px;">Result</div><div style="font-size:18px;font-weight:700;color:#111827;">${esc(result)}</div>`, theme)
          : callout("Nobody voted on this one, so there's no result label. Both sides are still there for anyone to read.", theme)) +
        para("The record stays up, together with both sides and the reasons people gave.") +
        button(recordUrl!, "See the results →", theme.color);
      textLines = [
        "The community has weighed in on a record you're part of.",
        result ? `Result: ${result}` : "Nobody voted on this one, so there's no result label.",
        "The record stays up, together with both sides and the reasons people gave.",
      ];

    } else if (type === "verdict_community_unlock" && notification.record_id) {
      subject = "The conversation is open again";
      headline = "You can join the conversation again";
      preheader = "It's been a week since the results came out.";
      link = { label: "Go to the record", href: recordUrl! };
      body =
        para("It's been a week since the results came out. You can now post and reply in the record's community section.") +
        button(recordUrl!, "Go to the record →", theme.color);
      textLines = ["It's been a week since the results came out. You can now post and reply in the record's community section."];

    } else if (type === "claim_approved") {
      subject = "Your profile is officially yours";
      headline = "Welcome — your profile is officially yours 🎉";
      preheader = "You can now manage your page and respond to records about you.";
      link = { label: "Go to your dashboard", href: `${APP_URL}/dashboard/myrecords` };
      body =
        para("Great news: we've confirmed it's you. Your DNounce profile now belongs to you.") +
        callout(`<strong>Here's what you can do now</strong><br>• Update your profile details<br>• Read every record about you<br>• Share your side, or challenge a record you see differently`, theme) +
        button(`${APP_URL}/dashboard/myrecords`, "Go to your dashboard →", theme.color);
      textLines = [
        "We've confirmed it's you. Your DNounce profile now belongs to you.",
        "You can update your profile, read every record about you, and share your side or challenge a record.",
      ];

    } else if (type === "claim_rejected") {
      subject = "An update on your profile claim";
      headline = "We couldn't confirm your claim this time";
      preheader = "Here's why, and how to try again.";
      link = { label: "Contact support", href: `${APP_URL}/dashboard/settings/support` };
      body =
        para("Thanks for claiming your profile. We weren't able to approve it this time.") +
        callout(`<strong>Reason:</strong> ${esc(notification.body || "No reason was given.")}`, theme) +
        para("If you think we got it wrong, or you have more to show us, our team is happy to take another look.") +
        button(`${APP_URL}/dashboard/settings/support`, "Contact support →", theme.color);
      textLines = [
        "We weren't able to approve your profile claim this time.",
        `Reason: ${notification.body || "No reason was given."}`,
        "If you think we got it wrong, contact support and we'll take another look.",
      ];

    } else if (type === "trial_ending") {
      subject = "Your free trial ends in 3 days";
      headline = "Your free trial ends in 3 days";
      preheader = "No action needed to keep going.";
      link = { label: "Manage your plan", href: `${APP_URL}/dashboard/settings/billing` };
      body =
        (notification.body ? para(esc(notification.body)) : "") +
        callout("<strong>Want to keep going?</strong> No action needed — your plan continues automatically when the trial ends.<br><strong>Prefer to cancel?</strong> You can do it any time before then from Billing.", theme) +
        button(`${APP_URL}/dashboard/settings/billing`, "Manage your plan →", theme.color);
      textLines = [
        notification.body || "",
        "No action is needed to keep going — your plan continues automatically when the trial ends.",
        "You can cancel any time before then from Billing.",
      ].filter(Boolean);

    } else {
      // Every other notification: same design, using the title and body the database wrote.
      subject = notification.title || "An update from DNounce";
      headline = esc(subject);
      preheader = notification.body || "There's something new on DNounce.";
      link = recordUrl ? { label: "View the record", href: recordUrl } : { label: "Open DNounce", href: `${APP_URL}/dashboard` };
      body =
        para(esc(notification.body || "There's something new for you on DNounce.")) +
        button(link.href, `${link.label} →`, theme.color);
      textLines = [notification.body || "There's something new for you on DNounce."];
    }

    const html = layout({ theme, preheader, headline, body, firstName });
    const text = toText(subject, firstName, textLines, link);

    // 3. Send via Resend
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
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return new Response("Resend failed", { status: 200 });
    }

    console.log(`Email sent — type: ${type}`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response("Internal error", { status: 200 });
  }
});
