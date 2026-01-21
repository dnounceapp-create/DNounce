"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, User, MapPin, FileText, Star, CheckCircle, AlertTriangle, CircleAlert, Copy, } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { stageConfig } from "@/config/stageConfig";

const PUBLIC_STAGE_ORDER = [3, 6, 7] as const;

function isSubjectDisputeFlow(record: any): boolean {
  const status = normalizeStatus(record?.status);

  // These are YOUR dispute statuses (from getRecordStage)
  return [
    "deletion_request",
    "deletion_requested",
    "intake",
    "dispute_intake",
    "debate",
    "subject_dispute",
    "dispute_debate",
    "active_dispute",
    "voting",
    "voting_in_progress",
    "final",
    "resolved",
    "closed",
    "anonymity_active",
  ].includes(status);
}

function DominoStageRow({ stage, record }: { stage: number; record: any }) {
  const visibleStages = isSubjectDisputeFlow(record)
    ? PUBLIC_STAGE_ORDER
    : ([3] as const);

  function getStageForUI(realStage: number) {
    const prev = [...visibleStages].reverse().find((s) => s <= realStage);
    return prev ?? visibleStages[0];
  }

  const stageForUI = getStageForUI(stage);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {visibleStages.map((id) => {
          const isActive = id === stageForUI;

          return (
            <div
              key={id}
              title={stageConfig[id].label}
              className={[
                // ✅ mobile sizing
                "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1",
                "text-[10px] sm:text-[11px] font-semibold",
                "transition",
                // ✅ active filled
                isActive
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-300",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  isActive ? "bg-white" : "bg-gray-300",
                ].join(" ")}
              />
              <span className="max-w-[72vw] sm:max-w-[220px] truncate">
                {stageConfig[id].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function shouldRevealContributorIdentity(record: any): boolean {
  const cred = normalizeCredibility(record?.credibility);
  const choseName = record?.contributor_identity_preference === true;

  // If user chose to display their name → reveal identity
  if (choseName) return true;

  // Opinion-Based → show real identity
  if (cred === "Opinion-Based") return true;

  // Evidence-Based / Unclear / Pending → anonymous
  return false;
}

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}


function normalizeStatus(raw: any) {
  return (raw || "").toString().trim().toLowerCase();
}

function getRecordStage(record: any): number {
  const status = normalizeStatus(record?.status);

  const aiDone = !!record?.ai_completed_at;
  const isPublished = record?.is_published === true || !!record?.published_at;

  // Stages 4–7: drive explicitly off status once you set it in DB.
  // Map multiple aliases so you don’t break if strings vary slightly.
  if (["deletion_request", "deletion_requested", "intake", "dispute_intake"].includes(status)) return 4;
  if (["debate", "subject_dispute", "dispute_debate", "active_dispute"].includes(status)) return 5;
  if (["voting", "voting_in_progress"].includes(status)) return 6;
  if (["final", "resolved", "closed", "anonymity_active"].includes(status)) return 7;

  // Stages 1–3: infer from AI + publish fields
  if (!aiDone) return 1;
  if (aiDone && !isPublished) return 2;
  return 3;
}

function normalizeCredibility(raw: any) {
  const s = (raw || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[‐-‒–—−]/g, "-"); // normalize weird dashes

  if (s.includes("evidence-based") || s.includes("evidence based")) return "Evidence-Based";
  if (s.includes("opinion-based") || s.includes("opinion based")) return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  return "Pending AI Review";
}

function getContributorDisplayName(record: any): string {
  const reveal = shouldRevealContributorIdentity(record);

  const fullName = ""; // public anon view does not fetch real name

  if (reveal) {
    return fullName || "Individual Contributor";
  }

  const cred = normalizeCredibility(record?.credibility);
  if (cred === "Evidence-Based") return "SuperHero123";
  if (cred === "Unclear") return "BeWary123";
  return "Individual Contributor";
}

function formatMMDDYYYY(value: any) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default function RecordPage() {
  const params = useParams<{ id: string }>();
  const recordId = params?.id;
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!recordId) return;
  
    async function fetchRecord() {
      try {
        setLoading(true);
    
        const { data, error } = await supabase
          .from("records")
          .select(`
            id,
            created_at,
            rating,
            description,
            category,
            location,
            credibility,
            relationship,
            status,
            is_published,
            ai_completed_at,
            published_at,
            contributor_id,
            contributor_identity_preference,

            subject:subjects!records_subject_id_fkey (
              subject_uuid,
              name,
              nickname,
              organization,
              location,
              avatar_url
            ),

            attachments:record_attachments!record_attachments_record_id_fkey (
              id
            ),

            contributor:contributors!records_contributor_id_fkey (
              id
            )
          `)
          .eq("id", recordId)
          .limit(1);

        if (error) {
          setError(error.message);
          setRecord(null);
          return;
        }

        const row = data?.[0] ?? null;

        if (!row) {
          setError("Record not available publicly. Please sign in.");
          setRecord(null);
          return;
        }

        setRecord(row);
        setCurrentStage(getRecordStage(row));

      } catch (e: any) {
        setError(e?.message || "Failed to load record");
        setRecord(null);
      } finally {
        setLoading(false);
      }
    } 
  
    fetchRecord();
  
  }, [recordId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-gray-600" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <h1 className="text-xl font-semibold mb-3">{error}</h1>
          <Link
            href="/"
            className="text-blue-600 hover:underline"
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  const subject = record.subject;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Record Detail</h1>
      </div>

      {/* Subject + Contributor Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"> 
        {/* SUBJECT CARD */}
        <div className="border rounded-2xl p-5 shadow-sm bg-white">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Subject
            </h2>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-gray-600" />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 truncate">
                {subject?.name}
                {subject?.nickname && (
                  <span className="text-gray-500 ml-1">
                    ({subject.nickname})
                  </span>
                )}
              </p>

              <p className="text-sm text-gray-600">
                {subject?.organization || "Independent"} •{" "}
                {subject?.location || "Unknown Location"}
              </p>

              <Link
                href={`/subject/${subject?.subject_uuid}`}
                className="text-blue-600 hover:underline text-sm"
              >
                View Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* CONTRIBUTOR CARD */}
        <div className="border rounded-2xl p-5 shadow-sm bg-white">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Contributor
            </h2>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              <User className="w-7 h-7 text-gray-600" />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-semibold text-gray-900 truncate">
                {getContributorDisplayName(record)}
              </p>

              {(() => {
                const contributorId =
                  record?.contributor?.id ??
                  record?.contributor?.[0]?.id ??
                  null;

                return contributorId ? (
                  <Link
                    href={`/contributor/${contributorId}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Profile →
                  </Link>
                ) : null;
              })()}

              {record.also_known_as &&
                (normalizeCredibility(record?.credibility) === "Opinion-Based" ||
                record?.contributor_identity_preference === true) && (
                  <p className="text-sm text-gray-500 truncate">
                    ({record.also_known_as})
                  </p>
              )}

              {(() => {
                const isOverrideName = record?.contributor_identity_preference === true;

                const cred = normalizeCredibility(record?.credibility);

                // If contributor explicitly chose to show their name → never say anonymous
                if (isOverrideName) return null;

                // Otherwise: Evidence-Based, Unclear, Pending → anonymous
                if (cred !== "Opinion-Based") {
                  return (
                    <p className="mt-1 text-xs text-gray-400">
                      Anonymous contributor
                    </p>
                  );
                }

                return null;
              })()}

              <p className="mt-1 text-xs text-gray-400">
                Submitted this record
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Record Info */}
      <div className="border rounded-2xl p-5 shadow-md bg-white space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Submitted Record</h2>

          {/* Credibility badge (mobile-safe) */}
          {(() => {
            const raw = (record.credibility || "").toString().trim();

            const label =
              raw.includes("Evidence-Based") ? "Evidence-Based" :
              raw.includes("Opinion-Based") ? "Opinion-Based" :
              raw.includes("Unclear") ? "Unclear" :
              raw ? raw :
              "Pending AI Review";

            const badgeStyle =
              label === "Evidence-Based"
                ? "bg-green-50 text-green-800 border-green-200"
                : label === "Opinion-Based"
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : label === "Unclear"
                ? "bg-yellow-50 text-yellow-900 border-yellow-200"
                : "bg-gray-50 text-gray-700 border-gray-200";

            const CredibilityIcon =
              label === "Evidence-Based"
                ? CheckCircle
                : label === "Opinion-Based"
                ? AlertTriangle
                : label === "Unclear"
                ? CircleAlert
                : null;

            const iconColor =
              label === "Evidence-Based"
                ? "text-green-600"
                : label === "Opinion-Based"
                ? "text-blue-600"
                : label === "Unclear"
                ? "text-yellow-600"
                : "";

            return (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {CredibilityIcon && <CredibilityIcon className={`w-4 h-4 ${iconColor}`} />}
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${badgeStyle}`}>
                  Credibility: {label}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-x-6 text-xs text-gray-600">
          <div>
            <span className="font-semibold text-gray-800">Submitted:</span>{" "}
            {formatMMDDYYYY(record.created_at)}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Record ID:</span>

            <span className="font-mono text-[11px]">{shortId(record.id)}</span>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(record.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch (e) {
                  console.error("Copy failed", e);
                }
              }}              
              title="Copy record ID"
              className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            <div className="min-w-[64px]">
              {copied && (
                <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Copied!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 🧩 Stage Domino Tracker (only if disputed) */}
        {isSubjectDisputeFlow(record) && (() => {
          const stage = getRecordStage(record);
          return (
            <div className="pt-1">
              <DominoStageRow stage={stage} record={record} />
            </div>
          );
        })()}

        {/* Rating */}
        <div className="flex items-center gap-2 text-yellow-500">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star
              key={i}
              size={22}
              className={
                record.rating >= i + 1
                  ? "fill-current text-black"
                  : "text-gray-300"
              }
            />
          ))}
        </div>

        <div className="text-sm text-gray-600">
          <strong>Category:</strong> {record.category}
        </div>

        <div className="text-sm text-gray-600 flex gap-2 items-center">
          <MapPin className="w-4 h-4" />
          {record.location}
        </div>

        <div className="text-sm text-gray-600">
          <strong>Relationship:</strong> {record.relationship}
        </div>

        <div className="pt-3 border-t">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            Experience Details
          </div>
          <div className="text-sm sm:text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">
            {record.description}
          </div>
        </div>

        {/* Attachments */}
        {(record.attachments?.length ?? 0) > 0 && (
        <div className="pt-4 border-t text-sm text-gray-700">
          <span className="font-semibold">Attachments:</span>{" "}
          {record.attachments.length} file(s)
            <div className="text-xs text-gray-500 mt-1">
              Sign in to view attachments.
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-center">
        <div className="text-sm font-semibold text-gray-900">
          Want the full record?
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Copy the record ID and sign in to view additional details and participation options.
        </div>
      </div>
    </div>
  );
}