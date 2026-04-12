import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("name, nickname, organization, location, avatar_url, owner_auth_user_id")
    .eq("subject_uuid", id)
    .maybeSingle();

  if (!subject) {
    return { title: "Subject Profile | DNounce" };
  }

  const displayName = subject.nickname
    ? `${subject.name} (${subject.nickname})`
    : subject.name;

  const title = `${displayName} | DNounce`;
  const description = [
    subject.organization,
    subject.location,
    "View records and reputation on DNounce.",
  ]
    .filter(Boolean)
    .join(" • ");

  // Fetch bio from user_accountdetails if claimed
  let bio: string | null = null;
  if (subject.owner_auth_user_id) {
    const { data: acct } = await supabaseAdmin
      .from("user_accountdetails")
      .select("bio")
      .eq("user_id", subject.owner_auth_user_id)
      .maybeSingle();
    bio = acct?.bio ?? null;
  }

  const fullDescription = bio
    ? `${bio} • ${description}`
    : description;

  const imageUrl = subject.avatar_url ?? undefined;

  return {
    title,
    description: fullDescription,
    openGraph: {
      title,
      description: fullDescription,
      type: "profile",
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description: fullDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default function SubjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}