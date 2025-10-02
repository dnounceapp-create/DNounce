"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  console.log(
    "Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + "..."
  );
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
        <div className="flex items-center gap-2 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Error: {error.message}</span>
        </div>
      );
    } else {
      setMessage(
        <div className="flex items-start gap-2 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" />
          </svg>
          <span>
            Check your email for a password reset link.  
            It may take a few minutes, and sometimes lands in **Spam/Junk**.  
            The email will come from <strong>noreply@mail.app.supabase.io</strong>.
          </span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-10 py-6 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="DNounce logo" width={60} height={60} />
          <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Forgot Password
          </h2>
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2 border rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          {message && (
            <div className="mt-4 text-center text-sm">
              {message}
            </div>
          )}

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
