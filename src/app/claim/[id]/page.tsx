'use client';

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, AlertTriangle, CheckCircle, FileText, Upload, User, X, Star } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function slugify(s?: string | null) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function subjectSlug(name?: string | null, nickname?: string | null) {
  const combined = [name, nickname].filter(Boolean).join(" ");
  return slugify(combined) || "profile";
}
function citySlug(location?: string | null) {
  return slugify((location || "").split(",")[0].trim()) || "unknown";
}
function capitalizeWords(value: string) {
  return value.split(" ").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : "")).join(" ");
}
function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return digits;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function Field({ label, placeholder, value, onChange, disabled = false, required = false, mode = "text", helperText }: {
  label: string; placeholder: string; value: string; onChange: (val: string) => void;
  disabled?: boolean; required?: boolean; mode?: "text" | "phone" | "email"; helperText?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let next = raw;
    if (mode === "phone") next = formatPhoneNumber(raw);
    else if (mode === "email") next = raw.trim();
    else next = capitalizeWords(raw);
    onChange(next);
  };
  return (
    <div className="flex flex-col">
      <label className="mb-2 text-[15px] font-medium text-[#1E293B] tracking-tight">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input placeholder={placeholder} type={mode === "phone" ? "tel" : mode === "email" ? "email" : "text"}
        value={value} onChange={handleChange} disabled={disabled}
        className={`w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[15px] text-gray-800 placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`} />
      {helperText && <p className="text-xs text-gray-500 mt-1 leading-tight">{helperText}</p>}
    </div>
  );
}

