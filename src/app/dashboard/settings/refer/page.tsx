"use client";

import { useState, useEffect } from "react";
import { Users, Share2, Copy, Check, Mail, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ReferPage() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const referralLink = userId
    ? `https://dnounce.com/ref/${userId.slice(0, 8)}`
    : "https://dnounce.com/ref/...";

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInvite() {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setToast({ type: "error", msg: "Please enter a valid email address." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        type: "support",
        topic: "referral",
        message: `Referral invite sent to: ${email}`,
      });
      if (error) throw error;
      setEmail("");
      setToast({ type: "success", msg: `Invite sent to ${email}!` });
    } catch (err: any) {
      setToast({ type: "error", msg: err?.message || "Failed to send invite." });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Refer a Friend</h1>
        <p className="text-gray-600 mb-8">
          Invite your friends to join DNounce and earn rewards when they sign up.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              Share Your Link
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700"
              />
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Share this link on social media, messages, or email!</p>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-600" />
              Invite via Email
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleInvite}
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                {submitting ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </section>

          <section className="pt-2 border-t border-gray-200">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Referral Rewards</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Earn bonus points when friends join DNounce.</li>
              <li>Get access to beta features before public release.</li>
              <li>Top referrers appear on the leaderboard.</li>
            </ul>
          </section>
        </div>

        {toast && (
          <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
