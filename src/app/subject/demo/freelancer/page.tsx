"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  Copy,
  Check,
  FilePlus,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

/* ─── Static demo data ─────────────────────────────── */

const SUBJECT = {
  name: "Alex Rivera",
  nickname: null as string | null,
  job_title: "Independent Web Designer",
  organization: "Rivera Web Studio",
  location: "Austin, TX",
  bio: "Full-stack web designer and developer based in Austin. Building custom websites and e-commerce solutions for small businesses since 2018.",
  subject_uuid: "demo-freelancer-alex-rivera",
};

const SCORES = {
  subject_score: 1.8 as number | null,
  overall_score: 44 as number | null,
  contributor_score: null as number | null,
  voter_score: null as number | null,
  citizen_score: null as number | null,
};

const BREAKDOWN = { total: 1, evidence: 0, opinion: 1 };

const RECORDS = [
  {
    id: "bf72c341-9a1e-4d88-b203-e91fa6c30d44",
    title: "GourmetGo Catering • Alex Rivera",
    category: "Freelancer",
    stage: "Voting Open",
    anonymity_status: "Anonymity Not Granted",
    description:
      "Do not hire this developer. We paid $3,000 for a restaurant ordering website to launch before our busiest weekend of the year. The site went live, but the checkout button literally didn't work — customers were filling carts and bouncing because nothing happened when they hit Pay.",
    date: "2026-05-14T09:30:00.000Z",
    comments: 12,
  },
];

const QR_URL = "https://www.dnounce.com/subject/demo/freelancer";
const RECORD_HREF = "/demo/freelancer";

/* ─── Helpers ──────────────────────────────────────── */

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function credibilityBadge(cred: string) {
  const c = (cred || "").trim();
  const base =
    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium";
  if (c === "Anonymity Granted")
    return (
      <span className={`${base} bg-green-100 text-green-700`}>
        <CheckCircle size={12} className="text-green-700" />
        {c}
      </span>
    );
  if (c === "Anonymity Not Granted")
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        <AlertTriangle size={12} className="text-red-700" />
        {c}
      </span>
    );
  return (
    <span className={`${base} bg-yellow-100 text-yellow-700`}>{c || "Pending"}</span>
  );
}

/* ─── Page ─────────────────────────────────────────── */

export default function SubjectDemoFreelancerPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedSubjectId, setCopiedSubjectId] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "reputations" | "social">(
    "records"
  );

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

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header (matches demo/realtor) ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <Image
                src="/logo.png"
                alt="DNounce Logo"
                width={52}
                height={52}
                priority
                className="w-[52px] h-[52px] sm:w-[74px] sm:h-[74px]"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                DNounce
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a
                href="/?from=demo&section=how-it-works"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                How it works
              </a>
              <a
                href="/?from=demo&section=voting-section"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Community
              </a>
              <a
                href="/?from=demo&section=guidelines-section"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Guidelines
              </a>
              <a
                href="/?from=demo&section=legal-section"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Legal
              </a>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push("/loginsignup")}
                className="hidden md:block text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => router.push("/loginsignup")}
                className="bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition-colors"
              >
                Get started
              </button>
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
            <div
              id="demo-mobile-menu"
              className="md:hidden pt-4 pb-2 space-y-1 border-t border-gray-100 mt-3"
            >
              <a
                href="/?from=demo&section=how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                How it works
              </a>
              <a
                href="/?from=demo&section=voting-section"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Community
              </a>
              <a
                href="/?from=demo&section=guidelines-section"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Guidelines
              </a>
              <a
                href="/?from=demo&section=legal-section"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Legal
              </a>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content (mirrors subject/[id]) ── */}
      <div className="max-w-5xl mx-auto px-3 py-4 pt-24 sm:p-6 sm:pt-28">
        <button
          onClick={() => {
            if (typeof window !== "undefined") window.history.back();
          }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition"
        >
          ← Back
        </button>

        <div className="border rounded-2xl bg-white p-3 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              {/* Header + Scores */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* LEFT: Identity */}
                <div className="flex flex-col">
                  <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[112px_1fr] gap-x-4 items-start">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      <User className="h-10 w-10 text-gray-600" />
                    </div>

                    <div className="flex flex-col gap-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                          {SUBJECT.name}
                          {SUBJECT.nickname ? ` (${SUBJECT.nickname})` : ""}
                        </h3>
                      </div>
                      {SUBJECT.job_title && (
                        <p className="text-sm font-semibold text-gray-800">
                          {SUBJECT.job_title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {SUBJECT.organization || "Independent"}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <span>📍</span> {SUBJECT.location || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {SUBJECT.bio && (
                    <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                      {SUBJECT.bio}
                    </p>
                  )}

                  {/* Subject ID + QR row */}
                  <div className="mt-3 flex items-center gap-3 w-full">
                    <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                      <span className="font-semibold text-gray-800">Subject ID:</span>
                      <span className="font-mono truncate max-w-[220px] sm:max-w-[320px]">
                        {shortId(SUBJECT.subject_uuid)}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(SUBJECT.subject_uuid);
                            setCopiedSubjectId(true);
                            setTimeout(() => setCopiedSubjectId(false), 1200);
                          } catch (e) {
                            console.error("Copy failed", e);
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-600 hover:bg-gray-100"
                        title="Copy full subject ID"
                      >
                        {copiedSubjectId ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQrOpen(true)}
                      className="ml-auto inline-flex items-center justify-center rounded-lg border bg-white p-2 hover:bg-gray-50"
                      title="Show QR code"
                    >
                      <div className="relative">
                        <QRCodeCanvas
                          value={QR_URL}
                          size={36}
                          level="H"
                          includeMargin={true}
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="rounded bg-white p-px">
                            <Image
                              src="/logo.png"
                              alt="DNounce"
                              width={12}
                              height={12}
                              className="scale-150"
                              priority
                              unoptimized
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* RIGHT: Scores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                  {[
                    { label: "Subject Score", val: SCORES.subject_score },
                    { label: "Overall Score", val: SCORES.overall_score },
                    { label: "Contributor Score", val: SCORES.contributor_score },
                    { label: "Voter Score", val: SCORES.voter_score },
                    { label: "Citizen Score", val: SCORES.citizen_score },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="text-xl font-bold text-gray-900">
                        {s.val != null ? s.val : "—"}
                      </p>
                      <p className="text-xs text-gray-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Record CTA */}
              <div className="mt-6 mb-4 rounded-2xl border bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Want to share an experience about this subject?
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Sign in to submit a record. This subject will be pre-selected.
                  </div>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => router.push("/loginsignup?from=demo")}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <FilePlus className="h-4 w-4" />
                    Submit A Record
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b mb-6 mt-6 text-sm font-medium">
                {(["records", "reputations", "social"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-center px-4 py-2 ${
                      activeTab === tab
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "records"
                      ? "Records About Me"
                      : tab === "reputations"
                      ? "Reputations & Badges"
                      : "Social Media"}
                  </button>
                ))}
              </div>

              {activeTab === "records" && (
                <>
                  {/* Breakdown */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Record Breakdown</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {BREAKDOWN.total}
                        </div>
                        <div className="text-sm text-gray-500">Total Records</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {BREAKDOWN.evidence}
                        </div>
                        <div className="text-sm text-gray-500">Anonymity Granted</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {BREAKDOWN.opinion}
                        </div>
                        <div className="text-sm text-gray-500">Anonymity Not Granted</div>
                      </div>
                    </div>
                  </div>

                  {/* Records list */}
                  <div className="space-y-4">
                    {RECORDS.map((r) => (
                      <div
                        key={r.id}
                        className="w-full rounded-2xl border bg-white p-4 hover:shadow-sm hover:border-gray-300 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {r.title}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-gray-500">
                              Anonymity Status:
                            </span>
                            {credibilityBadge(r.anonymity_status)}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-700">{r.category}</span>
                            <span className="text-xs rounded-full border bg-gray-50 px-2 py-1 text-gray-700">
                              {r.stage}
                            </span>
                            <span className="text-xs text-gray-500">
                              📅 {new Date(r.date).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                              💬 {r.comments} {r.comments === 1 ? "comment" : "comments"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
                          {r.description}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(RECORD_HREF)}
                            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                          >
                            View record
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "reputations" && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Badges</h4>
                  <p className="text-sm text-gray-500">No badges earned yet.</p>
                </div>
              )}

              {activeTab === "social" && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Social Media</h4>
                  <p className="text-gray-500 text-sm">
                    {SUBJECT.name} doesn't have any social media on display.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA banner (kept per spec) */}
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5 text-center">
          <div className="text-sm font-semibold text-indigo-900 mb-1">
            Take control of your reputation.
          </div>
          <div className="text-xs text-indigo-700 mb-3">
            Invite people to share their experience, and respond when you want to add
            context.
          </div>
          <button
            onClick={() => router.push("/loginsignup?from=demo")}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Get started
          </button>
        </div>
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-gray-900">QR Code</div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-full border p-1.5 text-gray-600 hover:bg-gray-100"
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="relative flex items-center justify-center rounded-xl border bg-white p-6">
              <QRCodeCanvas value={QR_URL} size={240} level="H" includeMargin={true} />
              <div className="absolute flex items-center justify-center">
                <div className="relative w-[92px] h-[92px] rounded-md bg-white overflow-hidden ring-1 ring-gray-200">
                  <Image
                    src="/logo.png"
                    alt="DNounce"
                    fill
                    priority
                    className="object-cover scale-[1.25]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-600 break-all">{QR_URL}</div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(QR_URL);
                  } catch (e) {
                    console.error("Copy failed", e);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
