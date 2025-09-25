"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert("Invalid or expired reset link.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      alert(error.message);
    } else {
      alert("Password reset successful! Please log in.");
      window.location.href = "/loginsignup";
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
        <h2 className="text-2xl font-semibold text-center mb-6">Reset Password</h2>
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            className="w-full px-3 py-2 border rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}