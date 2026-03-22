"use client";

import { useState } from "react";
import { Monitor, LifeBuoy, UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ITSupportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !notes.trim()) {
      setToast({ type: "error", msg: "Please attach a file or add notes before submitting." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase.from("support_tickets").insert({
        user_id: session?.user?.id || null,
        type: "it",
        message: notes.trim() || "IT support diagnostic file submitted.",
      });

      if (error) throw error;

      setFile(null);
      setNotes("");
      setToast({ type: "success", msg: "Submitted successfully. Our IT team will follow up shortly." });
    } catch (err: any) {
      setToast({ type: "error", msg: err?.message || "Failed to submit. Please try again." });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">IT Support</h1>
        <p className="text-gray-600 mb-8">
          Submit diagnostics or describe a technical issue for our IT team.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-gray-600" />
              Remote Session
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Need live help? Contact our support team to schedule a secure remote session.
            </p>
            <a
              href="mailto:it@dnounce.com?subject=Remote Support Request"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all"
            >
              <LifeBuoy className="w-4 h-4" />
              Request Remote Session
            </a>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-gray-600" />
              Submit Diagnostic
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Attach a screenshot or log file and describe the issue to help our team investigate.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  Attach File (Optional)
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.log,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white"
                />
                {file && <p className="text-xs text-gray-500 mt-1">Attached: <span className="font-medium">{file.name}</span></p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe the technical issue…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <LifeBuoy className="w-4 h-4" />
                  {submitting ? "Submitting…" : "Submit for Support"}
                </button>
              </div>
            </form>
          </section>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              IT support is available Monday–Friday, 9am–6pm EST. Expect a response within 24 hours.
            </p>
          </div>
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
