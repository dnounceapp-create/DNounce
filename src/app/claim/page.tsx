"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, ShieldCheck, User } from "lucide-react";
import RecordOutcomeSummary from "@/components/profile/RecordOutcomeSummary";
import { demoLink, swapName } from "@/lib/demoPersonalize";

/**
 * dnounce.com/claim?code=123456
 * Claim a pre-built profile. Nothing about the person is public until they claim it.
 */

// Also read in /user-setup, so new sign-ups come back here after setup.
const PROFILE_CODE_KEY = "dnounce_profile_code";

type DemoRow = {
  slug: string;
  subject_name: string;
  category: string | null;
  rating: number;
  description: string;
  created_at_display: string | null;
  debate_posts: any[] | null;
  seed_votes: { choice?: string }[] | null;
};

type Preview = {
  first_name: string;
  last_name: string;
  company_name: string | null;
  nickname: string | null;
  neighborhood: string;
  trade: string | null;
  claimed: boolean;
};

function slugify(s?: string | null) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function saveCode(code: string) {
  try { localStorage.setItem(PROFILE_CODE_KEY, code); } catch {}
}
function clearCode() {
  try { localStorage.removeItem(PROFILE_CODE_KEY); } catch {}
}

function ClaimProfile() {
  const router = useRouter();
  const params = useSearchParams();
  const urlCode = (params.get("code") || "").replace(/\D/g, "").slice(0, 6);

  const [typed, setTyped] = useState(urlCode);
  const [code, setCode] = useState(urlCode.length === 6 ? urlCode : "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<"unknown" | "out" | "needs_setup" | "in">("unknown");
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState<null | "claimed" | "review">(null);
  const [examples, setExamples] = useState<DemoRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exSort, setExSort] = useState("Newest");
  const [exStage, setExStage] = useState("");

  // Two example records (one great, one bad) from the public demo pages
  useEffect(() => {
    (async () => {
      const cols = "slug, subject_name, category, rating, description, created_at_display, debate_posts, seed_votes";
      // The two made for this page; any other demo pages as a fallback.
      const { data: made } = await supabase.from("demo_records").select(cols).in("slug", ["claim-example-great", "claim-example-bad"]);
      const { data: all } = (made ?? []).length === 2 ? { data: made } : await supabase.from("demo_records").select(cols);
      const rows = ((all ?? []) as DemoRow[]).filter((r) => r.slug && r.description && typeof r.rating === "number");
      if (rows.length === 0) return;
      const great = [...rows].sort((a, b) => b.rating - a.rating || (a.debate_posts?.length ?? 0) - (b.debate_posts?.length ?? 0))[0];
      const bad = [...rows]
        .filter((r) => r.slug !== great.slug)
        .sort((a, b) => a.rating - b.rating || (b.debate_posts?.length ?? 0) - (a.debate_posts?.length ?? 0))[0];
      setExamples([great, bad].filter(Boolean) as DemoRow[]);
    })();
  }, []);

  // Who's here?
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return setSession("out");
      const { data: row } = await supabase.from("users").select("onboarding_complete").eq("auth_user_id", user.id).maybeSingle();
      setSession(row?.onboarding_complete ? "in" : "needs_setup");
    })();
  }, []);

  // Look up the code
  useEffect(() => {
    if (code.length !== 6) return;
    (async () => {
      setLoading(true);
      setError(null);
      setPreview(null);
      const res = await fetch(`/api/prospects/lookup?code=${code}`);
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) return setError(json.error || "Something went wrong. Please try again.");
      setPreview(json.profile);
      saveCode(code);
    })();
  }, [code]);

  // Signed in but hasn't finished setting up: finish setup first, then come back here.
  useEffect(() => {
    if (session === "needs_setup" && preview && !preview.claimed) router.replace("/user-setup");
  }, [session, preview, router]);

  async function claim() {
    setClaiming(true);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/prospects/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => ({}));
    setClaiming(false);
    if (!res.ok) return setError(json.error || "We couldn't claim this profile. Please try again.");
    clearCode();
    if (json.review) return setDone("review");
    setDone("claimed");

    // Open their live profile
    if (json.subject_uuid) {
      const { data: s } = await supabase
        .from("subjects")
        .select("subject_uuid, name, nickname, location")
        .eq("subject_uuid", json.subject_uuid)
        .maybeSingle();
      if (s) {
        const slug = slugify([s.name, s.nickname].filter(Boolean).join(" ")) || "profile";
        const city = slugify((s.location || "").split(",")[0].trim()) || "unknown";
        setTimeout(() => router.push(`/subject/${s.subject_uuid}/${slug}/${city}`), 1500);
        return;
      }
    }
    setTimeout(() => router.push("/dashboard/myrecords"), 1500);
  }

  const back = `/claim?code=${code}`;
  const name = preview ? `${preview.first_name} ${preview.last_name}` : "";
  // Example totals that match the example records shown below
  const shownExamples = examples
    .filter((r) => !exStage || (exStage === "voting") === ((r.debate_posts ?? []).length > 0))
    .sort((a, b) =>
      exSort === "Rating: High" ? b.rating - a.rating
      : exSort === "Rating: Low" ? a.rating - b.rating
      : exSort === "Oldest" ? String(a.created_at_display).localeCompare(String(b.created_at_display))
      : String(b.created_at_display).localeCompare(String(a.created_at_display)));
  const exampleSummary = examples.map((r) => ({
    status: (r.debate_posts ?? []).length > 0 ? "voting" : "published",
    final_outcome: null,
  }) as any);
  const persona = { name, org: preview?.company_name, loc: preview?.neighborhood, cat: preview?.trade };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <img src="/icons/logoicon-120x120.png" alt="" className="h-9 w-9 rounded-lg" />
          <span className="text-xl font-extrabold tracking-tight text-gray-900">DNounce</span>
        </Link>

        {/* Enter the code */}
        {!preview && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Claim your profile</h1>
            <p className="mt-1 text-sm text-gray-600">Enter the 6-digit code we sent you.</p>
            <form
              className="mt-5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const c = typed.replace(/\D/g, "");
                if (c.length !== 6) return setError("Enter the 6-digit code.");
                setCode(c);
              }}
            >
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={typed}
                onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg tracking-[0.4em] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* After claiming, or already claimed */}
        {preview && (done || preview.claimed) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {done === "claimed" ? (
              <div className="text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
                <h1 className="mt-3 text-xl font-bold text-gray-900">It&apos;s yours, {preview.first_name}!</h1>
                <p className="mt-1 text-sm text-gray-600">Your profile is live. Taking you there now…</p>
              </div>
            ) : done === "review" ? (
              <div className="text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-blue-600" />
                <h1 className="mt-3 text-xl font-bold text-gray-900">Almost there</h1>
                <p className="mt-1 text-sm text-gray-600">
                  You already have a profile with records on it, so our team will connect the two by hand. We&apos;ll email you when it&apos;s done.
                </p>
              </div>
            ) : preview.claimed ? (
              <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900">This profile has been claimed</h1>
                <p className="mt-1 text-sm text-gray-600">
                  If that was you, just <Link href="/loginsignup" className="font-semibold text-blue-600">sign in</Link>. If it wasn&apos;t, please{" "}
                  <Link href="/support" className="font-semibold text-blue-600">contact support</Link>.
                </p>
              </div>
            ) : null}
          </div>
        )}

      </div>

      {/* Their profile, exactly as it will look once it's live */}
      {preview && !done && !preview.claimed && (
        <div className="mx-auto w-full max-w-5xl">
          {/* Claim banner */}
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">Hi {preview.first_name}, this is your DNounce profile</p>
              <p className="mt-1 text-sm text-gray-700">Claim it free to make it yours. Nobody can see it until you claim it.</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                <li>• One link to share with clients, so new customers see your track record.</li>
                <li>• Clients can write records about their experience with you.</li>
                <li>• If you disagree with a record, you can challenge it and tell your side.</li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">Sign up or sign in with the email we contacted you at. Once you verify it, the profile is yours.</p>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              {session === "in" ? (
                <button
                  onClick={claim}
                  disabled={claiming}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {claiming && <Loader2 className="h-4 w-4 animate-spin" />} Claim my profile
                </button>
              ) : session === "out" ? (
                <>
                  <Link
                    href={`/loginsignup?redirectTo=${encodeURIComponent(back)}`}
                    onClick={() => saveCode(code)}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Claim my profile
                  </Link>
                  <span className="text-xs text-gray-500 text-center sm:text-right">
                    Already on DNounce?{" "}
                    <Link href={`/loginsignup?redirectTo=${encodeURIComponent(back)}`} onClick={() => saveCode(code)} className="font-semibold text-blue-600">
                      Sign in
                    </Link>
                  </span>
                </>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          {/* Same layout as the public profile page */}
          <div className="border rounded-2xl bg-white p-3 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[112px_1fr] gap-x-4 items-start lg:min-w-[300px]">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  <User className="h-10 w-10 text-gray-600" />
                </div>
                <div className="flex flex-col gap-1 pt-0.5">
                  <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                    {name}
                    {preview.nickname ? ` (${preview.nickname})` : ""}
                  </h3>
                  {preview.trade && <p className="text-sm font-semibold text-gray-800">{preview.trade}</p>}
                  <p className="text-xs text-gray-500">{preview.company_name || "Independent"}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <span>📍</span> {preview.neighborhood}
                  </p>
                </div>
              </div>
              <div>
                <RecordOutcomeSummary records={exampleSummary} />
                {examples.length > 0 && <p className="mt-1 text-[11px] text-gray-400 text-center lg:text-right">Example numbers</p>}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Your link to share with clients</div>
              <div className="text-xs text-gray-600 mt-1">
                Once you claim it, you get one link (and a QR code) to send clients so they can write a record about their experience with you.
              </div>
            </div>

            <div className="flex border-b mb-6 mt-6 text-sm font-medium">
              <span className="flex-1 text-center px-4 py-2 text-blue-600 border-b-2 border-blue-600">Records</span>
              <span className="flex-1 text-center px-4 py-2 text-gray-400">Badges</span>
              <span className="flex-1 text-center px-4 py-2 text-gray-400">Social media</span>
            </div>
            {/* Filter + Sort (same as the profile page) */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <select value={exSort} onChange={(e) => setExSort(e.target.value)} className="w-full sm:w-auto min-w-[210px] rounded-xl border px-3 py-2 text-sm bg-white">
                <option>Newest</option>
                <option>Oldest</option>
                <option>Rating: High</option>
                <option>Rating: Low</option>
              </select>
              <select value={exStage} onChange={(e) => setExStage(e.target.value)} className="w-full sm:w-auto min-w-[180px] rounded-xl border px-3 py-2 text-sm bg-white">
                <option value="">All stages</option>
                <option value="published">Public</option>
                <option value="voting">Community vote</option>
              </select>
            </div>

            {/* Breakdown */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Record Breakdown</h4>
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{examples.length}</div>
                  <div className="text-sm text-gray-500">Total Records</div>
                </div>
              </div>
            </div>

            {examples.length > 0 ? (
              <div className="space-y-4">
                {shownExamples.map((r) => {
                  const open = expanded === r.slug;
                  const href = demoLink(r.slug, persona, back);
                  const challenged = (r.debate_posts ?? []).length > 0;
                  return (
                    <div key={r.slug} className="w-full rounded-2xl border bg-white p-4 hover:shadow-sm hover:border-gray-300 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            DNounce App • {name} <span className="ml-1 align-middle text-[10px] font-semibold uppercase tracking-wide rounded-full bg-gray-100 text-gray-500 px-1.5 py-0.5">Example</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {(preview.trade || r.category) && <span className="text-xs text-gray-700">{preview.trade || r.category}</span>}
                          {challenged && <span className="text-xs rounded-full border bg-gray-50 px-2 py-1 text-gray-700">Community vote</span>}
                          <span className="text-xs text-gray-500">{r.created_at_display ? `📅 ${new Date(r.created_at_display + "T12:00:00").toLocaleDateString()}` : ""}</span>
                          <span className="text-xs text-gray-500">💬 0 comments</span>
                        </div>
                      </div>
                      <div className={`mt-3 text-sm text-gray-700 whitespace-pre-wrap ${open ? "" : "line-clamp-3"}`}>
                        {swapName(r.description, r.subject_name, name)}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link href={href} className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50">View record</Link>
                        <button type="button" onClick={() => setExpanded(open ? null : r.slug)} className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50">
                          {open ? "Collapse" : "Expand"}
                        </button>
                      </div>
                      {open && (
                        <div className="mt-4 border-t pt-4 space-y-3">
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-600">
                            <span><span className="text-gray-400">Written by</span> <span className="font-semibold text-gray-800">DNounce App</span></span>
                            <span><span className="text-gray-400">Rating</span> <span className="font-semibold text-gray-800">{r.rating}/10</span></span>
                            <span><span className="text-gray-400">Relationship</span> <span className="font-semibold text-gray-800">Client</span></span>
                          </div>
                          {challenged && (
                            <div className="rounded-xl border bg-gray-50 p-3 space-y-3">
                              <div className="text-xs font-semibold text-gray-700">Debate</div>
                              {(r.debate_posts ?? []).slice(0, 3).map((p: any, i: number) => (
                                <div key={i} className="text-sm">
                                  <span className="font-semibold text-gray-900">{p.role === "subject" ? `${name} (Subject)` : "DNounce App (Contributor)"}:</span>{" "}
                                  <span className="text-gray-700">{swapName(p.body, r.subject_name, name)}</span>
                                </div>
                              ))}
                              {(r.seed_votes ?? []).length > 0 && (
                                <div className="text-xs text-gray-600">{(r.seed_votes ?? []).length} community members have voted so far. Open the record to vote yourself.</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 text-center">Example records so you can see how your profile works. They aren&apos;t real and won&apos;t be on it.</p>
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 pb-2">No records yet. Once your profile is live, share your link and clients can write about their experience with you.</p>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-md">
        <p className="mt-6 text-center text-xs text-gray-500">
          Not you, or don&apos;t want a profile? <Link href="/support" className="underline">Let us know</Link> and we&apos;ll remove it.
        </p>
      </div>
    </main>
  );
}

export default function ClaimProfilePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50" />}>
      <ClaimProfile />
    </Suspense>
  );
}
