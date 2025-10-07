"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function LoginSignupPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) router.replace("/dashboard/myrecords");
    };
    checkSession();
  }, [router]);

  // Google login
  const handleGoogle = async () => {
    if (typeof window === "undefined") return;
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

  // Email/password login
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

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    const onboarded = !!user.user_metadata?.onboardingComplete;
    router.replace(onboarded ? "/dashboard/myrecords" : "/user-setup");
  };

  // Email/password signup
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

    const { data: { session } } = await supabase.auth.getSession();
    if (session) router.replace("/user-setup");
    else alert("Check your email to confirm your account, then sign in.");
  };

  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-gray-50 flex flex-col">
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="DNounce logo" width={60} height={60} />
          <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md sm:max-w-lg bg-white shadow-xl rounded-2xl p-6 sm:p-8 md:p-10 space-y-10">
          {/* Login section */}
          <div className="w-full bg-white shadow-md rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Email"
                className="w-full h-12 px-3 border rounded-lg text-base"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                className="w-full h-12 px-3 border rounded-lg text-base"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:underline inline-block py-2"
                >
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                className="w-full h-12 rounded-lg bg-blue-600 text-white text-base font-medium hover:bg-blue-700"
              >
                Login
              </button>
            </form>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex items-center justify-center w-full h-12 px-4 border rounded-lg text-base hover:bg-gray-50"
              >
                <img
                  src="/googleicon.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2 inline-block"
                />
                Continue with Google
              </button>
            </div>
          </div>

          {/* Signup section */}
          <div className="w-full bg-white shadow-md rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>
            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Email"
                className="w-full h-12 px-3 border rounded-lg text-base"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                className="w-full h-12 px-3 border rounded-lg text-base"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
              <button
                type="submit"
                className="w-full h-12 rounded-lg bg-green-600 text-white text-base font-medium hover:bg-green-700"
              >
                Create Account
              </button>
            </form>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex items-center justify-center w-full h-12 px-4 border rounded-lg text-base hover:bg-gray-50"
              >
                <img
                  src="/googleicon.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2 inline-block"
                />
                Sign up with Google
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
