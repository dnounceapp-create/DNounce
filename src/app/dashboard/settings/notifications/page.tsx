"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";

export default function NotificationsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [moderationAlerts, setModerationAlerts] = useState(true);

  const handleSave = () => {
    alert("✅ Notification preferences saved successfully!");
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
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-gray-600 mb-8">
          Control how and when you get notified about updates and activities on your account.
        </p>

        {/* Settings Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          {/* Notification Group */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600" />
              Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                <div>
                  <p className="font-medium text-gray-800">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates about your account via email.</p>
                </div>
                <button
                  onClick={() => setEmailAlerts(!emailAlerts)}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                    emailAlerts
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {emailAlerts ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                <div>
                  <p className="font-medium text-gray-800">Push Notifications</p>
                  <p className="text-sm text-gray-600">Allow alerts on your device or browser.</p>
                </div>
                <button
                  onClick={() => setPushAlerts(!pushAlerts)}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                    pushAlerts
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {pushAlerts ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
                <div>
                  <p className="font-medium text-gray-800">Moderation Alerts</p>
                  <p className="text-sm text-gray-600">
                    Be notified if one of your posts is under review or verified.
                  </p>
                </div>
                <button
                  onClick={() => setModerationAlerts(!moderationAlerts)}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                    moderationAlerts
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {moderationAlerts ? "Enabled" : "Disabled"}
                </button>
              </div>
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
