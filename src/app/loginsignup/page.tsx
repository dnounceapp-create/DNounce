"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import type { Factor } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2 } from "lucide-react";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginSignupPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const router = useRouter();
  const [fromDemo, setFromDemo] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromDemo(params.get("from") === "demo");
  }, []);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);

  // ── Redirect if already logged in ──────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      const onboarded = !!user.user_metadata?.onboardingComplete;
      if (!onboarded) { router.replace("/user-setup"); return; }
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirectTo");
      router.replace(redirectTo || "/dashboard/myrecords");
    };
    checkSession();
  }, []);

  // ── After login redirect ────────────────────────────────────────────────────
  const afterLoginRedirect = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;
    const onboarded = !!user.user_metadata?.onboardingComplete;
    if (!onboarded) { router.replace("/user-setup"); return; }
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get("redirectTo");
    router.replace(redirectTo || "/dashboard/myrecords");
  };

  // ── Google login ────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (typeof window === "undefined") return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setLoginError("Google login failed: " + error.message);
  };

  // ── Email / phone login ─────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    // Resolve phone → email if needed
    let emailToUse = loginEmail.trim();

    if (!isValidEmail(emailToUse)) {
      const cleanPhone = emailToUse.replace(/\D/g, "");
      const { data: accountData } = await supabase
        .from("user_accountdetails")
        .select("user_id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (!accountData) {
        setAuthLoading(false);
        setLoginError("No account found with that phone number.");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("email")
        .eq("id", accountData.user_id)
        .maybeSingle();

      if (!userData?.email) {
        setAuthLoading(false);
        setLoginError("Could not find an email linked to that phone number.");
        return;
      }

      emailToUse = userData.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: loginPassword,
    });

    if (signInError) {
      setAuthLoading(false);

      if (signInError.message === "Invalid login credentials") {
        // Check if email exists in our DB to give a smarter message
        const { data: accountExists } = await supabase
          .from("user_accountdetails")
          .select("user_id")
          .eq("email", emailToUse)
          .maybeSingle();

        if (accountExists) {
          setLoginError("Account found but the password is incorrect. Try again or reset your password.");
        } else {
          setLoginError("No account found with that email or phone number.");
        }
      } else {
        setLoginError(signInError.message);
      }
      return;
    }

    // Check MFA
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      setAuthLoading(false);
      await afterLoginRedirect();
      return;
    }

    const verifiedTotp = (factorsData?.all || []).find(
      (f: Factor) => f.factor_type === "totp" && f.status === "verified"
    );

    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setMfaRequired(true);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(false);
    await afterLoginRedirect();
  };

  // ── MFA verify ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    if (!factorId) {
      setOtpError("No TOTP factor available on this account.");
      return;
    }
    setAuthLoading(true);

    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: otp.trim(),
    });

    setAuthLoading(false);

    if (mfaError) {
      setOtpError(mfaError.message || "Invalid code, please try again.");
      return;
    }

    await afterLoginRedirect();
  };

  // ── Signup ──────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    const res = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `https://www.dnounce.com/loginsignup`,
      },
    });

    if (res.error) {
      const msg = res.error.message.toLowerCase();

      if (msg.includes("already registered") || msg.includes("user already exists")) {
        // Try silent login — credentials might match
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword,
        });

        if (!loginErr) {
          // Credentials matched — log them in silently
          await afterLoginRedirect();
          return;
        }

        // Email exists but wrong password
        setSignupError("This email already exists. The password you entered is incorrect — try logging in instead.");
      } else {
        setSignupError(res.error.message);
      }
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      router.replace("/user-setup");
    } else {
      setSignupPassword("");
      setShowEmailSent(true);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="DNounce logo" width={60} height={60} />
          <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">DNounce</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md sm:max-w-lg">
          {fromDemo && (
            <button
              type="button"
              onClick={() => router.push("/demo")}
              className="mb-4 text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              ← Back to demo
            </button>
          )}
          <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 md:p-10 space-y-10">

          {/* ── Login ── */}
          <div className="w-full bg-white shadow-md rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-center mb-6">
              {mfaRequired ? "Two-Factor Authentication" : "Login"}
            </h2>

            {mfaRequired ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Enter the 6-digit code from your authenticator app.
                </p>

                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  className="w-full h-12 px-3 border rounded-lg text-center tracking-widest text-lg"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setOtpError(null); }}
                  autoFocus
                />

                {otpError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {otpError}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:underline"
                    onClick={() => { setMfaRequired(false); setOtp(""); setFactorId(null); setOtpError(null); }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading || otp.length !== 6}
                    className="h-12 px-5 rounded-lg bg-blue-600 text-white text-base font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {authLoading ? "Verifying…" : "Verify Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="Email or phone number"
                  className="w-full h-12 px-3 border rounded-lg text-base focus:ring-blue-300 focus:outline-none focus:ring-2"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null); }}
                />

                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  className="w-full h-12 px-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null); }}
                />

                {loginError && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm border ${
                    loginError.includes("password is incorrect")
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {loginError}
                  </div>
                )}

                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline inline-block py-2">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !loginEmail.trim() || !loginPassword}
                  className="w-full h-12 rounded-lg bg-blue-600 text-white text-base font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? "Signing in…" : "Login"}
                </button>
              </form>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex items-center justify-center w-full h-12 px-4 border rounded-lg text-base hover:bg-gray-50"
              >
                <img src="/googleicon.svg" alt="Google" className="w-5 h-5 mr-2 inline-block" />
                Continue with Google
              </button>
            </div>
          </div>

          {/* ── Signup ── */}
          <div className="w-full bg-white shadow-md rounded-xl p-6 sm:p-8">
            {showEmailSent ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
                <p className="text-sm text-gray-600">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-gray-900">{signupEmail || "your email"}</span>.
                  Click the link to activate your account and get started.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 text-left">
                  <span className="font-semibold">📬 Don't see it?</span> Check your{" "}
                  <span className="font-semibold">Spam</span> or{" "}
                  <span className="font-semibold">Junk</span> folder. The email comes from{" "}
                  <span className="font-medium">support@dnounce.com</span>.
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailSent(false)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Back to sign up
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="Email"
                      className={`w-full h-12 px-3 border rounded-lg text-base ${
                        signupEmail && !isValidEmail(signupEmail)
                          ? "border-red-400 focus:ring-red-300"
                          : "focus:ring-blue-300"
                      } focus:outline-none focus:ring-2`}
                      value={signupEmail}
                      onChange={(e) => { setSignupEmail(e.target.value); setSignupError(null); }}
                    />
                    {signupEmail && !isValidEmail(signupEmail) && (
                      <p className="mt-1 text-xs text-red-500">Please enter a valid email address.</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Password"
                      className={`w-full h-12 px-3 border rounded-lg text-base ${
                        signupPassword && signupPassword.length < 6
                          ? "border-red-400 focus:ring-red-300"
                          : "focus:ring-blue-300"
                      } focus:outline-none focus:ring-2`}
                      value={signupPassword}
                      onChange={(e) => { setSignupPassword(e.target.value); setSignupError(null); }}
                    />
                    {signupPassword && signupPassword.length < 6 && (
                      <p className="mt-1 text-xs text-red-500">Password must be at least 6 characters.</p>
                    )}
                    {signupPassword && signupPassword.length >= 6 && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Password looks good
                      </p>
                    )}
                  </div>

                  {signupError && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm border ${
                      signupError.includes("already exists")
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {signupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isValidEmail(signupEmail) || signupPassword.length < 6}
                    className="w-full h-12 rounded-lg bg-green-600 text-white text-base font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <img src="/googleicon.svg" alt="Google" className="w-5 h-5 mr-2 inline-block" />
                    Sign up with Google
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}