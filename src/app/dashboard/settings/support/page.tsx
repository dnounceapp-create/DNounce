"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy, Mail, Upload, ChevronLeft, CheckCircle2 } from "lucide-react";

export default function ContactSupportPage() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return alert("Please enter your message before submitting.");

    setSubmitted(true);
    setMessage("");
    setTopic("");
    setFile(null);
    setTimeout(() => setSubmitted(false), 3000);
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
        <h1 className="text-3xl font-bold mb-2">Contact Support</h1>
        <p className="text-gray-600 mb-8">
          Get in touch with DNounce support. We'll respond as soon as possible.
        </p>

        {/* Support Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Support Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a topic</option>
                <option value="account">🔒 Account / Login</option>
                <option value="billing">💳 Billing & Subscription</option>
                <option value="technical">⚙️ Technical Issue</option>
                <option value="report">🚨 Reporting Abuse</option>
                <option value="general">💬 General Question</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your issue or question..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-600" /> Attach Screenshot (Optional)
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-1">
                  Attached: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Mail className="w-4 h-4" />
                {submitted ? "Message Sent!" : "Send Message"}
              </button>
            </div>

            {/* Success Message */}
            {submitted && (
              <div className="flex items-center gap-2 mt-3 text-green-700 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Your message has been sent successfully!
              </div>
            )}
          </form>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-sm text-gray-500 text-center">
          <p>
            Or email us directly at{" "}
            <a
              href="mailto:support@dnounce.com"
              className="text-blue-600 hover:underline"
            >
              support@dnounce.com
            </a>
          </p>
          <p className="mt-2">Typical response time: within 24 hours.</p>
        </div>
      </div>
    </div>
  );
}
