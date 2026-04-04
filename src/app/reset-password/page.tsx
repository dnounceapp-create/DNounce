"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Restore Supabase session from URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      supabase.auth
        .setSession({
          access_token: new URLSearchParams(hash.replace("#", "")).get("access_token")!,
          refresh_token: new URLSearchParams(hash.replace("#", "")).get("refresh_token")!,
        })
        .catch((err) => console.error("Session error:", err));
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Password updated successfully!");
    setTimeout(() => router.push("/loginsignup"), 2000);
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="DNounce logo" width={60} height={60} />
          <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">DNounce</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 sm:p-8 md:p-10">

          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Reset your password</h2>
            <p className="text-sm text-gray-500 mt-2">Enter a new password for your account.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="New password"
                className={`w-full h-12 px-3 border rounded-xl text-base focus:outline-none focus:ring-2 ${
                  password && password.length < 6
                    ? "border-red-400 focus:ring-red-300"
                    : "focus:ring-blue-300"
                }`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
              {password && password.length < 6 && (
                <p className="mt-1 text-xs text-red-500">Password must be at least 6 characters.</p>
              )}
              {password && password.length >= 6 && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Password looks good
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                className={`w-full h-12 px-3 border rounded-xl text-base focus:outline-none focus:ring-2 ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-400 focus:ring-red-300"
                    : "focus:ring-blue-300"
                }`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!password || password.length < 6 || password !== confirmPassword}
              className="w-full h-12 rounded-xl bg-green-600 text-white text-base font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/loginsignup" className="text-sm text-blue-600 hover:underline">
              ← Back to Login
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}