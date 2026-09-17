'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Copy, Check, Plus, RefreshCw } from "lucide-react";

const DNOUNCE_MOD_CONTRIBUTOR_ID = 'ef0fdd91-38c6-438b-8229-f2efa16bdaa9';
const DNOUNCE_MOD_AUTH_ID = 'b164ea4a-6ced-48dc-9546-cab73967d6b8';

type ClaimCode = {
  id: string;
  record_id: string;
  code: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
  source_url: string | null;
  notes: string | null;
  record?: { category: string; contributor_display_name: string; };
};

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function AdminClaimsPage() {
  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Form state for generating a code for an existing record
  const [recordId, setRecordId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('record_claim_codes')
      .select('*, record:records(category, contributor_display_name)')
      .order('created_at', { ascending: false });
    setCodes(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generateClaimCode() {
    if (!recordId.trim()) { setFormError('Record ID is required.'); return; }
    setGenerating(true);
    setFormError(null);

    // Verify record exists and is a mod record
    const { data: record, error: recErr } = await supabase
      .from('records')
      .select('id, dnounce_mod_record, contributor_claimed')
      .eq('id', recordId.trim())
      .single();

    if (recErr || !record) { setFormError('Record not found.'); setGenerating(false); return; }
    if (!record.dnounce_mod_record) { setFormError('This record is not a DNounce Mod record.'); setGenerating(false); return; }
    if (record.contributor_claimed) { setFormError('This record has already been claimed.'); setGenerating(false); return; }

    const code = generateCode();
    const { error } = await supabase.from('record_claim_codes').insert({
      record_id: recordId.trim(),
      code,
      source_url: sourceUrl.trim() || null,
      notes: notes.trim() || null,
    });

    if (error) { setFormError(error.message); setGenerating(false); return; }

    setGeneratedCode(code);
    setGenerating(false);
    await load();
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributor Claims</h1>
          <p className="text-sm text-gray-500 mt-1">Generate 6-digit claim codes for DNounce Mod records.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setGeneratedCode(null); setFormError(null); setRecordId(''); setSourceUrl(''); setNotes(''); }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> Generate Code
        </button>
      </div>

      {/* DNounce Mod Account Info */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-xs font-semibold text-blue-700 mb-2">DNounce Mod Account</div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-blue-800">
          <div><span className="text-blue-500">Auth ID:</span> {DNOUNCE_MOD_AUTH_ID}</div>
          <div><span className="text-blue-500">Contributor ID:</span> {DNOUNCE_MOD_CONTRIBUTOR_ID}</div>
        </div>
      </div>

      {/* Generate Code Form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Generate Claim Code</h2>
          {formError && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{formError}</div>}

          {generatedCode ? (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
                <div className="text-xs text-green-600 font-medium mb-2">Claim Code Generated</div>
                <div className="text-5xl font-bold font-mono tracking-widest text-green-700 mb-4">{generatedCode}</div>
                <button onClick={() => copyToClipboard(generatedCode, 'generated')}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                  {copied === 'generated' ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                </button>
              </div>
              <div className="text-xs text-gray-500 text-center">Send this code to the original poster along with the record URL. It never expires and can only be used once.</div>
              <button onClick={() => { setGeneratedCode(null); setRecordId(''); setSourceUrl(''); setNotes(''); }}
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Generate Another
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Record ID *</label>
                <input value={recordId} onChange={e => setRecordId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                  placeholder="UUID of the DNounce Mod record" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Source URL</label>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="https://reddit.com/r/nyc/comments/..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="e.g. Reddit post from Aug 2026, user complained about contractor in Brooklyn" />
              </div>
              <button onClick={generateClaimCode} disabled={generating}
                className="inline-flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate 6-Digit Code'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Codes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">No claim codes yet.</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 grid grid-cols-12 text-xs font-medium text-gray-400 uppercase tracking-wide">
            <div className="col-span-2">Code</div>
            <div className="col-span-3">Record</div>
            <div className="col-span-3">Source</div>
            <div className="col-span-2">Notes</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1"></div>
          </div>
          {codes.map(c => (
            <div key={c.id} className="px-6 py-4 border-b border-gray-50 last:border-0 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 font-mono text-lg font-bold text-gray-900 tracking-widest">{c.code}</div>
              <div className="col-span-3 min-w-0">
                <div className="text-xs font-medium text-gray-700 truncate">{c.record?.contributor_display_name ?? '—'}</div>
                <div className="text-[10px] text-gray-400 truncate">{c.record?.category ?? '—'}</div>
                <div className="text-[10px] font-mono text-gray-300 truncate">{c.record_id.slice(0, 8)}…</div>
              </div>
              <div className="col-span-3 min-w-0">
                {c.source_url ? (
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{c.source_url.replace(/^https?:\/\//, '').slice(0, 40)}…</a>
                ) : <span className="text-xs text-gray-300">—</span>}
              </div>
              <div className="col-span-2 text-xs text-gray-500 truncate">{c.notes ?? '—'}</div>
              <div className="col-span-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.used ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-700'}`}>
                  {c.used ? 'Used' : 'Active'}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => copyToClipboard(c.code, c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                  {copied === c.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
