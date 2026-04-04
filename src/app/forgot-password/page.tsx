"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<React.ReactNode>("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      );
    } else {
      setMessage(
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          <Mail className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Check your email</p>
            <p>
              A reset link is on its way. It may take a few minutes — check your{" "}
              <span className="font-semibold">Spam</span> or{" "}
              <span className="font-semibold">Junk</span> folder if you don't see it.
              The email comes from{" "}
              <span className="font-semibold">support@dnounce.com</span>.
            </p>
          </div>
        </div>
      );
    }

    setLoading(false);
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
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Forgot your password?</h2>
            <p className="text-sm text-gray-500 mt-2">Enter your email and we'll send you a reset link.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full h-12 px-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 text-white text-base font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>

          {message && <div className="mt-5">{message}</div>}

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