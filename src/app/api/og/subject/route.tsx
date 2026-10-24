import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

import { summarizeRecords } from "@/lib/outcome";
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

  if (subject.owner_auth_user_id) {
    const acctRes = await supabaseAdmin.from("user_accountdetails").select("bio").eq("user_id", subject.owner_auth_user_id).maybeSingle();
    bio = acctRes.data?.bio ?? null;
  }

  // How their records turned out (replaces the old 0–100 scores). Public records only.
  const { data: recs } = await supabaseAdmin
    .from("records")
    .select("status, final_outcome, dispute_started_at")
    .eq("subject_id", id)
    .eq("is_published", true)
    .is("deleted_at", null);
  const sum = summarizeRecords(recs ?? []);
  const totalRecords = sum.total;
  const scoreList = [
    { label: "Public records", value: sum.total },
    { label: "Challenged", value: sum.challenged },
    { label: "Sided with them", value: sum.sidedWithThem },
    { label: "Sided with the writer", value: sum.sidedWithWriter },
    { label: "Ties", value: sum.ties },
  ];

  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://dnounce.com"}/logo.png`;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "#F9FAFB", fontFamily: "system-ui, sans-serif", padding: "20px 28px", gap: 12 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoUrl} style={{ width: 24, height: 24, borderRadius: 5 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>DNounce</span>
          </div>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>dnounce.com</span>
        </div>

        {/* Main white card */}
        <div style={{ display: "flex", background: "white", borderRadius: 18, border: "1px solid #E5E7EB", padding: "20px 24px", flex: 1, flexDirection: "column", gap: 16 }}>

          {/* Header: identity + scores */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>

            {/* Left: avatar + info */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: 1 }}>
              {/* Avatar */}
              {avatarUrl ? (
                <img src={avatarUrl} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "1px solid #E5E7EB", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width={36} height={36} viewBox="0 0 24 24" style={{ display: "flex" }}>
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" fill="none"/>
                    <circle cx="12" cy="7" r="4" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
              )}

              {/* Name + org + location + bio */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 22, color: "#111827", lineHeight: 1.2, display: "flex" }}>
                  {subjectName}{nickname}
                </span>
                <span style={{ fontSize: 14, color: "#4B5563" }}>{org}</span>
                {loc ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" style={{ display: "flex", flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="10" r="3" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
                    </svg>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{loc}</span>
                  </div>
                ) : null}
                {bio ? (
                  <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginTop: 2 }}>{bio}</span>
                ) : null}
              </div>
            </div>

            {/* Right: scores */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexShrink: 0 }}>
              {scoreList.map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 70 }}>
                  <span style={{ fontWeight: 700, fontSize: 22, color: "#111827" }}>{s.value != null ? s.value : "—"}</span>
                  <span style={{ fontSize: 10, color: "#6B7280", textAlign: "center" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#F3F4F6", display: "flex" }} />

          {/* Tabs row */}
          <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
            {["Records", "Badges", "Social media"].map((tab, i) => (
              <div key={tab} style={{ display: "flex", flex: 1, justifyContent: "center", padding: "8px 16px", fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "#2563EB" : "#6B7280", borderBottom: i === 0 ? "2px solid #2563EB" : "2px solid transparent", marginBottom: -1 }}>
                {tab}
              </div>
            ))}
          </div>

          {/* Record Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Record Breakdown</span>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { label: "Total Records", value: totalRecords ?? 0 },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 28, color: "#111827" }}>{s.value}</span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom logo watermark */}
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <img src={logoUrl} style={{ width: 90, height: 90, borderRadius: 20 }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>DNounce</span>
            </div>
          </div>

        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}