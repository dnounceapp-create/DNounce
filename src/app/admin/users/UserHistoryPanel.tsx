"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, FileText, ThumbsUp, Award, Bell, Shield, MessageSquare } from "lucide-react";

type Props = { userId: string; onClose: () => void };

export default function UserHistoryPanel({ userId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "records_subject" | "records_contributor" | "votes" | "statements" | "badges" | "notifications" | "bans" | "audit">("overview");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [
        acct, scores, preferences,
        subjectRow, contributorRow,
        bans, adminActions, badges,
        notifications,
      ] = await Promise.all([
        supabase.from("user_accountdetails").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_scores").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("subjects").select("subject_uuid").eq("owner_auth_user_id", userId).maybeSingle(),
        supabase.from("contributors").select("id").eq("user_id", userId).maybeSingle(),
        supabase.from("user_bans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("admin_audit_log").select("*").eq("target_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("badges").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      ]);

      // Load records as subject
      let subjectRecords: any[] = [];
      if (subjectRow.data?.subject_uuid) {
        const { data: recs } = await supabase.from("records").select("id, status, category, credibility, created_at").eq("subject_id", subjectRow.data.subject_uuid).order("created_at", { ascending: false });
        subjectRecords = recs ?? [];
      }

      // Load records as contributor
      let contributorRecords: any[] = [];
      if (contributorRow.data?.id) {
        const { data: recs } = await supabase.from("records").select("id, status, category, credibility, created_at, subject:subjects(name)").eq("contributor_id", contributorRow.data.id).order("created_at", { ascending: false });
        contributorRecords = recs ?? [];
      }

      // Load votes
      const { data: votes } = await supabase.from("record_votes").select("id, record_id, choice, explanation, created_at, author_alias").eq("user_id", userId).order("created_at", { ascending: false });

      // Load community statements
      const { data: statements } = await supabase.from("record_community_statements").select("id, record_id, author_alias, body, created_at, author_role").eq("author_user_id", userId).order("created_at", { ascending: false });

      setData({
        acct: acct.data, scores: scores.data, preferences: preferences.data,
        subjectRecords, contributorRecords,
        votes: votes ?? [], statements: statements ?? [],
        bans: bans.data ?? [], adminActions: adminActions.data ?? [],
        badges: badges.data ?? [], notifications: notifications.data ?? [],
      });
      setLoading(false);
    }
    load();
  }, [userId]);

  const TABS = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "records_subject", label: `Subject (${data?.subjectRecords?.length ?? 0})`, icon: FileText },
    { id: "records_contributor", label: `Contributor (${data?.contributorRecords?.length ?? 0})`, icon: FileText },
    { id: "votes", label: `Votes (${data?.votes?.length ?? 0})`, icon: ThumbsUp },
    { id: "statements", label: `Statements (${data?.statements?.length ?? 0})`, icon: MessageSquare },
    { id: "badges", label: `Badges (${data?.badges?.length ?? 0})`, icon: Award },
    { id: "notifications", label: `Notifs (${data?.notifications?.length ?? 0})`, icon: Bell },
    { id: "bans", label: `Bans (${data?.bans?.length ?? 0})`, icon: Shield },
    { id: "audit", label: `Audit (${data?.adminActions?.length ?? 0})`, icon: Shield },
  ];

  const name = data?.acct ? `${data.acct.first_name ?? ""} ${data.acct.last_name ?? ""}`.trim() : "User";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-end p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <div className="text-white font-semibold text-sm">{name || "User Profile"}</div>
            <div className="text-gray-500 text-xs font-mono">{userId.slice(0, 16)}…</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading profile…</div>
        ) : (
          <>
            <div className="flex gap-1 px-4 py-2 border-b border-gray-800 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.id ? "bg-white text-gray-900" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Name", name],
                      ["Job Title", data.acct?.job_title ?? "—"],
                      ["Location", data.acct?.location ?? "—"],
                      ["Subject Score", data.scores?.subject_score ?? "—"],
                      ["Contributor Score", data.scores?.contributor_score ?? "—"],
                      ["Voter Score", data.scores?.voter_score ?? "—"],
                      ["Citizen Score", data.scores?.citizen_score ?? "—"],
                      ["Overall Score", data.scores?.overall_score ?? "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-gray-800 rounded-xl p-3">
                        <div className="text-gray-500 text-[11px] mb-0.5">{k}</div>
                        <div className="text-white text-sm font-medium">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "records_subject" && (
                <div className="space-y-2">
                  {data.subjectRecords.length === 0 ? <div className="text-gray-500 text-sm">No records as subject.</div> : data.subjectRecords.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                      <div>
                        <div className="text-white text-xs font-medium">{r.category ?? "—"}</div>
                        <div className="text-gray-500 text-[11px] font-mono">{r.id.slice(0, 8)}…</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status === "published" ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-400"}`}>{r.status}</span>
                        <span className="text-gray-500 text-[11px]">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "records_contributor" && (
                <div className="space-y-2">
                  {data.contributorRecords.length === 0 ? <div className="text-gray-500 text-sm">No records as contributor.</div> : data.contributorRecords.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                      <div>
                        <div className="text-white text-xs font-medium">{(r.subject as any)?.name ?? "—"}</div>
                        <div className="text-gray-500 text-[11px]">{r.category ?? "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status === "published" ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-400"}`}>{r.status}</span>
                        <span className="text-gray-500 text-[11px]">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "votes" && (
                <div className="space-y-2">
                  {data.votes.length === 0 ? <div className="text-gray-500 text-sm">No votes cast.</div> : data.votes.map((v: any) => (
                    <div key={v.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{v.author_alias ?? "—"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.choice === "side_with_contributor" ? "bg-blue-900 text-blue-400" : "bg-indigo-900 text-indigo-400"}`}>{v.choice?.toUpperCase()}</span>
                        <span className="text-gray-500 text-[11px] ml-auto">{new Date(v.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-400 text-xs">{v.explanation?.slice(0, 120)}…</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "statements" && (
                <div className="space-y-2">
                  {data.statements.length === 0 ? <div className="text-gray-500 text-sm">No community statements.</div> : data.statements.map((s: any) => (
                    <div key={s.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{s.author_alias}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{s.author_role}</span>
                        <span className="text-gray-500 text-[11px] ml-auto">{new Date(s.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-400 text-xs">{s.body?.slice(0, 120)}…</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "badges" && (
                <div className="space-y-2">
                  {data.badges.length === 0 ? <div className="text-gray-500 text-sm">No badges.</div> : data.badges.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                      <span className="text-white text-sm">{b.icon} {b.label}</span>
                      <span className="text-gray-500 text-xs">{b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "notifications" && (
                <div className="space-y-2">
                  {data.notifications.length === 0 ? <div className="text-gray-500 text-sm">No notifications.</div> : data.notifications.map((n: any) => (
                    <div key={n.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-xs font-semibold">{n.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${n.read ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-400"}`}>{n.read ? "Read" : "Unread"}</span>
                      </div>
                      <div className="text-gray-400 text-xs">{n.body}</div>
                      <div className="text-gray-600 text-[11px]">{n.type} • {new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "bans" && (
                <div className="space-y-2">
                  {data.bans.length === 0 ? <div className="text-gray-500 text-sm">No ban history.</div> : data.bans.map((b: any) => (
                    <div key={b.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.is_permanent ? "bg-red-900 text-red-400" : "bg-orange-900 text-orange-400"}`}>{b.is_permanent ? "Permanent" : "Temporary"}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.is_active ? "bg-red-900 text-red-400" : "bg-gray-700 text-gray-400"}`}>{b.is_active ? "Active" : "Revoked"}</span>
                      </div>
                      <div className="text-gray-300 text-xs">{b.reason}</div>
                      <div className="text-gray-500 text-[11px]">Banned: {new Date(b.created_at).toLocaleString()} {b.expires_at ? `• Expires: ${new Date(b.expires_at).toLocaleString()}` : ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "audit" && (
                <div className="space-y-2">
                  {data.adminActions.length === 0 ? <div className="text-gray-500 text-sm">No admin actions on this user.</div> : data.adminActions.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                      <span className="text-blue-400 text-xs font-mono">{a.action}</span>
                      <span className="text-gray-500 text-[11px]">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
