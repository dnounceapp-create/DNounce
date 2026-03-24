"use client";

import { useState } from "react";
import { X, Save, Loader2, Copy, Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = data.map(row =>
    keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(",")
  );
  const blob = new Blob([[keys.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function CSVButton({ data, filename }: { data: Record<string, any>[]; filename: string }) {
  return (
    <button onClick={() => exportToCSV(data, filename)} disabled={!data.length}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/50 text-green-400 hover:bg-green-900 border border-green-800 text-sm font-medium transition disabled:opacity-40">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
      Export CSV
    </button>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function fmtDate(val: any) {
  if (!val) return "—";
  try { return new Date(val).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return String(val); }
}
export function fmtVal(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ─── Status / Cred Badges ─────────────────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  ai_verification: "AI Verification", subject_notified: "Subject Notified",
  published: "Published", deletion_request: "Deletion Request",
  debate: "Debate", voting: "Voting", decision: "Decision",
};
const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-900 text-green-300 border-green-700",
  debate: "bg-orange-900 text-orange-300 border-orange-700",
  voting: "bg-blue-900 text-blue-300 border-blue-700",
  deletion_request: "bg-red-900 text-red-300 border-red-700",
  decision: "bg-purple-900 text-purple-300 border-purple-700",
  subject_notified: "bg-yellow-900 text-yellow-300 border-yellow-700",
  ai_verification: "bg-gray-800 text-gray-300 border-gray-600",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${STATUS_STYLES[status] ?? "bg-gray-800 text-gray-300 border-gray-600"}`}>{STATUS_LABELS[status] ?? status}</span>;
}
export function CredBadge({ cred }: { cred: string }) {
  const s: Record<string, string> = { "Evidence-Based": "bg-emerald-900 text-emerald-300 border-emerald-700", "Opinion-Based": "bg-blue-900 text-blue-300 border-blue-700", "Unclear": "bg-yellow-900 text-yellow-300 border-yellow-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${s[cred] ?? "bg-gray-800 text-gray-300 border-gray-600"}`}>{cred || "Pending"}</span>;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
export function CopyID({ id, short = true }: { id: string; short?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!id) return <span className="text-gray-600 text-[11px]">—</span>;
  return (
    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition font-mono text-[11px]" title={id}>
      {short ? `${id.slice(0, 8)}…` : id}
      {copied ? <Check className="w-3 h-3 text-green-400 shrink-0" /> : <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100" />}
    </button>
  );
}

// ─── Detail Panel Rows ────────────────────────────────────────────────────────
export function DetailRow({ label, value, mono, copyable, highlight }: { label: string; value: any; mono?: boolean; copyable?: boolean; highlight?: string }) {
  const [copied, setCopied] = useState(false);
  const display = fmtVal(value);
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-800/40 last:border-0">
      <span className="text-gray-500 text-xs shrink-0 w-40 mt-0.5 leading-relaxed">{label}</span>
      <div className="flex items-start gap-1.5 flex-1 justify-end min-w-0">
        <span className={`text-right break-all leading-relaxed ${mono ? "font-mono text-[11px] text-gray-400" : "text-xs text-gray-200"} ${display === "—" ? "!text-gray-600" : ""} ${highlight === "green" && display !== "—" ? "text-green-400" : ""} ${highlight === "red" && display !== "—" ? "text-red-400" : ""}`}>{display}</span>
        {copyable && value && (
          <button onClick={() => { navigator.clipboard.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="shrink-0 p-0.5 rounded text-gray-600 hover:text-white transition mt-0.5">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function DetailSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 hover:text-gray-300 transition">
        {title}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="bg-gray-800/40 rounded-xl px-3">{children}</div>}
    </div>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────
export function SidePanel({ title, subtitle, onClose, children, actions }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-full max-w-xl bg-gray-900 border-l border-gray-700 h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <div className="text-white font-semibold text-sm leading-snug">{title}</div>
            {subtitle && <div className="text-gray-500 text-[11px] font-mono mt-0.5 break-all">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white ml-3 mt-0.5 shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {actions && <div className="px-5 py-4 border-t border-gray-800 shrink-0 space-y-3">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Smart Field Types ────────────────────────────────────────────────────────
export type SmartField = {
  key: string;
  label: string;
  section?: string;
  type?: "text" | "textarea" | "select" | "boolean" | "number" | "datetime-local" | "email" | "readonly" | "warning";
  options?: { value: string; label: string }[];
  required?: boolean;
  help?: string;
  validate?: (val: any, form: Record<string, any>) => string | null;
  showIf?: (form: Record<string, any>) => boolean;
};

// ─── Smart Edit Modal — handles ALL modification types ────────────────────────
export function SmartEditModal({
  title, subtitle, data, fields, warning, confirmText, onSave, onClose, danger = false
}: {
  title: string; subtitle?: string; data: Record<string, any>; fields: SmartField[];
  warning?: string; confirmText?: string;
  onSave: (updated: Record<string, any>, note: string) => Promise<void>;
  onClose: () => void; danger?: boolean;
}) {
  const [form, setForm] = useState<Record<string, any>>({ ...data });
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const visibleFields = fields.filter(f => !f.showIf || f.showIf(form));

  // Group by section
  const sections: Record<string, SmartField[]> = {};
  visibleFields.forEach(f => {
    const s = f.section ?? "Details";
    if (!sections[s]) sections[s] = [];
    sections[s].push(f);
  });

  function validate() {
    const errs: string[] = [];
    visibleFields.forEach(f => {
      if (f.type === "readonly" || f.type === "warning") return;
      const val = form[f.key];
      if (f.required && (val === "" || val === null || val === undefined)) errs.push(`${f.label} is required`);
      if (f.validate) { const e = f.validate(val, form); if (e) errs.push(e); }
    });
    if (confirmText && confirm !== confirmText) errs.push(`Type "${confirmText}" to confirm`);
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setSaving(true); setErrors([]);
    try { await onSave(form, note); onClose(); }
    catch (e: any) { setErrors([e?.message || "Failed to save. Check your connection and try again."]); setSaving(false); }
  }

  function set(key: string, val: any) { setForm(p => ({ ...p, [key]: val })); }

  function renderField(f: SmartField) {
    if (f.type === "warning") return (
      <div key={f.key} className="mb-4 flex items-start gap-2 bg-orange-950/40 border border-orange-800/50 rounded-xl p-3 text-sm text-orange-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{f.help}
      </div>
    );
    if (f.type === "readonly") return (
      <div key={f.key} className="mb-4">
        <label className="block text-gray-400 text-xs font-medium mb-1">{f.label}</label>
        <div className="bg-gray-800/50 rounded-xl px-3 py-2.5 text-gray-400 text-sm font-mono break-all select-all">{fmtVal(form[f.key])}</div>
      </div>
    );
    if (f.type === "boolean") return (
      <div key={f.key} className="mb-4">
        <label className="block text-gray-300 text-xs font-medium mb-1">{f.label}{f.required && <span className="text-red-400"> *</span>}</label>
        {f.help && <p className="text-gray-500 text-[11px] mb-1.5 leading-relaxed">{f.help}</p>}
        <div className="flex gap-2">
          {[{ v: true, l: "✓ Yes" }, { v: false, l: "✗ No" }].map(o => (
            <button key={String(o.v)} type="button" onClick={() => set(f.key, o.v)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${form[f.key] === o.v ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>
    );
    if (f.type === "select") return (
      <div key={f.key} className="mb-4">
        <label className="block text-gray-300 text-xs font-medium mb-1">{f.label}{f.required && <span className="text-red-400"> *</span>}</label>
        {f.help && <p className="text-gray-500 text-[11px] mb-1.5 leading-relaxed">{f.help}</p>}
        <select value={form[f.key] ?? ""} onChange={e => set(f.key, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500">
          <option value="">Select…</option>
          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
    if (f.type === "textarea") return (
      <div key={f.key} className="mb-4">
        <label className="block text-gray-300 text-xs font-medium mb-1">{f.label}{f.required && <span className="text-red-400"> *</span>}</label>
        {f.help && <p className="text-gray-500 text-[11px] mb-1.5 leading-relaxed">{f.help}</p>}
        <textarea value={form[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 resize-none" />
      </div>
    );
    return (
      <div key={f.key} className="mb-4">
        <label className="block text-gray-300 text-xs font-medium mb-1">{f.label}{f.required && <span className="text-red-400"> *</span>}</label>
        {f.help && <p className="text-gray-500 text-[11px] mb-1.5 leading-relaxed">{f.help}</p>}
        <input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={e => set(f.key, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <div className="text-white font-semibold text-sm">{title}</div>
            {subtitle && <div className="text-gray-500 text-xs mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white ml-3 mt-0.5 shrink-0"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {warning && (
            <div className="flex items-start gap-2 bg-orange-950/40 border border-orange-800/50 rounded-xl p-3 text-sm text-orange-300 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{warning}
            </div>
          )}
          {Object.entries(sections).map(([sname, sfields]) => (
            <div key={sname}>
              {Object.keys(sections).length > 1 && (
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 mt-3">{sname}</div>
              )}
              {sfields.map(renderField)}
            </div>
          ))}
          <div className="mt-2 mb-4 pt-4 border-t border-gray-800">
            <label className="block text-gray-400 text-xs font-medium mb-1">
              Reason for change <span className="text-gray-600">(saved to audit log — be specific)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="e.g. User reported incorrect location. Verified via their LinkedIn and updated accordingly."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 resize-none" />
          </div>
          {confirmText && (
            <div className="mb-4 bg-red-950/30 border border-red-800/50 rounded-xl p-3">
              <label className="block text-red-300 text-xs font-medium mb-2">
                This action is irreversible. Type <span className="font-mono font-bold bg-red-900 px-1 rounded">{confirmText}</span> to confirm.
              </label>
              <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={confirmText}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500" />
            </div>
          )}
          {errors.length > 0 && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-3 space-y-1">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{e}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-40 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stage Change Modal ───────────────────────────────────────────────────────
const STAGE_CONFIG: Record<string, {
  label: string; desc: string; color: string;
  fields: SmartField[];
}> = {
  ai_verification: {
    label: "Reset to AI Verification", color: "gray",
    desc: "The record will be pulled from public view and sent back to the AI review queue. Credibility label will be cleared.",
    fields: [
      { key: "_warn", type: "warning", label: "", help: "This will make the record private immediately. The subject and contributor will be notified." },
      { key: "note", label: "Reason for reset", type: "textarea", required: true, help: "Be specific — this is logged and visible to all admins." },
    ],
  },
  subject_notified: {
    label: "Mark Subject as Notified", color: "yellow",
    desc: "AI verification is complete. The subject is being notified and the record enters a 7-day review window.",
    fields: [
      { key: "ai_completed_at", label: "AI Completed At", type: "datetime-local", required: true, help: "When did the AI finish reviewing this record?" },
      { key: "credibility", label: "AI Credibility Label", type: "select", required: true, options: [{ value: "Evidence-Based", label: "Evidence-Based" }, { value: "Opinion-Based", label: "Opinion-Based" }, { value: "Unclear", label: "Unclear" }] },
      { key: "note", label: "Reason", type: "textarea", required: true },
    ],
  },
  published: {
    label: "Publish Record", color: "green",
    desc: "The record will be publicly visible on DNounce. This is a major action.",
    fields: [
      { key: "_warn", type: "warning", label: "", help: "Publishing makes this record visible to the entire internet. Ensure AI review is complete and credibility is correct." },
      { key: "credibility", label: "Credibility Label", type: "select", required: true, options: [{ value: "Evidence-Based", label: "Evidence-Based" }, { value: "Opinion-Based", label: "Opinion-Based" }, { value: "Unclear", label: "Unclear" }] },
      { key: "published_at", label: "Publish Date/Time", type: "datetime-local", required: true },
      { key: "note", label: "Reason (if overriding normal flow)", type: "textarea", required: false },
    ],
  },
  deletion_request: {
    label: "Flag as Deletion Request", color: "red",
    desc: "The subject is formally requesting deletion. The record will be locked and prepared for debate.",
    fields: [
      { key: "dispute_started_at", label: "Dispute Started At", type: "datetime-local", required: true },
      { key: "note", label: "Reason / context", type: "textarea", required: true },
    ],
  },
  debate: {
    label: "Open Debate Stage", color: "orange",
    desc: "The structured debate window opens between subject and contributor. Both parties are notified immediately.",
    fields: [
      { key: "debate_started_at", label: "Debate Starts", type: "datetime-local", required: true },
      { key: "debate_ends_at", label: "Debate Ends", type: "datetime-local", required: true, help: "Standard is 72 hours from start date." },
      { key: "note", label: "Notes", type: "textarea", required: false },
    ],
  },
  voting: {
    label: "Open Community Voting", color: "blue",
    desc: "The community voting window opens. Citizens and voters can now vote to keep or delete the record.",
    fields: [
      { key: "voting_started_at", label: "Voting Starts", type: "datetime-local", required: true },
      { key: "voting_ends_at", label: "Voting Ends", type: "datetime-local", required: true, help: "Standard is 48 hours from start date." },
      { key: "note", label: "Notes", type: "textarea", required: false },
    ],
  },
  decision: {
    label: "Record Final Decision", color: "purple",
    desc: "Voting is closed and the final outcome is recorded. This determines whether the record is kept or deleted.",
    fields: [
      { key: "_warn", type: "warning", label: "", help: "This is permanent. Once a decision is recorded, the record enters the execution stage." },
      { key: "final_outcome", label: "Final Outcome", type: "select", required: true, options: [{ value: "keep", label: "✅ Keep — community voted to keep the record" }, { value: "delete", label: "🗑️ Delete — community voted to delete the record" }] },
      { key: "decision_started_at", label: "Decision Made At", type: "datetime-local", required: true },
      { key: "finalized_at", label: "Finalized At", type: "datetime-local", required: true },
      { key: "note", label: "Notes", type: "textarea", required: false },
    ],
  },
};

export function StageChangeModal({ currentStatus, targetStatus, onSave, onClose }: {
  currentStatus: string; targetStatus: string;
  onSave: (data: Record<string, any>, note: string) => Promise<void>; onClose: () => void;
}) {
  const config = STAGE_CONFIG[targetStatus];
  const now = new Date().toISOString().slice(0, 16);
  const plus72 = new Date(Date.now() + 72 * 3600000).toISOString().slice(0, 16);
  const plus48 = new Date(Date.now() + 48 * 3600000).toISOString().slice(0, 16);

  const defaults: Record<string, string> = {
    ai_completed_at: now, published_at: now, dispute_started_at: now,
    debate_started_at: now, debate_ends_at: plus72,
    voting_started_at: now, voting_ends_at: plus48,
    decision_started_at: now, finalized_at: now,
  };

  const initData: Record<string, string> = {};
  config?.fields.forEach(f => { if (defaults[f.key]) initData[f.key] = defaults[f.key]; });

  if (!config) return null;

  return (
    <SmartEditModal
      title={config.label}
      subtitle={
        <span className="flex items-center gap-2">
          <StatusBadge status={currentStatus} />
          <span className="text-gray-500">→</span>
          <StatusBadge status={targetStatus} />
        </span> as any
      }
      data={initData}
      fields={config.fields}
      onSave={onSave}
      onClose={onClose}
    />
  );
}
