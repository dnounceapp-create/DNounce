import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://www.dnounce.com";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function contributorLabel(record: any): string {
  const cred = (record.ai_vendor_1_result || record.credibility || "").toLowerCase();
  const choseName = record.contributor_identity_preference === true;

  if (cred.includes("evidence")) {
    return choseName ? record.contributor_real_name || "Somebody" : "Somebody";
  }
  if (cred.includes("opinion")) {
    return record.contributor_real_name || "Somebody";
  }
  // unclear or pending → alias
  return record.contributor_alias || "Somebody";
}

function recordType(record: any): string {
  const cred = (record.ai_vendor_1_result || record.credibility || "").toLowerCase();
  if (cred.includes("evidence")) return "Evidence-Based";
  if (cred.includes("opinion")) return "Opinion-Based";
  return "Unclear";
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "DNounce <notifications@dnounce.com>",
      to,
      subject,
      html,
    }),
  });
}

async function insertNotification(userId: string, title: string, body: string, type: string, recordId: string) {
  await supabase.from("notifications").insert({ user_id: userId, title, body, type, record_id: recordId });
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">
        <tr><td style="background:#0f0f0f;padding:20px 28px;text-align:center;">
          <span style="font-size:18px;font-weight:500;color:#ffffff;letter-spacing:-0.3px;">DNounce</span>
        </td></tr>
        <tr><td style="padding:28px;">
          ${content}
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
          <p style="font-size:11px;color:#999;text-align:center;margin:0;">
            Sincerely, The DNounce Team &nbsp;·&nbsp;
            <a href="${APP_URL}/dashboard/settings/notifications" style="color:#999;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoBox(label: string, value: string) {
  return `<tr><td style="color:#888;padding:4px 0;font-size:12px;">${label}</td><td style="color:#111;font-weight:500;font-size:12px;text-align:right;">${value}</td></tr>`;
}

function detailsTable(rows: string[]) {
  return `<table style="width:100%;background:#f5f5f5;border-radius:8px;padding:12px 14px;margin-bottom:16px;border-collapse:collapse;">${rows.join("")}</table>`;
}

function highlightBox(color: string, borderColor: string, titleColor: string, bodyColor: string, title: string, body: string) {
  return `<div style="background:${color};border-left:3px solid ${borderColor};border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:16px;">
    <p style="font-size:12px;font-weight:600;color:${titleColor};margin:0 0 4px;">${title}</p>
    <p style="font-size:12px;color:${bodyColor};margin:0;line-height:1.5;">${body}</p>
  </div>`;
}

function ctaButton(href: string, text: string) {
  return `<a href="${href}" style="display:block;text-align:center;background:#0f0f0f;color:#fff;font-size:13px;font-weight:500;padding:12px;border-radius:8px;text-decoration:none;margin-top:16px;">${text}</a>`;
}

function transparencyNote(recordId: string) {
  return `<p style="font-size:12px;color:#888;line-height:1.5;"><strong style="color:#555;">Transparency Note:</strong> If you are unsure about the legitimacy of this message, go directly to dnounce.com and search your Record ID (<strong>${recordId}</strong>) to verify this notification.</p>`;
}

// ─── Stage-specific notification builders ────────────────────────────────────

