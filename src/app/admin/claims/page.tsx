'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Copy, Check, Plus, X } from "lucide-react";

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
  record?: { category: string; contributor_display_name: string; subjects?: { name: string } | null };
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

  // Contributor (claimer) info
  const [cFirstName, setCFirstName] = useState('');
  const [cLastName, setCLastName] = useState('');
  const [cJobTitle, setCJobTitle] = useState('');
  const [cLocation, setCLocation] = useState('');

  // Subject info
  const [sFirstName, setSFirstName] = useState('');
  const [sLastName, setSLastName] = useState('');
  const [sNickname, setSNickname] = useState('');
  const [sOrganization, setSOrganization] = useState('');
  const [sRelationship, setSRelationship] = useState('');
  const [sCategory, setSCategory] = useState('');
  const [sLocation, setSLocation] = useState('');

  // Subject contact
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');

  // Record info
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');

  // Evidence
  const [files, setFiles] = useState<File[]>([]);

  // Source & notes
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Result
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedRecordId, setGeneratedRecordId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('record_claim_codes')
      .select('*, record:records(category, contributor_display_name, subjects(name))')
      .order('created_at', { ascending: false });
    setCodes(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function generateRecord() {
    setGenerating(true);
    setFormError(null);

    // Check for duplicate source URL if one was provided
    if (sourceUrl.trim()) {
      const { data: existing } = await supabase
        .from('record_claim_codes')
        .select('id')
        .eq('source_url', sourceUrl.trim())
        .maybeSingle();
      if (existing) {
        setFormError('A record already exists for this source URL.');
        setGenerating(false);
        return;
      }
    }

    // Create subject
    const subjectName = `${sFirstName.trim()} ${sLastName.trim()}`.trim();
    const { data: subject, error: subjectErr } = await supabase
      .from('subjects')
      .insert({
        name: subjectName,
        nickname: sNickname.trim() || null,
        organization: sOrganization.trim() || null,
        location: sLocation.trim() || null,
      })
      .select('subject_uuid')
      .single();
    if (subjectErr || !subject) { setFormError('Failed to create subject: ' + subjectErr?.message); setGenerating(false); return; }

    // Create record under DNounce Mod
    const { data: record, error: recordErr } = await supabase
      .from('records')
      .insert({
        subject_id: subject.subject_uuid,
        contributor_id: DNOUNCE_MOD_CONTRIBUTOR_ID,
        created_by: DNOUNCE_MOD_AUTH_ID,
        record_type: 'evidence',
        is_published: true,
        relationship: sRelationship.trim() || 'Client',
        location: sLocation.trim() || null,
        category: sCategory.trim(),
        rating,
        description: description.trim(),
        submitted_at: new Date().toISOString(),
        agree_terms: true,
        status: 'voting',
        anonymity_status: 'Anonymity Granted',
        published_at: new Date().toISOString(),
        contributor_identity_preference: true,
        contributor_display_name: 'DNounce Community',
        voting_started_at: new Date().toISOString(),
        voting_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dnounce_mod_record: true,
        contributor_claimed: false,
      })
      .select('id')
      .single();
    if (recordErr || !record) { setFormError('Failed to create record: ' + recordErr?.message); setGenerating(false); return; }

    // Upload attachments
    for (const file of files) {
      const path = `${record.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file);
      if (!uploadErr) {
        await supabase.from('record_attachments').insert({
          record_id: record.id,
          path,
          mime_type: file.type,
          size_bytes: file.size,
          label: file.name,
        });
      }
    }

    // Generate claim code
    const code = generateCode();
    const { error: codeErr } = await supabase.from('record_claim_codes').insert({
      record_id: record.id,
      code,
      source_url: sourceUrl.trim(),
      notes: notes.trim() || null,
      subject_phone: sPhone.trim() || null,
      subject_email: sEmail.trim() || null,
    });
    if (codeErr) { setFormError('Record created but failed to generate code: ' + codeErr.message); setGenerating(false); return; }

    setGeneratedCode(code);
    setGeneratedRecordId(record.id);
    setGenerating(false);
    await load();
  }

  async function deleteCode(id: string, recordId: string) {
    if (!confirm('Delete this claim code and its record permanently?')) return;
    const res = await fetch('/api/admin/delete-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeId: id, recordId }),
    });
    if (res.ok) await load();
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function resetForm() {
    setGeneratedCode(null); setGeneratedRecordId(null);
    setCFirstName(''); setCLastName(''); setCJobTitle(''); setCLocation('');
    setSFirstName(''); setSLastName(''); setSNickname(''); setSOrganization('');
    setSRelationship(''); setSCategory(''); setSLocation('');
    setSPhone(''); setSEmail('');
    setRating(0); setDescription(''); setFiles([]); setSourceUrl(''); setNotes('');
    setFormError(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributor Claims</h1>
          <p className="text-sm text-gray-500 mt-1">Generate 6-digit claim codes for DNounce Mod records.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> Generate Record
        </button>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-xs font-semibold text-blue-700 mb-2">DNounce Mod Account</div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-blue-800">
          <div><span className="text-blue-500">Auth ID:</span> {DNOUNCE_MOD_AUTH_ID}</div>
          <div><span className="text-blue-500">Contributor ID:</span> {DNOUNCE_MOD_CONTRIBUTOR_ID}</div>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Generate Record</h2>
          {formError && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{formError}</div>}

          {generatedCode && generatedRecordId ? (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
                <div className="text-xs text-green-600 font-medium mb-1">Record Created · Claim Code Generated</div>
                <div className="text-5xl font-bold font-mono tracking-widest text-green-700 mb-3">{generatedCode}</div>
                <div className="text-xs text-gray-500 mb-4 font-mono">dnounce.com/record/{generatedRecordId.slice(0, 8)}…</div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => copyToClipboard(generatedCode, 'code')}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {copied === 'code' ? <><Check className="w-4 h-4" /> Copied Code</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                  </button>
                  <button onClick={() => copyToClipboard(`https://www.dnounce.com/record/${generatedRecordId}`, 'link')}
                    className="inline-flex items-center gap-2 bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {copied === 'link' ? <><Check className="w-4 h-4" /> Copied Link</> : <><Copy className="w-4 h-4" /> Copy Record Link</>}
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">Send the code + record link to the original poster. The code never expires and can only be used once.</div>
              <button onClick={resetForm}
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Generate Another
              </button>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Source & Notes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</h3>
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
                    placeholder="e.g. Reddit post Aug 2026, contractor dispute Brooklyn" />
                </div>
              </div>

              {/* Contributor (claimer) info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Claimer Info (optional — pre-fills claim page)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                    <input value={cFirstName} onChange={e => setCFirstName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Jane" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                    <input value={cLastName} onChange={e => setCLastName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Doe" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Job Title</label>
                    <input value={cJobTitle} onChange={e => setCJobTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Nurse" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                    <input value={cLocation} onChange={e => setCLocation(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Brooklyn, NY" />
                  </div>
                </div>
              </div>

              {/* Subject info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject's Basic Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                    <input value={sFirstName} onChange={e => setSFirstName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="John" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                    <input value={sLastName} onChange={e => setSLastName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Doe" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Also Known As</label>
                    <input value={sNickname} onChange={e => setSNickname(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Johnny" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Organization</label>
                    <input value={sOrganization} onChange={e => setSOrganization(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Acme Inc." />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Relationship</label>
                    <input value={sRelationship} onChange={e => setSRelationship(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Client, Tenant..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                    <input value={sCategory} onChange={e => setSCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Contractor, Barber..." />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                    <input value={sLocation} onChange={e => setSLocation(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Brooklyn, NY" />
                  </div>
                </div>
              </div>

              {/* Subject Contact Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject Contact Info (optional)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
                    <input value={sPhone} onChange={e => setSPhone(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="(718) 555-1234" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Email Address</label>
                    <input value={sEmail} onChange={e => setSEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="john@example.com" />
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rating</h3>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${rating >= n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Experience Details</h3>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Paste the original complaint here..." />
              </div>

              {/* Evidence Upload */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evidence (optional)</h3>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => document.getElementById('admin-file-input')?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                >
                  <input id="admin-file-input" type="file" multiple className="hidden"
                    onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
                  <p className="text-xs text-gray-400">Drag & drop or click to upload</p>
                  <p className="text-[10px] text-gray-300 mt-1">PDF, JPG, PNG, MP4, DOCX — max 100MB each</p>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <span className="text-xs text-gray-700 truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-2 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={generateRecord} disabled={generating}
                className="inline-flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Record'}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">No claim codes yet.</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Record</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Link</th>
                <th className="px-4 py-3 text-left font-medium"></th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900 tracking-widest whitespace-nowrap">{c.code}</td>
                  <td className="px-4 py-3 min-w-0 max-w-[160px]">
                    <div className="text-xs font-medium text-gray-700 truncate">{c.record?.contributor_display_name ?? '—'}</div>
                    <div className="text-[10px] text-gray-400 truncate">{c.record?.category ?? '—'}</div>
                    <a href={`/record/${c.record_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">{c.record_id.slice(0, 8)}…</a>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    {c.source_url ? (
                      <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">{c.source_url.replace(/^https?:\/\//, '').slice(0, 30)}…</a>
                    ) : <span className="text-[10px] text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-[10px] text-gray-500 leading-relaxed">
                      {[c.record?.contributor_display_name, (c.record?.subjects as any)?.name].filter(Boolean).join(' • ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.used ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-700'}`}>
                      {c.used ? 'Used' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap">dnounce.com/record/{c.record_id.slice(0, 8)}…</span>
                      <button onClick={() => copyToClipboard(`https://www.dnounce.com/record/${c.record_id}`, c.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition text-gray-600 text-[10px] font-medium w-fit">
                        {copied === c.id ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteCode(c.id, c.record_id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
