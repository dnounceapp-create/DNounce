"use client";

import { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV Export Button ────────────────────────────────────────────────────────
export function CSVButton({ data, filename }: { data: Record<string, any>[]; filename: string }) {
  return (
    <button
      onClick={() => exportToCSV(data, filename)}
      disabled={!data.length}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/50 text-green-400 hover:bg-green-900 border border-green-800 text-sm font-medium transition disabled:opacity-40"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      Export CSV
    </button>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
type EditField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "boolean" | "number";
  options?: string[];
  readOnly?: boolean;
};

type EditModalProps = {
  title: string;
  data: Record<string, any>;
  fields: EditField[];
  onSave: (updated: Record<string, any>) => Promise<void>;
  onClose: () => void;
};

export function EditModal({ title, data, fields, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState<Record<string, any>>({ ...data });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function set(key: string, val: any) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <span className="text-white font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-gray-400 text-xs font-medium mb-1">{f.label}</label>
              {f.readOnly ? (
                <div className="bg-gray-800 rounded-xl px-3 py-2 text-gray-400 text-sm font-mono break-all">{String(form[f.key] ?? "—")}</div>
              ) : f.type === "boolean" ? (
                <select value={String(form[f.key])} onChange={e => set(f.key, e.target.value === "true")}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
                  <option value="true">Yes / True</option>
                  <option value="false">No / False</option>
                </select>
              ) : f.type === "select" ? (
                <select value={form[f.key] ?? ""} onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500">
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={form[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500 resize-none" />
              ) : f.type === "number" ? (
                <input type="number" value={form[f.key] ?? ""} onChange={e => set(f.key, Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500" />
              ) : (
                <input type="text" value={form[f.key] ?? ""} onChange={e => set(f.key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500" />
              )}
            </div>
          ))}
          {error && <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-xl px-3 py-2">{error}</div>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-sm transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold transition disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timestamp formatter ──────────────────────────────────────────────────────
export function fmtDate(val: any) {
  if (!val) return "—";
  try { return new Date(val).toLocaleString(); } catch { return String(val); }
}

// ─── Null display ─────────────────────────────────────────────────────────────
export function fmtVal(val: any) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ─── Table cell ───────────────────────────────────────────────────────────────
export function Cell({ val, mono, dim, truncate = true }: { val: any; mono?: boolean; dim?: boolean; truncate?: boolean }) {
  const display = fmtVal(val);
  return (
    <span className={[
      truncate ? "max-w-[160px] truncate block" : "",
      mono ? "font-mono text-[11px]" : "text-sm",
      dim ? "text-gray-500" : "text-gray-200",
    ].join(" ")} title={display}>
      {display}
    </span>
  );
}
