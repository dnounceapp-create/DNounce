'use client';
//hi
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';

export default function LoginSignupPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const router = useRouter();

  // Google login/signup
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`, // ✅ always send through callback
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  
    if (error) alert(error.message);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    // fetch session → get user id → go to dashboard
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (userId) {
      router.replace(`/${userId}/dashboard/myrecords`);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
    });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    // If email confirmation is OFF, we’ll have a session right away
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
  
    if (userId) {
      router.replace(`/${userId}/dashboard/myrecords`);
    } else {
      alert('Check your email to confirm your account, then sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-10 py-6 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          {/* Bigger logo + word */}
          <Image src="/logo.png" alt="DNounce logo" width={80} height={80} />
          <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">DNounce</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl p-12">
          <div className="flex flex-col items-center gap-16">
            {/* Login section */}
            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
              <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded-md"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-3 py-2 border rounded-md"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />

                {/* Forgot password link */}
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Login
                </button>
              </form>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex items-center justify-center w-full px-4 py-2 border rounded-md hover:bg-gray-100"
                >
                  <img
                    src="/google-logo.svg"
                    alt="Google"
                    className="w-5 h-5 mr-2 inline-block"
                  />
                  Continue with Google
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full flex items-center justify-center">
              <div className="w-full max-w-md h-px bg-gray-300"></div>
            </div>

            {/* Signup section */}
            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
              <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>
              <form onSubmit={handleSignup} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-3 py-2 border rounded-md"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full px-3 py-2 border rounded-md"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                >
                  Create Account
                </button>
              </form>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex items-center justify-center w-full px-4 py-2 border rounded-md hover:bg-gray-100"
                >
                  <img
                    src="/google-logo.svg"
                    alt="Google"
                    className="w-5 h-5 mr-2 inline-block"
                  />
                  Sign up with Google
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}