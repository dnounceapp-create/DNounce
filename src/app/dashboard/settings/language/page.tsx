"use client";

import { useState, useEffect } from "react";
import { Languages, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const LANGUAGES = [
  { value: "en", label: "English", preview: "Hello, welcome to DNounce!" },
  { value: "es", label: "Español", preview: "¡Hola, bienvenido a DNounce!" },
  { value: "fr", label: "Français", preview: "Bonjour, bienvenue sur DNounce !" },
  { value: "de", label: "Deutsch", preview: "Hallo, willkommen bei DNounce!" },
  { value: "zh", label: "中文", preview: "你好，欢迎来到 DNounce！" },
  { value: "ar", label: "العربية", preview: "مرحبًا بك في DNounce!" },
];

export default function LanguageSettingsPage() {
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("language")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data?.language) setLanguage(data.language);
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
        .upsert({ user_id: session.user.id, language, updated_at: new Date().toISOString() });
      if (error) throw error;
      setToast({ type: "success", msg: "Language preference saved." });
    } catch (err: any) {
      setToast({ type: "error", msg: err?.message || "Failed to save." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  const preview = LANGUAGES.find((l) => l.value === language)?.preview || "";

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Language</h1>
        <p className="text-gray-600 mb-8">
          Choose your preferred language for the app interface and notifications.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Languages className="w-5 h-5 text-gray-600" />
              Language Preference
            </h2>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Changing this will reload the interface in your selected language.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Preview</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800">
              {preview}
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
