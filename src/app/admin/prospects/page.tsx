'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Copy, Check, ExternalLink, Search } from "lucide-react";

/**
 * Admin: pre-built profiles (private until the person claims them).
 * Track calls, add emails, and copy each person's claim link.
 */

type Prospect = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  nickname: string | null;
  phone: string;
  email: string | null;
  neighborhood: string;
  trade: string | null;
  source_url: string | null;
  status: string;
  claim_code: string;
  claimed_subject_id: string | null;
  notes: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  invited: "Link sent",
  claimed: "Claimed",
  declined: "Said no",
  do_not_contact: "Do not contact",
};
const STATUS_COLOR: Record<string, string> = {
  not_contacted: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-800",
  invited: "bg-indigo-100 text-indigo-800",
  claimed: "bg-green-100 text-green-800",
  declined: "bg-amber-100 text-amber-800",
  do_not_contact: "bg-red-100 text-red-800",
};
const SETTABLE = ["not_contacted", "contacted", "invited", "declined", "do_not_contact"];

const fmtPhone = (p: string) => (p.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p);
const claimLink = (code: string) => `https://www.dnounce.com/claim?code=${code}`;

export default function ProspectsPage() {
  const [rows, setRows] = useState<Prospect[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [trade, setTrade] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { email?: string; notes?: string }>>({});

  async function headers() {
    const { data } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
  }

  async function load() {
    const res = await fetch("/api/admin/prospects", { headers: await headers() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || "Couldn't load the list."); setRows([]); return; }
    setRows(json.prospects ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(p: Prospect, change: Record<string, string>) {
    setSaving(p.id);
    setMsg(null);
    const res = await fetch("/api/admin/prospects", {
      method: "PATCH",
      headers: await headers(),
      body: JSON.stringify({ id: p.id, ...change }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) { setMsg(json.error || "Couldn't save."); return; }
    setRows((rs) => (rs ?? []).map((r) => (r.id === p.id ? { ...r, ...json.prospect } : r)));
    setDrafts((d) => { const n = { ...d }; delete n[p.id]; return n; });
  }

  async function copy(p: Prospect) {
    try {
      await navigator.clipboard.writeText(claimLink(p.claim_code));
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setMsg(`Copy this link: ${claimLink(p.claim_code)}`);
    }
  }

  const trades = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.trade || "Contractor"))).sort(), [rows]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, "");
    return (rows ?? []).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (trade !== "all" && (r.trade || "Contractor") !== trade) return false;
      if (!s) return true;
      const hay = `${r.first_name} ${r.last_name} ${r.company_name ?? ""} ${r.nickname ?? ""} ${r.neighborhood} ${r.email ?? ""}`.toLowerCase();
      return hay.includes(s) || (digits.length >= 3 && r.phone.includes(digits));
    });
  }, [rows, q, status, trade]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Prospects</h1>
        <p className="text-sm text-gray-400">
          Pre-built profiles. Nobody can see them until the person claims theirs with their link.
        </p>
      </div>

      {rows && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-900">{rows.length} total</span>
          {Object.keys(STATUS_LABEL).map((k) => (
            <span key={k} className={`rounded-full px-3 py-1 font-medium ${STATUS_COLOR[k]}`}>
              {STATUS_LABEL[k]}: {counts[k] ?? 0}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, neighborhood, phone…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
          <option value="all">All statuses</option>
          {Object.keys(STATUS_LABEL).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        <select value={trade} onChange={(e) => setTrade(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
          <option value="all">All trades</option>
          {trades.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {msg && <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 break-all">{msg}</div>}

      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-400">Nobody matches.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Showing {shown.length}</p>
          {shown.map((p) => {
            const d = drafts[p.id] ?? {};
            const claimed = p.status === "claimed";
            return (
              <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">
                      {p.first_name} {p.last_name}
                      {p.nickname && <span className="font-normal text-gray-500"> “{p.nickname}”</span>}
                    </div>
                    <div className="text-gray-600">
                      {[p.company_name, p.trade || "Contractor", p.neighborhood].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                      <a href={`tel:${p.phone}`} className="font-medium text-blue-700">{fmtPhone(p.phone)}</a>
                      {p.email && <a href={`mailto:${p.email}`} className="text-blue-700 break-all">{p.email}</a>}
                      {p.source_url && (
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700">
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-800">Code {p.claim_code}</span>
                  <button onClick={() => copy(p)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    {copied === p.id ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy claim link</>}
                  </button>
                  {!claimed && (
                    <select
                      value={p.status}
                      disabled={saving === p.id}
                      onChange={(e) => save(p, { status: e.target.value })}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                    >
                      {SETTABLE.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                    </select>
                  )}
                  {saving === p.id && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </div>

                {!claimed && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      value={d.email ?? p.email ?? ""}
                      onChange={(e) => setDrafts((x) => ({ ...x, [p.id]: { ...d, email: e.target.value } }))}
                      placeholder="Email"
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900"
                    />
                    <input
                      value={d.notes ?? p.notes ?? ""}
                      onChange={(e) => setDrafts((x) => ({ ...x, [p.id]: { ...d, notes: e.target.value } }))}
                      placeholder="Notes (e.g. call back Tuesday)"
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900"
                    />
                    <button
                      disabled={!drafts[p.id] || saving === p.id}
                      onClick={() => save(p, { ...(d.email !== undefined ? { email: d.email } : {}), ...(d.notes !== undefined ? { notes: d.notes } : {}) })}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
