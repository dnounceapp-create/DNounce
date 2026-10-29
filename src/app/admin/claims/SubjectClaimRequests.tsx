"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

/** Profile claim requests waiting for an admin (manual requests and phone matches at sign-up). */
export default function SubjectClaimRequests() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
  }

  async function load() {
    const res = await fetch("/api/admin/subject-claims", { headers: await authHeaders() });
    const json = await res.json().catch(() => ({}));
    setRows(res.ok ? json.claims ?? [] : []);
    if (!res.ok) setMsg(json.error || "Couldn't load claim requests.");
  }

  useEffect(() => { load(); }, []);

  async function act(c: any, action: "approve" | "reject") {
    const key = `${c.subject_uuid}:${c.claimant_auth_user_id}`;
    setBusy(key);
    setMsg(null);
    const res = await fetch("/api/admin/subject-claims", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ subject_uuid: c.subject_uuid, claimant_auth_user_id: c.claimant_auth_user_id, action, reason: reasons[key] }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg(res.ok ? (action === "approve" ? "Approved — the profile is now theirs." : "Rejected — they've been told why.") : json.error || "Something went wrong.");
    await load();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Profile claim requests (subjects)</h2>
        <span className="text-xs text-gray-500">{rows ? `${rows.length} waiting` : ""}</span>
      </div>
      {msg && <div className="mb-3 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">{msg}</div>}
      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No requests waiting.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const key = `${c.subject_uuid}:${c.claimant_auth_user_id}`;
            return (
              <div key={key} className="rounded-xl border border-gray-200 p-4 text-sm">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">Subject profile</div>
                    <div className="font-semibold text-gray-900">{c.subject?.name ?? "—"}</div>
                    <div className="text-xs text-gray-600">{c.subject?.location ?? ""}</div>
                    <div className="text-xs text-gray-600">On file: {c.subject?.email || "no email"} · {c.subject?.phone || "no phone"}</div>
                    {c.subject?.owner_auth_user_id && <div className="text-xs text-red-600">Already owned by someone</div>}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">Requested by</div>
                    <div className="font-semibold text-gray-900">{c.claimant?.name ?? "—"}</div>
                    <div className="text-xs text-gray-600">{c.claimant?.email ?? "—"} {c.claimant?.email_confirmed ? "(confirmed)" : "(not confirmed)"}</div>
                    <div className="text-xs text-gray-600">Phone typed: {c.claimant?.phone || "—"}</div>
                  </div>
                </div>
                {c.note && <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">{c.note}</div>}
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    value={reasons[key] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [key]: e.target.value }))}
                    placeholder="Reason if rejecting (sent to them)"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button disabled={busy === key} onClick={() => act(c, "approve")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">Approve</button>
                  <button disabled={busy === key} onClick={() => act(c, "reject")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
