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
  record:    { label: "New on your profile",      color: "#2563EB", soft: "#EFF6FF", icon: "📝" },
  challenge: { label: "Your record",       color: "#D97706", soft: "#FFFBEB", icon: "⚖️" },
  bothsides: { label: "Debate",          color: "#0891B2", soft: "#ECFEFF", icon: "💬" },
  vote:      { label: "Community vote",  color: "#7C3AED", soft: "#F5F3FF", icon: "🗳️" },
  results:   { label: "Results",         color: "#4F46E5", soft: "#EEF2FF", icon: "📣" },
  account:   { label: "Your profile",    color: "#059669", soft: "#ECFDF5", icon: "✅" },
  billing:   { label: "Your plan",         color: "#111827", soft: "#F3F4F6", icon: "💳" },
  badge:     { label: "New badge",       color: "#C026D3", soft: "#FDF4FF", icon: "🏅" },
  heads_up:  { label: "Heads up",        color: "#DC2626", soft: "#FEF2F2", icon: "⚠️" },
  activity:  { label: "Update",        color: "#0EA5E9", soft: "#F0F9FF", icon: "🔔" },
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

/** A short, friendly list (optional heading). */
function tips(heading: string, items: string[]) {
  const head = heading
    ? `<div style="font-family:${FONT};font-size:15px;font-weight:700;color:#111827;margin:0 0 10px;">${heading}</div>`
    : "";
  const rows = items
    .map((t) => `<tr><td width="22" valign="top" style="font-family:${FONT};font-size:15px;line-height:24px;color:#9CA3AF;">•</td><td style="font-family:${FONT};font-size:15px;line-height:24px;color:#374151;padding-bottom:6px;">${t}</td></tr>`)
    .join("");
  return `<div style="margin:24px 0 8px;">${head}<table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table></div>`;
}

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
              <p style="margin:24px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:#374151;">— The DNounce team</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Trust note -->
        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
          We'll never ask for your password by email. Not sure a link is real? Just go to <a href="${APP_URL}" style="color:#4B5563;">dnounce.com</a> and sign in.
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:20px;color:#9CA3AF;text-align:center;">
          <a href="${APP_URL}/support" style="color:#6B7280;text-decoration:none;">Help Center</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/legal#privacy" style="color:#6B7280;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
          <a href="${APP_URL}/legal#terms" style="color:#6B7280;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
          <a href="${settings}" style="color:#6B7280;text-decoration:none;">Email settings</a>
          <br>You're getting this because you have a DNounce account.
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
    "— The DNounce team",
    "",
    `Email settings: ${APP_URL}/dashboard/settings/notifications`,
  ].join("\n");
}

