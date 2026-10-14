'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Send, Copy, Check, Share2, Loader2, ArrowLeft, User, X } from "lucide-react";

type MatchUser = {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  location: string | null;
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  const len = digits.length;
  if (len === 0) return '';
  if (len < 4) return digits;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function Avatar({ u, size = 40 }: { u: MatchUser; size?: number }) {
  const initials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase();
  if (u.avatar_url) {
    return <img src={u.avatar_url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0" style={{ width: size, height: size }}>
      {initials || <User className="w-4 h-4" />}
    </div>
  );
}

export default function RequestRecordPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [relationshipTypes, setRelationshipTypes] = useState<{ id: string; label: string }[]>([]);

  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MatchUser | null>(null);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [sentToName, setSentToName] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('relationship_types')
      .select('id, label')
      .order('created_at')
      .then(({ data }) => setRelationshipTypes(data ?? []));
  }, []);

  const phoneDigits = phone.replace(/\D/g, '');
  const cleanEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  // Live search, same "starts with" behavior as the submit page
  useEffect(() => {
    if (selected) return;
    if (cleanEmail.length < 3 && phoneDigits.length < 3) {
      setMatches([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/record-requests/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ email: cleanEmail, phone: phoneDigits }),
        });
        const data = await res.json().catch(() => ({}));
        setMatches(Array.isArray(data.users) ? data.users : []);
      } catch {
        setMatches([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [cleanEmail, phoneDigits, selected]);

  function selectUser(u: MatchUser) {
    setSelected(u);
    setFirstName(u.first_name);
    setLastName(u.last_name);
    setMatches([]);
    setError(null);
  }

  function clearSelection() {
    setSelected(null);
    setFirstName('');
    setLastName('');
  }

  // Existing user: one contact field is enough. New person: name, email, and phone all required.
  const canSubmit = !sending && !!relationship && (
    selected
      ? (emailValid || phoneDigits.length === 10)
      : (!!firstName.trim() && emailValid && phoneDigits.length === 10)
  );

  async function handleSubmit() {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Please log in again.'); setSending(false); return; }
    const res = await fetch('/api/record-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        selectedUserId: selected?.user_id ?? null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        phone: phoneDigits,
        relationship,
      }),
    });
    const result = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setError(result.error ?? 'Something went wrong. Please try again.'); return; }
    setSentToName(firstName.trim());
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
    setEmail(''); setPhone(''); setFirstName(''); setLastName(''); setRelationship('');
    setSelected(null); setMatches([]); setLink(null); setError(null);
  }

  const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      <Link href="/dashboard/myrecords" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to My Records
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Request a Record</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Ask someone you've dealt with to share their honest experience with you. You won't be able to edit or remove what they write.</p>

      {link ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <div className="text-base font-semibold text-green-900 mb-1">Request sent to {sentToName}!</div>
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}

          {/* Contact info first */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Their contact info</h2>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Email {!selected && <span className="text-red-500">*</span>}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="maria@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Phone Number {!selected && <span className="text-red-500">*</span>}
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(formatPhoneNumber(e.target.value))} className={inputClass} placeholder="(718) 555-1234" />
            </div>
            {selected && (
              <p className="text-xs text-gray-500">Since they're already on DNounce, one contact field is enough.</p>
            )}
          </div>

          {/* Search results */}
          {!selected && searching && <div className="text-xs text-gray-400">Searching...</div>}
          {!selected && !searching && matches.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600">Is this them?</div>
              {matches.map(u => (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => selectUser(u)}
                  className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 hover:bg-violet-50 hover:border-violet-200 transition text-left"
                >
                  <Avatar u={u} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</div>
                    {u.location && <div className="text-xs text-gray-500 truncate">{u.location}</div>}
                  </div>
                  <span className="text-xs font-semibold text-violet-600 shrink-0">Select</span>
                </button>
              ))}
            </div>
          )}

          {/* Selected existing user */}
          {selected && (
            <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
              <Avatar u={selected} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{selected.first_name} {selected.last_name}</div>
                {selected.location && <div className="text-xs text-gray-500 truncate">{selected.location}</div>}
              </div>
              <button type="button" onClick={clearSelection} className="p-1 rounded-full hover:bg-violet-100 text-gray-500" title="Not them">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Name: filled automatically for existing users */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">First Name {!selected && <span className="text-red-500">*</span>}</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!!selected} className={inputClass} placeholder="Maria" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} disabled={!!selected} className={inputClass} placeholder="Lopez" />
            </div>
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
