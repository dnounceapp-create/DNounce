'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Send, Copy, Check, Share2, Loader2, ArrowLeft } from "lucide-react";


function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const len = digits.length;
  if (len === 0) return '';
  if (len < 4) return digits;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function RequestRecordPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    supabase
      .from('relationship_types')
      .select('id, label')
      .order('created_at')
      .then(({ data }) => setRelationshipTypes(data ?? []));
  }, []);

  const phoneDigits = phone.replace(/\D/g, '');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = firstName.trim() && emailValid && phoneDigits.length === 10 && relationship && !sending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Please log in again.'); setSending(false); return; }
    const res = await fetch('/api/record-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneDigits,
        relationship,
      }),
    });
    const result = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setError(result.error ?? 'Something went wrong. Please try again.'); return; }
    setLink(result.link);
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!link) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Share your experience on DNounce', url: link }); } catch {}
    } else {
      copyLink();
    }
  }

  function reset() {
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setRelationship('');
    setLink(null); setError(null);
  }

  const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500";

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      <Link href="/dashboard/myrecords" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to My Records
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Request a Record</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Ask someone you've dealt with to share their honest experience with you. You won't be able to edit or remove what they write.</p>

      {link ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <div className="text-base font-semibold text-green-900 mb-1">Request sent to {firstName}!</div>
          <p className="text-sm text-green-800 mb-4">We emailed them a link. You can also send it yourself:</p>
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-3 py-2 mb-3">
            <span className="text-xs font-mono text-gray-700 truncate flex-1">{link}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copyLink} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              {copied ? <><Check className="w-4 h-4 text-green-600" /> Copied to clipboard</> : <><Copy className="w-4 h-4" /> Copy Link</>}
            </button>
            <button type="button" onClick={shareLink} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-sm font-medium text-white transition">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
          <button type="button" onClick={reset} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">Request another</button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">First Name <span className="text-red-500">*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Maria" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Lopez" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Email <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="maria@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number <span className="text-red-500">*</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(formatPhoneNumber(e.target.value))} className={inputClass} placeholder="(718) 555-1234" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">How do you know them? <span className="text-red-500">*</span></label>
            <select value={relationship} onChange={e => setRelationship(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="">Select...</option>
              {relationshipTypes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      )}
    </div>
  );
}
