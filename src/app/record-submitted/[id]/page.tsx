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
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

export default function RecordSubmittedPage() {
  const params = useParams<{ id?: string }>();
  const recordId = (params?.id as string) ?? "";

  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // OPTIONAL: prove it exists in DB / preload anything you want
  const [dbExists, setDbExists] = useState<boolean | null>(null);

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