export default function ClaimOverridePage() {
  const { id: recordId } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Subject info
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectUuid, setSubjectUuid] = useState('');
  const [subjectNickname, setSubjectNickname] = useState('');
  const [subjectLocation, setSubjectLocation] = useState('');
  const [submitFirstName, setSubmitFirstName] = useState('');
  const [submitLastName, setSubmitLastName] = useState('');
  const [submitNickname, setSubmitNickname] = useState('');
  const [submitOrganization, setSubmitOrganization] = useState('');
  const [submitRelationship, setSubmitRelationship] = useState('');
  const [submitCategory, setSubmitCategory] = useState('');
  const [submitLocation, setSubmitLocation] = useState('');
  const [submitPhone, setSubmitPhone] = useState('');
  const [submitEmail, setSubmitEmail] = useState('');

  // Record info
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [lastTappedStar, setLastTappedStar] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<{url: string; name: string; type: string} | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<{id: string; path: string; label: string; mime_type: string; size_bytes: number}[]>([]);

  // Identity
  const [identityPreference, setIdentityPreference] = useState<'hide' | 'show'>('hide');
  const [identityTouched, setIdentityTouched] = useState(false);
  const [confirmIdentityOpen, setConfirmIdentityOpen] = useState(false);
  const pendingIdentity = useRef<'hide' | 'show' | null>(null);
  const [displayName, setDisplayName] = useState('');

  const termsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/loginsignup'); return; }
      setSessionUserId(session.user.id);

      const storedRecordId = sessionStorage.getItem('claim_record_id');
      const storedCode = sessionStorage.getItem('claim_code');

      if (storedRecordId !== recordId || !storedCode) {
        setError('Invalid or missing claim code. Please start over from the record page.');
        setLoading(false);
        return;
      }

      const { data: claimCode } = await supabase
        .from('record_claim_codes')
        .select('id, used')
        .eq('record_id', recordId)
        .eq('code', storedCode)
        .maybeSingle();

      if (!claimCode || claimCode.used) {
        setError('This claim code is invalid or has already been used.');
        setLoading(false);
        return;
      }

      const { data: record } = await supabase
        .from('records')
        .select('description, contributor_display_name, anonymity_status, contributor_claimed, dnounce_mod_record, contributor_override_used, category, relationship, rating, location, subject_id, contributor_identity_preference')
        .eq('id', recordId)
        .maybeSingle();

      if (!record) { setError('Record not found.'); setLoading(false); return; }
      if (!record.dnounce_mod_record) { setError('This record cannot be claimed.'); setLoading(false); return; }
      if (record.contributor_claimed) { setError('This record has already been claimed.'); setLoading(false); return; }
      if (record.contributor_override_used) { setError('This record has already been edited.'); setLoading(false); return; }

      setDescription(record.description ?? '');
      setSubmitCategory(record.category ?? '');
      setSubmitRelationship(record.relationship ?? '');
      setRating(record.rating ?? 0);
      setSubmitLocation(record.location ?? '');
      setSubjectId(record.subject_id);
      setIdentityPreference(record.contributor_identity_preference ? 'show' : 'hide');

      const { data: userAcct } = await supabase
        .from('user_accountdetails')
        .select('first_name, last_name, job_title, location')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setDisplayName(`${userAcct?.first_name ?? ''} ${userAcct?.last_name ?? ''}`.trim());

      // Load claimer info from claim code
      const { data: claimData } = await supabase
        .from('record_claim_codes')
        .select('claimer_first_name, claimer_last_name, claimer_job_title, claimer_location, subject_phone, subject_email')
        .eq('record_id', recordId)
        .eq('code', storedCode)
        .maybeSingle();

      // Pre-fill subject contact if available
      if (claimData?.subject_phone) setSubmitPhone(claimData.subject_phone);
      if (claimData?.subject_email) setSubmitEmail(claimData.subject_email);

      // If user has no first name yet and claimer info exists, update their account
      if (claimData?.claimer_first_name && !userAcct?.first_name) {
        await supabase.from('user_accountdetails').update({
          first_name: claimData.claimer_first_name,
          last_name: claimData.claimer_last_name || null,
          job_title: claimData.claimer_job_title || null,
          location: claimData.claimer_location || null,
        }).eq('user_id', session.user.id);
      }

      if (record.subject_id) {
        const { data: subject } = await supabase
          .from('subjects')
          .select('name, nickname, organization, location, subject_uuid')
          .eq('subject_uuid', record.subject_id)
          .maybeSingle();
        if (subject) {
          const parts = (subject.name || '').split(' ');
          setSubmitFirstName(parts[0] || '');
          setSubmitLastName(parts.slice(1).join(' ') || '');
          setSubmitNickname(subject.nickname || '');
          setSubmitOrganization(subject.organization || '');
          setSubmitLocation(subject.location || record.location || '');
          setSubjectLocation(subject.location || '');
          setSubjectName(subject.name || '');
          setSubjectUuid(subject.subject_uuid || '');
          setSubjectNickname(subject.nickname || '');
        }
      }

      // Load existing attachments
      const { data: attachments } = await supabase
        .from('record_attachments')
        .select('id, path, label, mime_type, size_bytes')
        .eq('record_id', recordId);
      setExistingAttachments(attachments ?? []);

      setLoading(false);
    }
    init();
  }, [recordId, router]);

  async function handleClaim() {
    if (!sessionUserId) return;
    setSaving(true);
    setError(null);

    const storedCode = sessionStorage.getItem('claim_code');

    let { data: contributor } = await supabase
      .from('contributors')
      .select('id')
      .eq('auth_user_id', sessionUserId)
      .maybeSingle();

    if (!contributor) {
      const { data: userAcct } = await supabase
        .from('user_accountdetails')
        .select('user_id')
        .eq('user_id', sessionUserId)
        .maybeSingle();
      const { data: newContributor, error: contribErr } = await supabase
        .from('contributors')
        .insert({ user_id: userAcct?.user_id ?? sessionUserId, auth_user_id: sessionUserId, alias: 'SuperHero123' })
        .select('id')
        .single();
      if (contribErr || !newContributor) {
        setError('Could not create your contributor account. Please contact support.');
        setSaving(false);
        return;
      }
      contributor = newContributor;
    }

    // Upload files
    for (const file of files) {
      const path = `${recordId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file);
      if (!uploadErr) {
        await supabase.from('record_attachments').insert({
          record_id: recordId, path, mime_type: file.type, size_bytes: file.size, label: file.name,
        });
      }
    }

    const res = await fetch('/api/claim-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId,
        code: storedCode,
        userId: sessionUserId,
        contributorId: contributor.id,
        description: description.trim(),
        displayName: displayName,
        identityPreference,
        category: submitCategory.trim(),
        relationship: submitRelationship.trim(),
        rating,
        location: submitLocation.trim(),
        firstName: submitFirstName.trim(),
        lastName: submitLastName.trim(),
        nickname: submitNickname.trim(),
        organization: submitOrganization.trim(),
        subjectId,
      }),
    });

    const result = await res.json();
    if (!res.ok) { setError(result.error ?? 'Something went wrong.'); setSaving(false); return; }

    sessionStorage.removeItem('claim_record_id');
    sessionStorage.removeItem('claim_code');
    setSuccess(true);
    setSaving(false);
    setTimeout(() => router.push(`/record/${recordId}`), 3000);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <div className="text-base font-semibold text-red-900 mb-2">Unable to claim record</div>
        <div className="text-sm text-red-700 mb-6">{error}</div>
        <button onClick={() => router.push(`/record/${recordId}`)} className="text-sm text-red-600 hover:underline">← Back to record</button>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-4" />
        <div className="text-base font-semibold text-green-900 mb-2">Record claimed successfully!</div>
        <div className="text-sm text-green-700 mb-1">Your record has been updated and is now going through AI verification.</div>
        <div className="text-sm text-gray-400">Redirecting you back to the record...</div>
      </div>
    </div>
  );

  return (
    <>
    <form onSubmit={e => { e.preventDefault(); setShowConfirm(true); }} className="w-full max-w-3xl mx-auto px-3 sm:px-5 md:px-8 py-4 sm:py-8 space-y-8 sm:space-y-10">
      <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-snug">Claim & Update Record</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-500 max-w-md leading-relaxed">This is your one and only chance to update this record. Once submitted, it cannot be edited again.</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          One-time override · Cannot be undone
        </div>
      </div>

      <Card className="p-4 sm:p-6 md:p-8 bg-white shadow-md rounded-2xl">
        <CardContent className="p-0 sm:p-2 space-y-8">

          {/* Subject Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col text-center mb-5 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Subject</h2>
              <p className="text-xs sm:text-sm text-gray-500">The subject of this record. Their identity cannot be changed.</p>
            </div>
            <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-5 py-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <Link href={`/subject/${subjectUuid}/${subjectSlug(subjectName, subjectNickname)}/${citySlug(subjectLocation)}`} className="text-sm font-semibold text-blue-600 hover:underline">
                  {subjectName || '—'}
                </Link>
                <div className="text-xs font-mono text-gray-400 mt-0.5">UUID: {subjectUuid}</div>
              </div>
            </div>
          </div>

          {/* Subject Contact Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col text-center mb-5 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Subject Contact Information</h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">Used to notify the subject.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Phone Number" placeholder="(718) 555-1234" value={submitPhone} onChange={setSubmitPhone} mode="phone" />
              <Field label="Email Address" placeholder="johndoe@example.com" value={submitEmail} onChange={setSubmitEmail} mode="email" />
            </div>
          </div>

          {/* Subject Basic Info */}
          <div>
            <div className="mb-5 sm:mb-6 text-center">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Subject's Basic Information</h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">Update what you know about the subject from your experience.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
              <Field label="First Name" placeholder="e.g. John" value={submitFirstName} onChange={setSubmitFirstName} required />
              <Field label="Last Name" placeholder="e.g. Doe" value={submitLastName} onChange={setSubmitLastName} />
              <Field label="Also Known As" placeholder="e.g. Johnny" value={submitNickname} onChange={setSubmitNickname} />
              <Field label="Organization / Company" placeholder="e.g. Acme Inc." value={submitOrganization} onChange={setSubmitOrganization} />
              <Field label="Relationship" placeholder="e.g. Client, Tenant" value={submitRelationship} onChange={setSubmitRelationship} required />
              <Field label="Category" placeholder="e.g. Contractor, Barber" value={submitCategory} onChange={setSubmitCategory} required />
              <Field label="Location" placeholder="e.g. Brooklyn, NY" value={submitLocation} onChange={setSubmitLocation} required />
            </div>
          </div>

          {/* Rating */}
          <div className="mt-8 sm:mt-10 select-none">
            <label className="block text-lg font-medium mb-3 sm:mb-4">Rate Your Experience <span className="text-red-500">*</span></label>
            <div className="flex items-center justify-start flex-wrap gap-2 sm:gap-3">
              {Array.from({ length: 10 }).map((_, i) => {
                const starValue = i + 1;
                const currentValue = hoverRating ?? rating;
                const fillLevel = currentValue >= starValue ? 1 : currentValue >= starValue - 0.5 ? 0.5 : 0;
                return (
                  <div key={starValue} className="relative cursor-pointer active:scale-105 transition-transform" style={{ width: 42, height: 42 }}
                    onClick={() => { setRating(prev => { const half = starValue - 0.5; if (prev < half) return half; if (prev === half) return starValue; return half; }); setHoverRating(null); }}
                    onMouseEnter={() => setHoverRating(starValue)} onMouseLeave={() => setHoverRating(null)}>
                    <Star size={40} className="absolute inset-0 text-gray-300" strokeWidth={1.5} />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillLevel * 100}%` }}>
                      <Star size={40} className="text-black fill-black" strokeWidth={1.5} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-gray-500">Selected rating: {rating ? rating.toFixed(1) : '—'} / 10</p>
          </div>

          {/* Identity Preference */}
          <div className="mb-8 mt-8">
            <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-semibold text-gray-900">Identity Preference <span className="text-red-500">*</span></div>
                  <div className="mt-1 text-sm text-gray-600 leading-relaxed">Choose how your name is displayed if allowed based on your submission type.</div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">{identityPreference === 'hide' ? 'Showing as anonymous' : 'Showing my real name'}</span>
                    <button type="button" role="switch"
                      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${identityPreference === 'hide' ? 'bg-black border-black' : 'bg-gray-200 border-gray-300'}`}
                      onClick={() => {
                        const next: 'hide' | 'show' = identityPreference === 'show' ? 'hide' : 'show';
                        if (identityTouched) { pendingIdentity.current = next; setConfirmIdentityOpen(true); return; }
                        setIdentityPreference(next); setIdentityTouched(true);
                      }}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${identityPreference === 'hide' ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="font-semibold text-sm">Important</div>
                <div className="mt-1 text-sm leading-relaxed">Your preference may be overridden:
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    <li><span className="font-semibold">Anonymity Granted:</span> Your choice is respected.</li>
                    <li><span className="font-semibold">Anonymity Not Granted:</span> Always shows Real Name.</li>
                  </ul>
                </div>
              </div>
            </div>
            {confirmIdentityOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                  <div className="text-base font-semibold text-gray-900">Are you sure?</div>
                  <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                    You're about to change your identity preference to <span className="font-semibold">{pendingIdentity.current === 'hide' ? 'Showing as anonymous' : 'Showing my real name'}</span>.
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => setConfirmIdentityOpen(false)} className="flex-1 rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={() => { if (pendingIdentity.current) setIdentityPreference(pendingIdentity.current); setIdentityTouched(true); setConfirmIdentityOpen(false); }} className="flex-1 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Confirm</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Evidence (optional)</label>
            {existingAttachments.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Existing evidence</div>
                {existingAttachments.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-700 truncate">{a.label || a.path.split('/').pop()}</span>
                      <span className="text-[10px] text-gray-400">{(a.size_bytes / 1024).toFixed(0)}KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await supabase.from('record_attachments').delete().eq('id', a.id);
                        setExistingAttachments(prev => prev.filter(x => x.id !== a.id));
                      }}
                      className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
              onClick={() => document.getElementById('claim-file-input')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}>
              <input id="claim-file-input" type="file" multiple className="hidden" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Drag and drop or click to browse</p>
              <p className="text-[11px] text-gray-300 mt-1">PDF, JPG, PNG, MP4, DOCX — max 100MB each</p>
            </div>
            {files.length > 0 && (
              <div className="mt-5 text-left">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Attached Files</h4>
                <div className="space-y-2">
                  {files.map((file, index) => {
                    const sizeKB = file.size / 1024;
                    const sizeLabel = sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
                    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
                    return (
                      <div key={index} className="relative flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 hover:bg-gray-50 w-full">
                        <button
                          type="button"
                          onClick={() => { const url = URL.createObjectURL(file); setPreviewFile({ url, name: file.name, type: file.type }); }}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                            {previewUrl ? (
                              <img src={previewUrl} alt={file.name} className="h-10 w-10 rounded-xl object-cover" />
                            ) : (
                              <FileText className="h-4 w-4 text-gray-700" />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{`Attachment #${index + 1}`}</div>
                            <div className="text-xs text-gray-500 truncate">{file.name} · {sizeLabel}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, i) => i !== index))}
                          className="p-1 hover:bg-gray-200 rounded-full transition flex-shrink-0"
                          title="Remove file"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Experience Details */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Experience details <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={8} required
              className="w-full h-28 p-4 border border-gray-100 rounded-2xl text-sm text-gray-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your experience clearly and accurately." />
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-1" />
              <label className="text-xs text-gray-400">I agree to the <button type="button" className="text-blue-500 hover:underline">Terms of Service</button> and confirm that my submission is truthful, that I understand DNounce's anonymity determination is a structural tool only, and that I — not DNounce — bear full legal responsibility for this submission.</label>
            </div>
            <div ref={termsRef} className="h-36 overflow-y-auto border border-gray-100 rounded-xl p-4 text-xs text-gray-400 bg-gray-50 leading-relaxed">
              <p className="font-semibold mb-2 text-gray-600">Important Legal Notice</p>
              <p className="mb-2">By submitting this record, you acknowledge that DNounce is a neutral platform operating under Section 230 of the Communications Decency Act. You — not DNounce — are solely responsible for the accuracy and legality of your submission.</p>
              <p className="mb-2">You certify that your submission is truthful to the best of your knowledge and based on either verifiable evidence or honest personal opinion. Submitting knowingly false or malicious content may result in permanent account suspension and exposes you to legal liability.</p>
              <p className="mb-2">Anonymity Determination: Your submission will be evaluated and assigned either Anonymity Granted or Anonymity Not Granted. This is a structural determination only — it does not mean DNounce has verified or endorsed your submission.</p>
              <p className="mb-2">The subject will be notified and has the right to respond and dispute through our structured community process.</p>
              <p>Any attempt to use legal process to suppress this record or unmask an anonymous contributor may be treated as a SLAPP. DNounce reserves the right to oppose such actions vigorously.</p>
            </div>
          </div>

          <button type="submit" disabled={!agreedToTerms || saving}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50">
            {saving ? 'Claiming...' : 'Claim & Update Record'}
          </button>

        </CardContent>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Are you absolutely sure?</h2>
            <p className="text-sm text-gray-500 mb-6">This will permanently claim the record under your account. The subject will be re-notified. <span className="font-semibold text-gray-700">You can never edit this record again.</span></p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">Go back</button>
              <button type="button" onClick={() => { setShowConfirm(false); handleClaim(); }} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Yes, claim it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={() => setPreviewFile(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewFile(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
            <div className="text-white text-sm mb-3 font-medium">{previewFile.name}</div>
            {previewFile.type.startsWith('image/') ? (
              <img src={previewFile.url} alt={previewFile.name} className="max-h-[80vh] max-w-full rounded-xl object-contain" />
            ) : previewFile.type === 'application/pdf' ? (
              <iframe src={previewFile.url} className="w-full h-[80vh] rounded-xl" />
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-700 font-medium">{previewFile.name}</div>
                <a href={previewFile.url} download={previewFile.name} className="mt-4 inline-block text-blue-600 hover:underline text-sm">Download to view</a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
