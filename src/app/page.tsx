"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, HelpCircle, Activity, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const faqs = [
  {
    q: "How do I submit a record?",
    a: "Sign in, go to your dashboard, and click 'Submit Record'. You'll be guided through the process step by step.",
  },
  {
    q: "How long does the credibility review take?",
    a: "Up to 72 hours. Our language classification system analyzes your submission and labels it as Evidence-Based, Opinion-Based, or Unable to Verify.",
  },
  {
    q: "I'm a subject — how do I dispute a record?",
    a: "Once you're notified of a record, log in and request deletion from your dashboard. This triggers a 72-hour debate window between you and the contributor, followed by a community vote.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. Go to Settings → scroll all the way down → Delete Account. Your login and personal details are removed immediately. Records you submitted may remain as they involve other parties.",
  },
  {
    q: "Can I edit a record after submitting it?",
    a: "No. Once submitted, records cannot be edited to preserve integrity. If you made a significant error, contact us at support@dnounce.com.",
  },
  {
    q: "Why was my record labeled 'Unable to Verify'?",
    a: "This means the language in your submission didn't contain enough factual anchors (dates, reference numbers, documented events) to be classified as Evidence-Based, and not enough opinion language to be Opinion-Based. Adding more specific detail in a future submission helps.",
  },
  {
    q: "How does the community vote work?",
    a: "After a 72-hour debate between the contributor and subject, the community votes to keep or delete the record. Your vote explanation is also judged — poor explanations can result in a Low-Quality Voter badge.",
  },
  {
    q: "I think a record about me is false. What can I do?",
    a: "Use the dispute process — it's designed exactly for this. If you believe the record is defamatory and want to pursue legal action against the contributor, consult a lawyer. We'll cooperate with valid legal processes.",
  },
  {
    q: "My account was suspended. What do I do?",
    a: "Email support@dnounce.com with your account details and a clear explanation. We'll review and get back to you within 3 business days.",
  },
  {
    q: "How do I claim my subject profile?",
    a: "Profile claiming is coming soon. You'll be able to verify ownership of your profile and manage how it appears on DNounce.",
  },
];

export default function SupportPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error: insertError } = await supabase.from("support_tickets").insert({
        user_id: session?.user?.id ?? null,
        type: "support",
        topic: topic.trim(),
        category,
        message: message.trim(),
        status: "open",
        priority: "normal",
        admin_note: !session?.user && email.trim() ? `Contact email: ${email.trim()}` : null,
      });

      if (insertError) throw insertError;
      setSubmitted(true);
      setTopic(""); setEmail(""); setMessage(""); setCategory("general");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try emailing us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to DNounce</Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
          <p className="text-gray-500">We're here to help. Find answers below or reach out directly.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Contact Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <a
            href="mailto:support@dnounce.com"
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition group"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="font-semibold text-gray-900 mb-1">Email Us</div>
            <div className="text-sm text-gray-500">
              Send us an email at <span className="text-blue-600">support@dnounce.com</span>. We respond within 2–3 business days.
            </div>
          </a>

          <button
            onClick={() => {
              setShowForm(true);
              setSubmitted(false);
              setTimeout(() => document.getElementById("ticket-form")?.scrollIntoView({ behavior: "smooth" }), 100);
            }}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition group text-left"
          >
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="font-semibold text-gray-900 mb-1">Submit a Ticket</div>
            <div className="text-sm text-gray-500">
              Fill out a short form and we'll get back to you. No account required.
            </div>
          </button>
        </div>

        {/* Inline Ticket Form */}
        {showForm && (
          <div id="ticket-form" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket submitted!</h3>
                <p className="text-sm text-gray-500 mb-6">We'll get back to you within 2–3 business days.</p>
                <button
                  onClick={() => { setShowForm(false); setSubmitted(false); }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Submit another ticket
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Submit a Ticket</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What's your question about?"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General Question</option>
                      <option value="account">Account Issue</option>
                      <option value="record">Record / Submission</option>
                      <option value="dispute">Dispute / Deletion</option>
                      <option value="technical">Technical Problem</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue or question in as much detail as possible..."
                      rows={5}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Your Email <span className="text-gray-400 font-normal text-xs">(optional — only needed if you're not logged in)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="so we can reply to you"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Common Questions</h2>
          </div>
          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                <div className="font-semibold text-gray-900 mb-1.5 text-sm">{faq.q}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Status */}
        <div id="status" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Platform Status</h2>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700">All systems operational</span>
          </div>
          <p className="text-sm text-gray-500">
            If you're experiencing an issue and everything shows as operational, it may be account-specific. Email us at{" "}
            <a href="mailto:support@dnounce.com" className="text-blue-600 hover:underline">support@dnounce.com</a>.
          </p>
        </div>

        <div className="text-center text-sm text-gray-400 pb-4">
          Still stuck? Email{" "}
          <a href="mailto:support@dnounce.com" className="text-blue-600 hover:underline">support@dnounce.com</a>{" "}
          and a real person will get back to you.
        </div>

      </div>
    </div>
  );
}