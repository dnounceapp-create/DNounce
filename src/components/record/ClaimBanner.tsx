'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, X } from "lucide-react";

export default function ClaimBanner({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function verify() {
    if (code.length !== 6) { setError('Enter your 6-digit code.'); return; }
    setVerifying(true);
    setError(null);

    // Check code is valid and unused
    const { data: claimCode } = await supabase
      .from('record_claim_codes')
      .select('id, used')
      .eq('record_id', recordId)
      .eq('code', code.trim())
      .maybeSingle();

    if (!claimCode) { setError('Invalid code. Check the code and try again.'); setVerifying(false); return; }
    if (claimCode.used) { setError('This code has already been used.'); setVerifying(false); return; }

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Store code + record in sessionStorage then redirect to signup
      sessionStorage.setItem('claim_record_id', recordId);
      sessionStorage.setItem('claim_code', code.trim());
      router.push(`/loginsignup?redirectTo=/record/${recordId}/claim`);
      return;
    }

    // Already logged in — go straight to override screen
    sessionStorage.setItem('claim_record_id', recordId);
    sessionStorage.setItem('claim_code', code.trim());
    router.push(`/record/${recordId}/claim`);
  }

  return (
    <>
      {/* Banner */}
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold">Is this your complaint?</span>
              <span className="text-sm text-blue-100 ml-2">Claim this record and make it yours — update the details, set your anonymity, and let your voice be heard.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-full text-sm font-semibold transition"
            >
              Claim it →
            </button>
            <button onClick={() => setDismissed(true)} className="text-blue-200 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Code Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Enter your claim code</h2>
              <button onClick={() => { setShowModal(false); setCode(''); setError(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code you received. This code is single-use and ties this record to your account.</p>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-3xl font-bold font-mono tracking-[0.5em] border-2 border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 mb-4"
              placeholder="000000"
              autoFocus
            />
            {error && <div className="text-sm text-red-600 mb-4 text-center">{error}</div>}
            <button
              onClick={verify}
              disabled={verifying || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Claim'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-4">You'll be asked to create an account or log in after verification.</p>
          </div>
        </div>
      )}
    </>
  );
}
