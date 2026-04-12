import RecordDetail from "@/components/record/RecordDetail";
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

  const { data: record } = await supabaseAdmin
    .from("records")
    .select("description, category, subjects(name), record_attachments(path, mime_type)")
    .eq("id", id)
    .maybeSingle();

  const subjectName = (record?.subjects as any)?.name ?? "DNounce Record";
  const description = record?.description
    ? record.description.slice(0, 160)
    : `A record submitted on DNounce about ${subjectName}.`;
  const title = `Record about ${subjectName} | DNounce`;

  const attachments: any[] = record?.record_attachments ?? [];
  const firstImage = attachments.find((a) => (a.mime_type || "").startsWith("image/"));
  let imageUrl: string | undefined;
  if (firstImage?.path) {
    const { data } = supabaseAdmin.storage.from("attachments").getPublicUrl(firstImage.path);
    imageUrl = data?.publicUrl;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecordDetail recordId={id} embedded={false} />;
}