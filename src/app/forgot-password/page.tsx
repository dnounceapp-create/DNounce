"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <header className="absolute top-6 left-6 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="DNounce logo" width={48} height={48} />
          <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-center mb-6">Forgot Password</h2>

        {sent ? (
          <p className="text-center text-green-600">
            Reset link sent! Please check your email.
          </p>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2 border rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="w-full py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}