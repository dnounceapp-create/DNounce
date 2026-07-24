import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Server-side canonical redirect: /subject/[id] → /subject/[id]/<slug>
// The [name] segment is cosmetic (SEO) — DB lookups still use [id] only.
// Uses 307 (temporary) because subject name/nickname can change.

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

export default async function SubjectIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("name, nickname")
    .eq("subject_uuid", id)
    .maybeSingle();

  const slug = subjectSlug(subject?.name ?? null, subject?.nickname ?? null);
  redirect(`/subject/${id}/${slug}`);
}
