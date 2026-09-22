'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Copy, Check, Plus, X, MapPin, User } from "lucide-react";

const DNOUNCE_MOD_CONTRIBUTOR_ID = 'ef0fdd91-38c6-438b-8229-f2efa16bdaa9';
const DNOUNCE_MOD_AUTH_ID = 'b164ea4a-6ced-48dc-9546-cab73967d6b8';

type UserPreview = {
  kind: "user";
  user_id: string;
  subject_uuid: string;
  name: string;
  nickname?: string | null;
  organization?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
};
type ExternalSubjectPreview = {
  kind: "external";
  id: string;
  name: string;
  nickname?: string | null;
  organization?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
};
type PersonPreview = UserPreview | ExternalSubjectPreview;

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const len = digits.length;
  if (len === 0) return '';
  if (len < 4) return digits;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const RELATIONSHIP_OPTIONS = [
  'Client', 'Former Client', 'Tenant', 'Former Tenant', 'Employee',
  'Former Employee', 'Customer', 'Patient', 'Student', 'Other'
];

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

export default function AdminClaimsPage() {
  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedRecordId, setGeneratedRecordId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [cFirstName, setCFirstName] = useState('');
  const [cLastName, setCLastName] = useState('');
  const [cJobTitle, setCJobTitle] = useState('');
  const [cLocation, setCLocation] = useState('');
  const [sFirstName, setSFirstName] = useState('');
  const [sLastName, setSLastName] = useState('');
  const [sNickname, setSNickname] = useState('');
  const [sOrganization, setSOrganization] = useState('');
  const [sRelationship, setSRelationship] = useState('');
  const [sCategory, setSCategory] = useState('');
  const [sLocation, setSLocation] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  // Subject search
  const [selectedPerson, setSelectedPerson] = useState<PersonPreview | null>(null);
  const [userResults, setUserResults] = useState<UserPreview[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalSubjectPreview[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoSearched, setAutoSearched] = useState(false);
  // Location suggestions
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [cLocationSuggestions, setCLocationSuggestions] = useState<any[]>([]);

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

  function resetForm() {
    setGeneratedCode(null); setGeneratedRecordId(null);
    setSourceUrl(''); setNotes('');
    setCFirstName(''); setCLastName(''); setCJobTitle(''); setCLocation('');
    setSFirstName(''); setSLastName(''); setSNickname(''); setSOrganization('');
    setSRelationship(''); setSCategory(''); setSLocation('');
    setSPhone(''); setSEmail('');
    setRating(0); setDescription(''); setFiles([]);
    setSelectedPerson(null);
    setUserResults([]);
    setExternalResults([]);
    setLocationSuggestions([]);
    setCLocationSuggestions([]);
    setFormError(null);
  }

  const phoneDigits = sPhone.replace(/\D/g, '');
  const emailNorm = sEmail.trim().toLowerCase();
  const hasPhoneOrEmail = phoneDigits.length > 0 || emailNorm.length > 0;
  const isTempExternal = selectedPerson?.kind === 'external' && selectedPerson.id.startsWith('temp-');
  const isAnyNonTempSelected = !!selectedPerson && !isTempExternal;

  useEffect(() => {
    if (isAnyNonTempSelected) return;
    if (!hasPhoneOrEmail) {
      setAutoSearched(false);
      setAutoLoading(false);
      setUserResults([]);
      setExternalResults([]);
      return;
    }
    setAutoLoading(true);
    setAutoSearched(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/subjects/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: sPhone, email: sEmail }),
        });
        const json = await res.json().catch(() => ({}));
        setUserResults(Array.isArray(json.users) ? json.users : []);
        setExternalResults(Array.isArray(json.externals) ? json.externals : []);
      } catch {
        setUserResults([]);
        setExternalResults([]);
      } finally {
        setAutoLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [sPhone, sEmail, hasPhoneOrEmail, isAnyNonTempSelected]);

  useEffect(() => {
    const q = sLocation.trim();
    if (!q) { setLocationSuggestions([]); return; }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(q)}`);
        if (!res.ok) { setLocationSuggestions([]); return; }
        const data = await res.json().catch(() => ({}));
        setLocationSuggestions(data?.predictions || []);
      } catch { setLocationSuggestions([]); }
    }, 100);
    return () => clearTimeout(id);
  }, [sLocation]);

  useEffect(() => {
    const q = cLocation.trim();
    if (!q) { setCLocationSuggestions([]); return; }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(q)}`);
        if (!res.ok) { setCLocationSuggestions([]); return; }
        const data = await res.json().catch(() => ({}));
        setCLocationSuggestions(data?.predictions || []);
      } catch { setCLocationSuggestions([]); }
    }, 100);
    return () => clearTimeout(id);
  }, [cLocation]);

  async function generateRecord() {
    if (!sFirstName.trim()) { setFormError('Subject first name is required.'); return; }
    if (!sCategory.trim()) { setFormError('Category is required.'); return; }
    if (!description.trim()) { setFormError('Experience description is required.'); return; }
    if (!sourceUrl.trim()) { setFormError('Source URL is required.'); return; }
    setGenerating(true);
    setFormError(null);
    // Check if subject phone/email already exists in user_accountdetails
    if (sPhone.replace(/\D/g, '') || sEmail.trim()) {
      const res = await fetch(`/api/admin/search-subjects?q=${encodeURIComponent(sPhone.replace(/\D/g, '') || sEmail.trim())}`);
      const data = await res.json();
      if ((data.users ?? []).length > 0) {
        const match = data.users[0];
        setFormError(`This contact info is already linked to a DNounce account: ${match.name}. Search for them above and select them instead of creating a new subject.`);
        setGenerating(false);
        return;
      }
    }
    const res = await fetch('/api/admin/generate-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceUrl, notes,
        cFirstName, cLastName, cJobTitle, cLocation,
        selectedSubjectId: selectedPerson ? (selectedPerson.kind === 'user' ? selectedPerson.subject_uuid : selectedPerson.id) : null,
        sFirstName, sLastName, sNickname, sOrganization,
        sRelationship, sCategory, sLocation, sPhone, sEmail,
        rating, description,
      }),
    });
    const result = await res.json();
    if (!res.ok) { setFormError(result.error); setGenerating(false); return; }
    // Upload evidence files BEFORE state changes to prevent unmount
    if (files.length > 0 && result.recordId) {
      const formData = new FormData();
      formData.append('recordId', result.recordId);
      files.forEach(f => formData.append('files', f));
      try {
        const uploadRes = await fetch('/api/admin/upload-attachments', {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadRes.json();
        console.log('📎 upload response:', uploadRes.status, uploadResult);
      } catch (uploadErr) {
        console.error('📎 upload error:', uploadErr);
      }
    }
    setGeneratedCode(result.code);
    setGeneratedRecordId(result.recordId);
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contributor Claims</h1>
          <p className="text-sm text-gray-500 mt-1">Generate records and claim codes for outreach campaigns.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); resetForm(); }} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
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
                  <button onClick={() => copyToClipboard(generatedCode, 'code')} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {copied === 'code' ? <><Check className="w-4 h-4" /> Copied Code</> : <><Copy className="w-4 h-4" /> Copy Code</>}
                  </button>
                  <button onClick={() => copyToClipboard(`https://www.dnounce.com/record/${generatedRecordId}`, 'link')} className="inline-flex items-center gap-2 bg-white border border-green-300 text-green-700 hover:bg-green-50 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {copied === 'link' ? <><Check className="w-4 h-4" /> Copied Link</> : <><Copy className="w-4 h-4" /> Copy Record Link</>}
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">Send the code + record link to the original poster. The code never expires and can only be used once.</div>
              <button onClick={resetForm} className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Generate Another</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</h3>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Source URL *</label><input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="https://reddit.com/r/nyc/comments/..." /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="e.g. Reddit post Aug 2026, contractor dispute Brooklyn" /></div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Claimer Info (optional)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label><input value={cFirstName} onChange={e => setCFirstName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Jane" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label><input value={cLastName} onChange={e => setCLastName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Doe" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Job Title</label><input value={cJobTitle} onChange={e => setCJobTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Nurse" /></div>
                  <div className="relative">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                    <input value={cLocation} onChange={e => setCLocation(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Brooklyn, NY" />
                    {cLocationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {cLocationSuggestions.map((s: any) => (
                          <div key={s.place_id} onClick={() => { setCLocation(s.description); setCLocationSuggestions([]); }} className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />{s.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Subject Basic Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject's Basic Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">First Name *</label><input value={sFirstName} onChange={e => setSFirstName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="John" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label><input value={sLastName} onChange={e => setSLastName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Doe" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Also Known As</label><input value={sNickname} onChange={e => setSNickname(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Johnny" /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Organization</label><input value={sOrganization} onChange={e => setSOrganization(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Acme Inc." /></div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Relationship</label>
                    <select value={sRelationship} onChange={e => setSRelationship(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white">
                      <option value="">Select...</option>
                      {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">Category *</label><input value={sCategory} onChange={e => setSCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Contractor, Barber..." /></div>
                  <div className="col-span-2 relative">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                    <input value={sLocation} onChange={e => setSLocation(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Brooklyn, NY" />
                    {locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {locationSuggestions.map((s: any) => (
                          <div key={s.place_id} onClick={() => { setSLocation(s.description); setLocationSuggestions([]); }} className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {s.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject Contact Info (optional)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
                    <input value={sPhone} onChange={e => setSPhone(formatPhoneNumber(e.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="(718) 555-1234" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Email Address</label>
                    <input value={sEmail} onChange={e => setSEmail(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="john@example.com" />
                  </div>
                </div>
                {/* Auto-search results */}
                {autoLoading && <div className="text-xs text-gray-400 mt-2">Searching...</div>}
                {autoSearched && !autoLoading && [...userResults, ...externalResults].length > 0 && !selectedPerson && (
                  <div className="mt-2 space-y-2">
                    {[...userResults, ...externalResults].map(p => {
                      const key = p.kind === 'user' ? p.subject_uuid : p.id;
                      return (
                        <div key={key} onClick={() => {
                          setSelectedPerson(p);
                          const parts = p.name.split(' ');
                          setSFirstName(parts[0] || '');
                          setSLastName(parts.slice(1).join(' ') || '');
                          setSNickname(p.nickname || '');
                          setSOrganization(p.organization || '');
                          setSLocation(p.location || '');
                        }} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900">{p.name}</div>
                            <div className="text-[10px] text-gray-400">{p.organization || 'Independent'}{p.location ? ` · ${p.location}` : ''}</div>
                            {p.kind === 'user' && <div className="text-[10px] text-blue-500">DNounce user</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedPerson && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{selectedPerson.name}</div>
                      <div className="text-[10px] text-gray-400">{selectedPerson.organization}{selectedPerson.location ? ` · ${selectedPerson.location}` : ''}</div>
                    </div>
                    <button type="button" onClick={() => { setSelectedPerson(null); setAutoSearched(false); }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rating</h3>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${rating >= n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Experience Details *</h3>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="Paste the original complaint here..." />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Evidence (optional)</h3>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition" onClick={() => document.getElementById('admin-file-input')?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}>
                  <input id="admin-file-input" type="file" multiple className="hidden" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
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
              <button onClick={generateRecord} disabled={generating} className="inline-flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50">
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
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900 tracking-widest whitespace-nowrap">{c.code}</td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <div className="text-xs font-medium text-gray-700 truncate">{c.record?.contributor_display_name ?? '—'}</div>
                    <div className="text-[10px] text-gray-400 truncate">{c.record?.category ?? '—'}</div>
                    <a href={`/record/${c.record_id}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">{c.record_id.slice(0, 8)}…</a>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    {c.source_url ? <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate block">{c.source_url.replace(/^https?:\/\//, '').slice(0, 30)}…</a> : <span className="text-[10px] text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[140px]"><span className="text-[10px] text-gray-500 truncate block">{c.notes ?? '—'}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.used ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-700'}`}>{c.used ? 'Used' : 'Active'}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => copyToClipboard(`https://www.dnounce.com/record/${c.record_id}`, c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 inline-flex">
                      {copied === c.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteCode(c.id, c.record_id)} className="p-1.5 rounded-lg hover:bg-red-50 transition text-red-400 inline-flex ml-1">
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
