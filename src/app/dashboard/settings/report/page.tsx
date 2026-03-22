"use client";

import { useState } from "react";
import { Flag, Upload, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ReportIssuePage() {
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setToast({ type: "error", msg: "Please describe the issue before submitting." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase.from("support_tickets").insert({
        user_id: session?.user?.id || null,
        type: "report",
        category: category || null,
        priority,
        message: description.trim(),
      });

      if (error) throw error;

      setDescription("");
      setCategory("");
      setPriority("normal");
      setFile(null);
      setToast({ type: "success", msg: "Your report has been submitted. Thank you!" });
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
        <h1 className="text-3xl font-bold mb-2">Report an Issue</h1>
        <p className="text-gray-600 mb-8">Found a bug or having trouble? Let us know below.</p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                <option value="bug">Bug or Error</option>
                <option value="ui">UI or Display Issue</option>
                <option value="performance">Performance Problem</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Priority Level</label>
              <div className="flex gap-3">
                {["low", "normal", "high"].map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setPriority(level)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      priority === level
                        ? "bg-blue-100 border-blue-500 text-blue-700"
                        : "bg-white border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe what happened…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-600" /> Attach Screenshot (Optional)
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
              />
              {file && <p className="text-xs text-gray-500 mt-1">Attached: <span className="font-medium">{file.name}</span></p>}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <Flag className="w-4 h-4" />
                {submitting ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </form>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Thank you for helping us improve DNounce. Your feedback is reviewed by our dev team.
        </p>

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
