"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, FileText, MessageSquare, ThumbsUp, Bell, Pin, Eye, Award } from "lucide-react";

type Props = { recordId: string; onClose: () => void };

export default function RecordHistoryPanel({ recordId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "votes" | "debate" | "community" | "reactions" | "notifications" | "social">("overview");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [
        record, stages, votes, voteReplies, debateMsgs, debateAtts,
        communityStmts, communityReplies, reactions, notifications,
        pinned, follows, recordAtts, outcomes,
      ] = await Promise.all([
        supabase.from("records").select("*, subject:subjects(*), contributor:contributors!records_contributor_id_fkey(*)").eq("id", recordId).maybeSingle(),
        supabase.from("record_stages").select("*").eq("record_id", recordId).order("created_at", { ascending: true }),
        supabase.from("record_votes").select("*").eq("record_id", recordId).order("created_at", { ascending: true }),
        supabase.from("record_vote_replies").select("*").eq("record_id", recordId).order("created_at", { ascending: true }),
        supabase.from("record_debate_messages").select("*").eq("record_id", recordId).order("created_at", { ascending: true }),
        supabase.from("record_debate_attachments").select("*").eq("record_id", recordId),
        supabase.from("record_community_statements").select("*").eq("record_id", recordId).order("created_at", { ascending: true }),
        supabase.from("record_community_replies").select("*").eq("record_id", recordId).order("created_at", { ascending: true }),
        supabase.from("reactions").select("*").eq("target_id", recordId).order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("record_id", recordId).order("created_at", { ascending: false }),
        supabase.from("pinned_records").select("*").eq("record_id", recordId),
        supabase.from("record_follows").select("*").eq("record_id", recordId),
        supabase.from("record_attachments").select("*").eq("record_id", recordId),
        supabase.from("record_outcomes").select("*").eq("record_id", recordId),
      ]);

      setData({
        record: record.data,
        stages: stages.data ?? [],
        votes: votes.data ?? [],
        voteReplies: voteReplies.data ?? [],
        debateMsgs: debateMsgs.data ?? [],
        debateAtts: debateAtts.data ?? [],
        communityStmts: communityStmts.data ?? [],
        communityReplies: communityReplies.data ?? [],
        reactions: reactions.data ?? [],
        notifications: notifications.data ?? [],
        pinned: pinned.data ?? [],
        follows: follows.data ?? [],
        recordAtts: recordAtts.data ?? [],
        outcomes: outcomes.data ?? [],
      });
      setLoading(false);
    }
    load();
  }, [recordId]);

  const TABS = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "votes", label: `Votes (${data?.votes?.length ?? 0})`, icon: ThumbsUp },
    { id: "debate", label: `Debate (${data?.debateMsgs?.length ?? 0})`, icon: MessageSquare },
    { id: "community", label: `Community (${data?.communityStmts?.length ?? 0})`, icon: MessageSquare },
    { id: "reactions", label: `Reactions (${data?.reactions?.length ?? 0})`, icon: ThumbsUp },
    { id: "notifications", label: `Notifs (${data?.notifications?.length ?? 0})`, icon: Bell },
    { id: "social", label: `Social`, icon: Pin },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-end p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <div className="text-white font-semibold text-sm">Record History</div>
            <div className="text-gray-500 text-xs font-mono">{recordId.slice(0, 8)}…</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading history…</div>
        ) : !data?.record ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Record not found</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-gray-800 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.id ? "bg-white text-gray-900" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Subject", (data.record.subject as any)?.name ?? "—"],
                      ["Status", data.record.status],
                      ["Category", data.record.category ?? "—"],
                      ["Credibility", data.record.credibility ?? "—"],
                      ["Created", new Date(data.record.created_at).toLocaleString()],
                      ["Published", data.record.published_at ? new Date(data.record.published_at).toLocaleString() : "—"],
                      ["Debate ends", data.record.debate_ends_at ? new Date(data.record.debate_ends_at).toLocaleString() : "—"],
                      ["Voting ends", data.record.voting_ends_at ? new Date(data.record.voting_ends_at).toLocaleString() : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-gray-800 rounded-xl p-3">
                        <div className="text-gray-500 text-[11px] mb-0.5">{k}</div>
                        <div className="text-white text-sm font-medium truncate">{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Stage history */}
                  {data.stages.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-xs font-medium mb-2">Stage History ({data.stages.length})</div>
                      <div className="space-y-2">
                        {data.stages.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2 text-xs">
                            <span className="text-white font-mono">{s.stage ?? s.status ?? JSON.stringify(s)}</span>
                            <span className="text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleString() : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Outcomes */}
                  {data.outcomes.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-xs font-medium mb-2">Outcomes</div>
                      {data.outcomes.map((o: any) => (
                        <div key={o.id} className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-white">{JSON.stringify(o)}</div>
                      ))}
                    </div>
                  )}
                  {/* Attachments */}
                  <div>
                    <div className="text-gray-400 text-xs font-medium mb-2">Attachments ({data.recordAtts.length + data.debateAtts.length})</div>
                    <div className="text-gray-500 text-xs">{data.recordAtts.length} record attachments • {data.debateAtts.length} debate attachments</div>
                  </div>
                </div>
              )}

              {tab === "votes" && (
                <div className="space-y-3">
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>Contributor: <span className="text-blue-400 font-semibold">{data.votes.filter((v: any) => v.choice === "side_with_contributor").length}</span></span>
                    <span>Subject: <span className="text-indigo-400 font-semibold">{data.votes.filter((v: any) => v.choice === "side_with_subject").length}</span></span>
                    <span>Replies: <span className="text-white font-semibold">{data.voteReplies.length}</span></span>
                  </div>
                  {data.votes.map((v: any) => (
                    <div key={v.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300">{v.author_alias ?? "Anonymous"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.choice === "side_with_contributor" ? "bg-blue-900 text-blue-400" : "bg-indigo-900 text-indigo-400"}`}>{v.choice?.toUpperCase()}</span>
                        <span className="text-gray-500 text-[11px] ml-auto">{new Date(v.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-300 text-xs whitespace-pre-wrap">{v.explanation}</div>
                      {data.voteReplies.filter((r: any) => String(r.vote_id) === String(v.id)).map((r: any) => (
                        <div key={r.id} className="ml-3 border-l border-gray-700 pl-3 mt-2">
                          <div className="text-gray-400 text-[11px] font-semibold">{r.author_alias}</div>
                          <div className="text-gray-400 text-xs">{r.body}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {tab === "debate" && (
                <div className="space-y-3">
                  {data.debateMsgs.length === 0 ? <div className="text-gray-500 text-sm">No debate messages.</div> : data.debateMsgs.map((m: any) => (
                    <div key={m.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.author_role === "subject" ? "bg-blue-900 text-blue-400" : "bg-orange-900 text-orange-400"}`}>{m.author_role}</span>
                        {m.parent_message_id && <span className="text-gray-600 text-[10px]">↩ reply</span>}
                        <span className="text-gray-500 text-[11px] ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-300 text-xs whitespace-pre-wrap">{m.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "community" && (
                <div className="space-y-3">
                  {data.communityStmts.length === 0 ? <div className="text-gray-500 text-sm">No community statements.</div> : data.communityStmts.map((s: any) => (
                    <div key={s.id} className="bg-gray-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-300">{s.author_alias}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400`}>{s.author_role}</span>
                        <span className="text-gray-500 text-[11px] ml-auto">{new Date(s.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-300 text-xs whitespace-pre-wrap">{s.body}</div>
                      {data.communityReplies.filter((r: any) => r.statement_id === s.id).map((r: any) => (
                        <div key={r.id} className="ml-3 border-l border-gray-700 pl-3 mt-2">
                          <div className="text-gray-400 text-[11px] font-semibold">{r.author_alias}</div>
                          <div className="text-gray-400 text-xs">{r.body}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {tab === "reactions" && (
                <div className="space-y-2">
                  {data.reactions.length === 0 ? <div className="text-gray-500 text-sm">No reactions.</div> : data.reactions.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2 text-xs">
                      <span className="text-gray-400 font-mono">{r.target_type}</span>
                      <span className={r.direction === 1 ? "text-green-400" : "text-red-400"}>{r.direction === 1 ? "▲ Up" : "▼ Down"}</span>
                      <span className="text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "notifications" && (
                <div className="space-y-2">
                  {data.notifications.length === 0 ? <div className="text-gray-500 text-sm">No notifications sent.</div> : data.notifications.map((n: any) => (
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

              {tab === "social" && (
                <div className="space-y-4">
                  <div>
                    <div className="text-gray-400 text-xs font-medium mb-2">Pinned by ({data.pinned.length} users)</div>
                    {data.pinned.length === 0 ? <div className="text-gray-600 text-xs">Nobody has pinned this record.</div> : data.pinned.map((p: any) => (
                      <div key={p.id} className="text-gray-400 text-xs font-mono bg-gray-800 rounded px-2 py-1 mb-1">{p.user_id?.slice(0, 16)}… • {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</div>
                    ))}
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs font-medium mb-2">Followed by ({data.follows.length} users)</div>
                    {data.follows.length === 0 ? <div className="text-gray-600 text-xs">Nobody is following this record.</div> : data.follows.map((f: any) => (
                      <div key={f.id} className="text-gray-400 text-xs font-mono bg-gray-800 rounded px-2 py-1 mb-1">{f.user_id?.slice(0, 16)}… • {f.created_at ? new Date(f.created_at).toLocaleDateString() : "—"}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
