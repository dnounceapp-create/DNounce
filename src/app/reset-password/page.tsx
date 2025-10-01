"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

  // Google login
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      console.error("OAuth error:", error);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav bar with logo */}
      <header className="flex items-center justify-between px-10 py-6 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="DNounce logo" width={60} height={60} />
          <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* Reset form */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Reset Password
          </h2>
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-3 py-2 border rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full px-3 py-2 border rounded-md"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              Update Password
            </button>
          </form>

          {error && (
            <p className="mt-4 text-red-600 text-sm text-center">{error}</p>
          )}
          {success && (
            <p className="mt-4 text-green-600 text-sm text-center">{success}</p>
          )}

          {/* Divider */}
          <div className="w-full flex items-center justify-center my-6">
            <div className="w-full h-px bg-gray-300" />
          </div>

          {/* Google login button */}
          <div>
            <button
              type="button"
              onClick={handleGoogle}
              className="flex items-center justify-center w-full px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              <Image
                src="/googleicon.svg"
                alt="Google"
                width={20}
                height={20}
                className="mr-2 inline-block"
              />
              Continue with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/loginsignup"
              className="text-blue-600 hover:underline text-sm"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
