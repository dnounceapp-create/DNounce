"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuthUser } from "@/hooks/useAuth";
import Image from "next/image";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function UserSetupPage() {
  const { user, loading } = useAuthUser();
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    occupation: "",
    location: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-400 mr-2"></div>
        Loading your session...
      </div>
    );
  }

  // Handle no user (unauthenticated)
  if (!user) {
    router.replace("/loginsignup");
    return null;
  }

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updates = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        occupation: form.occupation.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        onboardingComplete: true,
      };

      const { error: updateError } = await supabase.auth.updateUser({
        data: updates,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/myrecords"), 1500);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "Something went wrong, please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-6 py-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        <Image src="/logo.png" alt="DNounce Logo" width={60} height={60} />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-gray-500 text-sm text-center max-w-md">
          Let’s personalize your DNounce experience. This information helps verify
          your identity and build trusted reputations.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-lg space-y-5 border border-gray-100"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            name="fullName"
            type="text"
            required
            placeholder="e.g., Julie Park"
            value={form.fullName}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            name="username"
            type="text"
            required
            placeholder="e.g., juliepark_"
            value={form.username}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            This will be visible to others on your profile.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Occupation
            </label>
            <input
              name="occupation"
              type="text"
              placeholder="e.g., Software Engineer"
              value={form.occupation}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              name="location"
              type="text"
              placeholder="e.g., New York, NY"
              value={form.location}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            name="bio"
            placeholder="Write a short intro about yourself..."
            value={form.bio}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-200" />
              Success!
            </>
          ) : (
            "Complete Setup"
          )}
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-400 text-center max-w-sm">
        Your information remains private and is used only to verify authenticity on DNounce.
      </p>
    </div>
  );
}
