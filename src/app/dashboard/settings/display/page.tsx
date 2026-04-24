"use client";

import { useState, useEffect } from "react";
import { Monitor, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function DisplaySettingsPage() {
  const [theme, setTheme] = useState("system");
  const [fontSize, setFontSize] = useState("medium");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("theme, font_size, reduce_motion")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) {
        if (data.theme) setTheme(data.theme);
        if (data.font_size) setFontSize(data.font_size);
        setReduceMotion(!!data.reduce_motion);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not signed in.");
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: session.user.id,
          theme,
          font_size: fontSize,
          reduce_motion: reduceMotion,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setToast({ type: "success", msg: "Display preferences saved." });
    } catch (err: any) {
      setToast({ type: "error", msg: err?.message || "Failed to save." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  // loading removed

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Display</h1>
        <p className="text-gray-600 mb-8">Adjust the look and feel of your DNounce experience.</p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-gray-600" />
              Theme
            </h2>
            <div className="grid grid-cols-3 gap-3">
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
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-400 bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Font Size</h2>
            <div className="grid grid-cols-3 gap-3">
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
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-400 bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Motion</h2>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">Reduce Motion</p>
                <p className="text-xs text-gray-500 mt-0.5">Minimizes animations for accessibility.</p>
              </div>
              <button
                onClick={() => setReduceMotion(!reduceMotion)}
                className={`shrink-0 px-4 py-1 rounded-full text-sm font-medium transition-all ${
                  reduceMotion
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {reduceMotion ? "Enabled" : "Disabled"}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Preview</h2>
            <div
              className={`p-4 rounded-xl border ${
                theme === "dark" ? "bg-gray-900 text-white border-gray-800" : "bg-gray-50 text-gray-800 border-gray-200"
              }`}
              style={{
                fontSize: fontSize === "small" ? "0.875rem" : fontSize === "large" ? "1.125rem" : "1rem",
                transition: reduceMotion ? "none" : "all 0.3s ease",
              }}
            >
              This is a live preview of your current display preferences.
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
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
