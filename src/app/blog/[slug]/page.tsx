import { createClient } from "@supabase/supabase-js";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateStaticParams() {
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("published", true);
  return (data ?? []).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("blog_posts")
    .select("title, description")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!data) return {};
  return {
    title: `${data.title} | DNounce Blog`,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      url: `https://www.dnounce.com/blog/${slug}`,
      type: "article",
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900 transition">← All posts</Link>
        <div className="mt-8 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{post.category}</span>
            <span className="text-xs text-gray-400">{post.read_time}</span>
            <span className="text-xs text-gray-400">{new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight">{post.title}</h1>
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">{post.description}</p>
        </div>
        <article className="prose prose-gray prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
          <MDXRemote source={post.content} />
        </article>
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 text-center">
            <div className="text-base font-semibold text-indigo-900 mb-1">Have an experience to share?</div>
            <div className="text-sm text-indigo-700 mb-4">DNounce gives both sides a voice — share your experience and let the community decide.</div>
            <a href="/loginsignup" className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition">Get started</a>
          </div>
        </div>
      </div>
    </div>
  );
}
