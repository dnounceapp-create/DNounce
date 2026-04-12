import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "DNounce Record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function Stars({ rating, max = 10 }: { rating: number; max?: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 18,
            height: 18,
            borderRadius: 2,
            background: i < rating ? "#F59E0B" : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </div>
  );
}

function CredBadge({ cred }: { cred: string }) {
  const c = (cred || "").toLowerCase();
  let bg = "#374151";
  let color = "#D1D5DB";
  let label = cred;

  if (c.includes("evidence")) { bg = "#065F46"; color = "#6EE7B7"; label = "Evidence-Based"; }
  else if (c.includes("opinion")) { bg = "#7F1D1D"; color = "#FCA5A5"; label = "Opinion-Based"; }
  else if (c.includes("unable")) { bg = "#78350F"; color = "#FDE68A"; label = "Unable to Verify"; }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: bg,
        color,
        borderRadius: 999,
        padding: "4px 14px",
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </div>
  );
}

export default async function RecordOGImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: record } = await supabaseAdmin
    .from("records")
    .select(`
      description, category, location, relationship, rating,
      credibility, ai_vendor_1_result,
      subjects(name, nickname, organization, location),
      record_attachments(path, mime_type)
    `)
    .eq("id", id)
    .maybeSingle();

  const subject = (record?.subjects as any) ?? {};
  const subjectName = subject.name ?? "Unknown Subject";
  const subjectNickname = subject.nickname ? ` (${subject.nickname})` : "";
  const org = record?.category || subject.organization || "Independent";
  const loc = record?.location || subject.location || "";
  const rating = Number(record?.rating ?? 0);
  const cred = record?.ai_vendor_1_result || record?.credibility || "Pending";
  const relationship = record?.relationship || "";
  const description = (record?.description || "").slice(0, 200);

  // First image attachment
  const attachments: any[] = record?.record_attachments ?? [];
  const firstImage = attachments.find((a) => (a.mime_type || "").startsWith("image/"));
  let attachmentUrl: string | undefined;
  if (firstImage?.path) {
    const { data } = supabaseAdmin.storage.from("attachments").getPublicUrl(firstImage.path);
    attachmentUrl = data?.publicUrl;
  }

  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://dnounce.com"}/logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: "#0A0F1E",
          fontFamily: "Georgia, serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background attachment image (blurred) */}
        {attachmentUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.12,
                filter: "blur(40px)",
              }}
            />
          </div>
        )}

        {/* Dark overlay gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(10,15,30,0.97) 0%, rgba(20,25,50,0.92) 100%)",
            display: "flex",
          }}
        />

        {/* Gold accent line top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #B8860B, #FFD700, #B8860B)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            padding: "48px 56px",
          }}
        >
          {/* Top row: logo + dnounce label */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} style={{ width: 40, height: 40, borderRadius: 8 }} />
            <span style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              DNounce
            </span>
            <div style={{ flex: 1, display: "flex" }} />
            <CredBadge cred={cred} />
          </div>

          {/* Subject name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            <div style={{ color: "#FFFFFF", fontSize: 42, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
              {subjectName}{subjectNickname}
            </div>
            <div style={{ color: "#9CA3AF", fontSize: 18, display: "flex", gap: 8, alignItems: "center" }}>
              <span>{org}</span>
              {loc ? (
                <>
                  <span style={{ color: "#4B5563" }}>•</span>
                  <span>📍 {loc}</span>
                </>
              ) : null}
              {relationship ? (
                <>
                  <span style={{ color: "#4B5563" }}>•</span>
                  <span>{relationship}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Stars */}
          {rating > 0 && (
            <div style={{ display: "flex", marginBottom: 20 }}>
              <Stars rating={rating} />
            </div>
          )}

          {/* Description */}
          {description ? (
            <div
              style={{
                color: "#D1D5DB",
                fontSize: 20,
                lineHeight: 1.6,
                flex: 1,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                borderLeft: "3px solid #FFD700",
                paddingLeft: 20,
              }}
            >
              "{description}"
            </div>
          ) : null}

          {/* Bottom: attachment preview or watermark */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 24 }}>
            <div style={{ color: "#6B7280", fontSize: 14, letterSpacing: "0.05em" }}>
              dnounce.com
            </div>
            {attachmentUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentUrl}
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "2px solid rgba(255,215,0,0.3)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}