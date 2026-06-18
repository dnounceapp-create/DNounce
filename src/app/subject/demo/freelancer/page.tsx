"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  Copy,
  Check,
  FileText,
  Star,
  ShieldCheck,
  ScrollText,
  Share2,
  AlertTriangle,
} from "lucide-react";

/* ─── Static demo data ─────────────────────────────── */

const SUBJECT = {
  name: "Alex Rivera",
  job_title: "Independent Web Designer",
  organization: "Rivera Web Studio",
  location: "Austin, TX",
  bio: "Full-stack web designer and developer based in Austin. Building custom websites and e-commerce solutions for small businesses since 2018.",
  subject_uuid: "demo-freelancer-alex-rivera",
};

const SCORES = { subject_score: 1.8, overall_score: 44 };

const BREAKDOWN = { total: 1, anonymity_granted: 0, anonymity_not_granted: 1 };

const RECORDS = [
  {
    id: "bf72c341-9a1e-4d88-b203-e91fa6c30d44",
    title: "GourmetGo Catering • Alex Rivera",
    category: "Freelancer",
    status: "Voting Open",
    anonymity_status: "Anonymity Not Granted",
    description:
      "Do not hire this developer. We paid $3,000 for a restaurant ordering website to launch before our busiest weekend of the year. The site went live, but the checkout button literally didn't work...",
    date: "05/14/2026",
    comments: 12,
  },
];

const DEMO_RECORD_HREF = "/demo/freelancer";

/* ─── Page ─────────────────────────────────────────── */

export default function SubjectDemoFreelancerPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"records" | "reputations" | "social">("records");

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
          page_type: "demo_subject_freelancer",
          page_id: null,
          viewer_auth_user_id: userId,
          is_anonymous: !userId,
        })
        .then(() => {});
    });
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const menu = document.getElementById("demo-mobile-menu");
      const button = document.getElementById("demo-menu-button");
      if (
        menu &&
        !menu.contains(event.target as Node) &&
        button &&
        !button.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function copySubjectId() {
    navigator.clipboard.writeText(SUBJECT.subject_uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/logo.png" alt="DNounce Logo" width={52} height={52} priority className="w-[52px] h-[52px] sm:w-[74px] sm:h-[74px]" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">DNounce</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="/?from=demo&section=how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">How it works</a>
              <a href="/?from=demo&section=voting-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Community</a>
              <a href="/?from=demo&section=guidelines-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Guidelines</a>
              <a href="/?from=demo&section=legal-section" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Legal</a>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => router.push("/loginsignup")} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors">Log in</button>
              <button onClick={() => router.push("/loginsignup")} className="bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition-colors">Get started</button>
              <button
                id="demo-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                aria-label="Open menu"
              >
                <div className="w-4 h-0.5 bg-current mb-1" />
                <div className="w-4 h-0.5 bg-current mb-1" />
                <div className="w-4 h-0.5 bg-current" />
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="demo-mobile-menu" className="md:hidden pt-4 pb-2 space-y-1 border-t border-gray-100 mt-3">
              <a href="/?from=demo&section=how-it-works" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">How it works</a>
              <a href="/?from=demo&section=voting-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Community</a>
              <a href="/?from=demo&section=guidelines-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Guidelines</a>
              <a href="/?from=demo&section=legal-section" onClick={() => setMobileMenuOpen(false)} className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Legal</a>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 pt-24 pb-8 sm:px-4 space-y-4 sm:space-y-5">
        {/* Back */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.history.back();
          }}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Profile card */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <User className="w-10 h-10" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{SUBJECT.name}</h1>
              <p className="mt-1 text-sm text-gray-600 flex items-center gap-1.5 justify-center sm:justify-start">
                <Briefcase className="w-3.5 h-3.5 text-gray-400" /> {SUBJECT.job_title} · {SUBJECT.organization}
              </p>
              <p className="mt-1 text-sm text-gray-500 flex items-center gap-1.5 justify-center sm:justify-start">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> {SUBJECT.location}
              </p>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">{SUBJECT.bio}</p>

              {/* Subject ID row */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Subject ID:</span>
                <span className="font-mono text-xs text-gray-800">{SUBJECT.subject_uuid}</span>
                <button
                  type="button"
                  onClick={copySubjectId}
                  className="ml-1 text-gray-500 hover:text-gray-900 transition"
                  aria-label="Copy subject ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Scores row */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 text-center">
              <div className="text-[11px] font-medium text-gray-500">Subject Score</div>
              <div className="mt-1 text-xl font-bold text-gray-900 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {SCORES.subject_score.toFixed(1)}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
              <div className="text-[11px] font-medium text-gray-500">Overall Score</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{SCORES.overall_score}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
              <div className="text-[11px] font-medium text-gray-500">Contributor</div>
              <div className="mt-1 text-xl font-bold text-gray-400">—</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
              <div className="text-[11px] font-medium text-gray-500">Voter</div>
              <div className="mt-1 text-xl font-bold text-gray-400">—</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-[11px] font-medium text-gray-500">Citizen</div>
              <div className="mt-1 text-xl font-bold text-gray-400">—</div>
            </div>
          </div>

          {/* Submit A Record CTA */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push("/loginsignup?from=demo")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 text-sm font-semibold hover:opacity-90 transition shadow-sm"
            >
              <FileText className="w-4 h-4" /> Submit A Record
            </button>
            <button
              onClick={() => router.push("/loginsignup?from=demo")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white text-gray-800 px-5 py-3 text-sm font-semibold hover:bg-gray-50 transition"
            >
              <Share2 className="w-4 h-4" /> Share Profile
            </button>
          </div>
        </section>

        {/* Tabs */}
        <section>
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
            {([
              { key: "records", label: "Records About Me" },
              { key: "reputations", label: "Reputations & Badges" },
              { key: "social", label: "Social Media" },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  tab === t.key
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Records tab content */}
        {tab === "records" && (
          <>
            {/* Record Breakdown */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Record Breakdown</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                  <div className="text-[11px] font-medium text-gray-500">Total</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">{BREAKDOWN.total}</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-center">
                  <div className="text-[11px] font-medium text-blue-700">Anonymity Granted</div>
                  <div className="mt-1 text-2xl font-bold text-blue-900">{BREAKDOWN.anonymity_granted}</div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-center">
                  <div className="text-[11px] font-medium text-indigo-700">Anonymity Not Granted</div>
                  <div className="mt-1 text-2xl font-bold text-indigo-900">{BREAKDOWN.anonymity_not_granted}</div>
                </div>
              </div>
            </section>

            {/* Record cards */}
            <section className="space-y-3">
              {RECORDS.map((r) => (
                <div key={r.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold">
                      <AlertTriangle className="w-3 h-3" /> {r.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold">
                      {r.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold">
                      {r.anonymity_status}
                    </span>
                    <span className="ml-auto text-[11px] text-gray-500">{r.date}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{r.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{r.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">{r.comments} comments</span>
                    <button
                      type="button"
                      onClick={() => router.push(DEMO_RECORD_HREF)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 text-white px-4 py-2 text-xs font-semibold hover:bg-black transition"
                    >
                      View record
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {tab === "reputations" && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center text-sm text-gray-500">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No reputations or badges yet.
          </section>
        )}

        {tab === "social" && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center text-sm text-gray-500">
            <ScrollText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No social media links added yet.
          </section>
        )}

        {/* CTA banner */}
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5 text-center">
          <div className="text-sm font-semibold text-indigo-900 mb-1">Take control of your reputation.</div>
          <div className="text-xs text-indigo-700 mb-3">Invite people to share their experience, and respond when you want to add context.</div>
          <button
            onClick={() => router.push("/loginsignup?from=demo")}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  );
}
