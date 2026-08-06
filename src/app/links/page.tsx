"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, FilePlus } from "lucide-react";

export const dynamic = "force-dynamic";

type DemoRow = {
  slug: string;
  category: string | null;
  subject_name: string | null;
  contributor_name: string | null;
  description: string | null;
  subject_job_title: string | null;
};

function truncate(s: string | null | undefined, max = 120) {
  if (!s) return "";
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + "…";
}

export default function LinksPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DemoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch all demos
  useEffect(() => {
    supabase
      .from("demo_records")
      .select("slug, category, subject_name, contributor_name, description, subject_job_title")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setRows((data ?? []) as DemoRow[]);
        setLoading(false);
      });
  }, []);

  // Page view tracking — skip admins
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const userId = sessionData?.session?.user?.id ?? null;
      if (userId) {
        const { data: adminCheck } = await supabase
          .from("admin_roles")
          .select("user_id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .maybeSingle();
        if (adminCheck) return;
      }
      supabase
        .from("page_views")
        .insert({
          page_type: "links",
          page_id: null,
          viewer_auth_user_id: userId ?? null,
          is_anonymous: !userId,
        })
        .then(() => {});
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/logo.png" alt="DNounce Logo" width={74} height={74} priority />
              <span className="text-xl font-bold text-gray-900 tracking-tight">DNounce</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="/?section=how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
              <a href="/?section=voting-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Community</a>
              <a href="/?section=guidelines-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Guidelines</a>
              <a href="/?section=legal-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Legal</a>
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/loginsignup")} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">Log in</button>
              <button onClick={() => router.push("/loginsignup")} className="bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">Get started</button>
              <button id="menu-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                <div className="w-4 h-0.5 bg-current mb-1" /><div className="w-4 h-0.5 bg-current mb-1" /><div className="w-4 h-0.5 bg-current" />
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden pt-4 pb-2 space-y-1 border-t border-gray-100 mt-3">
              <a href="/?section=how-it-works" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">How it works</a>
              <a href="/?section=voting-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Community</a>
              <a href="/?section=guidelines-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Guidelines</a>
              <a href="/?section=legal-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Legal</a>
            </div>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-[480px] mx-auto px-4 py-8 pt-20 sm:pt-24 space-y-6">
        {/* Tagline */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900 leading-snug">
            Real experiences. Both sides heard. The community decides.
          </h1>
          <p className="text-sm text-gray-600">
            Browse real disputes and cast your vote.
          </p>
        </div>

        {/* Section header */}
        <div className="pt-2">
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight uppercase">
            Live Demos — Cast Your Vote
          </h2>
        </div>

        {/* Demo list */}
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 animate-pulse"
                >
                  <div className="h-4 w-24 bg-gray-100 rounded-full mb-3" />
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
                  <div className="h-3 w-full bg-gray-100 rounded mb-1.5" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded mb-4" />
                  <div className="h-9 w-full bg-gray-100 rounded-xl" />
                </div>
              ))
            : rows.map((r) => (
                <Link
                  key={r.slug}
                  href={`/d/${r.slug}`}
                  className="block rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition group"
                >
                  {/* Category badge */}
                  {r.category && (
                    <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5 mb-2">
                      {r.category}
                    </span>
                  )}

                  {/* Title: subject vs contributor */}
                  <div className="text-base font-semibold text-gray-900 leading-tight mb-2">
                    {r.subject_name || "Subject"}{" "}
                    <span className="text-gray-400 font-medium">vs</span>{" "}
                    {r.contributor_name || "Contributor"}
                  </div>

                  {/* Preview */}
                  {r.description && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {truncate(r.description, 120)}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold px-4 py-2.5 group-hover:opacity-95 transition">
                    Vote Now
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}

          {!loading && rows.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 text-center text-sm text-gray-500">
              No demos available yet.
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center mt-8">
          <div className="text-sm font-semibold text-indigo-900 mb-1">
            Have your own experience to share?
          </div>
          <div className="text-xs text-indigo-700 mb-4">
            Submit a record and let the community weigh in.
          </div>
          <button
            onClick={() => router.push("/loginsignup")}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 transition"
          >
            <FilePlus className="w-4 h-4" />
            Get started
          </button>
        </div>

        {/* Footer */}
        <div className="pt-6 pb-4 text-center">
          <p className="text-xs text-gray-500 font-medium">
            DNounce — Both sides, always.
          </p>
        </div>
      </main>
    </div>
  );
}
