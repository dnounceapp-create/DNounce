"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, FileText, Users, Ticket, Award, Bell, MessageSquare, ThumbsUp } from "lucide-react";
import Link from "next/link";

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  meta?: string;
};

const TYPE_ICONS: Record<string, any> = {
  record: FileText, user: Users, ticket: Ticket, badge: Award,
  notification: Bell, statement: MessageSquare, reaction: ThumbsUp,
};

const TYPE_COLORS: Record<string, string> = {
  record: "text-blue-400 bg-blue-950/50",
  user: "text-green-400 bg-green-950/50",
  ticket: "text-purple-400 bg-purple-950/50",
  badge: "text-teal-400 bg-teal-950/50",
  notification: "text-yellow-400 bg-yellow-950/50",
  statement: "text-orange-400 bg-orange-950/50",
  reaction: "text-pink-400 bg-pink-950/50",
};

export default function AdminSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    const [
      records, users, accts, tickets, badges, notifications, statements, votes,
    ] = await Promise.all([
      supabase.from("records").select("id, status, category, credibility, subject:subjects(name)").or(`id.ilike.%${q}%,category.ilike.%${q}%`).limit(10),
      supabase.from("users").select("id, auth_user_id, is_banned, created_at").limit(5),
      supabase.from("user_accountdetails").select("user_id, first_name, last_name").or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`).limit(10),
      supabase.from("support_tickets").select("id, topic, type, status, message").or(`topic.ilike.%${q}%,message.ilike.%${q}%`).limit(10),
      supabase.from("badges").select("id, user_id, label").ilike("label", `%${q}%`).limit(10),
      supabase.from("notifications").select("id, user_id, title, body, type").or(`title.ilike.%${q}%,body.ilike.%${q}%`).limit(10),
      supabase.from("record_community_statements").select("id, record_id, author_alias, body").ilike("body", `%${q}%`).limit(10),
      supabase.from("record_votes").select("id, record_id, user_id, choice, explanation").ilike("explanation", `%${q}%`).limit(10),
    ]);

    // Records
    (records.data ?? []).forEach((r: any) => {
      results.push({
        type: "record", id: r.id,
        title: (r.subject as any)?.name ?? "Unknown Subject",
        subtitle: `${r.category ?? "—"} • ${r.status}`,
        meta: r.credibility,
        href: `/admin/records?id=${r.id}`,
      });
    });

    // Users (match by name)
    const acctMap: Record<string, any> = {};
    (accts.data ?? []).forEach((a: any) => { acctMap[a.user_id] = a; });
    (users.data ?? []).forEach((u: any) => {
      const acct = acctMap[u.auth_user_id];
      if (!acct) return;
      const name = `${acct.first_name ?? ""} ${acct.last_name ?? ""}`.trim();
      if (!name.toLowerCase().includes(q)) return;
      results.push({
        type: "user", id: u.auth_user_id,
        title: name || "User",
        subtitle: u.is_banned ? "Banned" : "Active",
        meta: `Joined ${new Date(u.created_at).toLocaleDateString()}`,
        href: `/admin/users?id=${u.auth_user_id}`,
      });
    });

    // Tickets
    (tickets.data ?? []).forEach((t: any) => {
      results.push({
        type: "ticket", id: t.id,
        title: t.topic,
        subtitle: `${t.type} • ${t.status}`,
        href: `/admin/tickets?id=${t.id}`,
      });
    });

    // Badges
    (badges.data ?? []).forEach((b: any) => {
      results.push({
        type: "badge", id: b.id,
        title: b.label,
        subtitle: `User ${b.user_id.slice(0, 8)}…`,
        href: `/admin/badges`,
      });
    });

    // Notifications
    (notifications.data ?? []).forEach((n: any) => {
      results.push({
        type: "notification", id: n.id,
        title: n.title,
        subtitle: n.type,
        meta: n.body?.slice(0, 60) + "…",
        href: `/admin/notifications`,
      });
    });

    // Community statements
    (statements.data ?? []).forEach((s: any) => {
      results.push({
        type: "statement", id: String(s.id),
        title: s.author_alias ?? "Anonymous",
        subtitle: s.body?.slice(0, 80) + "…",
        href: `/record/${s.record_id}`,
      });
    });

    // Votes
    (votes.data ?? []).forEach((v: any) => {
      results.push({
        type: "reaction", id: String(v.id),
        title: `Vote: ${v.choice?.toUpperCase()}`,
        subtitle: v.explanation?.slice(0, 80) + "…",
        href: `/record/${v.record_id}`,
      });
    });

    setResults(results);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Global Search</h1>
        <p className="text-gray-400 text-sm mt-1">Search across records, users, tickets, badges, notifications, statements and votes</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Search everything… (press Enter)"
            className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
          />
        </div>
        <button onClick={search} disabled={loading || !query.trim()}
          className="px-6 py-3 rounded-2xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 disabled:opacity-50 transition">
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {searched && (
        <div>
          <div className="text-gray-400 text-sm mb-4">{results.length} results for "{query}"</div>

          {results.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500 text-sm">
              No results found.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r, i) => {
                const Icon = TYPE_ICONS[r.type] ?? FileText;
                const colorClass = TYPE_COLORS[r.type] ?? "text-gray-400 bg-gray-800";
                const content = (
                  <div className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 hover:border-gray-600 transition">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{r.title}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colorClass}`}>{r.type}</span>
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">{r.subtitle}</div>
                      {r.meta && <div className="text-gray-500 text-xs mt-0.5">{r.meta}</div>}
                    </div>
                    <div className="text-gray-600 text-xs font-mono shrink-0">{r.id.slice(0, 8)}…</div>
                  </div>
                );
                return r.href ? (
                  <Link key={i} href={r.href}>{content}</Link>
                ) : (
                  <div key={i}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
