"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  User,
  Copy,
  Check,
  FilePlus,
  CheckCircle,
  AlertTriangle,
  CircleAlert,
  X,
} from "lucide-react";
import {
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaGoogle,
  FaX,
  FaLink,
} from "react-icons/fa6";
import { QRCodeCanvas } from "qrcode.react";
import Image from "next/image";
import dynamic from "next/dynamic";


function getPlatformIcon(platformRaw: string) {
  const p = (platformRaw || "").toLowerCase();

  if (p === "instagram") return FaInstagram;
  if (p === "tiktok") return FaTiktok;
  if (p === "facebook") return FaFacebook;
  if (p === "google") return FaGoogle;
  if (p === "x" || p === "twitter") return FaX;

  return FaLink; // fallback
}

function buildProfileUrl(platformRaw: string, value: string) {
  const handle = value.replace(/^@/, "");
  const p = (platformRaw || "").toLowerCase();

  if (p === "instagram") return `https://instagram.com/${handle}`;
  if (p === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (p === "x" || p === "twitter") return `https://x.com/${handle}`;
  if (p === "facebook") return `https://facebook.com/${handle}`;

  return "";
}

function shortId(id: string, left = 6, right = 6) {
  if (!id) return "";
  if (id.length <= left + right + 3) return id;
  return `${id.slice(0, left)}…${id.slice(-right)}`;
}

// This is for FILTERING “credibility buckets” only (not what we DISPLAY).
function normalizeCredBucket(raw: any) {
  const s = (raw || "").toString().toLowerCase();
  if (s.includes("evidence")) return "Evidence-Based";
  if (s.includes("opinion")) return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  if (s.includes("unable")) return "Unable to Verify";
  return "Pending";
}

function stageFromStatus(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "published":
      return 3;
    case "deletion_request":
      return 4;
    case "debate":
      return 5;
    case "voting":
      return 6;
    case "decision":
      return 7;
    default:
      return 0;
  }
}

function prettyStage(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "published") return "Published";
  if (s === "deletion_request") return "Deletion Requested";
  if (s === "debate") return "Under Debate";
  if (s === "voting") return "Voting Open";
  if (s === "decision") return "Kept"; // never “Decision Reached”
  return "In Review";
}

function withinTimeBucket(dateIso: string | undefined, bucket: string | undefined) {
  if (!bucket || bucket === "all") return true;
  if (!dateIso) return false;

  const t = new Date(dateIso).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  if (bucket === "7d") return now - t <= 7 * day;
  if (bucket === "30d") return now - t <= 30 * day;
  if (bucket === "6m") return now - t <= 183 * day;
  if (bucket === "1y") return now - t <= 365 * day;

  return true;
}

type SortKey =
  | "Newest"
  | "Oldest"
  | "Stage: Most advanced"
  | "Stage: Least advanced"
  | "Voting ends soon"
  | "Rating: High"
  | "Rating: Low"
  | "Most discussed";

type SubjectRecord = any & {
  id: string;
  created_at?: string;
  submitted_at?: string;
  published_at?: string | null;
  description?: string | null;

  credibility?: string | null;
  ai_vendor_1_result?: string | null;

  is_published?: boolean | null;
  status?: string | null;
  voting_ends_at?: string | null;

  rating?: number | null;
  category?: string | null;
  record_type?: string | null;

  record_alias?: string | null;
  contributor_display_name?: string | null;
  contributor_identity_preference?: boolean | null;
};

type RecordFilters = {
  status?: string; // published/debate/voting/decision/...
  ai_cred?: string; // “Unable to Verify”, “Evidence-Based”, etc
  record_type?: string; // evidence/opinion/pending
  time?: string; // 7d/30d/6m/1y/all
};

const DEFAULT_SORT: SortKey = "Newest";

async function countExact(table: string, recordId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq("record_id", recordId);

  if (error) return 0;
  return Number(count ?? 0);
}

