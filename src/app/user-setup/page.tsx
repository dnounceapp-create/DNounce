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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
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
  });

  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);

  async function uploadAvatarAndSaveUrl(file: File, userId: string) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar.${ext}`; // stable path per user
  
    // 1️⃣ Upload (overwrite allowed)
    const { error: uploadErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
  
    if (uploadErr) throw uploadErr;
  
    // 2️⃣ Get public URL
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;
  
    // 3️⃣ Ensure user_accountdetails row exists
    await supabase
      .from("user_accountdetails")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
  
    // 4️⃣ Save avatar via RPC (with p_user_id passed in)
    const { error: dbErr } = await supabase.rpc("update_user_accountdetails", {
      p_user_id: userId,
      p_first_name: null,
      p_last_name: null,
      p_nickname: null,
      p_job_title: null,
      p_organization: null,
      p_phone: null,
      p_location: null,
      p_avatar_url: publicUrl,
    });
  
    if (dbErr) throw dbErr;
  
    return publicUrl;
  }
  
  
  // ✅ Fetch location suggestions from /api/location
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
          console.warn("⚠️ Location API failed during setup:", res.status);
          setLocationSuggestions([]);
          return;
        }

        const data = await res.json();
        setLocationSuggestions(data.predictions || []);
      } catch (err) {
        console.error("Location suggestions error (setup):", err);
        setLocationSuggestions([]);
      }
    };

    const id = setTimeout(fetchSuggestions, 300); // debounce typing
    return () => clearTimeout(id);
  }, [form.location]);


  // ---------- Guard + pre-check ----------
  useEffect(() => {
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        router.replace("/loginsignup");
        return;
      }

      // if already onboarded, send to dashboard
      const { data: usersRow, error: usersErr } = await supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (!usersErr && usersRow?.onboarding_complete === true) {
        router.replace("/dashboard/myrecords");
        return;
      }

      const { data: accountData } = await supabase
        .from("user_accountdetails")
        .select("avatar_url")
        .eq("user_id", session.user.id)
        .single();

      if (accountData?.avatar_url) {
        setAvatarUrl(accountData.avatar_url);
        setCroppedImage(accountData.avatar_url);
      }

      setLoading(false);
    };

    run();
  }, [router]);

  // ---------- form handlers ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const { error: rpcError } = await supabase.rpc("update_user_accountdetails", {
        p_user_id: userId,
        p_first_name: form.first_name.trim(),
        p_last_name: form.last_name.trim(),
        p_nickname: form.nickname.trim() || null,
        p_job_title: form.job_title.trim(),
        p_organization: form.organization.trim() || null,
        p_phone: cleanPhone,
        p_location: form.location.trim(),
        p_avatar_url: avatarUrl || null,
      });


      if (rpcError) throw rpcError;

      if (userId) {
        console.log("👤 Current user ID before mark_onboarding_complete:", userId);
      
        const { error: updateError } = await supabase.rpc("mark_onboarding_complete", {
          p_user_id: userId,
        });
      
        console.log("✅ mark_onboarding_complete result:", updateError);
        if (updateError) throw updateError;
      }      

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/myrecords"), 1200);
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "Something went wrong, please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-400 mr-2" />
        Loading your session...
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setShowCropModal(true);
  };
  
  // createImage helper
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
  
  // cropper → dataURL
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
  
  // save cropped preview (for now)
  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
  
    // 1️⃣ Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      setPopup({ type: "error", message: "❌ Not signed in." });
      setTimeout(() => setPopup({ type: null, message: "" }), 3000);
      return;
    }
  
    try {
      // 2️⃣ Crop the image
      const imageDataUrl = await getCroppedImg(
        URL.createObjectURL(selectedImage),
        croppedAreaPixels
      );
  
      // 3️⃣ Convert to File
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], "avatar.png", { type: "image/png" });
  
      // 4️⃣ Upload and save
      const publicUrl = await uploadAvatarAndSaveUrl(file, userId);
  
      // 5️⃣ Update UI
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
      });
      setTimeout(() => setPopup({ type: null, message: "" }), 3000);
    }
  };
  
  return (
    <div className="min-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-gray-50 flex flex-col">
      {/* 🧭 Top Bar (same as Login/Signup) */}
      <header className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="DNounce logo" width={50} height={50} />
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            DNounce
          </span>
        </Link>
      </header>

      {/* 🧱 Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-lg border border-gray-100">

          {/* Header intro */}
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

          {/* Form */}
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

                {/* ✏️ Pencil Button */}
                <button
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    if (avatarUrl) setShowAvatarOptionsModal(true);
                    else document.getElementById("avatar-upload")?.click();
                  }}
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-white rounded-full p-2 shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                >
                  <Pencil className="w-4 h-4 text-gray-600" />
                </button>

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
                Your nickname gives you a recognizable identity when engaging
                in the community.
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
                Shown when you participate in records — helps others understand
                your professional perspective.
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
                placeholder="+1 555 555 1234"
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

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 disabled:opacity-60"
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
            Your details are verified privately to help maintain authentic
            participation.
          </p>

          {showAvatarOptionsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-sm relative border border-gray-200">
                <button
                  onClick={() => setShowAvatarOptionsModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-all"
                  aria-label="Close"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                  Profile Picture Options
                </h2>

                <div className="space-y-3">
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
                      type="button"
                    >
                      Re-crop Current Picture
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowAvatarOptionsModal(false);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      document.getElementById("avatar-upload-setup")?.click();
                    }}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-xl px-6 py-3 text-base font-semibold border border-gray-300 shadow-sm hover:shadow-md hover:from-gray-200 hover:to-gray-300 transition-all active:scale-95"
                    type="button"
                  >
                    Change Profile Picture
                  </button>

                  <button
                    onClick={() => setShowAvatarOptionsModal(false)}
                    className="w-full text-gray-600 border border-gray-300 rounded-xl px-6 py-3 text-base font-medium hover:bg-gray-50 hover:shadow-sm transition-all active:scale-95"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCropModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-lg relative">
                <button
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-all"
                  onClick={() => setShowCropModal(false)}
                  aria-label="Close"
                  type="button"
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
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {popup.type && (
          <div
            className={`fixed top-6 left-1/2 -translate-x-1/2 rounded-xl shadow-lg border px-6 py-3 flex items-center gap-3 z-[1000]
              ${
                popup.visible
                  ? "animate-fade-in-down"
                  : "animate-fade-out-up"
              }
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
