"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, ShieldCheck, Mail, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AccountSecurityPage() {
  const router = useRouter();
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);
  const [isChangeCodeSent, setIsChangeCodeSent] = useState(false);
  const [changeEmailCode, setChangeEmailCode] = useState("");
  const [showChangePhoneModal, setShowChangePhoneModal] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneChangeCode, setPhoneChangeCode] = useState("");
  const PHONE_CHANGE_ENABLED = false;

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, ""); // Remove non-numeric chars
  
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const [accountdetails, setaccountDetails] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    job_title: "",
    organization: "",
    phone: "",
    location: "",
  });

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  // ✅ Load user + Account Details
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/loginsignup");
        return;
      }

      const currentUser = data.session.user;
      setUser(currentUser);
      setEmail(currentUser.email || "");

      const { data: accountdetailsData, error } = await supabase
        .from("user_accountdetails")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (error) console.error(error);

      if (accountdetailsData) {
        // Apply formatted phone for UI display
        if (accountdetailsData.phone) {
          accountdetailsData.phone = formatPhoneNumber(accountdetailsData.phone);
        }
        setaccountDetails(accountdetailsData);
      }
      setLoading(false);
    };

    loadData();
  }, [router]);

  // ✅ Hide success messages automatically
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleEditClick = () => {
    setShowAuthModal(true);
  };

  // ✅ Allow editing after user verifies email link
  const enableEditing = () => {
    setIsEditing(true);
    setMessage("✅ Editing enabled — you can now modify your details.");
    setMessageType("success");
  };

  // ✅ Save Account Details
  const handleSave = async () => {
    if (!isEditing) return;
  
    try {
      const cleanPhone = accountdetails.phone.replace(/\D/g, "");

      const { error: rpcError } = await supabase.rpc("update_user_accountdetails", {
        p_first_name: accountdetails.first_name.trim(),
        p_last_name: accountdetails.last_name.trim(),
        p_nickname: accountdetails.nickname.trim() || null,
        p_job_title: accountdetails.job_title.trim(),
        p_organization: accountdetails.organization.trim() || null,
        p_phone: cleanPhone, // ✅ digits only
        p_location: accountdetails.location.trim(),
      });

      if (rpcError) throw rpcError;

      setIsEditing(false);
      setMessage("✅ Account Details updated successfully!");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ " + err.message);
      setMessageType("error");
    }
  };

  const handleEditAuth = async () => {
    if (!email) {
      setMessage("❌ No email found for this account.");
      setMessageType("error");
      return;
    }
  
    try {
      setVerifying(true);
  
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
  
      // ✅ force UI refresh of modal step AFTER sending code
      setIsCodeSent(true);
      setShowAuthModal(true);
  
      setMessage("📧 Verification code sent. Check your email.");
      setMessageType("success");
  
      // Reset resend timer
      setCanResend(false);
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setMessage("❌ " + err.message);
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };  
  
  // Step 2: Verify code
  const handleVerifyCode = async () => {
    try {
      setVerifying(true);
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "email",
      });
      if (error) throw error;
  
      // ✅ Close modal and reset states
      setShowAuthModal(false);
      setIsCodeSent(false);
      setVerificationCode("");
  
      // ✅ Notify user
      setMessage("✅ Verified successfully! You can now edit your account details.");
      setMessageType("success");
  
      // ✅ UNLOCK INPUTS — this is the key part
      setIsEditing(true);
    } catch (err: any) {
      setMessage("❌ Invalid or expired code.");
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeEmail = async () => {
    try {
      setVerifying(true);
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
  
      setShowChangeEmailModal(false);
      setMessage("📧 Verification link sent to your new email. Please verify to complete the change.");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ " + err.message);
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  // ✅ Reset password function
  const handleResetPassword = async () => {
    try {
      if (!email) {
        setMessage("❌ Please enter a valid email address.");
        setMessageType("error");
        return;
      }
  
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
  
      // ✅ show confirmation modal instead of inline message
      setShowResetModal(true);
    } catch (err: any) {
      setMessage("❌ " + err.message);
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading your account...
      </div>
    );
  }

  // Step 1: Send identity code to current email
  const handleSendIdentityCode = async () => {
    try {
      setVerifying(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;

      setIsChangeCodeSent(true);
      setMessage("📧 Code sent to your current email.");
      setMessageType("success");

      // resend timer
      setCanResend(false);
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setMessage("❌ " + err.message);
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Verify identity
  const handleVerifyIdentityCode = async () => {
    try {
      setVerifying(true);
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "email",
      });
      if (error) throw error;

      setIsIdentityVerified(true);
      setIsChangeCodeSent(false);
      setVerificationCode("");
      setMessage("✅ Identity verified. You can now enter your new email.");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ Invalid or expired verification code.");
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  // Step 3: Send code to new email
  const handleSendNewEmailCode = async () => {
    try {
      setVerifying(true);
      const { error } = await supabase.auth.signInWithOtp({ email: newEmail });
      if (error) throw error;

      setIsChangeCodeSent(true);
      setMessage("📧 Code sent to new email.");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ " + err.message);
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  // Step 4: Verify new email code + update user email
  const handleVerifyNewEmailCode = async () => {
    try {
      setVerifying(true);
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: changeEmailCode,
        type: "email",
      });
      if (error) throw error;

      // ✅ Update user's email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (updateError) throw updateError;

      setShowChangeEmailModal(false);
      setIsIdentityVerified(false);
      setIsChangeCodeSent(false);
      setVerificationCode("");
      setChangeEmailCode("");

      setMessage("✅ Your email address has been changed successfully!");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ Invalid or expired code. Please try again.");
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  // Step 1: Send code to current phone
  const handleSendPhoneCode = async () => {
    setIsPhoneVerified(true);
    setIsPhoneCodeSent(false);
    setPhoneCode("");
    setMessage("ℹ️ Phone verification is temporarily disabled. Enter your new number.");
    setMessageType("success");
  };

  // Step 2: Verify current phone code
  const handleVerifyPhoneCode = async () => {
    setIsPhoneVerified(true);
    setIsPhoneCodeSent(false);
    setPhoneCode("");
    setMessage("ℹ️ Phone verification is temporarily disabled. Enter your new number.");
    setMessageType("success");
  };

  // Step 3: Send code to new phone
  const handleSendNewPhoneCode = async () => {
    try {
      setVerifying(true);
      if (!newPhone) {
        setMessage("❌ Please enter a new phone number.");
        setMessageType("error");
        return;
      }
  
      const { error } = await supabase
        .from("user_accountdetails")
        .update({ phone: newPhone })
        .eq("user_id", user.id);
  
      if (error) throw error;
  
      setaccountDetails((prev) => ({ ...prev, phone: newPhone }));
      setShowChangePhoneModal(false);
      setNewPhone("");
      setMessage("✅ Phone number updated (verification disabled).");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ " + (err?.message || "Failed to update phone."));
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  // Step 4: Confirm phone number update
  const handleChangePhone = async () => {
    try {
      setVerifying(true);
      if (!newPhone) {
        setMessage("❌ Please enter a new phone number.");
        setMessageType("error");
        return;
      }
  
      // ✅ Clean the number before saving (only digits)
      const cleanPhone = newPhone.replace(/\D/g, "");
  
      const { error } = await supabase
        .from("user_accountdetails")
        .update({ phone: cleanPhone })
        .eq("user_id", user.id);
  
      if (error) throw error;
  
      // ✅ Show formatted version in UI after saving
      const formatted = formatPhoneNumber(cleanPhone);
  
      setaccountDetails((prev) => ({ ...prev, phone: formatted }));
      setShowChangePhoneModal(false);
      setNewPhone("");
      setMessage("✅ Phone number updated (verification disabled).");
      setMessageType("success");
    } catch (err: any) {
      setMessage("❌ " + (err?.message || "Failed to update phone."));
      setMessageType("error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-2">Account & Security</h1>
        <p className="text-gray-600 mb-8">
          Manage your login credentials, security settings, and account details.
        </p>

        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
              messageType === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-8 transition-all">
          {/* Account Details Section */}
          <section>
            <h2 className="text-lg font-semibold mb-3 text-gray-900">
              Account Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  disabled={!isEditing}
                  value={accountdetails.first_name}
                  onChange={(e) =>
                    setaccountDetails({
                      ...accountdetails,
                      first_name: capitalizeFirstLetter(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  disabled={!isEditing}
                  value={accountdetails.last_name}
                  onChange={(e) =>
                    setaccountDetails({
                      ...accountdetails,
                      last_name: capitalizeFirstLetter(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname (optional)
              </label>
              <input
                disabled={!isEditing}
                value={accountdetails.nickname}
                onChange={(e) =>
                  setaccountDetails({
                    ...accountdetails,
                    nickname: capitalizeFirstLetter(e.target.value),
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                disabled={!isEditing}
                value={accountdetails.job_title}
                onChange={(e) =>
                  setaccountDetails({
                    ...accountdetails,
                    job_title: capitalizeFirstLetter(e.target.value),
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization (optional)
              </label>
              <input
                disabled={!isEditing}
                value={accountdetails.organization}
                onChange={(e) =>
                  setaccountDetails({
                    ...accountdetails,
                    organization: capitalizeFirstLetter(e.target.value),
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                disabled={!isEditing}
                value={accountdetails.location}
                onChange={(e) =>
                  setaccountDetails({
                    ...accountdetails,
                    location: capitalizeFirstLetter(e.target.value),
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </section>

          {/* Edit / Save Buttons */}
          <div className="flex justify-end pt-2">
            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
              >
                Edit Details
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
              >
                Save Changes
              </button>
            )}
          </div>

          {/* Change Phone Number */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gray-600" />
              Change Phone Number
            </h2>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-gray-700 text-sm mb-1">
                  Update the phone number linked to your account.
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {accountdetails.phone ? accountdetails.phone : "No phone number added"}
                </p>
              </div>

              <button
                onClick={() => setShowChangePhoneModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Change Phone
              </button>
            </div>
          </section>

          {/* Change Email */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-600" />
              Change Email
            </h2>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-gray-700 text-sm">Current Email</p>
                  <p className="text-gray-900 font-medium text-sm break-all">{email}</p>
                </div>

                <button
                  onClick={() => setShowChangeEmailModal(true)}
                  className="mt-3 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Change Email
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Updating your email requires verification from both your current and new addresses.
              </p>
            </div>
          </section>

          {/* Reset Password */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-600" />
              Reset Password
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-gray-700 text-sm">
                Send a password reset email to your account.
              </p>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Send Password Reset Email
              </button>
            </div>
          </section>

          {/* Security Info */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gray-600" />
              Account Security
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-gray-700 text-sm mb-1">
                Your account uses secure email-based authentication.
              </p>
              <p className="text-sm text-gray-600">
                Passwordless login with magic links or 6-digit codes keeps your
                data safe — no passwords required.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* 🔒 Secure Edit Verification Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative transform transition-all scale-100 animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowAuthModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            {!isCodeSent ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-gray-900 text-center">
                    Verify Your Identity
                  </h3>
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    To protect your account, please verify your identity before editing your Account Details.
                    <br />
                    We’ll send a secure verification code to{" "}
                    <span className="font-medium text-gray-800">{email}</span>.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditAuth}
                    disabled={verifying}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {verifying ? "Sending..." : "Send Code"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-gray-900 text-center">
                    Enter Verification Code
                  </h3>
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    We sent a 6-digit verification code to{" "}
                    <span className="font-medium text-gray-800">{email}</span>.
                    <br />
                    Enter the code below to continue.
                  </p>
                </div>

                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter your 6-digit code"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest mt-5 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  maxLength={6}
                />

                {/* Bottom row: left = resend, right = buttons */}
                <div className="mt-5 flex items-center justify-between gap-3">
                  {/* Left: resend / countdown */}
                  {!canResend ? (
                    <p className="text-xs text-gray-500">
                      You can resend a new code in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      onClick={handleEditAuth}
                      disabled={verifying}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}

                  {/* Right: back + verify */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsCodeSent(false);
                        setVerificationCode("");
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md active:scale-95 transition-all"
                    >
                      ← Back
                    </button>

                    <button
                      onClick={handleVerifyCode}
                      disabled={verifying || verificationCode.length < 6}
                      className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm active:scale-95 ${
                        verifying || verificationCode.length < 6
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {verifying ? "Verifying..." : "Verify & Continue →"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ✉️ Password Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowResetModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto bg-blue-50 text-blue-600 w-12 h-12 flex items-center justify-center rounded-full">
                <Mail className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900">
                Password Reset Email Sent
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                We’ve sent a password-reset email to <br />
                <span className="font-medium text-gray-800">{email}</span>.
                <br />Please check your inbox (and spam folder) to continue.
              </p>

              <button
                onClick={() => setShowResetModal(false)}
                className="mt-4 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all active:scale-95"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 Change Email Flow */}
      {showChangeEmailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                setShowChangeEmailModal(false);
                setIsIdentityVerified(false);
                setIsChangeCodeSent(false);
                setVerificationCode("");
                setChangeEmailCode("");
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* STEP 1: Verify Identity */}
            {!isIdentityVerified && !isChangeCodeSent && (
              <>
                <h3 className="text-2xl font-semibold text-gray-900 text-center">
                  Verify Your Identity
                </h3>
                <p className="text-sm text-gray-600 text-center mt-2 mb-4 leading-relaxed">
                  Before changing your email, please verify your identity.  
                  We’ll send a 6-digit code to your current email:{" "}
                  <span className="font-medium text-gray-800">{email}</span>.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowChangeEmailModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendIdentityCode}
                    disabled={verifying}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {verifying ? "Sending..." : "Send Code"}
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Enter identity code */}
            {!isIdentityVerified && isChangeCodeSent && (
              <>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-gray-900 text-center">
                    Enter Verification Code
                  </h3>
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    We sent a 6-digit verification code to{" "}
                    <span className="font-medium text-gray-800">{email}</span>.
                    <br />
                    Enter the code below to continue.
                  </p>
                </div>

                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter your 6-digit code"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest mt-5 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  maxLength={6}
                />

                <div className="mt-5 flex items-center justify-between gap-3">
                  {!canResend ? (
                    <p className="text-xs text-gray-500">
                      You can resend a new code in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      onClick={handleSendIdentityCode}
                      disabled={verifying}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsChangeCodeSent(false)}
                      className="px-5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md active:scale-95 transition-all"
                    >
                      ← Back
                    </button>

                    <button
                      onClick={handleVerifyIdentityCode}
                      disabled={verifying || verificationCode.length < 6}
                      className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm active:scale-95 ${
                        verifying || verificationCode.length < 6
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {verifying ? "Verifying..." : "Verify & Continue →"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: Verify New Email Code */}
            {isIdentityVerified && isChangeCodeSent && (
              <>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-gray-900 text-center">
                    Verify Your New Email
                  </h3>
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    We sent a 6-digit verification code to your <br />
                    new email:{" "}
                    <span className="font-medium text-gray-800">{newEmail}</span>.
                    <br />Enter the code below to confirm the change.
                  </p>
                </div>

                <input
                  type="text"
                  value={changeEmailCode}
                  onChange={(e) => setChangeEmailCode(e.target.value)}
                  placeholder="Enter your 6-digit code"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest mt-5 text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  maxLength={6}
                />

                <div className="mt-5 flex items-center justify-between gap-3">
                  {!canResend ? (
                    <p className="text-xs text-gray-500">
                      You can resend a new code in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      onClick={handleSendNewEmailCode}
                      disabled={verifying}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsChangeCodeSent(false);
                        setChangeEmailCode("");
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:shadow-md active:scale-95 transition-all"
                    >
                      ← Back
                    </button>

                    <button
                      onClick={handleChangeEmail}
                      disabled={verifying || changeEmailCode.length < 6}
                      className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm active:scale-95 ${
                        verifying || changeEmailCode.length < 6
                          ? "bg-blue-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {verifying ? "Verifying..." : "Confirm & Update →"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 4: Enter verification code for new email */}
            {isIdentityVerified && isChangeCodeSent && (
              <>
                <h3 className="text-2xl font-semibold text-gray-900 text-center">
                  Verify New Email
                </h3>
                <p className="text-sm text-gray-600 text-center mt-2 mb-4">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-gray-800">{newEmail}</span>.
                  <br />Enter it below to confirm your new email address.
                </p>

                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter your 6-digit code"
                  value={changeEmailCode}
                  onChange={(e) => setChangeEmailCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest text-lg font-semibold focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex justify-between mt-5 items-center">
                  {!canResend ? (
                    <p className="text-xs text-gray-500">
                      Resend available in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      onClick={handleSendNewEmailCode}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Resend Code
                    </button>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsChangeCodeSent(false);
                        setChangeEmailCode("");
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleVerifyNewEmailCode}
                      disabled={verifying || changeEmailCode.length < 6}
                      className={`px-5 py-2 rounded-lg text-white font-medium ${
                        verifying || changeEmailCode.length < 6
                          ? "bg-blue-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {verifying ? "Verifying..." : "Confirm Change"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 📱 Change Phone Number Modal */}
      {showChangePhoneModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowChangePhoneModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-semibold text-gray-900 text-center">
              Update Phone Number
            </h3>
            <p className="text-sm text-gray-600 text-center mt-2 mb-4">
              SMS verification is currently disabled. You can still update your number below.
            </p>

            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={newPhone}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setNewPhone(formatted);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              maxLength={14} // (555) 123-4567 has 14 characters
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowChangePhoneModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePhone}
                disabled={verifying || !newPhone}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {verifying ? "Saving..." : "Save Number"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}