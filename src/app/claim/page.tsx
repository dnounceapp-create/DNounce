"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, MapPin, Briefcase, ShieldCheck } from "lucide-react";

/**
 * dnounce.com/claim?code=123456
 * Claim a pre-built profile. Nothing about the person is public until they claim it.
 */

// Also read in /user-setup, so new sign-ups come back here after setup.
const PROFILE_CODE_KEY = "dnounce_profile_code";

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

        {/* The profile */}
        {preview && (
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
            ) : (
              <>
                <p className="text-sm font-semibold text-blue-600">Hi {preview.first_name},</p>
                <h1 className="mt-1 text-xl font-bold text-gray-900">Your DNounce profile is ready</h1>
                <p className="mt-1 text-sm text-gray-600">Claim it free to make it yours. Nobody can see it until you claim it.</p>
                <p className="mt-2 text-xs text-gray-500">Sign up or sign in with the email we contacted you at. Once you verify it, the profile is yours.</p>

                <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                      {preview.first_name[0]}{preview.last_name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {name}
                        {preview.nickname && <span className="font-normal text-gray-500"> “{preview.nickname}”</span>}
                      </div>
                      {preview.company_name && <div className="text-sm text-gray-600">{preview.company_name}</div>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{preview.neighborhood}</span>
                    {preview.trade && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{preview.trade}</span>}
                  </div>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-700">
                  <li>• One link to share with clients, so new customers see your track record.</li>
                  <li>• Clients can write records about their experience with you.</li>
                  <li>• Free, and nobody can pay to hide or remove a record.</li>
                </ul>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                {session === "in" ? (
                  <button
                    onClick={claim}
                    disabled={claiming}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {claiming && <Loader2 className="h-4 w-4 animate-spin" />} Claim my profile
                  </button>
                ) : session === "out" ? (
                  <>
                    <Link
                      href={`/loginsignup?redirectTo=${encodeURIComponent(back)}`}
                      onClick={() => saveCode(code)}
                      className="mt-6 block w-full rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Create my free account
                    </Link>
                    <p className="mt-3 text-center text-xs text-gray-500">
                      Already on DNounce?{" "}
                      <Link href={`/loginsignup?redirectTo=${encodeURIComponent(back)}`} onClick={() => saveCode(code)} className="font-semibold text-blue-600">
                        Sign in
                      </Link>{" "}
                      and you&apos;ll come right back here.
                    </p>
                  </>
                ) : (
                  <div className="mt-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                )}
              </>
            )}
          </div>
        )}

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
