import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// Star SVG path
function Star({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "flex" }}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "#111827" : "none"}
        stroke={filled ? "#111827" : "#D1D5DB"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Warning triangle SVG
function WarningIcon({ color }: { color: string }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" style={{ display: "flex" }}>
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" style={{ display: "flex" }}>
      <path
        d="M22 11.08V12a10 10 0 11-5.93-9.14"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="22 4 12 14.01 9 11.01"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const { data: record } = await supabaseAdmin
    .from("records")
    .select(`
      description, category, location, relationship, rating,
      credibility, ai_vendor_1_result, created_at,
      contributor_display_name, contributor_identity_preference,
      subjects(name, nickname, organization, location, avatar_url)
    `)
    .eq("id", id)
    .maybeSingle();

  const subject = (record?.subjects as any) ?? {};
  const subjectName = subject.name ?? "Unknown Subject";
  const subjectNickname = subject.nickname ? ` (${subject.nickname})` : "";
  const subjectOrg = subject.organization || "Independent";
  const subjectLoc = record?.location || subject.location || "Unknown Location";
  const subjectAvatar = subject.avatar_url ?? null;

  const rawCred = record?.ai_vendor_1_result || record?.credibility || "";
  const c = rawCred.toLowerCase();
  let credLabel = "Pending AI Review";
  let credBg = "#F3F4F6"; let credColor = "#6B7280"; let credBorder = "#E5E7EB";
  let credIcon: "warning" | "check" | "none" = "none";

  if (c.includes("evidence")) {
    credLabel = "Evidence-Based"; credBg = "#F0FDF4"; credColor = "#15803D";
    credBorder = "#BBF7D0"; credIcon = "check";
  } else if (c.includes("opinion")) {
    credLabel = "Opinion-Based"; credBg = "#FEF2F2"; credColor = "#DC2626";
    credBorder = "#FECACA"; credIcon = "warning";
  } else if (c.includes("unable")) {
    credLabel = "Unable to Verify"; credBg = "#FFFBEB"; credColor = "#D97706";
    credBorder = "#FDE68A"; credIcon = "warning";
  }

  const rating = Number(record?.rating ?? 0);
  const category = record?.category || "";
  const relationship = record?.relationship || "";
  const rawDescription = record?.description || "";
  const description = rawDescription.length > 500 ? rawDescription.slice(0, 500) + "…" : rawDescription;
  const submittedDate = formatDate(record?.created_at || "");

  const c2 = rawCred.toLowerCase();
  const revealContributor =
    c2.includes("opinion") ||
    (c2.includes("evidence") && record?.contributor_identity_preference === true);
  const contributorName = revealContributor
    ? (record?.contributor_display_name || "SuperHero123")
    : "SuperHero123";

  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://dnounce.com"}/logo.png`;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "#F9FAFB", fontFamily: "system-ui, sans-serif", padding: "20px 28px", gap: 8 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoUrl} style={{ width: 24, height: 24, borderRadius: 5 }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>DNounce</span>
          </div>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>dnounce.com</span>
        </div>

        {/* Subject card */}
        <div style={{ display: "flex", background: "white", borderRadius: 14, border: "1px solid #E5E7EB", padding: "12px 16px", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" style={{ display: "flex" }}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="12" cy="7" r="4" stroke="#2563EB" strokeWidth="2" fill="none"/>
            </svg>
            <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>Subject</span>
          </div>
          {subjectAvatar ? (
            <img src={subjectAvatar} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "1px solid #E5E7EB", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#F3F4F6", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" style={{ display: "flex" }}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="12" cy="7" r="4" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{subjectName}{subjectNickname}</span>
            <span style={{ fontSize: 11, color: "#6B7280" }}>{subjectOrg} • {subjectLoc}</span>
          </div>
        </div>

        {/* Contributor card */}
        <div style={{ display: "flex", background: "white", borderRadius: 14, border: "1px solid #E5E7EB", padding: "12px 16px", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" style={{ display: "flex" }}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="12" cy="7" r="4" stroke="#16A34A" strokeWidth="2" fill="none"/>
            </svg>
            <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>Contributor</span>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#F3F4F6", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width={20} height={20} viewBox="0 0 24 24" style={{ display: "flex" }}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="12" cy="7" r="4" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{contributorName}</span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>Submitted this record</span>
          </div>
        </div>

        {/* Submitted Record card */}
        <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: 14, border: "1px solid #E5E7EB", padding: "14px 16px", flex: 1, gap: 8 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Submitted Record</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#6B7280" }}>AI Credibility Recommendation:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: credBg, border: `1px solid ${credBorder}`, borderRadius: 999, padding: "2px 8px" }}>
                {credIcon === "warning" && <WarningIcon color={credColor} />}
                {credIcon === "check" && <CheckIcon color={credColor} />}
                <span style={{ fontSize: 11, fontWeight: 600, color: credColor }}>{credLabel}</span>
              </div>
            </div>
          </div>

          {/* Submitted + Record ID row */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>Submitted</span>
              <span style={{ fontSize: 12, color: "#111827" }}>{submittedDate}</span>
            </div>
          </div>

          {/* Stars */}
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Star key={i} filled={i < rating} size={17} />
            ))}
          </div>

          {/* Fields - each on own line */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {category ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "#6B7280", fontWeight: 500 }}>Category:</span>
                <span style={{ color: "#111827" }}>{category}</span>
              </div>
            ) : null}
            {subjectLoc ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" style={{ display: "flex", flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="10" r="3" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
                </svg>
                <span style={{ color: "#111827" }}>{subjectLoc}</span>
              </div>
            ) : null}
            {relationship ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "#6B7280", fontWeight: 500 }}>Relationship:</span>
                <span style={{ color: "#111827" }}>{relationship}</span>
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#F3F4F6", display: "flex" }} />

          {/* Experience Details */}
          <div style={{ height: 1, background: "#E5E7EB", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Experience Details</span>
            <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
              {description}
            </span>
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