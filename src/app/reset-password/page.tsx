"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Grab access_token from query params
  const accessToken = searchParams.get("access_token");

  useEffect(() => {
    if (!accessToken) {
      setErrorMsg("Invalid or expired reset link. Please request a new one.");
    }
  }, [accessToken]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!accessToken) {
      setErrorMsg("Invalid or expired reset link.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // Exchange the access_token for a session
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: "", // recovery links don’t need refresh_token
    });

    if (sessionError || !data.session) {
      setErrorMsg("Session invalid or expired. Please request a new reset email.");
      setLoading(false);
      return;
    }

    // Now update the password
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Password updated! Redirecting to login...");
      setTimeout(() => router.push("/loginsignup"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {/* Header with logo + DNounce */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <Link href="/">
          <Image src="/logo.png" alt="DNounce Logo" width={32} height={32} />
        </Link>
        <Link href="/" className="text-xl font-bold text-gray-800">
          DNounce
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Reset Password
        </h2>

        {errorMsg && (
          <p className="text-red-600 text-sm text-center mb-3">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="text-green-600 text-sm text-center mb-3">{successMsg}</p>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