// Stage 1 → Contributor
async function notifyContributorStage1(record: any, contributorEmail: string, contributorFirstName: string) {
  const subject = "Your record is under AI review — DNounce";
  const recordUrl = `${APP_URL}/record/${record.id}`;

  const html = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${contributorFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">Your record has been submitted successfully and is currently under AI review. This process takes up to <strong>72 hours</strong>. You will be notified once it moves to the next stage.</p>
    ${detailsTable([infoBox("Record ID", record.id.slice(0, 8) + "…"), infoBox("Status", "AI Verification in Progress"), infoBox("Est. completion", "Within 72 hours")])}
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">You can view your submission at any time in your <a href="${APP_URL}/dashboard/records-submitted" style="color:#185FA5;">Records Submitted</a> dashboard. You may delete your record during this stage if you change your mind.</p>
    ${ctaButton(recordUrl, "View Your Submission")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(record.id.slice(0, 8) + "…")}
  `);

  await Promise.all([
    insertNotification(record.contributor_user_id, "Your record is under AI review", "Your submission is being reviewed by DNounce AI. You'll hear back within 72 hours.", "stage_1_contributor", record.id),
    sendEmail(contributorEmail, subject, html),
  ]);
}

// Stage 2 → Subject
async function notifySubjectStage2(record: any, subjectEmail: string, subjectFirstName: string) {
  const contribLabel = contributorLabel(record);
  const recType = recordType(record);
  const isEvidence = recType === "Evidence-Based";
  const isOpinion = recType === "Opinion-Based";
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";

  const whyBox = isEvidence
    ? highlightBox("#E6F1FB", "#185FA5", "#042C53", "#0C447C", 'Why "Somebody"?', 'For Evidence-Based records, DNounce protects the contributor\'s identity to keep focus on the evidence — not personal retaliation. If this were an Opinion-Based record, the contributor\'s name would be visible.')
    : isOpinion
    ? highlightBox("#EAF3DE", "#3B6D11", "#173404", "#3B6D11", "Why is the contributor's name shown?", "For Opinion-Based records, DNounce displays the contributor's name since the submission reflects a personal experience or viewpoint rather than hard evidence. This ensures clarity and transparency for both parties.")
    : "";

  const html = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${subjectFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">You are receiving this message because a record has been submitted about you on DNounce, our community accountability platform.</p>
    ${detailsTable([
      infoBox("Record ID", shortId),
      infoBox("Record Type", recType),
      infoBox("Submitted by", `"${contribLabel}" who labeled you as ${record.relationship || "a contact"}`),
      infoBox("Review window", "24 hours (private)"),
    ])}
    ${whyBox}
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:4px;"><strong style="color:#111;">Your rights and next steps:</strong></p>
    <ol style="margin:8px 0 16px 16px;font-size:13px;color:#555;line-height:1.9;">
      <li><strong style="color:#111;">View the record:</strong> Go to <a href="${recordUrl}" style="color:#185FA5;">dnounce.com/${shortId}</a> to privately review the details before it publishes.</li>
      <li><strong style="color:#111;">Prepare your response:</strong> You have <strong>24 hours</strong> to review the record privately before it becomes publicly visible.</li>
      <li><strong style="color:#111;">Request deletion:</strong> If you believe this record does not belong on your profile, you can request deletion after it publishes. This will initiate a structured debate process.</li>
    </ol>
    ${ctaButton(recordUrl, "View Record Privately")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.subject_user_id, "Action Required — A record has been submitted about you", `${contribLabel} submitted a ${recType} record about you. You have 24 hours to review privately before it publishes.`, "stage_2_subject", record.id),
    sendEmail(subjectEmail, "Action Required — DNounce Subject Alert", html),
  ]);
}

// Stage 3 → Subject + Contributor
async function notifyStage3Published(record: any, subjectEmail: string, subjectFirstName: string, contributorEmail: string, contributorFirstName: string) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";
  const recType = recordType(record);

  // Subject email
  const subjectHtml = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${subjectFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">The record about you is now publicly visible on DNounce.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Record Type", recType), infoBox("Status", "Published — publicly visible")])}
    ${highlightBox("#EAF3DE", "#3B6D11", "#173404", "#3B6D11", "What can you do now?", "The record is live. If you believe it should not be on your profile, you can request deletion from your dashboard. This will trigger a structured debate and community vote.")}
    ${ctaButton(recordUrl, "View Published Record")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  // Contributor email
  const contribHtml = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${contributorFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">Your record is now live and publicly visible on DNounce.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Record Type", recType), infoBox("Status", "Published — publicly visible")])}
    ${ctaButton(recordUrl, "View Your Live Record")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.subject_user_id, "Your record is now published", "The record about you is now publicly visible on DNounce.", "stage_3_subject", record.id),
    insertNotification(record.contributor_user_id, "Your record is now live", "Your submitted record is now publicly visible on DNounce.", "stage_3_contributor", record.id),
    sendEmail(subjectEmail, "Your DNounce Record is Now Published", subjectHtml),
    sendEmail(contributorEmail, "Your DNounce Record is Now Live", contribHtml),
  ]);
}

// Stage 4 → Contributor (subject disputed)
async function notifyContributorStage4(record: any, contributorEmail: string, contributorFirstName: string) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";
  const recType = recordType(record);
  const subjectName = record.subject_name || "The subject";

  const html = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${contributorFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">A record you submitted on DNounce has been disputed by the subject. A structured debate process will now begin.</p>
    ${detailsTable([
      infoBox("Record ID", shortId),
      infoBox("Record Type", recType),
      infoBox("Disputed by", `${subjectName} (subject)`),
      infoBox("Debate opens in", "24 hours"),
    ])}
    ${highlightBox("#FAEEDA", "#BA7517", "#412402", "#633806", "What happens now?", "A 72-hour debate window will open between you and the subject. During this time, both parties can post statements, reply to each other, and submit supporting evidence. After debate closes, the community votes to keep or delete the record.")}
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:4px;"><strong style="color:#111;">Your responsibilities and timeline:</strong></p>
    <ol style="margin:8px 0 16px 16px;font-size:13px;color:#555;line-height:1.9;">
      <li><strong style="color:#111;">Review the dispute:</strong> Go to <a href="${recordUrl}" style="color:#185FA5;">dnounce.com/${shortId}</a> to see the subject's reason for disputing.</li>
      <li><strong style="color:#111;">Prepare your statement:</strong> Once debate opens you will have a <strong>72-hour window</strong> to exchange statements and evidence with the subject. Use the time wisely — replies within the debate window count.</li>
      <li><strong style="color:#111;">Support your record:</strong> Gather any sources, screenshots, or context that supports your original submission.</li>
    </ol>
    ${ctaButton(recordUrl, "View Record & Prepare Statement")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.contributor_user_id, "Action Required — Your record has been disputed", `${subjectName} has disputed your record. Debate opens in 24 hours — review and prepare.`, "stage_4_contributor", record.id),
    sendEmail(contributorEmail, "Action Required — Your DNounce Record Has Been Disputed", html),
  ]);
}

// Stage 5 → Subject + Contributor (debate open)
async function notifyStage5Debate(record: any, subjectEmail: string, subjectFirstName: string, contributorEmail: string, contributorFirstName: string) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";

  const sharedNote = `<p style="font-size:12px;color:#888;line-height:1.5;"><strong style="color:#555;">Important:</strong> The 72-hour window is for the full back-and-forth exchange — not just your opening statement. Both parties can post, reply, and submit evidence throughout. Plan your participation accordingly.</p>`;

  const subjectHtml = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${subjectFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">The debate on the disputed record is now open. You have a <strong>72-hour window</strong> to present your case with evidence and respond to the contributor.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Stage", "Debate Open"), infoBox("Window", "72 hours from now")])}
    ${highlightBox("#FAEEDA", "#BA7517", "#412402", "#633806", "Your goal in this stage", "Present your reasoning for why this record should be deleted. You can post statements, upload supporting evidence, and reply to the contributor's arguments — all within the 72-hour window.")}
    ${sharedNote}
    ${ctaButton(recordUrl, "Enter Debate & Post Your Case")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  const contribHtml = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${contributorFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">The debate on your disputed record is now open. You have a <strong>72-hour window</strong> to defend your submission with sources and reasoning.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Stage", "Debate Open"), infoBox("Window", "72 hours from now")])}
    ${highlightBox("#E6F1FB", "#185FA5", "#042C53", "#0C447C", "Your goal in this stage", "Defend your record with supporting evidence — screenshots, links, or context. You can post statements and reply to the subject throughout the 72-hour window.")}
    ${sharedNote}
    ${ctaButton(recordUrl, "Enter Debate & Defend Your Record")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.subject_user_id, "Debate is now open — 72 hours to make your case", "Present your case and respond to the contributor. The full 72-hour window is for the entire exchange.", "stage_5_subject", record.id),
    insertNotification(record.contributor_user_id, "Debate is now open — 72 hours to defend your record", "Defend your submission with evidence. The full 72-hour window is for the entire exchange.", "stage_5_contributor", record.id),
    sendEmail(subjectEmail, "Debate Now Open — DNounce Record Dispute", subjectHtml),
    sendEmail(contributorEmail, "Debate Now Open — Defend Your DNounce Record", contribHtml),
  ]);
}

// Stage 6 → All eligible voters + subject + contributor
async function notifyStage6Voting(record: any, subjectEmail: string, subjectFirstName: string, contributorEmail: string, contributorFirstName: string) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";

  // Subject + contributor notified (view only)
  const observerHtml = (firstName: string) => emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${firstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">The community is now voting on the disputed record. You can observe the voting progress but cannot interact during this stage.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Stage", "Voting Open"), infoBox("Voting window", "48 hours")])}
    ${highlightBox("#f5f5f5", "#ccc", "#333", "#666", "What happens next?", "After 48 hours, the community vote determines whether the record is kept or deleted. You will be notified of the outcome.")}
    ${ctaButton(recordUrl, "Observe Voting Progress")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.subject_user_id, "Voting has begun on your record", "The community is voting on the disputed record. You can observe but not interact during voting.", "stage_6_subject", record.id),
    insertNotification(record.contributor_user_id, "Voting has begun on your record", "The community is now voting. Observe the progress — outcome announced in 48 hours.", "stage_6_contributor", record.id),
    sendEmail(subjectEmail, "Community Voting Has Begun — DNounce", observerHtml(subjectFirstName)),
    sendEmail(contributorEmail, "Community Voting Has Begun — DNounce", observerHtml(contributorFirstName)),
  ]);
}

// Voting ended → Subject + Contributor + Voters who voted
async function notifyVotingEnded(record: any, subjectEmail: string, subjectFirstName: string, contributorEmail: string, contributorFirstName: string, outcome: "keep" | "delete") {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";
  const outcomeLabel = outcome === "keep" ? "Kept on DNounce" : "Deleted from DNounce";
  const outcomeColor = outcome === "keep" ? "#EAF3DE" : "#FCEBEB";
  const outcomeBorder = outcome === "keep" ? "#3B6D11" : "#A32D2D";
  const outcomeTitleColor = outcome === "keep" ? "#173404" : "#501313";
  const outcomeBodyColor = outcome === "keep" ? "#3B6D11" : "#A32D2D";
  const outcomeNote = outcome === "keep"
    ? "The community voted to keep this record on DNounce. It will remain publicly visible."
    : "The community voted to delete this record. It will be removed from DNounce.";

  const resultHtml = (firstName: string) => emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${firstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">Voting has concluded on the disputed record.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Outcome", outcomeLabel)])}
    ${highlightBox(outcomeColor, outcomeBorder, outcomeTitleColor, outcomeBodyColor, `Outcome: ${outcomeLabel}`, outcomeNote)}
    ${ctaButton(recordUrl, "View Record Outcome")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.subject_user_id, `Voting concluded — record ${outcomeLabel.toLowerCase()}`, outcomeNote, "voting_ended_subject", record.id),
    insertNotification(record.contributor_user_id, `Voting concluded — record ${outcomeLabel.toLowerCase()}`, outcomeNote, "voting_ended_contributor", record.id),
    sendEmail(subjectEmail, `Voting Concluded — Record ${outcomeLabel} — DNounce`, resultHtml(subjectFirstName)),
    sendEmail(contributorEmail, `Voting Concluded — Record ${outcomeLabel} — DNounce`, resultHtml(contributorFirstName)),
  ]);
}

// 7-day unlock → Subject + Contributor can interact again
async function notifySevenDayUnlock(record: any, subjectEmail: string, subjectFirstName: string, contributorEmail: string, contributorFirstName: string) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";

  const html = (firstName: string) => emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${firstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">It has been 7 days since the decision on the disputed record. You can now interact with the community section of this record again.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Status", "Community interaction unlocked")])}
    ${ctaButton(recordUrl, "Return to Record")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(record.subject_user_id, "You can now interact with the record again", "7 days have passed since the decision. Community interaction is unlocked.", "seven_day_unlock", record.id),
    insertNotification(record.contributor_user_id, "You can now interact with the record again", "7 days have passed since the decision. Community interaction is unlocked.", "seven_day_unlock", record.id),
    sendEmail(subjectEmail, "Record Interaction Unlocked — DNounce", html(subjectFirstName)),
    sendEmail(contributorEmail, "Record Interaction Unlocked — DNounce", html(contributorFirstName)),
  ]);
}

// Voter: voted — reply to their vote
async function notifyVoterReply(voterUserId: string, voterEmail: string, voterFirstName: string, record: any, replierAlias: string) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";

  const html = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${voterFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;"><strong style="color:#111;">${replierAlias}</strong> replied to your vote statement on a record you participated in.</p>
    ${detailsTable([infoBox("Record ID", shortId)])}
    ${ctaButton(recordUrl, "View Reply")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(voterUserId, "Someone replied to your vote", `${replierAlias} replied to your vote statement.`, "voter_reply", record.id),
    sendEmail(voterEmail, "Someone Replied to Your Vote — DNounce", html),
  ]);
}

// Voter: vote flagged as low quality
async function notifyVoterFlagged(voterUserId: string, voterEmail: string, voterFirstName: string, record: any) {
  const recordUrl = `${APP_URL}/record/${record.id}`;
  const shortId = record.id.slice(0, 8) + "…";

  const html = emailWrapper(`
    <p style="font-size:13px;color:#555;margin-bottom:16px;">Hello <strong style="color:#111;">${voterFirstName}</strong>,</p>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:16px;">Your vote on a record has been flagged as low quality by the community. This does not remove your vote, but it has been noted.</p>
    ${detailsTable([infoBox("Record ID", shortId), infoBox("Status", "Vote flagged as low quality")])}
    ${highlightBox("#FAEEDA", "#BA7517", "#412402", "#633806", "What does this mean?", "The community felt your vote explanation lacked sufficient reasoning. If enough voters flag your vote, it may be disqualified from the final tally.")}
    ${ctaButton(recordUrl, "View Record")}
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
    ${transparencyNote(shortId)}
  `);

  await Promise.all([
    insertNotification(voterUserId, "Your vote was flagged as low quality", "The community flagged your vote explanation. If flagged by enough voters, your vote may be disqualified.", "voter_flagged", record.id),
    sendEmail(voterEmail, "Your Vote Has Been Flagged — DNounce", html),
  ]);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const { type, record, extra } = await req.json();

    switch (type) {
      case "stage_1_contributor":
        await notifyContributorStage1(record, extra.contributorEmail, extra.contributorFirstName);
        break;
      case "stage_2_subject":
        await notifySubjectStage2(record, extra.subjectEmail, extra.subjectFirstName);
        break;
      case "stage_3_published":
        await notifyStage3Published(record, extra.subjectEmail, extra.subjectFirstName, extra.contributorEmail, extra.contributorFirstName);
        break;
      case "stage_4_contributor":
        await notifyContributorStage4(record, extra.contributorEmail, extra.contributorFirstName);
        break;
      case "stage_5_debate":
        await notifyStage5Debate(record, extra.subjectEmail, extra.subjectFirstName, extra.contributorEmail, extra.contributorFirstName);
        break;
      case "stage_6_voting":
        await notifyStage6Voting(record, extra.subjectEmail, extra.subjectFirstName, extra.contributorEmail, extra.contributorFirstName);
        break;
      case "voting_ended":
        await notifyVotingEnded(record, extra.subjectEmail, extra.subjectFirstName, extra.contributorEmail, extra.contributorFirstName, extra.outcome);
        break;
      case "seven_day_unlock":
        await notifySevenDayUnlock(record, extra.subjectEmail, extra.subjectFirstName, extra.contributorEmail, extra.contributorFirstName);
        break;
      case "voter_reply":
        await notifyVoterReply(extra.voterUserId, extra.voterEmail, extra.voterFirstName, record, extra.replierAlias);
        break;
      case "voter_flagged":
        await notifyVoterFlagged(extra.voterUserId, extra.voterEmail, extra.voterFirstName, record);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown type" }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});