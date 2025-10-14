"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Languages } from "lucide-react";

export default function LanguageSettingsPage() {
  const [language, setLanguage] = useState("en");

  const handleSave = () => {
    alert(`✅ Language preference saved: ${language.toUpperCase()}`);
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
        <h1 className="text-3xl font-bold mb-2">Language</h1>
        <p className="text-gray-600 mb-8">
          Choose your preferred language for the app interface and notifications.
        </p>

        {/* Form Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Languages className="w-5 h-5 text-gray-600" />
              Language Preference
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select your preferred language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English (Default)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                  <option value="de">Deutsch (German)</option>
                  <option value="zh">中文 (Chinese)</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Changing this will reload the interface in your selected language.
                </p>
              </div>
            </div>
          </section>

          {/* Preview Section */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Preview</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              {language === "en" && <p>Hello, welcome to DNounce!</p>}
              {language === "es" && <p>¡Hola, bienvenido a DNounce!</p>}
              {language === "fr" && <p>Bonjour, bienvenue sur DNounce !</p>}
              {language === "de" && <p>Hallo, willkommen bei DNounce!</p>}
              {language === "zh" && <p>你好，欢迎来到 DNounce！</p>}
              {language === "ar" && <p>مرحبًا بك في DNounce!</p>}
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
