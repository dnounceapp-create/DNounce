"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ShieldCheck, Mail, X, XCircle, User, Pencil, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import NextImage from "next/image";
import Cropper from "react-easy-crop";

interface PopupState {
  type: "success" | "error" | "warning" | null;
  message: string;
  visible: boolean;
}

function triggerPopup(
  setPopup: React.Dispatch<React.SetStateAction<PopupState>>,
  type: "success" | "error" | "warning",
  message: string
) {
  setPopup({ type, message, visible: true });
  setTimeout(() => setPopup((p) => ({ ...p, visible: false })), 2200);
  setTimeout(() => setPopup({ type: null, message: "", visible: false }), 2600);
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [popup, setPopup] = useState<PopupState>({
    type: null,
    message: "",
    visible: false,
  });  
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarOptionsModal, setShowAvatarOptionsModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [userIdCopied, setUserIdCopied] = useState(false);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    setSelectedImage(file);
    setShowCropModal(true);
  };

  const handleCopyUserId = async () => {
    if (!userId) return;
  
    try {
      await navigator.clipboard.writeText(userId);
      setUserIdCopied(true);
      setTimeout(() => setUserIdCopied(false), 1200);
    } catch {
      // optional: if you still want the big popup on failure
      triggerPopup(setPopup, "error", "❌ Failed to copy User ID.");
    }
  };   

  // 🖼️ Utility: Create cropped image from react-easy-crop data
  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Failed to create canvas context");

    const diameter = Math.min(pixelCrop.width, pixelCrop.height);
    canvas.width = diameter;
    canvas.height = diameter;

    ctx.beginPath();
    ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, 2 * Math.PI);
    ctx.clip();

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      diameter,
      diameter
    );

    return canvas.toDataURL("image/png");
  };

  // 🧩 Handle saving cropped image (preview only for now)
  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
  
    // 1) Get a circular PNG data URL from the cropper
    const imageDataUrl = await getCroppedImg(
      URL.createObjectURL(selectedImage),
      croppedAreaPixels
    );
  
    // 2) Convert data URL → Blob → File
    const res = await fetch(imageDataUrl);
    const blob = await res.blob();
    const file = new File([blob], "avatar.png", { type: "image/png" });
  
    // 3) Upload + save URL to DB
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      triggerPopup(setPopup, "error", "❌ Not signed in.");
      return;
    }
  
    try {
      const publicUrl = await uploadAvatarAndSaveUrl(file, userId);
  
      // 4) Update local UI
      setCroppedImage(`${publicUrl}?v=${Date.now()}`);
      setAvatarUrl(`${publicUrl}?v=${Date.now()}`);
      setShowCropModal(false);
  
      // If you have toast/message state on this page:
      triggerPopup(setPopup, "success", "✅ Profile picture updated!");

    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + (err?.message || "Failed to upload avatar."));
    }
  };
  
  async function uploadAvatarAndSaveUrl(file: File, userId: string) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar.${ext}`;
  
    const { error: uploadErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
  
    if (uploadErr) throw uploadErr;
  
    const { data: publicData } = supabase
      .storage
      .from("avatars")
      .getPublicUrl(path);
  
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) throw new Error("Could not generate public URL.");
  
    // ✅ Save via RPC (uses auth.uid() internally)
    const { error: dbErr } = await supabase.rpc("update_user_accountdetails", {
      p_avatar_url: publicUrl,
    });
  
    if (dbErr) throw dbErr;
  
    return publicUrl;
  }
  
  // helper for creating image object
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      // 🧠 Ensure we're in the browser before using Image()
      if (typeof window === "undefined") {
        reject(new Error("createImage must be called in a browser environment"));
        return;
      }
  
      const GlobalImage = window.Image || Image; // safely reference browser Image
      const image = new GlobalImage();
      image.crossOrigin = "anonymous";
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = (error) => reject(error);
    });
  
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

  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  // ✅ Load user + Account Details
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.auth.getSession();
  
      // ⚠️ Don’t redirect instantly — wait for the session check
      if (!data?.session) {
        // Try to recover session silently
        const {
          data: { user },
        } = await supabase.auth.getUser();
  
        if (!user) {
          router.replace("/loginsignup");
          return;
        }
      }
  
      const currentUser = data.session?.user || (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        router.replace("/loginsignup");
        return;
      }
  
      setUser(currentUser);
      setEmail(currentUser.email || "");
      setUserId(currentUser.id);
  
      const { data: accountdetailsData, error } = await supabase
        .from("user_accountdetails")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();
  
      if (error?.message) console.error("Supabase error:", error.message);
  
      if (accountdetailsData) {
        if (accountdetailsData.phone) {
          accountdetailsData.phone = formatPhoneNumber(accountdetailsData.phone);
        }
        setaccountDetails(accountdetailsData);
        if (accountdetailsData.avatar_url) {
          setAvatarUrl(accountdetailsData.avatar_url);
          setCroppedImage(accountdetailsData.avatar_url);
        }
      }
  
      setLoading(false);
    };
  
    loadData();
  }, [router]);
  

  // ✅ Location autocomplete (wired to /api/location)
  useEffect(() => {
    const q = accountdetails.location?.trim();
    if (!q) {
      setLocationSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(q)}`);
        if (!res.ok) {
          console.warn("⚠️ Location API failed in Account Settings:", res.status);
          setLocationSuggestions([]);
          return;
        }

        const data = await res.json();
        setLocationSuggestions(data.predictions || []);
      } catch (err) {
        console.error("Location autocomplete error:", err);
        setLocationSuggestions([]);
      }
    };

    const id = setTimeout(fetchSuggestions, 300); // debounce typing
    return () => clearTimeout(id);
  }, [accountdetails.location]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".avatar-menu-container")) {
        setShowAvatarMenu(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);  

  const handleEditClick = () => {
    setShowAuthModal(true);
  };

  // ✅ Allow editing after user verifies email link
  const enableEditing = () => {
    setIsEditing(true);
    triggerPopup(setPopup, "success", "✅ Editing enabled — you can now modify your details.");
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
      triggerPopup(setPopup, "success", "✅ Account Details updated successfully!");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + err.message);
    }
  };

  const handleEditAuth = async () => {
    if (!email) {
      triggerPopup(setPopup, "error", "❌ No email found for this account.");
      return;
    }
  
    try {
      setVerifying(true);
  
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
  
      // ✅ force UI refresh of modal step AFTER sending code
      setIsCodeSent(true);
      setShowAuthModal(true);
  
      triggerPopup(setPopup, "success", "📧 Verification code sent. Check your email.");
  
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
      triggerPopup(setPopup, "error", "❌ " + err.message);
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
      triggerPopup(setPopup, "success", "✅ Verified successfully! You can now edit your account details.");
  
      // ✅ UNLOCK INPUTS — this is the key part
      setIsEditing(true);
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ Invalid or expired code.");
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
      triggerPopup(setPopup, "success", "📧 Verification link sent to your new email. Please verify to complete the change.");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  // ✅ Reset password function
  const handleResetPassword = async () => {
    try {
      if (!email) {
        triggerPopup(setPopup, "error", "❌ Please enter a valid email address.");
        return;
      }
  
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
  
      // ✅ show confirmation modal instead of inline message
      setShowResetModal(true);
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + err.message);
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
      triggerPopup(setPopup, "success", "📧 Code sent to your current email.");

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
      triggerPopup(setPopup, "error", "❌ " + err.message);
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
      triggerPopup(setPopup, "success", "✅ Identity verified. You can now enter your new email.");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ Invalid or expired verification code.");
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
      triggerPopup(setPopup, "success", "📧 Code sent to new email.");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + err.message);
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
      triggerPopup(setPopup, "success", "✅ Your email address has been changed successfully!");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ Invalid or expired code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Step 1: Send code to current phone
  const handleSendPhoneCode = async () => {
    setIsPhoneVerified(true);
    setIsPhoneCodeSent(false);
    setPhoneCode("");
    triggerPopup(setPopup, "success", "ℹ️ Phone verification is temporarily disabled. Enter your new number.");
  };

  // Step 2: Verify current phone code
  const handleVerifyPhoneCode = async () => {
    setIsPhoneVerified(true);
    setIsPhoneCodeSent(false);
    setPhoneCode("");
    triggerPopup(setPopup, "success", "ℹ️ Phone verification is temporarily disabled. Enter your new number.");
  };

  // Step 3: Send code to new phone
  const handleSendNewPhoneCode = async () => {
    try {
      setVerifying(true);
      if (!newPhone) {
        triggerPopup(setPopup, "error", "❌ Please enter a new phone number.");
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
      triggerPopup(setPopup, "success", "✅ Phone number updated (verification disabled).");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + (err?.message || "Failed to update phone."));
    } finally {
      setVerifying(false);
    }
  };

  // Step 4: Confirm phone number update
  const handleChangePhone = async () => {
    try {
      setVerifying(true);
      if (!newPhone) {
        triggerPopup(setPopup, "error", "❌ Please enter a new phone number.");
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
      triggerPopup(setPopup, "success", "✅ Phone number updated (verification disabled).");
    } catch (err: any) {
      triggerPopup(setPopup, "error", "❌ " + (err?.message || "Failed to update phone."));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Account & Security</h1>
        <p className="text-gray-600 mb-8">
          Manage your login credentials, security settings, and account details.
        </p>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-8 transition-all">
          
          {/* 🖼️ Avatar Display */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              {avatarUrl ? (
                <NextImage
                  src={
                    avatarUrl
                      ? avatarUrl.replace("/render/image/", "/object/public/")
                      : "/default-avatar.png"
                  }
                  alt="User Avatar"
                  width={120}
                  height={120}
                  className="rounded-full object-cover border border-gray-300 shadow-sm group-hover:scale-105 transition-transform duration-200"
                  unoptimized
                />
                         
              ) : (
                <div className="relative w-28 h-28 rounded-full overflow-hidden bg-transparent flex items-center justify-center border border-gray-200 shadow-sm">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* ✏️ Pencil Icon Overlay (appears on hover) */}
              <button
                onClick={() => {
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                
                  if (avatarUrl) {
                    // If the user already has a profile picture, open the recrop/change modal
                    setShowAvatarOptionsModal(true);
                  } else {
                    // Otherwise, go straight to file picker (open gallery)
                    document.getElementById("avatar-upload")?.click();
                  }
                }}                
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white rounded-full p-2 shadow-md 
                          opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110"
              >
                <Pencil className="w-4 h-4 text-gray-600" />
              </button>

              {/* 📂 Dropdown Menu for Recrop / Change */}
              {showAvatarMenu && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50">
                  {avatarUrl && (
                    <button
                      onClick={() => {
                        setCrop({ x: 0, y: 0 });
                        setZoom(1);
                        fetch(avatarUrl)
                          .then((res) => res.blob())
                          .then((blob) => {
                            const file = new File([blob], "recrop.png", { type: "image/png" });
                            setSelectedImage(file);
                            setShowCropModal(true);
                            setShowAvatarMenu(false);
                          });
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Re-crop Current Picture
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setShowAvatarMenu(false);
                      document.getElementById("avatar-upload")?.click();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Upload New Picture
                  </button>
                </div>
              )}

              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 🆔 User ID (compact pill with copy icon) */}
          <div className="flex justify-center -mt-2 mb-6">
            {/* wrapper that lets us position the badge OUTSIDE the pill */}
            <div className="relative inline-flex items-center">
              {/* ✅ your pill stays EXACTLY the same */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700">
                <span className="text-gray-600">User ID:</span>

                <span className="font-mono text-gray-900">
                  {userId ? `${userId.slice(0, 6)}…${userId.slice(-4)}` : "—"}
                </span>

                <button
                  type="button"
                  onClick={handleCopyUserId}
                  disabled={!userId}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition disabled:opacity-50"
                  aria-label="Copy User ID"
                  title="Copy User ID"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>

              {/* ✅ outside-of-pill badge */}
              <div className="absolute left-full ml-2">
                <span
                  className={[
                    "text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap",
                    "bg-green-50 border-green-200 text-green-700",
                    "transition-opacity duration-200",
                    userIdCopied ? "opacity-100" : "opacity-0 pointer-events-none",
                  ].join(" ")}
                >
                  Copied!
                </span>
              </div>
            </div>
          </div>
 
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

            <div className="mt-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>

              <input
                disabled={!isEditing}
                type="text"
                value={accountdetails.location}
                onChange={(e) =>
                  setaccountDetails({
                    ...accountdetails,
                    location: e.target.value,
                  })
                }
                placeholder="City or neighborhood..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-blue-500"
              />

              {locationSuggestions.length > 0 && isEditing && (
                <ul className="absolute z-50 bg-white border rounded-md w-full shadow-md mt-1 max-h-60 overflow-y-auto">
                  {locationSuggestions.map((s: any, idx: number) => (
                    <li
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setaccountDetails({ ...accountdetails, location: s.description });
                        setLocationSuggestions([]);
                      }}
                    >
                      <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
                      <span className="font-semibold text-gray-800 text-sm leading-tight">
                        {s.description}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Type a city name to see neighborhoods, or neighborhood to see full location.
              </p>
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

      {/* 🖼️ Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-lg relative">
            {/* ❌ Close */}
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-all"
              onClick={() => setShowCropModal(false)}
            >
              <X className="w-5 h-5" />
            </button>

            {/* 🧠 Header */}
            <h2 className="text-2xl font-semibold text-center mb-4 text-gray-900">
              Crop Your Profile Picture
            </h2>

            {/* 🖼️ Crop Area */}
            <div className="relative w-full h-72 bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200">
              {selectedImage && (
                <Cropper
                  image={URL.createObjectURL(selectedImage)}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) =>
                    setCroppedAreaPixels(croppedAreaPixels)
                  }
                />
              )}
            </div>

            {/* 🧭 Controls */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full sm:w-2/3 accent-blue-600"
              />
              <button
                onClick={handleCropSave}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 🧩 Avatar Options Modal */}
      {showAvatarOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm relative border border-gray-200">
            {/* ❌ Close Button */}
            <button
              onClick={() => setShowAvatarOptionsModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 🧠 Header */}
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
              Profile Picture Options
            </h2>

            {/* 🪄 Buttons */}
            <div className="space-y-3">
              {/* Re-crop */}
              {avatarUrl && (
                <button
                  onClick={() => {
                    setShowAvatarOptionsModal(false);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    fetch(avatarUrl)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const file = new File([blob], "recrop.png", { type: "image/png" });
                        setSelectedImage(file);
                        setShowCropModal(true);
                      });
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl px-6 py-3 text-base font-semibold shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95"
                >
                  Re-crop Current Picture
                </button>
              )}

              {/* Change Picture */}
              <button
                onClick={() => {
                  setShowAvatarOptionsModal(false);
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                  document.getElementById("avatar-upload")?.click();
                }}
                className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl px-6 py-3 text-base font-semibold border border-gray-300 shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 transition-all active:scale-95"
              >
                Change Profile Picture
              </button>

              <button
                onClick={async () => {
                  const { data: sessionData } = await supabase.auth.getSession();
                  const userId = sessionData?.session?.user?.id;
                  if (!userId) return;

                  await supabase
                    .from("user_accountdetails")
                    .update({ avatar_url: null })
                    .eq("user_id", userId);

                  setAvatarUrl(null);
                  setCroppedImage(null);
                  setShowAvatarOptionsModal(false);
                }}
                className="w-full text-red-600 border border-red-300 rounded-xl px-6 py-3 text-base font-medium hover:bg-red-50 transition-all"
              >
                Remove Picture
              </button>

              {/* Cancel */}
              <button
                onClick={() => setShowAvatarOptionsModal(false)}
                className="w-full text-gray-600 border border-gray-300 rounded-xl px-6 py-3 text-base font-medium hover:bg-gray-50 hover:shadow-sm transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {popup.type && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 rounded-xl shadow-lg border px-6 py-3 flex items-center gap-3 z-[1000]
            ${popup.visible ? "animate-fade-in-down" : "animate-fade-out-up"}
            ${
              popup.type === "success"
                ? "bg-white border-green-200 text-green-700"
                : popup.type === "error"
                ? "bg-white border-red-200 text-red-700"
                : "bg-white border-yellow-200 text-yellow-700"
            }`}
        >
          {popup.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {popup.type === "error" && <XCircle className="w-5 h-5 text-red-500" />}
          {popup.type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
          <span className="font-medium">{popup.message}</span>
        </div>
      )}

    </div>
  );
}