async function getTotalCommentCount(recordId: string): Promise<number> {
  const tables = [
    "record_comments",
    "record_community_messages",
    "record_community_replies",
    "record_voting_messages",
    "record_vote_replies",
    "record_debate_messages",
  ];

  const counts = await Promise.all(tables.map((t) => countExact(t, recordId)));
  return counts.reduce((a, b) => a + b, 0);
}

const RecordDetail = dynamic(() => import("@/components/record/RecordDetail"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
      Loading record…
    </div>
  ),
});

export default function SubjectProfilePage() {
  const params = useParams<{ id: string }>();
  const subjectId = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [subject, setSubject] = useState<any>(null);
  const [records, setRecords] = useState<SubjectRecord[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"records" | "reputations" | "social">("records");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const [copiedSubjectId, setCopiedSubjectId] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const [copiedSocialId, setCopiedSocialId] = useState<string | null>(null);

  // Filters / Sort / Pagination
  const [filters, setFilters] = useState<RecordFilters>({});
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // comments/traction per record
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  const [subjectScores, setSubjectScores] = useState<{
    subject_score: number | null;
    contributor_score: number | null;
    voter_score: number | null;
    citizen_score: number | null;
    overall_score: number | null;
  } | null>(null);
  const [subjectBadges, setSubjectBadges] = useState<any[]>([]);

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const hasNonDefaultSort = sort !== DEFAULT_SORT;

  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  useEffect(() => {
    if (activeTab !== "records") setExpandedRecordId(null);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const href = window.location.href;
    setPageUrl(href);

    if (subjectId) {
      setQrUrl(`https://www.dnounce.com/subject/${subjectId}`);
    }
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId) return;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authed = !!sessionData.session;

      if (authed && action === "submit-record") {
        router.replace(`/dashboard/submit?subject_id=${subjectId}`);
      }
    })();
  }, [subjectId, action, router]);

  useEffect(() => {
    if (!subjectId) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Subject (safe fields only)
        const { data: subj, error: subjErr } = await supabase
          .from("subjects")
          .select("subject_uuid,name,nickname,organization,location,avatar_url")
          .eq("subject_uuid", subjectId)
          .maybeSingle();

        if (subjErr) throw subjErr;
        if (!subj) {
          setErr("Subject not found.");
          setSubject(null);
          setRecords([]);
          setSocialLinks([]);
          return;
        }

        // 2) Records about this subject (published+ pipeline stages)
        const { data: recs, error: recErr } = await supabase
          .from("records")
          .select(`
            id,
            created_at,
            submitted_at,
            published_at,
            description,
            credibility,
            ai_vendor_1_result,
            is_published,
            status,
            voting_ends_at,
            rating,
            category,
            record_type,
            record_alias,
            contributor_display_name,
            contributor_identity_preference
          `)
          .eq("subject_id", subjectId)
          .in("status", ["published", "deletion_request", "debate", "voting", "decision"])
          .order("created_at", { ascending: false })
          .limit(250);

        if (recErr) throw recErr;

        setSubject(subj);

        const rows: SubjectRecord[] = (recs || []) as any;

        // Keep your existing “hide if delete wins after decision” logic
        const rowsWithOutcome = await Promise.all(
          rows.map(async (r) => {
            if (r.status !== "decision") return { ...r, hide: false };

            if (r.voting_ends_at && Date.now() < new Date(r.voting_ends_at).getTime()) {
              return { ...r, hide: false };
            }

            const { data: tally } = await supabase.rpc("vote_tally", { p_record_id: r.id });
            const t = Array.isArray(tally) ? tally[0] : tally;

            const keep = Number(t?.keep_count ?? 0);
            const del = Number(t?.delete_count ?? 0);

            // tie => keep (your rule), so delete only when del > keep
            const deleteWins = del > keep;

            return { ...r, hide: deleteWins };
          })
        );

        const visible = rowsWithOutcome.filter((r: any) => !r.hide) as SubjectRecord[];
        setRecords(visible);

        // 2b) traction counts (async per record)
        const counts = await Promise.all(
          visible.map(async (r) => {
            const total = await getTotalCommentCount(r.id);
            return [r.id, total] as const;
          })
        );

        const nextMap: Record<string, number> = {};
        counts.forEach(([id, total]) => (nextMap[id] = total));
        setCommentCounts(nextMap);

        // 3) Social links
        const { data: ownerRows, error: ownerErr } = await supabase.rpc("get_subject_owner", {
          p_subject_id: subjectId,
        });

        if (ownerErr) throw ownerErr;

        const ownerAuthUserId = ownerRows?.[0]?.auth_user_id;

        if (!ownerAuthUserId) {
          setSocialLinks([]);
        } else {
          const { data: socials, error: socialsErr } = await supabase
            .from("user_social_links")
            .select("id, platform, label, url, created_at")
            .eq("user_id", ownerAuthUserId)
            .order("created_at", { ascending: true });

          if (socialsErr) throw socialsErr;
          setSocialLinks(socials || []);

          // 4) Scores — fetch via subject owner
          if (ownerAuthUserId) {
            const { data: scoreData } = await supabase
              .from("user_scores")
              .select("subject_score,contributor_score,voter_score,citizen_score,overall_score")
              .eq("user_id", ownerAuthUserId)
              .maybeSingle();
            setSubjectScores(scoreData || null);

          const { data: badgeData } = await supabase
            .from("badges")
            .select("id, label, color, icon")
            .eq("user_id", ownerAuthUserId);
          setSubjectBadges(badgeData || []);
        }
          
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load subject profile");
        setSubject(null);
        setRecords([]);
        setSocialLinks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectId]);

  const filteredSorted = useMemo(() => {
    const rows: SubjectRecord[] = records || [];
  
    let out = rows.filter((r) => {
      if (filters.status && (r.status || "").toLowerCase() !== filters.status) return false;
  
      if (filters.ai_cred) {
        const bucket = normalizeCredBucket(r.ai_vendor_1_result ?? r.credibility);
        if (bucket !== filters.ai_cred) return false;
      }
  
      if (filters.record_type) {
        const rt = (r.record_type || "").toLowerCase();
        if (rt !== filters.record_type) return false;
      }
  
      const dateRef = r.published_at || r.submitted_at || r.created_at;
      if (!withinTimeBucket(dateRef, filters.time)) return false;
  
      return true;
    });
  
    const byDate = (r: SubjectRecord) =>
      new Date(r.published_at || r.submitted_at || r.created_at || 0).getTime();
  
    out = out.sort((a, b) => {
      if (sort === "Newest") return byDate(b) - byDate(a);
      if (sort === "Oldest") return byDate(a) - byDate(b);
  
      if (sort === "Stage: Most advanced")
        return stageFromStatus(b.status) - stageFromStatus(a.status);
      if (sort === "Stage: Least advanced")
        return stageFromStatus(a.status) - stageFromStatus(b.status);
  
      if (sort === "Voting ends soon") {
        const av = a.voting_ends_at ? new Date(a.voting_ends_at).getTime() : Number.POSITIVE_INFINITY;
        const bv = b.voting_ends_at ? new Date(b.voting_ends_at).getTime() : Number.POSITIVE_INFINITY;
        return av - bv;
      }
  
      if (sort === "Rating: High")
        return Number(b.rating ?? -Infinity) - Number(a.rating ?? -Infinity);
      if (sort === "Rating: Low")
        return Number(a.rating ?? Infinity) - Number(b.rating ?? Infinity);
  
      if (sort === "Most discussed") {
        const ac = Number(commentCounts[a.id] ?? 0);
        const bc = Number(commentCounts[b.id] ?? 0);
        return bc - ac;
      }
  
      return byDate(b) - byDate(a);
    });
  
    return out;
  }, [records, filters, sort, commentCounts]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  const breakdown = useMemo(() => {
    const total = filteredSorted.length;
    const evidence = filteredSorted.filter(
      (r) => normalizeCredBucket(r.ai_vendor_1_result ?? r.credibility) === "Evidence-Based"
    ).length;
    const opinion = filteredSorted.filter(
      (r) => normalizeCredBucket(r.ai_vendor_1_result ?? r.credibility) === "Opinion-Based"
    ).length;
    return { total, evidence, opinion };
  }, [filteredSorted]);

  function contributorLabelByRules(r: SubjectRecord) {
    // Use the SAME value you display (ai_vendor_1_result first, then credibility)
    const rawCred = credRecommendationText(r);
    const bucket = normalizeCredBucket(rawCred);
  
    const realName = (r.contributor_display_name || "").trim();
    const alias = (r.record_alias || "").trim();
  
    // Decision table:
    // Evidence-Based: contributor_identity_preference TRUE => Real Name, FALSE => Alias
    // Unclear/Unable/Pending: Alias
    // Opinion-Based: Real Name
    let showRealName = false;
  
    if (bucket === "Evidence-Based") {
      showRealName = !!r.contributor_identity_preference;
    } else if (bucket === "Opinion-Based") {
      showRealName = true;
    } else {
      // Unclear / Unable to Verify / Pending => Alias
      showRealName = false;
    }
  
    if (showRealName) return realName || alias || "SuperHero123";
    return alias || realName || "SuperHero123";
  }
  
  function recordTitle(r: SubjectRecord) {
    if (r.record_alias) return r.record_alias;
    const subjectName = subject?.name || "Subject";
    const contributor = contributorLabelByRules(r);
    return `${contributor} • ${subjectName}`;
  }

  function credRecommendationText(r: SubjectRecord) {
    // DISPLAY raw DB recommendation (per requirement)
    const raw = (r.ai_vendor_1_result ?? r.credibility ?? "").toString().trim();
    return raw || "Pending";
  }

  function credibilityBadge(cred: string) {
    const c = (cred || "").trim();

    const base =
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium";

    if (c === "Evidence-Based") {
      return (
        <span className={`${base} bg-green-100 text-green-700`}>
          <CheckCircle size={12} className="text-green-700" />
          {c}
        </span>
      );
    }

    if (c === "Opinion-Based") {
      return (
        <span className={`${base} bg-red-100 text-red-700`}>
          <AlertTriangle size={12} className="text-red-700" />
          {c}
        </span>
      );
    }

    if (c === "Unable to Verify") {
      return (
        <span className={`${base} bg-yellow-100 text-yellow-700`}>
          <CircleAlert size={12} className="text-yellow-700" />
          {c}
        </span>
      );
    }

    // fallback (incl Pending / Unclear / anything else)
    return <span className={`${base} bg-yellow-100 text-yellow-700`}>{c || "Pending"}</span>;
  }

  if (loading) return <div className="p-8">Loading…</div>;

  if (err || !subject) {
    return (
      <div className="p-8 text-center">
        <div className="font-semibold">{err || "Not available"}</div>
        <Link className="text-blue-600 hover:underline" href="/">
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition"
      >
        ← Back
      </button>
      <div className="border rounded-2xl bg-white p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            {/* Header + Scores */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* LEFT: Identity */}
              <div className="flex flex-col">
                {/* Avatar + 3 lines */}
                <div className="grid grid-cols-[72px_1fr] gap-x-4 items-start">
                <div
                    className={`w-[72px] h-[72px] bg-gray-200 rounded-full flex items-center justify-center overflow-hidden ${subject.avatar_url ? "cursor-pointer hover:ring-2 hover:ring-gray-900 transition" : ""}`}
                    onClick={() => subject.avatar_url && setAvatarLightboxOpen(true)}
                  >
                    {subject.avatar_url ? (
                      <img
                        src={subject.avatar_url}
                        alt="Subject avatar"
                        className="w-full h-full object-cover select-none pointer-events-none no-screenshot"
                        style={{ WebkitUserSelect: "none", userSelect: "none" }}
                      />
                    ) : (
                      <User className="h-8 w-8 text-gray-600" />
                    )}
                  </div>

                  {avatarLightboxOpen && subject.avatar_url && (
                    <div
                      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
                      onClick={() => setAvatarLightboxOpen(false)}
                    >
                      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setAvatarLightboxOpen(false)}
                          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <img
                          src={subject.avatar_url}
                          alt="Subject avatar"
                          className="w-full rounded-2xl object-cover shadow-2xl select-none no-screenshot"
                          style={{ WebkitUserSelect: "none", userSelect: "none" }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 pt-0.5">
                    <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                      {subject.name}
                      {subject.nickname ? ` (${subject.nickname})` : ""}
                    </h3>

                    <p className="text-sm text-gray-600">
                      {subject.organization || "Independent"}
                    </p>

                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <span>📍</span> {subject.location || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Subject ID + QR row */}
                <div className="mt-3 flex items-center gap-3 w-full">
                  <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                    <span className="font-semibold text-gray-800">Subject ID:</span>

                    <span className="font-mono truncate max-w-[220px] sm:max-w-[320px]">
                      {shortId(subject.subject_uuid)}
                    </span>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(subject.subject_uuid);
                          setCopiedSubjectId(true);
                          setTimeout(() => setCopiedSubjectId(false), 1200);
                        } catch (e) {
                          console.error("Copy failed", e);
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                      title="Copy full subject ID"
                    >
                      {copiedSubjectId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="ml-auto inline-flex items-center justify-center rounded-lg border bg-white p-2 hover:bg-gray-50"
                    title="Show QR code"
                  >
                    <div className="relative">
                      <QRCodeCanvas value={qrUrl || ""} size={36} level="H" includeMargin={true} />
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
                  { label: "Subject Score",      val: subjectScores?.subject_score },
                  { label: "Overall Score",       val: subjectScores?.overall_score },
                  { label: "Contributor Score",   val: subjectScores?.contributor_score },
                  { label: "Voter Score",         val: subjectScores?.voter_score },
                  { label: "Citizen Score",       val: subjectScores?.citizen_score },
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
                  onClick={async () => {
                    const { data } = await supabase.auth.getSession();
                    const authed = !!data.session;

                    const dashboardSubmitUrl = `/dashboard/submit?subject_id=${subjectId}`;

                    if (!authed) {
                      router.push(
                        `/loginsignup?redirectTo=${encodeURIComponent(dashboardSubmitUrl)}`
                      );
                      return;
                    }

                    router.push(dashboardSubmitUrl);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  <FilePlus className="h-4 w-4" />
                  Submit A Record
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6 mt-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab("records")}
                className={`flex-1 text-center px-4 py-2 ${
                  activeTab === "records"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Records About Me
              </button>
              <button
                onClick={() => setActiveTab("reputations")}
                className={`flex-1 text-center px-4 py-2 ${
                  activeTab === "reputations"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Reputations & Badges
              </button>
              <button
                onClick={() => setActiveTab("social")}
                className={`flex-1 text-center px-4 py-2 ${
                  activeTab === "social"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Social Media
              </button>
            </div>

            {activeTab === "records" && (
              <>
                {/* Filter + Sort (no search) */}
                <div className="mb-5 flex flex-col gap-3">
                  {/* All controls in one horizontal row (wraps on small screens) */}
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="w-full sm:w-auto min-w-[210px] rounded-xl border px-3 py-2 text-sm bg-white"
                    >
                      <option>Newest</option>
                      <option>Oldest</option>
                      <option>Stage: Most advanced</option>
                      <option>Stage: Least advanced</option>
                      <option>Voting ends soon</option>
                      <option>Rating: High</option>
                      <option>Rating: Low</option>
                      <option>Most discussed</option>
                    </select>

                    <select
                      value={filters.status ?? ""}
                      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
                      className="w-full sm:w-auto min-w-[180px] rounded-xl border px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All stages</option>
                      <option value="published">Published</option>
                      <option value="deletion_request">Deletion Requested</option>
                      <option value="debate">Under Debate</option>
                      <option value="voting">Voting Open</option>
                      <option value="decision">Kept</option>
                    </select>

                    <select
                      value={filters.ai_cred ?? ""}
                      onChange={(e) => setFilters((f) => ({ ...f, ai_cred: e.target.value || undefined }))}
                      className="w-full sm:w-auto min-w-[220px] rounded-xl border px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All credibility recommendations</option>
                      <option value="Unable to Verify">Unable to Verify</option>
                      <option value="Evidence-Based">Evidence-Based</option>
                      <option value="Opinion-Based">Opinion-Based</option>
                      <option value="Unclear">Unclear</option>
                      <option value="Pending">Pending</option>
                    </select>

                    <select
                      value={filters.record_type ?? ""}
                      onChange={(e) => setFilters((f) => ({ ...f, record_type: e.target.value || undefined }))}
                      className="w-full sm:w-auto min-w-[160px] rounded-xl border px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All record types</option>
                      <option value="evidence">Evidence</option>
                      <option value="opinion">Opinion</option>
                      <option value="pending">Pending</option>
                    </select>

                    <select
                      value={filters.time ?? ""}
                      onChange={(e) => setFilters((f) => ({ ...f, time: e.target.value || undefined }))}
                      className="w-full sm:w-auto min-w-[150px] rounded-xl border px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="6m">Last 6 months</option>
                      <option value="1y">Last year</option>
                      <option value="all">All time</option>
                    </select>

                    {(hasActiveFilters || hasNonDefaultSort) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({});
                          setSort(DEFAULT_SORT);
                          setPage(1);
                        }}
                        className="w-full sm:w-auto whitespace-nowrap rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Optional chips row (keep if you like) */}
                  {(hasActiveFilters || hasNonDefaultSort) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {filters.status ? (
                        <span className="text-xs rounded-full border bg-gray-50 px-3 py-1">Stage: {filters.status}</span>
                      ) : null}
                      {filters.ai_cred ? (
                        <span className="text-xs rounded-full border bg-gray-50 px-3 py-1">Credibility: {filters.ai_cred}</span>
                      ) : null}
                      {filters.record_type ? (
                        <span className="text-xs rounded-full border bg-gray-50 px-3 py-1">Type: {filters.record_type}</span>
                      ) : null}
                      {filters.time ? (
                        <span className="text-xs rounded-full border bg-gray-50 px-3 py-1">Time: {filters.time}</span>
                      ) : null}
                      {sort !== DEFAULT_SORT ? (
                        <span className="text-xs rounded-full border bg-gray-50 px-3 py-1">Sort: {sort}</span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Breakdown */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Record Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{breakdown.total}</div>
                      <div className="text-sm text-gray-500">Total Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{breakdown.evidence}</div>
                      <div className="text-sm text-gray-500">Evidence-Based</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{breakdown.opinion}</div>
                      <div className="text-sm text-gray-500">Opinion-Based</div>
                    </div>
                  </div>
                </div>

                {/* Records list as clickable cards */}
                <div className="space-y-4">
                  {pageRows.map((r) => {
                    const title = recordTitle(r);
                    const stageNum = stageFromStatus(r.status);

                    // Stage pill rules:
                    // - Published (3): hidden
                    // - Stages 4–6: shown
                    // - Stage 7: show “Kept”
                    const showStagePill = stageNum >= 4 && stageNum <= 6;
                    const showKeptPill = stageNum === 7;

                    const comments = Number(commentCounts[r.id] ?? 0);
                    const dateRef = r.published_at || r.submitted_at || r.created_at;

                    const cred = credRecommendationText(r);

                    return (
                      <div
                        key={r.id}
                        className="w-full rounded-2xl border bg-white p-4 hover:shadow-sm hover:border-gray-300 transition"
                      >
                        {/* Row 1: Title + "AI Credibility Recommendation:" on same line */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
                          </div>
                    
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">
                              AI Credibility Recommendation:
                            </span>
                            {credibilityBadge(cred)}
                          </div>
                        </div>
                    
                        {/* Row 2: Category/Stage/Date/Comments + actions on same line */}
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Category first (NOT a pill) */}
                            {r.category ? <span className="text-xs text-gray-700">{r.category}</span> : null}
                    
                            {/* Stage pill AFTER category */}
                            {showStagePill ? (
                              <span className="text-xs rounded-full border bg-gray-50 px-2 py-1 text-gray-700">
                                {prettyStage(r.status)}
                              </span>
                            ) : null}
                    
                            {showKeptPill ? (
                              <span className="text-xs rounded-full border bg-gray-50 px-2 py-1 text-gray-700">
                                Kept
                              </span>
                            ) : null}
                    
                            <span className="text-xs text-gray-500">
                              {dateRef ? `📅 ${new Date(dateRef).toLocaleDateString()}` : ""}
                            </span>
                    
                            <span className="text-xs text-gray-500">
                              💬 {comments} {comments === 1 ? "comment" : "comments"}
                            </span>
                          </div>
                        </div>
                    
                        {/* Description */}
                        {r.description ? (
                          <div className="mt-3 text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
                            {r.description}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-gray-500 italic">No description provided.</div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/record/${r.id}`)}
                            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                          >
                            View record
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedRecordId((cur) => {
                                const next = cur === r.id ? null : r.id;

                                // if expanding, scroll to the inline detail
                                if (next) {
                                  setTimeout(() => {
                                    document
                                      .getElementById(`record-inline-${r.id}`)
                                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }, 0);
                                }

                                return next;
                              });
                            }}
                            className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
                          >
                            {expandedRecordId === r.id ? "Collapse" : "Expand"}
                          </button>
                        </div>
                    
                        {/* Inline expanded detail */}
                        {expandedRecordId === r.id ? (
                          <div id={`record-inline-${r.id}`} className="mt-4 border-t pt-4">
                            <RecordDetail recordId={r.id} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {filteredSorted.length === 0 && (
                    <div className="text-sm text-gray-500">No matching records.</div>
                  )}
                </div>

                {/* Pagination */}
                {filteredSorted.length > 0 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Rows:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="rounded-lg border px-2 py-1 bg-white"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                      >
                        Prev
                      </button>

                      <div className="text-sm text-gray-700">
                        Page <span className="font-semibold">{page}</span> / {totalPages}
                      </div>

                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "reputations" && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Badges</h4>
                {subjectBadges.length === 0 ? (
                  <p className="text-sm text-gray-500">No badges earned yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {subjectBadges.map((badge: any) => (
                      <div
                        key={badge.id}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-gray-50 text-sm font-medium text-gray-700"
                      >
                        <span>{badge.icon}</span>
                        {badge.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "social" && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Social Media</h4>

                {socialLinks.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {subject?.name || "This subject"} doesn’t have any social media on display.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {socialLinks.map((s) => {
                      const Icon = getPlatformIcon(s.platform);
                      const profileUrl = buildProfileUrl(s.platform, s.url);

                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-4 rounded-xl border bg-white p-4"
                        >
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-gray-700" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 capitalize">
                              {s.platform}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5">
                              {profileUrl ? (
                                <a
                                  href={profileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline break-all"
                                >
                                  {s.url}
                                </a>
                              ) : (
                                <div className="text-xs text-gray-600 break-all">{s.url}</div>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(s.url);
                                  setCopiedSocialId(String(s.id));
                                  setTimeout(() => setCopiedSocialId(null), 1200);
                                }}
                                className="inline-flex items-center justify-center rounded-full border p-1.5 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                                title="Copy"
                              >
                                {copiedSocialId === String(s.id) ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
              <QRCodeCanvas value={qrUrl || ""} size={240} level="H" includeMargin={true} />
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

            <div className="mt-4 text-xs text-gray-600 break-all">{pageUrl}</div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pageUrl);
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