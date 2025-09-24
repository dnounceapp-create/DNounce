'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Passwords don't match.");
      return;
    }
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) setMsg(error.message);
    else {
      setMsg('✅ Password updated! Redirecting…');
      setTimeout(() => router.push('/loginsignup'), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-10 py-6 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="DNounce logo" width={80} height={80} />
          <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-center mb-6">Reset Password</h2>
          {msg && <p className="text-center text-sm mb-4 text-red-500">{msg}</p>}
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-3 py-2 border rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              className="w-full px-3 py-2 border rounded-md"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}