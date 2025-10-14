"use client";

import { useState } from "react";
import Link from "next/link";
import { Monitor, LifeBuoy, ChevronLeft, UploadCloud, CheckCircle2 } from "lucide-react";

export default function ITSupportPage() {
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleScreenShare = () => {
    setScreenShareActive(!screenShareActive);
    alert(
      !screenShareActive
        ? "🖥️ Screen sharing started (mock). In production, this would open a secure session."
        : "❌ Screen sharing ended."
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please attach a screenshot or log file before submitting.");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFile(null);
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
        <h1 className="text-3xl font-bold mb-2">IT Support Screen</h1>
        <p className="text-gray-600 mb-8">
          Share your screen or upload diagnostics for technical support assistance.
        </p>

        {/* Main Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          {/* Screen Share Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-gray-600" />
              Live Screen Sharing
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Start a secure session with a DNounce technician to resolve your issue.
            </p>
            <button
              onClick={handleScreenShare}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                screenShareActive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {screenShareActive ? "End Screen Share" : "Start Screen Share"}
            </button>
          </section>

          <div className="border-t border-gray-200"></div>

          {/* File Upload Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-gray-600" />
              Upload Diagnostic Files
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Attach a screenshot or log file to help us better understand your issue.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.log,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
              >
                <LifeBuoy className="w-4 h-4" />
                {submitted ? "Submitted!" : "Submit for Support"}
              </button>
            </form>

            {submitted && (
              <div className="flex items-center gap-2 mt-3 text-green-700 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> File submitted successfully!
              </div>
            )}
          </section>

          {/* Support Note */}
          <section className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              DNounce IT support is available Monday–Friday, 9am–6pm EST. Expect a response within 24 hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
