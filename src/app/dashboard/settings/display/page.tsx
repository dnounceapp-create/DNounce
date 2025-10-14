"use client";

import { useState } from "react";
import Link from "next/link";
import { Monitor, ChevronLeft } from "lucide-react";

export default function DisplaySettingsPage() {
  const [theme, setTheme] = useState("system");
  const [fontSize, setFontSize] = useState("medium");
  const [reduceMotion, setReduceMotion] = useState(false);

  const handleSave = () => {
    alert("✅ Display preferences saved!");
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
        <h1 className="text-3xl font-bold mb-2">Display</h1>
        <p className="text-gray-600 mb-8">
          Adjust the look and feel of your DNounce experience.
        </p>

        {/* Form Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          {/* Theme */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-gray-600" />
              Theme
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System Default" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    theme === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 hover:border-gray-400 bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Font Size */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Font Size</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFontSize(opt.value)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    fontSize === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 hover:border-gray-400 bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Motion Preference */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Motion</h2>
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
              <div>
                <p className="font-medium text-gray-800">Reduce Motion</p>
                <p className="text-sm text-gray-600">
                  Minimizes animations and transitions for accessibility.
                </p>
              </div>
              <button
                onClick={() => setReduceMotion(!reduceMotion)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                  reduceMotion
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {reduceMotion ? "Enabled" : "Disabled"}
              </button>
            </div>
          </section>

          {/* Preview */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Preview</h2>
            <div
              className={`p-4 rounded-xl border ${
                theme === "dark"
                  ? "bg-gray-900 text-white border-gray-800"
                  : "bg-white text-gray-800 border-gray-200"
              }`}
              style={{
                fontSize:
                  fontSize === "small"
                    ? "0.875rem"
                    : fontSize === "large"
                    ? "1.125rem"
                    : "1rem",
                transition: reduceMotion ? "none" : "all 0.3s ease",
              }}
            >
              <p>This is a live preview of your current display preferences.</p>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
