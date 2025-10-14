"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, Upload, ChevronLeft, CheckCircle2 } from "lucide-react";

export default function ReportIssuePage() {
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return alert("Please describe the issue before submitting.");

    setSubmitted(true);
    setDescription("");
    setCategory("");
    setPriority("normal");
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
        <h1 className="text-3xl font-bold mb-2">Report an Issue</h1>
        <p className="text-gray-600 mb-8">
          Found a bug or having trouble with DNounce? Let us know below.
        </p>

        {/* Main Form Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                <option value="bug">🐞 Bug or Error</option>
                <option value="ui">🎨 UI or Display Issue</option>
                <option value="performance">⚡ Performance Problem</option>
                <option value="feature">💡 Feature Request</option>
                <option value="other">🧩 Other</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Priority Level
              </label>
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe what happened..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-gray-600" /> Attach Screenshot (Optional)
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
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
                <Flag className="w-4 h-4" />
                {submitted ? "Submitted!" : "Submit Report"}
              </button>
            </div>

            {/* Success Message */}
            {submitted && (
              <div className="flex items-center gap-2 mt-3 text-green-700 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Your report has been sent successfully!
              </div>
            )}
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-sm text-gray-500 mt-6 text-center">
          Thank you for helping us improve DNounce. Your feedback is reviewed by our dev team.
        </p>
      </div>
    </div>
  );
}
