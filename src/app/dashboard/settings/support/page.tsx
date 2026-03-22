"use client";

import { useState } from "react";
import { Mail, Upload, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ContactSupportPage() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setToast({ type: "error", msg: "Please enter your message before submitting." });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase.from("support_tickets").insert({
        user_id: session?.user?.id || null,
        type: "support",
        topic: topic || null,
        message: message.trim(),
      });

      if (error) throw error;

      setMessage("");
      setTopic("");
      setFile(null);
      setToast({ type: "success", msg: "Your message has been sent. We'll respond within 24 hours." });
    } catch (err: any) {
      setToast({ type: "error", msg: err?.message || "Failed to send. Please try again." });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Contact Support</h1>
        <p className="text-gray-600 mb-8">
          Get in touch with DNounce support. We'll respond as soon as possible.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Support Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a topic</option>
                <option value="account">Account / Login</option>
                <option value="billing">Billing & Subscription</option>
                <option value="technical">Technical Issue</option>
                <option value="report">Reporting Abuse</option>
                <option value="general">General Question</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your issue or question…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-600" /> Attach Screenshot (Optional)
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
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
                <Mail className="w-4 h-4" />
                {submitting ? "Sending…" : "Send Message"}
              </button>
            </div>
          </form>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Or email us directly at{" "}
          <a href="mailto:support@dnounce.com" className="text-blue-600 hover:underline">
            support@dnounce.com
          </a>
          . Typical response time: within 24 hours.
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
