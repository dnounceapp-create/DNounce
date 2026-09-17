'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";

const ANONYMITY_OPTIONS = [
  { value: 'Anonymity Granted', label: 'Keep me anonymous', desc: 'Your name will not appear on the record.' },
  { value: 'Anonymity Not Granted', label: 'Show my name', desc: 'Your display name will appear publicly on the record.' },
];

export default function ClaimOverridePage() {
  const { id: recordId } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [description, setDescription] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymity, setAnonymity] = useState('Anonymity Granted');

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
        .select('description, contributor_display_name, anonymity_status, contributor_claimed, dnounce_mod_record, contributor_override_used')
        .eq('id', recordId)
        .maybeSingle();

      if (!record) { setError('Record not found.'); setLoading(false); return; }
      if (!record.dnounce_mod_record) { setError('This record cannot be claimed.'); setLoading(false); return; }
      if (record.contributor_claimed) { setError('This record has already been claimed.'); setLoading(false); return; }
      if (record.contributor_override_used) { setError('This record has already been edited.'); setLoading(false); return; }

      setDescription(record.description ?? '');
      setDisplayName(record.contributor_display_name ?? '');
      setAnonymity(record.anonymity_status ?? 'Anonymity Granted');
      setLoading(false);
    }
    init();
  }, [recordId, router]);

  async function handleClaim() {
    if (!sessionUserId) return;
    setSaving(true);
    setError(null);

    const storedCode = sessionStorage.getItem('claim_code');

    const { data: contributor } = await supabase
      .from('contributors')
      .select('id')
      .eq('auth_user_id', sessionUserId)
      .maybeSingle();

    if (!contributor) {
      setError('Could not find your contributor account. Please contact support.');
      setSaving(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from('records')
      .update({
        contributor_id: contributor.id,
        created_by: sessionUserId,
        description: description.trim(),
        contributor_display_name: displayName.trim(),
        anonymity_status: anonymity,
        contributor_claimed: true,
        contributor_override_used: true,
        status: 'ai_processing',
        submitted_at: new Date().toISOString(),
        published_at: null,
        ai_completed_at: null,
        debate_started_at: null,
        debate_ends_at: null,
        voting_started_at: null,
        voting_ends_at: null,
        verdict_announced_at: null,
        decision_started_at: null,
      })
      .eq('id', recordId);

    if (updateErr) { setError(updateErr.message); setSaving(false); return; }

    await supabase
      .from('record_claim_codes')
      .update({
        used: true,
        used_by: sessionUserId,
        used_at: new Date().toISOString(),
      })
      .eq('record_id', recordId)
      .eq('code', storedCode ?? '');

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
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            One-time override · Cannot be undone
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Claim your record</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">This is your one and only chance to update this record before it goes live under your account. Once you submit, this record is locked — it cannot be edited again.</p>
        </div>

        <div className="space-y-5">
          {/* Display name */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="text-sm font-semibold text-gray-900 mb-1 block">Your display name</label>
            <p className="text-xs text-gray-500 mb-3">How you'll appear on the record if anonymity is not granted.</p>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Your full name"
            />
          </div>

          {/* Anonymity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="text-sm font-semibold text-gray-900 mb-3 block">Anonymity preference</label>
            <div className="space-y-3">
              {ANONYMITY_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${anonymity === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="anonymity" value={opt.value} checked={anonymity === opt.value} onChange={() => setAnonymity(opt.value)} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="text-sm font-semibold text-gray-900 mb-1 block">Your experience</label>
            <p className="text-xs text-gray-500 mb-3">This is pre-filled with the original complaint. Update it in your own words.</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              placeholder="Describe your experience..."
            />
          </div>

          {/* Warning */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-900 mb-1">This cannot be undone</div>
                <div className="text-xs text-amber-700 leading-relaxed">Once you claim this record, you cannot edit it again. The record will restart the full verification process and the subject will be re-notified. Make sure everything above is accurate before submitting.</div>
              </div>
            </div>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 rounded" />
            <span className="text-sm text-gray-600 leading-relaxed">I confirm this is my firsthand experience, the information above is accurate, and I understand this record cannot be edited after claiming.</span>
          </label>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!confirmed || !description.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl transition disabled:opacity-50 text-sm"
          >
            Claim & Submit Record
          </button>
        </div>
      </div>

      {/* Final confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Are you absolutely sure?</h2>
            <p className="text-sm text-gray-500 mb-6">This will permanently claim the record under your account. The subject will be notified. <span className="font-semibold text-gray-700">You can never edit this record again.</span></p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Go back
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleClaim(); }}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving...' : 'Yes, claim it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