async function recordInfo(recordId: string, userId: string) {
  const { data } = await supabase
    .from("records")
    .select("id, category, rating, final_outcome, debate_ends_at, contributor_id, subject_id, contributor_display_name, contributor_identity_preference")
    .eq("id", recordId)
    .maybeSingle();
  const rec = data as any;
  let subjectName = "the person it's about";
  let subjectOwner: string | null = null;
  let writerUser: string | null = null;
  if (rec?.subject_id) {
    const { data: s } = await supabase.from("subjects").select("name, owner_auth_user_id").eq("subject_uuid", rec.subject_id).maybeSingle();
    if ((s as any)?.name) subjectName = (s as any).name;
    subjectOwner = (s as any)?.owner_auth_user_id ?? null;
  }
  if (rec?.contributor_id) {
    const { data: c } = await supabase.from("contributors").select("user_id").eq("id", rec.contributor_id).maybeSingle();
    writerUser = (c as any)?.user_id ?? null;
  }
  const showWriter = !!rec && rec.contributor_identity_preference !== false && !!rec.contributor_display_name;
  const role: "writer" | "subject" | "other" =
    userId && userId === writerUser ? "writer" : userId && userId === subjectOwner ? "subject" : "other";
  return {
    record: rec,
    writer: showWriter ? String(rec.contributor_display_name) : "the writer",
    subject: subjectName,
    role,
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

    // No email for these (KJ, Oct 25): the writer already sees a confirmation screen
    // after submitting, and the person who challenged knows their challenge opens the debate.
    // The in-app notification still shows.
    const NO_EMAIL = new Set(["stage_2_contributor", "stage_5_subject"]);
    if (NO_EMAIL.has(type)) return new Response("No email for this type", { status: 200 });
    const theme = themeFor(type);
    const recordUrl = notification.record_id ? `${APP_URL}/record/${notification.record_id}` : null;

    let subject = notification.title || "An update from DNounce";
    let headline = esc(subject);
    let preheader = notification.body || "";
    let body = "";
    let textLines: string[] = [];
    let link: { label: string; href: string } | undefined;

    // Wording drafted by Runable (Oct 25), checked against how the site works.
    const info = notification.record_id ? await recordInfo(notification.record_id, notification.user_id) : null;
    const writerName = info?.writer ?? "the writer";
    const personName = info?.subject ?? "the person it's about";
    const otherName = info?.role === "writer" ? personName : writerName;
    // Add a full stop unless the text already ends with one ("Devon A.").
    const dot = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
    const BOTH_SIDES = tips("How the debate works", [
      "The debate lasts 3 days. The writer and the person it's about each tell their side.",
      "You can reply to each other and add photos, messages or receipts. Posts can't be edited once shared.",
      "Everyone else can read along. Then the community votes on who they side with.",
    ]);
    const GUIDELINES = `${APP_URL}/?section=guidelines-section`;
    const simple = (opts: { subj: string; pre: string; head: string; paras: string[]; btn: string; href: string; extra?: string }) => {
      subject = opts.subj;
      preheader = opts.pre;
      headline = esc(opts.head);
      link = { label: opts.btn, href: opts.href };
      body = opts.paras.map((p) => para(esc(p))).join("") + (opts.extra ?? "") + button(opts.href, opts.btn, theme.color);
      textLines = [...opts.paras];
    };

    if (type === "stage_2_subject" && info?.record) {
      const who = writerName === "the writer" ? "Someone" : writerName;
      const stars = info.record.rating ? ` and gave it ${info.record.rating} out of 10 stars` : "";
      simple({
        subj: "A record was written about you",
        pre: "You get the first look. It's private for 24 hours.",
        head: "You have a new record to read",
        paras: [
          `You get the first look. ${who} wrote a firsthand record about working with you${stars}.`,
          "You can read it privately for the next 24 hours, then it goes public on your profile.",
        ],
        btn: "Read it now",
        href: recordUrl!,
        extra: tips("Your options", [
          "<strong>Read it first.</strong> Only you can see it for now.",
          "<strong>See it differently?</strong> Once it's public, you can challenge it. That opens a 3-day debate where you and the writer each tell your side.",
          "<strong>The community decides.</strong> After the debate, people who don't know either of you read both sides and vote. DNounce never takes sides.",
        ]),
      });

    } else if (type === "stage_2_contributor" && info?.record) {
      simple({
        subj: "Your record is in",
        pre: `We let ${personName} know. It goes public in 24 hours.`,
        head: "Thanks — your record is in",
        paras: [
          `We let ${personName} know about your record. They get a private first look for 24 hours, then it goes public on their profile.`,
        ],
        btn: "View your record",
        href: recordUrl!,
      });

    } else if (type === "stage_3_contributor" && info?.record) {
      simple({
        subj: "Your record is live",
        pre: "The person it's about can now challenge it, once.",
        head: "Your record is now public",
        paras: [
          `Your record about ${personName} is live on their profile.`,
        ],
        btn: "View your record",
        href: recordUrl!,
      });

    } else if (type === "stage_3_subject" && info?.record) {
      simple({
        subj: "The record about you is now public",
        pre: "See it differently? You can challenge it once.",
        head: "The record about you is now public",
        paras: [
          "Anyone can read it on your profile now.",
          `If you want to challenge the record, you can. Challenging it starts a debate with ${dot(writerName === "the writer" ? "the writer" : writerName)}`,
        ],
        btn: "View the record",
        href: recordUrl!,
        extra: BOTH_SIDES,
      });

    } else if (type === "stage_4_contributor" && info?.record) {
      simple({
        subj: `${personName} challenged your record`,
        pre: "Here's what happens next.",
        head: `${personName} challenged your record`,
        paras: [
          `${personName} sees things differently and challenged your record.`,
          "The debate starts in 24 hours, and you can tell your side there.",
        ],
        btn: "See your record",
        href: recordUrl!,
        extra: BOTH_SIDES,
      });

    } else if (type === "stage_5_contributor" && info?.record) {
      simple({
        subj: "The debate is open. Tell your side.",
        pre: "You have 3 days to post, reply and add evidence.",
        head: "The debate is open",
        paras: [
          `The debate is now open on your record about ${personName}, and it runs for 3 days.`,
          `This is your space to tell your side in your own words and reply to ${dot(personName)} Once you post, it can't be edited, so take your time.`,
        ],
        btn: "Tell your side",
        href: recordUrl!,
        extra: BOTH_SIDES,
      });

    } else if (type === "stage_5_subject" && info?.record) {
      simple({
        subj: "The debate is open. Tell your side.",
        pre: "You have 3 days to post, reply and add evidence.",
        head: "Your debate is open",
        paras: [
          "Your challenge has opened a debate on the record about you.",
          `This is your 3-day space to tell your side in your own words and reply to ${dot(writerName)} Once you post, it can't be edited, so take your time.`,
        ],
        btn: "Tell your side",
        href: recordUrl!,
        extra: BOTH_SIDES,
      });

    } else if (type === "debate_reply" && info?.record) {
      const endsMs = info.record.debate_ends_at ? new Date(info.record.debate_ends_at).getTime() - Date.now() : null;
      const hoursLeft = endsMs !== null && endsMs > 0 ? Math.max(1, Math.round(endsMs / 3_600_000)) : null;
      const who = otherName === "the writer" ? "The writer" : otherName === "the person it's about" ? "The person it's about" : otherName;
      simple({
        subj: `${who} replied in your debate`,
        pre: "You can reply until the 3 days end.",
        head: "New reply in your debate",
        paras: [
          `${who} just posted in the debate. You can reply until the 3 days end.`,
          ...(hoursLeft ? [`The debate closes in about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`] : []),
        ],
        btn: "Read and reply",
        href: recordUrl!,
      });

    } else if ((type === "stage_6_subject" || type === "stage_6_contributor") && info?.record) {
      simple({
        subj: "The debate has closed. Voting starts.",
        pre: "The community now reads both sides and picks a side.",
        head: "The community votes now",
        paras: [
          `The debate is now closed on the record about ${personName}.`,
          "Signed-in members will read both stories and pick who they side with, with a short reason. Voting runs for 2 days.",
          "You can't vote on this record, but you can watch."
        ],
        btn: "Read the debate",
        href: recordUrl!,
      });

    } else if ((type === "voting_ended_subject" || type === "voting_ended_contributor") && info?.record) {
      const mine = info.role === "writer" ? "your record" : "the record about you";
      simple({
        subj: "Voting is closed. Results are coming.",
        pre: "Results come out in about a week.",
        head: "Voting is closed",
        paras: [
          `Voting on ${mine} has closed.`,
          "Results come out in about a week. We'll email you when they're in.",
        ],
        btn: "Read the debate",
        href: recordUrl!,
      });

    } else if (type === "voting_ended_voter" && info?.record) {
      simple({
        subj: "Thanks for voting",
        pre: "Voting has closed. Results come out in about a week.",
        head: "Thanks for voting",
        paras: [
          `Voting on the record about ${personName} has closed. Thanks for taking the time to read both sides and give your reason.`,
          "Results come out in about a week.",
        ],
        btn: "View the record",
        href: recordUrl!,
      });

    } else if (type === "verdict_announced" && info?.record) {
      // The email never gives the result away — people open the record to see it.
      const raw = (info.record.final_outcome ?? "").toLowerCase();
      const hasResult = raw !== "";
      const mine = info.role === "writer" ? "your record" : info.role === "subject" ? "the record about you" : `the record about ${personName}`;
      if (!hasResult) {
        simple({
          subj: "No votes were cast",
          pre: "There's no result this time.",
          head: "No result this time",
          paras: [`Nobody voted on ${mine}, so there's no result this time.`],
          btn: "Read the record",
          href: recordUrl!,
        });
      } else {
        simple({
          subj: "The results are in",
          pre: "Find out who the community sided with.",
          head: "The community has spoken",
          paras: [
            `The votes are counted on ${mine}.`,
            "Who did people side with, and why? Your results are waiting.",
          ],
          btn: "See the results",
          href: recordUrl!,
        });
      }

    } else if (type === "seven_day_unlock" && info?.record) {
      simple({
        subj: "You can comment on this record now",
        pre: "The results are out, and the conversation is open to you.",
        head: "The conversation is open to you",
        paras: [
          `Now that the results are out, you can comment on the record about ${personName}.`,
          "Keep it firsthand and stick to what happened.",
        ],
        btn: "Join the conversation",
        href: recordUrl!,
      });

    } else if (type === "voter_reply" && recordUrl) {
      simple({
        subj: "Someone replied to your vote",
        pre: "Take a look, and reply if you like.",
        head: "A reply to your vote",
        paras: [`Someone replied to the reason you gave for your vote on the record about ${personName}.`],
        btn: "See the reply",
        href: recordUrl,
      });

    } else if (type === "voter_flagged") {
      simple({
        subj: "Your vote reason was flagged",
        pre: "Your vote still counts for now.",
        head: "Your vote reason was flagged",
        paras: [
          `Other members flagged the reason you gave for your vote on the record about ${personName} as careless.`,
          "Your vote still counts unless enough members flag it.",
        ],
        btn: "Read the guidelines",
        href: GUIDELINES,
        extra: tips("", [
          "Every vote needs a short reason.",
          "Careless reasons can be flagged by other members.",
          "Enough flags removes the vote from the count.",
        ]),
      });

    } else if (type === "voter_convicted") {
      simple({
        subj: "Your vote was removed from the count",
        pre: "Here's why, and what it means for your badge.",
        head: "Your vote was removed",
        paras: [
          `Enough members flagged your reason on the record about ${personName} as careless, so your vote has been removed from the count.`,
          "This only affects your vote, not any records. Your profile now shows a Lost voting rights badge.",
        ],
        btn: "Read the guidelines",
        href: GUIDELINES,
        extra: tips("", [
          "Every vote needs a short, specific reason.",
          "Enough careless flags removes a vote from the count.",
        ]),
      });

    } else if (type === "badge_earned") {
      const badge = String(notification.title || "").split("—").pop()?.replace(/^[^A-Za-z]+/, "").trim() || "a new";
      const WHY: Record<string, string> = {
        "Top Writer": "writing records that hold up — almost all of them were never challenged, or most people sided with you",
        "Well Regarded": "records about you holding up really well with the community",
        "Top Community Member": "comments that people find helpful",
        "Top Voter": "vote reasons that people find helpful",
        "Rising Star": "a record that got the community talking",
        "Fan Favorite": "posts that people have only reacted to positively",
      };
      const why = WHY[badge];
      simple({
        subj: `You earned the ${badge} badge`,
        pre: "It now shows on your profile.",
        head: `You earned the ${badge} badge`,
        paras: [why ? `You've earned the ${badge} badge for ${why}. It now shows on your profile, next to your name.` : (notification.body || `You've earned the ${badge} badge. It now shows on your profile.`)],
        btn: "See your badges",
        href: `${APP_URL}/dashboard/reputation`,
      });

    } else if (/^(pinned|following)_/.test(type)) {
      simple({
        subj: notification.title || "New activity on a record you follow",
        pre: notification.body || "There's news on a record you follow.",
        head: "There's news on a record you follow",
        paras: [
          notification.body || "There's something new on a record you follow.",
          "You're getting this because you follow or pinned this record.",
        ],
        btn: "See what's new",
        href: recordUrl ?? `${APP_URL}/dashboard/following`,
      });

    } else if (type === "claim_approved") {
      simple({
        subj: "Your profile is claimed",
        pre: "It's yours to manage on DNounce.",
        head: "Your profile is claimed",
        paras: [
          "Your claim has been approved, so the profile is now linked to your account.",
          "You can see every record about you. If you see one differently, challenge it to start a debate and tell your side.",
        ],
        btn: "Go to your profile",
        href: `${APP_URL}/dashboard/myrecords`,
      });

    } else if (type === "claim_rejected") {
      simple({
        subj: "We couldn't approve your claim",
        pre: "Here's why, and what you can do next.",
        head: "We couldn't approve your claim",
        paras: [
          `We couldn't approve your profile claim. Reason: ${dot(notification.body || "we didn't have enough to confirm it")}`,
          "If you have more details, send us a message and we'll take another look.",
        ],
        btn: "Contact support",
        href: `${APP_URL}/dashboard/settings/support`,
      });

    } else if (type === "trial_ending") {
      const { data: sub } = await supabase.from("subscriptions").select("plan_id, trial_ends_at").eq("user_id", notification.user_id).maybeSingle();
      const plan = (sub as any)?.plan_id === "pro" ? "Pro plan at $24.99" : "Insights plan at $9.99";
      const ends = (sub as any)?.trial_ends_at
        ? new Date((sub as any).trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" })
        : null;
      simple({
        subj: "Your free trial ends in 3 days",
        pre: ends ? `Keep your plan, or change it before ${ends}.` : "Keep your plan, or change it before it ends.",
        head: "Your free trial ends in 3 days",
        paras: [
          `Nothing is charged until your free trial ends${ends ? ` on ${ends}` : ""}. After that, your ${plan} bills each month.`,
          "You can change or cancel anytime in your billing settings.",
        ],
        btn: "Manage your plan",
        href: `${APP_URL}/dashboard/settings/billing`,
      });

    } else {
      // Anything else (replies on your record, flagged votes on your record...): same design, database wording.
      simple({
        subj: notification.title || "Something new on DNounce",
        pre: notification.body || "There's something new for you on DNounce.",
        head: notification.title || "Something new on DNounce",
        paras: [notification.body || "There's something new for you on DNounce."],
        btn: recordUrl ? "Take a look" : "Open DNounce",
        href: recordUrl ?? `${APP_URL}/dashboard`,
      });
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
