"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Share2,
  ExternalLink,
  LayoutDashboard,
  Home,
  Star,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

export default function RecordSubmittedPage() {
  const params = useParams<{ id?: string }>();
  const recordId = (params?.id as string) ?? "";

  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // OPTIONAL: prove it exists in DB / preload anything you want
  const [dbExists, setDbExists] = useState<boolean | null>(null);

  // Survey state
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const [q1Rating, setQ1Rating] = useState(0);
  const [q1Text, setQ1Text] = useState("");
  const [q2Rating, setQ2Rating] = useState(0);
  const [q2Text, setQ2Text] = useState("");
  const [q3Rating, setQ3Rating] = useState(0);
  const [q3Text, setQ3Text] = useState("");
  const [q4Text, setQ4Text] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [surveyEmail, setSurveyEmail] = useState("");

  useEffect(() => {
    if (!recordId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("records")
          .select("id")
          .eq("id", recordId)
          .maybeSingle();

        if (error) {
          setDbExists(false);
          return;
        }

        setDbExists(!!data?.id);
      } catch {
        setDbExists(false);
      }
    })();
  }, [recordId]);

  // Check if user has already completed the post_submission survey
  useEffect(() => {
    if (!recordId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from("survey_completions")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("survey_type", "post_submission")
        .maybeSingle();

      if (!data) setShowSurvey(true);
    })();
  }, [recordId]);

  const recordHref = useMemo(
    () => (recordId ? `/record/${recordId}` : "/record"),
    [recordId]
  );
  const dashboardHref = "/dashboard/records-submitted";

  const absoluteRecordUrl =
    typeof window !== "undefined" ? `${window.location.origin}${recordHref}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recordId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = recordId;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        setCopied(false);
      }
    }
  }

  async function handleShare() {
    setShareError(null);

    const shareData = {
      title: "DNounce Record",
      text: "Here’s the record I submitted on DNounce.",
      url: absoluteRecordUrl,
    };

    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(absoluteRecordUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e: any) {
      setShareError(e?.message || "Couldn’t share right now.");
    }
  }

  async function submitSurvey() {
    setSurveySubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      await supabase.from("survey_responses").insert({
        user_id: userId,
        survey_type: "post_submission",
        record_id: recordId || null,
        responses: {
          q1_rating: q1Rating, q1_text: q1Text,
          q2_rating: q2Rating, q2_text: q2Text,
          q3_rating: q3Rating, q3_text: q3Text,
          q4_text: q4Text,
        },
        email_consent: emailConsent,
        email: emailConsent ? surveyEmail : null,
      });

      if (userId) {
        await supabase.from("survey_completions").insert({
          user_id: userId,
          survey_type: "post_submission",
        });
      }

      setSurveySubmitted(true);
    } catch (e) {
      console.error("Survey submit failed:", e);
      setSurveySubmitted(true); // close anyway, don't block the user
    } finally {
      setSurveySubmitting(false);
    }
  }

  if (!recordId) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Missing record id</h1>
            <p className="text-sm text-gray-600">
              This page requires a record id in the URL.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/dashboard/submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 font-semibold hover:bg-gray-50 transition"
              >
                <Home className="h-4 w-4" />
                Go back to submit
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (dbExists === false) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Record not found</h1>
            <p className="text-sm text-gray-600">
              We couldn’t find this record in the database.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/dashboard/submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 font-semibold hover:bg-gray-50 transition"
              >
                <Home className="h-4 w-4" />
                Go back to submit
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-200">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>

          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
            Record submitted
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            You’re all set.
          </p>
        </div>

        {/* Record ID card */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Record ID</div>
              <div className="mt-1 font-mono text-sm text-gray-900 break-all">
                {recordId}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
              aria-label="Copy record ID"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Share / Copy link row */}
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-white font-semibold hover:bg-black transition"
            >
              <Share2 className="h-4 w-4" />
              Share record link
            </button>

            {shareError ? (
              <div className="text-sm text-red-600 flex items-center justify-center sm:justify-start">
                {shareError}
              </div>
            ) : null}
          </div>
        </div>

        {/* Survey Modal */}
        {showSurvey && !surveySubmitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSurvey(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-base font-semibold text-gray-900">Quick feedback</div>
                  <div className="text-xs text-gray-500">Takes 30 seconds — helps us improve</div>
                </div>
                <button type="button" onClick={() => setShowSurvey(false)} className="rounded-full border p-1.5 text-gray-500 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Q1 */}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">How was the submission experience?</div>
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setQ1Rating(n)}>
                        <Star className={`w-6 h-6 ${n <= q1Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={q1Text} onChange={(e) => setQ1Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
                </div>

                {/* Q2 */}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">How easy was it to describe your experience?</div>
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setQ2Rating(n)}>
                        <Star className={`w-6 h-6 ${n <= q2Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={q2Text} onChange={(e) => setQ2Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
                </div>

                {/* Q3 */}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Did the form give you enough room to tell your story?</div>
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setQ3Rating(n)}>
                        <Star className={`w-6 h-6 ${n <= q3Rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={q3Text} onChange={(e) => setQ3Text(e.target.value)} rows={2} placeholder="Optional comment…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
                </div>

                {/* Q4 */}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">How can we improve?</div>
                  <textarea value={q4Text} onChange={(e) => setQ4Text(e.target.value)} rows={3} placeholder="Your thoughts…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
                </div>

                {/* Q5 — email consent */}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-2">Can we add you to our mailing list?</div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setEmailConsent(true)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${emailConsent ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"}`}>Yes</button>
                    <button type="button" onClick={() => { setEmailConsent(false); setSurveyEmail(""); }} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${!emailConsent ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"}`}>No</button>
                  </div>
                  {emailConsent && (
                    <input type="email" value={surveyEmail} onChange={(e) => setSurveyEmail(e.target.value)} placeholder="your@email.com" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400" />
                  )}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={async () => {
                  setShowSurvey(false);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return;
                    await supabase.from("survey_completions").insert({
                      user_id: session.user.id,
                      survey_type: "post_submission",
                    });
                  } catch (e) {
                    console.error("Survey skip failed:", e);
                  }
                }} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Skip forever</button>
                <button type="button" onClick={submitSurvey} disabled={surveySubmitting} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {surveySubmitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Survey thank you */}
        {showSurvey && surveySubmitted && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-200 mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="font-semibold text-gray-900">Thanks for your feedback!</div>
              <div className="text-sm text-gray-500 mt-1">It helps us make DNounce better.</div>
              <button type="button" onClick={() => { setShowSurvey(false); setSurveySubmitted(false); }} className="mt-4 rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white">Done</button>
            </div>
          </div>
        )}

        {/* Primary actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={recordHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 transition"
          >
            <ExternalLink className="h-4 w-4" />
            View record
          </Link>

          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 font-semibold hover:bg-gray-50 transition"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
