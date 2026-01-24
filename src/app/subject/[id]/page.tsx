"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { User, Copy, Check, LogIn, PlusCircle, FilePlus, QrCode } from "lucide-react";
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

// helper
function normalizeCred(raw: any) {
  const s = (raw || "").toString().toLowerCase();
  if (s.includes("evidence")) return "Evidence-Based";
  if (s.includes("opinion")) return "Opinion-Based";
  if (s.includes("unclear")) return "Unclear";
  return "Pending";
}

export default function SubjectProfilePage() {
  const params = useParams<{ id: string }>();
  const subjectId = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  
  const [subject, setSubject] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"records" | "reputations" | "social">("records");
  const [copiedSubjectId, setCopiedSubjectId] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  
  const [copiedSocialId, setCopiedSocialId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action");

  useEffect(() => {
    if (typeof window === "undefined") return;
  
    const href = window.location.href;
    setPageUrl(href);
  
    // Always encode the production URL so phone QR scans correctly
    if (subjectId) {
      setQrUrl(`https://www.dnounce.com/subject/${subjectId}`);
    }
  }, [subjectId]);      

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log("AUTH USER (viewer):", data.user?.id, "error:", error);
    })();
  }, []);  

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log("AUTH USER:", { id: data.user?.id, email: data.user?.email, error });
    })();
  }, []);  

  useEffect(() => {
    if (!subjectId) return;
  
    (async () => {
      // 1) session check
      const { data: sessionData } = await supabase.auth.getSession();
      const authed = !!sessionData.session;
  
      console.log("✅ authed?", authed);
      console.log("✅ session user id:", sessionData.session?.user?.id);
  
      // 2) direct user fetch (sometimes clearer)
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.log("❌ getUser error:", userErr.message);
      console.log("✅ getUser id:", userData.user?.id);
  
      // keep your redirect behavior
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

        // 2) Published records about this subject (public-safe list)
        const { data: recs, error: recErr } = await supabase
          .from("records")
          .select(`
            id,
            created_at,
            description,
            credibility,
            ai_vendor_1_result,
            is_published
          `)          
          .eq("subject_id", subjectId)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(25);

        if (recErr) throw recErr;

        setSubject(subj);
        setRecords(recs || []);

        // 3) Social links (subject_id -> public.users.auth_user_id -> user_social_links.user_id)
        const { data: ownerRows, error: ownerErr } = await supabase
            .rpc("get_subject_owner", { p_subject_id: subjectId });

        if (ownerErr) throw ownerErr;

        const ownerAuthUserId = ownerRows?.[0]?.auth_user_id;

        console.log("👤 subject owner auth_user_id:", ownerAuthUserId);

        if (!ownerAuthUserId) {
        setSocialLinks([]);
        } else {

        const { data: socials, error: socialsErr } = await supabase
            .from("user_social_links")
            .select("id, platform, label, url, created_at")
            .eq("user_id", ownerAuthUserId)
            .order("created_at", { ascending: true });

        if (socialsErr) throw socialsErr;
        console.log("🔗 socials found:", socials?.length, socials);
        setSocialLinks(socials || []);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load subject profile");
        setSubject(null);
        setRecords([]);
      } finally {
        setLoading(false);
      }

    })();
  }, [subjectId]);

  const breakdown = useMemo(() => {
    const total = records.length;
    const evidence = records.filter(r => normalizeCred(r.credibility) === "Evidence-Based").length;
    const opinion = records.filter(r => normalizeCred(r.credibility) === "Opinion-Based").length;
    return { total, evidence, opinion };
  }, [records]);

  if (loading) return <div className="p-8">Loading…</div>;

  if (err || !subject) {
    return (
      <div className="p-8 text-center">
        <div className="font-semibold">{err || "Not available"}</div>
        <Link className="text-blue-600 hover:underline" href="/">Go Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="border rounded-2xl bg-white p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            {/* Header + Scores */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* LEFT: Identity */}
            <div className="flex flex-col">
                {/* Avatar + 3 lines */}
                <div className="grid grid-cols-[72px_1fr] gap-x-4 items-start">
                <div className="w-[72px] h-[72px] bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {subject.avatar_url ? (
                    <img
                        src={subject.avatar_url}
                        alt="Subject avatar"
                        className="w-full h-full object-cover"
                    />
                    ) : (
                    <User className="h-8 w-8 text-gray-600" />
                    )}
                </div>

                <div className="flex flex-col gap-1 pt-0.5">
                    <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                    {subject.name}{subject.nickname ? ` (${subject.nickname})` : ""}
                    </h3>

                    <p className="text-sm text-gray-600">
                    {subject.organization || "Independent"}
                    </p>

                    <p className="text-sm text-gray-500 flex items-center gap-1">
                    <span>📍</span> {subject.location || "Unknown"}
                    </p>
                </div>
                </div>

                {/* Subject ID + ONE QR row (starts under avatar, same line) */}
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
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Subject Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Overall User Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Contributor Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Voter Score</p>
                </div>
                <div>
                <p className="text-xl font-bold text-gray-900">—</p>
                <p className="text-xs text-gray-600">Citizen Score</p>
                </div>
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

                {/* Records list (public → link to public record page) */}
                <div className="space-y-4">
                  {records.map((r) => (
                    <div key={r.id} className="border-b border-gray-100 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                📅 {new Date(r.created_at).toLocaleDateString()}
                            </div>
                  
                            {/* AI credibility recommendation */}
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] text-gray-500 mb-1">
                                AI Credibility Check recommends:
                                </span>
                        
                                {(() => {
                                const label = normalizeCred(r.ai_vendor_1_result ?? r.credibility);
                        
                                const badgeClass =
                                    label === "Evidence-Based"
                                    ? "bg-green-100 text-green-800"
                                    : label === "Opinion-Based"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : label === "Unclear"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-gray-100 text-gray-800";
                        
                                return (
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
                                    {label.toUpperCase()}
                                    </span>
                                );
                                })()}
                            </div>
                        </div>
                  
                    <div className="text-sm text-gray-700 mt-2 line-clamp-3 whitespace-pre-wrap">
                      {r.description}
                    </div>
                  
                    <a
                        href={`https://www.dnounce.com/public/record/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-blue-600 hover:underline text-sm"
                    >
                        View Record →
                    </a>
                  </div>
                  
                  ))}

                  {records.length === 0 && (
                    <div className="text-sm text-gray-500">No published records yet.</div>
                  )}
                </div>
              </>
            )}

            {activeTab === "reputations" && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Reputations</h4>
                <p className="text-gray-500 text-sm">No reputations found.</p>

                <h4 className="font-medium text-gray-900 mb-3 mt-6">Badges</h4>
                <p className="text-gray-500 text-sm">No badges found.</p>
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
                            {/* Platform Icon */}
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-gray-700" />
                            </div>

                            {/* Platform + handle */}
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

                                {/* Copy button inline */}
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
                {/* DNounce logo in the middle */}
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
