"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, RefreshCw } from "lucide-react";

type NotifRow = {
  id: string; user_id: string; title: string; body: string;
  type: string; read: boolean; created_at: string; user_name?: string;
};

const TYPES = ["all","stage_1_contributor","stage_2_subject","stage_3_subject","stage_3_contributor","stage_4_contributor","stage_5_subject","stage_5_contributor","stage_6_subject","stage_6_contributor","voting_ended_subject","voting_ended_contributor","debate_reply","voter_reply","voter_flagged","voter_convicted","community_reply","badge_earned","tagged","ticket_response"];

export default function AdminNotificationsPage() {
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("notifications").select("id, user_id, title, body, type, read, created_at").order("created_at", { ascending: false }).limit(500);
    const rows = (data as any[]) ?? [];
    const userIds = [...new Set(rows.map(r => r.user_id))];
    const { data: accts } = await supabase.from("user_accountdetails").select("user_id, first_name, last_name").in("user_id", userIds);
    const acctMap: Record<string, string> = {};
    (accts ?? []).forEach((a: any) => { acctMap[a.user_id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "User"; });
    setNotifs(rows.map(r => ({ ...r, user_name: acctMap[r.user_id] ?? "User" })));
    setLoading(false);
  }

  const filtered = notifs.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || n.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-white text-2xl font-bold">Notifications Log</h1><p className="text-gray-400 text-sm mt-1">{filtered.length} notifications</p></div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications…" className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-800">{["User","Title","Type","Read","Sent"].map(h => <th key={h} className="text-left text-gray-500 text-xs font-medium px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(n => (
                  <tr key={n.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3 text-gray-300 text-sm">{n.user_name}</td>
                    <td className="px-4 py-3"><div className="text-white text-sm font-medium">{n.title}</div><div className="text-gray-500 text-xs mt-0.5 truncate max-w-[300px]">{n.body}</div></td>
                    <td className="px-4 py-3"><span className="text-[11px] font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{n.type}</span></td>
                    <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${n.read ? "bg-green-900 text-green-400" : "bg-gray-800 text-gray-400"}`}>{n.read ? "Read" : "Unread"}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(n.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
