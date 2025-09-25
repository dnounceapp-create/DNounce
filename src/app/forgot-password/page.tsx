"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!email) {
      setErrorMsg("Please enter your email.");
      return;
    }

    setLoading(true);

    // Send reset email (Supabase will use your updated template with ConfirmationURL)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage("If an account exists, a password reset link has been sent to your email.");
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
          Forgot Password
        </h2>

        {errorMsg && (
          <p className="text-red-600 text-sm text-center mb-3">{errorMsg}</p>
        )}
        {message && (
          <p className="text-green-600 text-sm text-center mb-3">{message}</p>
        )}

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-4">
          <Link href="/loginsignup" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}