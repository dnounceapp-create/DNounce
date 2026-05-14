import RecordDetail from "@/components/record/RecordDetail";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";

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
      images: [{ url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/og/record?id=${id}`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${process.env.NEXT_PUBLIC_SITE_URL}/api/og/record?id=${id}`],
    },
  };
}

function RecordSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white">
      <img src="/logo.png" alt="DNounce" width={64} height={64} style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
      <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Loading record…</p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<RecordSkeleton />}>
      <RecordDetail recordId={id} embedded={false} />
    </Suspense>
  );
}