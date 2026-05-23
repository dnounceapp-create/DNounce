"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle2, ChevronLeft, Pencil, X, MapPin, User, AlertTriangle } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";


function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export default function UserSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarOptionsModal, setShowAvatarOptionsModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [popup, setPopup] = useState({
    type: null as "success" | "error" | "warning" | null,
    message: "",
    visible: false,
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    job_title: "",
    organization: "",
    phone: "",
    location: "",
    bio: "",
    howFound: "",
    howFoundOther: "",
  });

  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);

  async function uploadAvatarAndSaveUrl(file: File, userId: string) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // Ensure row exists before RPC
    await supabase
      .from("user_accountdetails")
      .upsert({ user_id: userId }, { onConflict: "user_id" });

    const { error: dbErr } = await supabase.rpc("update_user_accountdetails", {
      p_user_id: userId,
      p_first_name: null,
      p_last_name: null,
      p_nickname: null,
      p_job_title: null,
      p_organization: null,
      p_phone: null,
      p_location: null,
      p_bio: null,
      p_avatar_url: publicUrl,
    });

    if (dbErr) throw dbErr;

    return publicUrl;
  }

  // ✅ Fetch location suggestions
  useEffect(() => {
    const q = form.location.trim();
    if (!q) {
      setLocationSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setLocationSuggestions([]);
          return;
        }
        const data = await res.json();
        setLocationSuggestions(data.predictions || []);
      } catch (err) {
        setLocationSuggestions([]);
      }
    };

    const id = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(id);
  }, [form.location]);

  // ---------- Guard + pre-check ----------
  useEffect(() => {
    const run = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          router.replace("/loginsignup");
          return;
        }

        // Check if already onboarded — use maybeSingle so missing row doesn't throw
        const { data: usersRow } = await supabase
          .from("users")
          .select("onboarding_complete")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (usersRow?.onboarding_complete === true) {
          router.replace("/dashboard/myrecords");
          return;
        }

        // No users row means account was deleted — sign out and go home
        if (!usersRow) {
          await supabase.auth.signOut();
          router.replace("/");
          return;
        }

        // Load existing avatar if any — maybeSingle so missing row is fine
        const { data: accountData } = await supabase
          .from("user_accountdetails")
          .select("avatar_url")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (accountData?.avatar_url) {
          setAvatarUrl(accountData.avatar_url);
          setCroppedImage(accountData.avatar_url);
        }
      } catch (err) {
        console.error("Setup guard error:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  // ---------- form handlers ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const formatted = formatPhoneNumber(value);
      if (formatted.length <= 14) {
        setForm((prev) => ({ ...prev, phone: formatted }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const cleanPhone = form.phone.replace(/\D/g, "");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not signed in.");

      // Check for duplicate phone
      const { data: existingPhone } = await supabase
        .from("user_accountdetails")
        .select("user_id")
        .eq("phone", cleanPhone)
        .neq("user_id", userId)
        .maybeSingle();

      if (existingPhone) {
        setPopup({ type: "warning", message: "This number is already associated with an account.", visible: true });
        setTimeout(() => setPopup({ type: null, message: "", visible: false }), 3500);
        setSaving(false);
        return;
      }

      const { error: rpcError } = await supabase.rpc("update_user_accountdetails", {
        p_user_id: userId,
        p_first_name: form.first_name.trim(),
        p_last_name: form.last_name.trim(),
        p_nickname: form.nickname.trim() || null,
        p_job_title: form.job_title.trim(),
        p_organization: form.organization.trim() || null,
        p_phone: cleanPhone,
        p_location: form.location.trim(),
        p_bio: form.bio?.trim() || null,
        p_avatar_url: avatarUrl || null,
      });

      if (rpcError) throw rpcError;

      // Save how_found
      if (form.howFound) {
        const howFoundValue = form.howFound === "other" && form.howFoundOther.trim()
          ? `other: ${form.howFoundOther.trim()}`
          : form.howFound;
        await supabase
          .from("users")
          .update({ how_found: howFoundValue })
          .eq("auth_user_id", userId);
      }

      // Create subject profile if none exists
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;
      const { data: existingSubject } = await supabase
        .from("subjects")
        .select("subject_uuid")
        .eq("owner_auth_user_id", userId)
        .maybeSingle();

      const { error: subjectError } = await supabase.rpc("create_subject_if_not_exists", {
        p_user_id: userId,
        p_name: fullName,
        p_nickname: form.nickname.trim() || null,
        p_organization: form.organization.trim() || null,
        p_location: form.location.trim() || null,
        p_avatar_url: avatarUrl || null,
      });

      if (subjectError) throw subjectError;

      // Mark onboarding complete
      const { error: updateError } = await supabase.rpc("mark_onboarding_complete", {
        p_user_id: userId,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/myrecords"), 1200);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "Something went wrong, please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Avatar helpers ----------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setShowCropModal(true);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("createImage must be called in a browser environment"));
        return;
      }
      const GlobalImage = window.Image || Image;
      const image = new GlobalImage();
      image.crossOrigin = "anonymous";
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = (error) => reject(error);
    });

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

  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setPopup({ type: "error", message: "❌ Not signed in.", visible: true });
      setTimeout(() => setPopup({ type: null, message: "", visible: false }), 3000);
      return;
    }

    setShowCropModal(false);
    try {
      const imageDataUrl = await getCroppedImg(
        URL.createObjectURL(selectedImage),
        croppedAreaPixels
      );

      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], "avatar.png", { type: "image/png" });

      const publicUrl = await uploadAvatarAndSaveUrl(file, userId);

      setCroppedImage(publicUrl);
      setAvatarUrl(publicUrl);
      setShowCropModal(false);

      setPopup({ type: "success", message: "✅ Profile picture updated!", visible: true });
      setTimeout(() => setPopup((p) => ({ ...p, visible: false })), 2200);
      setTimeout(() => setPopup({ type: null, message: "", visible: false }), 2600);
    } catch (err: any) {
      console.error("Avatar save error:", err);
      setPopup({
        type: "error",
        message: err?.message || "❌ Failed to upload avatar.",
        visible: true,
      });
      setTimeout(() => setPopup({ type: null, message: "", visible: false }), 3000);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="DNounce logo" width={50} height={50} />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-lg border border-gray-100">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Complete Your Account Details
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Please complete these details before accessing your dashboard.
              This helps personalize your participation while keeping your
              activity safe and respectful in community records.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Back to sign in */}
            <div className="flex justify-start mb-3">
              <Link
                href="/loginsignup"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative group">
                {croppedImage || avatarUrl ? (
                  <NextImage
                    src={(croppedImage || avatarUrl)!.replace("/render/image/", "/object/public/")}
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

                {/* Pencil Button — type=button so it never submits the form */}
                <button
                  type="button"
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    if (avatarUrl || croppedImage) {
                      setShowAvatarOptionsModal(true);
                    } else {
                      document.getElementById("avatar-upload")?.click();
                    }
                  }}
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white rounded-full p-2 shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                >
                  <Pencil className="w-4 h-4 text-gray-600" />
                </button>

                {/* Single hidden file input — consistent ID used everywhere */}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  required
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  required
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname (optional)
              </label>
              <input
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Displayed on your public profile"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Your nickname gives you a recognizable identity when engaging in the community.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                required
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="e.g., Community Health Advocate"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Shown when you participate in records — helps others understand your professional perspective.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization (optional)
              </label>
              <input
                name="organization"
                value={form.organization}
                onChange={handleChange}
                placeholder="e.g., NYC Department of Health"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                required
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 555-1234"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                required
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City or neighborhood..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {locationSuggestions.length > 0 && (
                <ul className="absolute z-50 bg-white border rounded-md w-full shadow-md mt-1 max-h-60 overflow-y-auto">
                  {locationSuggestions.map((s: any, idx: number) => (
                    <li
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, location: s.description }));
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
                Type city name to see neighborhoods, or neighborhood to see full location.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                name="bio"
                value={form.bio ?? ""}
                onChange={(e) => {
                  if (e.target.value.length <= 150) {
                    setForm((prev) => ({ ...prev, bio: e.target.value }));
                  }
                }}
                rows={3}
                placeholder="Tell people a little about yourself…"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{(form.bio ?? "").length}/150</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How did you find DNounce?
              </label>
              <select
                name="howFound"
                value={form.howFound}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select an option…</option>
                <option value="reddit">Reddit</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter / X</option>
                <option value="facebook">Facebook</option>
                <option value="friend">Friend or family</option>
                <option value="google">Google search</option>
                <option value="news">News article</option>
                <option value="other">Other</option>
              </select>
              {form.howFound === "other" && (
                <input
                  name="howFoundOther"
                  value={form.howFoundOther}
                  onChange={handleChange}
                  placeholder="Tell us how you found us…"
                  className="mt-2 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
            </div>

            <p className="text-xs text-gray-400 text-center">
              By completing setup, you agree to DNounce's{" "}
              <a href="/legal" target="_blank" className="text-blue-500 hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="/legal#privacy" target="_blank" className="text-blue-500 hover:underline">Privacy Policy</a>.
              DNounce is a neutral platform. All community verdicts are user-generated, not editorial decisions by DNounce.
            </p>

            <button
              type="submit"
              disabled={saving || success}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-200" />
                  Success!
                </>
              ) : (
                "Complete Setup"
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center max-w-sm mx-auto">
            Your details are verified privately to help maintain authentic participation.
          </p>

          {/* Avatar Options Modal */}
          {showAvatarOptionsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm relative border border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAvatarOptionsModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-all"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                  Profile Picture Options
                </h2>

                <div className="space-y-3">
                  {(avatarUrl || croppedImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAvatarOptionsModal(false);
                        setCrop({ x: 0, y: 0 });
                        setZoom(1);
                        const src = croppedImage || avatarUrl!;
                        fetch(src)
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

                  <button
                    type="button"
                    onClick={() => {
                      setShowAvatarOptionsModal(false);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      // Use the single consistent input ID
                      document.getElementById("avatar-upload")?.click();
                    }}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl px-6 py-3 text-base font-semibold border border-gray-300 shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 transition-all active:scale-95"
                  >
                    Change Profile Picture
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAvatarOptionsModal(false)}
                    className="w-full text-gray-600 border border-gray-300 rounded-xl px-6 py-3 text-base font-medium hover:bg-gray-50 hover:shadow-sm transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Crop Modal */}
          {showCropModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-lg relative">
                <button
                  type="button"
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-all"
                  onClick={() => setShowCropModal(false)}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-semibold text-center mb-4 text-gray-900">
                  Crop Your Profile Picture
                </h2>

                <div className="relative w-full h-72 bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200">
                  {selectedImage && (
                    <Cropper
                      image={URL.createObjectURL(selectedImage)}
                      crop={crop}
                      zoom={zoom}
                      minZoom={0.5}
                      maxZoom={3}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                    />
                  )}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full sm:w-2/3 accent-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleCropSave}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg active:scale-95 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Popup toast */}
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
            {popup.type === "error" && <X className="w-5 h-5 text-red-500" />}
            {popup.type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
            <span className="font-medium">{popup.message}</span>
          </div>
        )}

      </main>
    </div>
  );
}