"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function UserSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    job_title: "",
    organization: "",
    phone: "",
    location: "",
  });

  // ---------- Guard + pre-check ----------
  useEffect(() => {
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        router.replace("/loginsignup");
        return;
      }

      // if already onboarded, send to dashboard
      const { data: usersRow, error: usersErr } = await supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (!usersErr && usersRow?.onboarding_complete === true) {
        router.replace("/dashboard/myrecords");
        return;
      }

      setLoading(false);
    };

    run();
  }, [router]);

  // ---------- form handlers ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
  
    if (name === "phone") {
      const formatted = formatPhoneNumber(value);
      if (formatted.length <= 14) {
        setForm((prev) => ({ ...prev, phone: formatted }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const cleanPhone = form.phone.replace(/\D/g, "");

      const { error: rpcError } = await supabase.rpc("update_user_accountdetails", {
        p_first_name: form.first_name.trim(),
        p_last_name: form.last_name.trim(),
        p_nickname: form.nickname.trim() || null,
        p_job_title: form.job_title.trim(),
        p_organization: form.organization.trim() || null,
        p_phone: cleanPhone,
        p_location: form.location.trim(),
      });

      if (rpcError) throw rpcError;

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ onboarding_complete: true })
          .eq("id", userId);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/myrecords"), 1200);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "Something went wrong, please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-400 mr-2" />
        Loading your session...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-gray-50 flex flex-col">
      {/* 🧭 Top Bar (same as Login/Signup) */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="DNounce logo" width={50} height={50} />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* 🧱 Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-lg border border-gray-100">

          {/* Header intro */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Complete Your Account Details
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Please complete these details before accessing your dashboard.
              This helps personalize your participation while keeping your
              activity safe and respectful in community records.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Back to sign in */}
            <div className="flex justify-start mb-3">
              <Link
                href="/loginsignup"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  required
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  required
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname (optional)
              </label>
              <input
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Displayed on your public profile"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Your nickname gives you a recognizable identity when engaging
                in the community.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                required
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="e.g., Community Health Advocate"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Shown when you participate in records — helps others understand
                your professional perspective.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization (optional)
              </label>
              <input
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="e.g., NYC Department of Health"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                required
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 555 1234"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                required
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g., Queens, NY"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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

          <p className="mt-6 text-xs text-gray-400 text-center max-w-sm mx-auto">
            Your details are verified privately to help maintain authentic
            participation.
          </p>
        </div>
      </main>
    </div>
  );
}
