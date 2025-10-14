"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, User, Mail, Hash } from "lucide-react";

export default function ProfileInfoPage() {
  const [displayName, setDisplayName] = useState("John Doe");
  const [username, setUsername] = useState("johndoe");
  const [email, setEmail] = useState("user@example.com");

  const handleSave = () => {
    alert("✅ Profile information saved successfully!");
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
        <h1 className="text-3xl font-bold mb-2">Profile Info</h1>
        <p className="text-gray-600 mb-8">
          Update your personal details that appear on your DNounce profile.
        </p>

        {/* Form Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          {/* Basic Info */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              Personal Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">
                    <Hash className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Usernames must be unique and contain only letters, numbers, or underscores.
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">
                  Email (Read-Only)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-9 p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Public Info */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Public Visibility</h2>
            <p className="text-sm text-gray-600 mb-3">
              Your display name and username may appear publicly on records you’ve submitted.
            </p>

            <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Show Profile Publicly</p>
                <p className="text-sm text-gray-600">Your basic info is visible to other users.</p>
              </div>
              <span className="text-green-700 bg-green-100 border border-green-300 text-sm px-3 py-1 rounded-full">
                Enabled
              </span>
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
