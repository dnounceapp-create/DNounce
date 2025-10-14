"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Share2, Copy, Check, ChevronLeft, Mail } from "lucide-react";

export default function ReferPage() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const referralLink = "https://dnounce.com/ref/your-username";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    if (!email) return alert("Please enter a valid email address.");
    setSent(true);
    setEmail("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Settings
          </Link>
        </div>

        {/* Header */}
        <h1 className="text-3xl font-bold mb-2">Refer a Friend</h1>
        <p className="text-gray-600 mb-8">
          Invite your friends to join DNounce and earn rewards when they sign up.
        </p>

        {/* Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          {/* Referral Link */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              Share Your Link
            </h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Share this link anywhere — social media, messages, or email!
            </p>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Email Invite */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                {sent ? "Sent!" : "Send Invite"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              You can invite multiple friends by sending them your link or email invites.
            </p>
          </section>

          {/* Rewards */}
          <section className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Referral Rewards</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>🎁 Earn bonus points when friends join DNounce.</li>
              <li>💬 Get access to beta features before public release.</li>
              <li>🏅 Top referrers appear on the leaderboard.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
