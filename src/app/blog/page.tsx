import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | DNounce",
  description: "Tips, guides, and insights on reputation, hiring, and dispute resolution.",
};

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, description, category, read_time, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24">
        <div className="mb-12">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition">← Back to DNounce</Link>
          <h1 className="mt-6 text-4xl font-bold text-gray-900 tracking-tight">DNounce Blog</h1>
          <p className="mt-3 text-lg text-gray-500">Guides on reputation, hiring, and dispute resolution.</p>
        </div>
        <div className="space-y-8">
          {(posts ?? []).map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-sm hover:border-gray-300 transition">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{post.category}</span>
                  <span className="text-xs text-gray-400">{post.read_time}</span>
                  <span className="text-xs text-gray-400">{new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition leading-tight">{post.title}</h2>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{post.description}</p>
                <div className="mt-4 text-sm font-medium text-blue-600 group-hover:underline">Read more →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
