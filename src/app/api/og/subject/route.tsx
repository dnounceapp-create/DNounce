import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return new Response("Missing id", { status: 400 });

  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("name, nickname, organization, location, avatar_url, owner_auth_user_id")
    .eq("subject_uuid", id)
    .maybeSingle();

  if (!subject) return new Response("Not found", { status: 404 });

  const subjectName = subject.name ?? "Unknown";
  const nickname = subject.nickname ? ` (${subject.nickname})` : "";
  const org = subject.organization || "Independent";
  const loc = subject.location || "";
  const avatarUrl = subject.avatar_url ?? null;

  let bio: string | null = null;
  let scores: any = null;

  if (subject.owner_auth_user_id) {
    const [acctRes, scoresRes] = await Promise.all([
      supabaseAdmin.from("user_accountdetails").select("bio").eq("user_id", subject.owner_auth_user_id).maybeSingle(),
      supabaseAdmin.from("user_scores").select("overall_score, contributor_score, voter_score, citizen_score").eq("user_id", subject.owner_auth_user_id).maybeSingle(),
    ]);
    bio = acctRes.data?.bio ?? null;
    scores = scoresRes.data ?? null;
  }

  const { data: subjectScoreData } = await supabaseAdmin
    .from("subject_scores")
    .select("subject_score")
    .eq("subject_uuid", id)
    .maybeSingle();

  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://dnounce.com"}/logo.png`;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: "#0A0F1E", fontFamily: "Georgia, serif", overflow: "hidden" }}>

        {/* Gold top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #B8860B, #FFD700, #B8860B)", display: "flex" }} />

        {/* Avatar background blur */}
        {avatarUrl && (
          <img src={avatarUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.08 }} />
        )}

        {/* Overlay */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, rgba(10,15,30,0.97) 0%, rgba(15,20,45,0.93) 100%)", display: "flex" }} />

        {/* Main layout */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", padding: "48px 56px", gap: 48 }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

            {/* Logo row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
              <img src={logoUrl} style={{ width: 36, height: 36, borderRadius: 8 }} />
              <span style={{ color: "#FFD700", fontSize: 15, fontWeight: 700, letterSpacing: "0.12em" }}>DNounce</span>
            </div>

            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 20 }}>
              {avatarUrl ? (
                <img src={avatarUrl} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,215,0,0.4)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "3px solid rgba(255,215,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#9CA3AF", fontSize: 40 }}>👤</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ color: "#FFFFFF", fontSize: 36, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", display: "flex" }}>
                  {subjectName}{nickname}
                </div>
                <div style={{ color: "#9CA3AF", fontSize: 17, display: "flex", gap: 8, alignItems: "center" }}>
                  <span>{org}</span>
                  {loc ? (
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: "#4B5563" }}>•</span>
                      <span>📍 {loc}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Bio */}
            {bio && (
              <div style={{ display: "flex", borderLeft: "3px solid #FFD700", paddingLeft: 16, marginBottom: 24 }}>
                <span style={{ color: "#D1D5DB", fontSize: 18, lineHeight: 1.6 }}>{bio}</span>
              </div>
            )}

            <div style={{ flex: 1, display: "flex" }} />

            <span style={{ color: "#6B7280", fontSize: 14, letterSpacing: "0.05em" }}>dnounce.com</span>
          </div>

          {/* Right column: scores */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, minWidth: 200 }}>
            <span style={{ color: "#FFD700", fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>REPUTATION</span>

            {[
              { label: "Subject Score", value: subjectScoreData?.subject_score ?? null },
              { label: "Overall Score", value: scores?.overall_score ?? null },
              { label: "Contributor", value: scores?.contributor_score ?? null },
              { label: "Voter Score", value: scores?.voter_score ?? null },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 20px", minWidth: 90, border: "1px solid rgba(255,215,0,0.15)" }}>
                <span style={{ color: "#FFD700", fontSize: 26, fontWeight: 700 }}>{s.value != null ? s.value : "—"}</span>
                <span style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}