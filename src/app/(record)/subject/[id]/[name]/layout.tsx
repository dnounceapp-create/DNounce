import { permanentRedirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Server-side canonical slug enforcement.
// Runs before the client page.tsx renders, so bots/crawlers never see the
// wrong-slug HTML — they get a 308 (permanent) straight to the canonical URL.
// (Next.js's permanentRedirect() returns 308; Google treats 308 the same as
// 301 for consolidating link equity.)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(s?: string | null) {
  return (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function subjectSlug(name?: string | null, nickname?: string | null) {
  const combined = [name, nickname].filter(Boolean).join(" ");
  return slugify(combined) || "profile";
}

export default async function SubjectNameLayout({
  params,
  children,
}: {
  params: Promise<{ id: string; name: string }>;
  children: React.ReactNode;
}) {
  const { id, name } = await params;

  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("name, nickname")
    .eq("subject_uuid", id)
    .maybeSingle();

  // Only enforce canonical when the subject exists. Nonexistent subjects
  // fall through to the client page, which shows its own "Subject not found" UI.
  if (subject) {
    const canonical = subjectSlug(subject.name, subject.nickname);
    if (name !== canonical) {
      permanentRedirect(`/subject/${id}/${canonical}`);
    }
  }

  return <>{children}</>;
}
