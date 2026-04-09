"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import {
  AlertTriangle,
  Upload,
  MapPin,
  FileText,
  User,
  X,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Star,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { classifyRecord } from "@/lib/ai/classifyRecord";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/** ——— Subject Search Types ——— */
type UserPreview = {
  kind: "user";
  user_id: string; // auth user id
  subject_uuid: string; // subjects.subject_uuid for that DNounce user
  name: string;
  nickname?: string | null;
  organization?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
};

type ExternalSubjectPreview = {
  kind: "external";
  id: string; // subjects.subject_uuid (or temp-*)
  name: string;
  nickname?: string | null;
  organization?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
};

type PersonPreview = UserPreview | ExternalSubjectPreview;

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
    return <ImageIcon className="w-4 h-4 text-gray-500" />;
  }
  if (["mp4", "mov", "avi", "mkv"].includes(ext || "")) {
    return <Video className="w-4 h-4 text-gray-500" />;
  }
  if (["pdf", "doc", "docx"].includes(ext || "")) {
    return <FileText className="w-4 h-4 text-gray-500" />;
  }
  return <FileIcon className="w-4 h-4 text-gray-500" />;
}

function capitalizeWords(value: string) {
  return value
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return digits;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* ——— Page Component ——— */
export default function SubmitRecordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectIdFromUrl = searchParams.get("subject_id");

  // form fields
  const [submitPhone, setSubmitPhone] = useState("");
  const [submitEmail, setSubmitEmail] = useState("");
  const [submitFirstName, setSubmitFirstName] = useState("");
  const [submitLastName, setSubmitLastName] = useState("");
  const [submitNickname, setSubmitNickname] = useState("");
  const [submitOrganization, setSubmitOrganization] = useState("");
  const [submitRelationship, setSubmitRelationship] = useState("");
  const [submitOtherRelationship, setSubmitOtherRelationship] = useState("");
  const [submitCategory, setSubmitCategory] = useState("");
  const [submitLocation, setSubmitLocation] = useState("");
  const [submitLocationSuggestions, setSubmitLocationSuggestions] = useState<any[]>([]);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [relLoading, setRelLoading] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<any[]>([]);

  const [rating, setRating] = useState<number>(0);
  const [lastTappedStar, setLastTappedStar] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const termsRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const subjectInfoRef = useRef<HTMLDivElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  // Identity preference (required)
  const [identityPreference, setIdentityPreference] = useState<"hide" | "show">("hide"); // default hide
  const [identityTouched, setIdentityTouched] = useState(false);
  
  // confirm when changing after initial choice
  const [confirmIdentityOpen, setConfirmIdentityOpen] = useState(false);
  const pendingIdentity = useRef<"hide" | "show" | null>(null);  

  // selection
  const [selectedPerson, setSelectedPerson] = useState<PersonPreview | null>(null);
  const [tempSubject, setTempSubject] = useState<ExternalSubjectPreview | null>(null);

  // auto-search results
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoSearched, setAutoSearched] = useState(false);

  const [userResults, setUserResults] = useState<UserPreview[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalSubjectPreview[]>([]);

  const phoneDigits = submitPhone.replace(/\D/g, "");
  const emailNorm = submitEmail.trim().toLowerCase();
  const hasPhoneOrEmail = phoneDigits.length > 0 || emailNorm.length > 0;

  const isTempExternal =
    selectedPerson?.kind === "external" && selectedPerson.id.startsWith("temp-");
  const isAnyNonTempSelected = !!selectedPerson && !isTempExternal;

  const isRealSelected =
    !!selectedPerson &&
    (selectedPerson.kind === "user" ||
      (selectedPerson.kind === "external" && !selectedPerson.id.startsWith("temp-")));

  const selectedPhone = selectedPerson?.phone
    ? selectedPerson.phone.replace(/\D/g, "")
    : "";
  const selectedEmail = selectedPerson?.email
    ? selectedPerson.email.trim().toLowerCase()
    : "";

  const combinedResults: PersonPreview[] =
    userResults.length > 0 ? userResults : externalResults;

  const showHelperMatchText =
    autoSearched && !autoLoading && !selectedPerson && combinedResults.length > 0;

  const canShowCreateSubjectCTA =
    autoSearched &&
    !autoLoading &&
    !selectedPerson &&
    hasPhoneOrEmail &&
    combinedResults.length === 0;

  // ✅ Override helpers: if input has value use it, else fall back to selectedPerson
  const pickText = (input: string, fallback?: string | null) => {
    const v = (input ?? "").trim();
    return v ? v : (fallback ?? null);
  };

  const pickPhone = (input: string, fallback?: string | null) => {
    const v = (input ?? "").replace(/\D/g, "");
    const fb = (fallback ?? "").replace(/\D/g, "");
    return v ? v : fb;
  };

  const pickEmail = (input: string, fallback?: string | null) => {
    const v = (input ?? "").trim().toLowerCase();
    const fb = (fallback ?? "").trim().toLowerCase();
    return v ? v : fb;
  };

  // keep temp subject in sync with form fields (if they created temp)
  useEffect(() => {
    if (!tempSubject) return;
    const updated: ExternalSubjectPreview = {
      ...tempSubject,
      name: `${submitFirstName} ${submitLastName}`.trim() || "(Unnamed Subject)",
      nickname: submitNickname || null,
      organization: submitOrganization || null,
      location: submitLocation || null,
      phone: submitPhone ? submitPhone.replace(/\D/g, "") : null,
      email: submitEmail ? submitEmail.trim().toLowerCase() : null,
    };
    setTempSubject(updated);
    setSelectedPerson(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    submitFirstName,
    submitLastName,
    submitNickname,
    submitOrganization,
    submitLocation,
    submitPhone,
    submitEmail,
  ]);

  // relationship types
  useEffect(() => {
    async function fetchRelationshipTypes() {
      setRelLoading(true);
      try {
        const [mainRes, otherRes] = await Promise.all([
          supabase
            .from("relationship_types")
            .select("id, label, value")
            .order("label", { ascending: true }),
          supabase
            .from("relationship_types_other")
            .select("id, custom_value")
            .order("custom_value", { ascending: true }),
        ]);

        const combined = [
          ...(mainRes.data?.map((r) => ({ id: r.id, label: r.label, value: r.value })) || []),
          ...(otherRes.data?.map((r) => ({ id: r.id, label: r.custom_value, value: r.custom_value })) || []),
        ];

        const dedup = Array.from(
          new Map(
            combined
              .filter((r) => r?.label)
              .map((r) => [r.label.trim().toLowerCase(), r])
          ).values()
        ).sort((a, b) => a.label.localeCompare(b.label));

        setRelationshipTypes(dedup);
      } catch (err) {
        console.error("Unexpected error fetching relationship types:", err);
        setRelationshipTypes([]);
      } finally {
        setRelLoading(false);
      }
    }
    fetchRelationshipTypes();
  }, []);

  /* ——— Location Autocomplete ——— */
  useEffect(() => {
    const q = submitLocation.trim();
    if (!q) {
      setSubmitLocationSuggestions([]);
      return;
    }

    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSubmitLocationSuggestions([]);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setSubmitLocationSuggestions(data?.predictions || []);
      } catch {
        setSubmitLocationSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(id);
  }, [submitLocation]);

  /* ——— Preselect subject by URL subject_id ——— */
  useEffect(() => {
    if (!subjectIdFromUrl) return;
    if (selectedPerson) return;

    (async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("subject_uuid, name, nickname, organization, location, avatar_url, phone, email")
        .eq("subject_uuid", subjectIdFromUrl)
        .maybeSingle();

      if (error || !data) return;

      const preselected: ExternalSubjectPreview = {
        kind: "external",
        id: data.subject_uuid,
        name: data.name,
        nickname: data.nickname,
        organization: data.organization,
        location: data.location,
        avatar_url: data.avatar_url,
        phone: data.phone,
        email: data.email,
      };

      setSelectedPerson(preselected);

      setSubmitFirstName((data.name || "").split(" ")[0] || "");
      setSubmitLastName((data.name || "").split(" ").slice(1).join(" ") || "");
      setSubmitNickname(data.nickname || "");
      setSubmitOrganization(data.organization || "");
      setSubmitLocation(data.location || "");
      setSubmitPhone(data.phone ? formatPhoneNumber(data.phone) : "");
      setSubmitEmail(data.email || "");

      setAutoSearched(true);
    })();
  }, [subjectIdFromUrl, selectedPerson]);

  /* ——— Auto-search (phone/email) ——— */
  useEffect(() => {
    // don’t auto-search once they’ve selected a real (non-temp) person
    if (isAnyNonTempSelected) return;

    // reset if empty
    if (!hasPhoneOrEmail) {
      setAutoSearched(false);
      setAutoLoading(false);
      setUserResults([]);
      setExternalResults([]);
      return;
    }

    setAutoLoading(true);
    setAutoSearched(true);

    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/subjects/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: submitPhone,
            email: submitEmail,
          }),
        });

        const json = await res.json().catch(() => ({}));

        const users: UserPreview[] = (json as any)?.users || [];
        const externals: ExternalSubjectPreview[] = (json as any)?.externals || [];

        setUserResults(Array.isArray(users) ? users : []);
        setExternalResults(Array.isArray(externals) ? externals : []);
      } catch (e) {
        console.error("Auto search failed:", e);
        setUserResults([]);
        setExternalResults([]);
      } finally {
        setAutoLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [submitPhone, submitEmail, hasPhoneOrEmail, isAnyNonTempSelected]);

  function handleTermsScroll() {
    /* placeholder */
  }

  async function handleCreateTempSubject() {
    const subjectTop = subjectInfoRef.current?.getBoundingClientRect().top ?? 0;
    const anchorY = window.scrollY + subjectTop - 100;

    const tempId = "temp-" + crypto.randomUUID();
    const newTemp: ExternalSubjectPreview = {
      kind: "external",
      id: tempId,
      name: `${submitFirstName} ${submitLastName}`.trim() || "(Unnamed Subject)",
      nickname: submitNickname || null,
      organization: submitOrganization || null,
      location: submitLocation || null,
      avatar_url: null,
      phone: submitPhone ? submitPhone.replace(/\D/g, "") : null,
      email: submitEmail ? submitEmail.trim().toLowerCase() : null,
    };

    setTempSubject(newTemp);
    setSelectedPerson(newTemp);

    requestAnimationFrame(() => {
      window.scrollTo({ top: anchorY, behavior: "smooth" });
    });
  }

  async function uploadEvidenceFiles(recordId: string, contributorId: string) {
    if (files.length === 0) return [];

    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `records/${recordId}/contributor_attachments/${contributorId}/${timestamp}-${index}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      return path;
    });

    const paths = await Promise.all(uploadPromises);

    const { error: insertError } = await supabase.from("record_attachments").insert(
      paths.map((p) => ({ record_id: recordId, contributor_id: contributorId, path: p }))
    );

    if (insertError) throw insertError;

    return paths;
  }

  async function getOrCreateContributorForCurrentUser() {
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user) throw new Error("User not authenticated");

    const { data: existing, error: fetchError } = await supabase
      .from("contributors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existing?.id) return { contributorId: existing.id };

    const { data: created, error: insertError } = await supabase
      .from("contributors")
      .insert({ user_id: user.id, auth_user_id: user.id })
      .select("id")
      .single();

    if (insertError || !created) throw insertError || new Error("Contributor creation failed");

    return { contributorId: created.id };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast({ title: "Not signed in", description: "Please sign in and try again." });
        return;
      }

      const missingFields: string[] = [];
      if (!description.trim()) missingFields.push("Experience details");
      if (!identityPreference) missingFields.push("Identity preference");
      if (!agreedToTerms) missingFields.push("Agree to Terms of Service");
      if (!rating || rating <= 0) missingFields.push("Rating (1–10)");
      if (!submitRelationship) missingFields.push("Relationship");
      if (!submitCategory.trim()) missingFields.push("Category");
      if (!submitLocation.trim()) missingFields.push("Location");

      // ✅ If REAL subject selected, we do NOT require phone/email/name inputs
      // ✅ If temp/not selected, require enough info to create subject
      if (!isRealSelected) {
        if (!submitFirstName.trim()) missingFields.push("First name");
        if (!submitPhone.trim() && !submitEmail.trim()) missingFields.push("Phone number or Email");
      }

      if (missingFields.length > 0) {
        toast({ title: "Missing required information", description: `Please fill in: ${missingFields.join(", ")}.` });
        return;
      }

      // basic validations (unchanged: only validate when NOT real-selected)
      if (!isRealSelected && submitEmail.trim()) {
        const email = submitEmail.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          toast({
            title: "Invalid Email",
            description: "Please enter a valid email address for the subject.",
          });
          return;
        }
      }
      if (!isRealSelected && submitPhone.trim()) {
        const digitsOnly = submitPhone.replace(/\D/g, "");
        if (digitsOnly.length < 10) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number with at least 10 digits.",
          });
          return;
        }
      }

      if (!selectedPerson) {
        toast({ title: "Person Required", description: "Please choose a DNounce user or create an external subject." });
        return;
      }

      const newRecordId = uuidv4();
      const { contributorId } = await getOrCreateContributorForCurrentUser();

      // ✅ Override rule for contact info on the record:
      // inputs win if provided; otherwise fall back to selectedPerson (real subject)
      const finalEmail = pickEmail(submitEmail, isRealSelected ? selectedPerson?.email : null);
      const finalPhone = pickPhone(submitPhone, isRealSelected ? selectedPerson?.phone : null);
      const emailOrPhone = finalEmail || finalPhone || null;

      let subjectId: string;

      // decide subjectId
      if (selectedPerson.kind === "user") {
        subjectId = selectedPerson.subject_uuid;
      } else {
        subjectId = selectedPerson.id;
        if (subjectId.startsWith("temp-")) {
          const { data: newSubject, error: newSubjectError } = await supabase
            .from("subjects")
            .insert({
              name: `${submitFirstName} ${submitLastName}`.trim() || "(Unnamed Subject)",
              nickname: submitNickname || null,
              organization: submitOrganization || null,
              location: submitLocation || null,
              phone: submitPhone ? submitPhone.replace(/\D/g, "") : null,
              email: submitEmail ? submitEmail.trim().toLowerCase() : null,
            })
            .select("subject_uuid")
            .single();

          if (newSubjectError || !newSubject) {
            toast({ title: "Error", description: "We couldn't save the external subject. Please try again." });
            return;
          }
          subjectId = newSubject.subject_uuid;
        }
      }

      const selectedRel = relationshipTypes.find((r: any) => r.id === submitRelationship);
      const relationshipValue =
        selectedRel?.value?.toLowerCase() === "other" ? submitOtherRelationship.trim() || null : selectedRel?.label || null;

      const { data: account } = await supabase
        .from("user_accountdetails")
        .select("first_name,last_name,avatar_url")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      const contributorFullName = `${account?.first_name ?? ""} ${account?.last_name ?? ""}`.trim() || null;

      // ✅ Override rule for subject fields written onto the record:
      // If inputs are non-empty -> use inputs
      // Else -> use selectedPerson values (when real-selected)
      const selName = isRealSelected ? (selectedPerson?.name ?? "") : "";
      const selFirst = selName ? selName.split(" ")[0] : "";
      const selLast = selName ? selName.split(" ").slice(1).join(" ") : "";

      const { data: newRecord, error: recordError } = await supabase
        .from("records")
        .insert({
          id: newRecordId,
          subject_id: subjectId,
          contributor_id: contributorId,
          record_type: "pending",
          email_or_phone: emailOrPhone,
          first_name: pickText(submitFirstName, selFirst),
          last_name: pickText(submitLastName, selLast),
          also_known_as: pickText(
            submitNickname,
            isRealSelected ? (selectedPerson?.nickname ?? null) : null
          ),
          organization: pickText(
            submitOrganization,
            isRealSelected ? (selectedPerson?.organization ?? null) : null
          ),
          relationship: relationshipValue,
          category: submitCategory || null,
          location: pickText(
            submitLocation,
            isRealSelected ? (selectedPerson?.location ?? null) : null
          ),
          rating: rating || null,
          description: description.trim() || null,
          agree_terms: agreedToTerms,
          contributor_identity_preference: identityPreference === "show",
          contributor_display_name: contributorFullName,
          contributor_avatar_url: account?.avatar_url || null,
        })
        .select("id")
        .single();

      if (recordError || !newRecord) {
        console.error("Error creating record:", recordError);
        toast({ title: "Error", description: "We couldn't submit your record. Please try again." });
        return;
      }

      const credibility = classifyRecord({
        description: description.trim(),
        rating,
        hasAttachments: files.length > 0,
      });

      await fetch("/api/records/update-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: newRecord.id, credibility }),
      }).catch(() => {});

      try {
        await uploadEvidenceFiles(newRecordId, contributorId);
      } catch (uploadErr) {
        console.error("Some evidence files failed to upload:", uploadErr);
        toast({
          title: "Record saved, but files failed",
          description: "Your record was created, but some evidence files could not be uploaded. You can try adding them again.",
        });
      }

      router.replace(`/record-submitted/${newRecord.id}`);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({ title: "Submit failed", description: err?.message || "Something went wrong submitting your record." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto px-3 sm:px-5 md:px-8 py-4 sm:py-8 space-y-8 sm:space-y-10">
      <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-snug">Submit a Record</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-500 max-w-md leading-relaxed">
          Share your experience and help build a more transparent, trustworthy community.
        </p>
      </div>

      <Card className="p-4 sm:p-6 md:p-8 bg-white shadow-md rounded-2xl">
        <CardContent className="p-0 sm:p-2">
          {/* Contact Info */}
          <div className="mb-8 sm:mb-10 bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col text-center mb-5 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Contact Information</h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-lg mx-auto">
                Enter a phone number and/or email. We’ll automatically search for matching DNounce users or existing subjects.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 sm:gap-y-5">
              <Field
                label="Phone Number"
                placeholder="e.g. (718) 555-1234"
                value={submitPhone}
                onChange={setSubmitPhone}
                disabled={false}
                required={!isRealSelected}
                mode="phone"
              />

              <Field
                label="Email Address"
                placeholder="e.g. johndoe@example.com"
                value={submitEmail}
                onChange={setSubmitEmail}
                disabled={false}
                required={!isRealSelected}
                mode="email"
              />
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
              <p>
                <strong>Why we ask:</strong> Every submission triggers a quick notification to the subject so they can view/respond.
              </p>
            </div>
          </div>

          {/* Subject Info */}
          <div
            ref={subjectInfoRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8 mb-6"
          >
            <Field label="First Name" placeholder="e.g. John" value={submitFirstName} onChange={setSubmitFirstName} disabled={false} required />
            <Field label="Last Name" placeholder="e.g. Doe" value={submitLastName} onChange={setSubmitLastName} disabled={false} />
            <Field label="Also Known As" placeholder="e.g. Johnny" value={submitNickname} onChange={setSubmitNickname} disabled={false} />
            <Field label="Organization / Company" placeholder="e.g. Acme Inc." value={submitOrganization} onChange={setSubmitOrganization} disabled={false} />

            <div className="flex flex-col col-span-1 sm:col-span-2 lg:col-span-1">
              <label className="mb-1 text-sm font-semibold text-gray-700">
                Relationship <span className="text-red-500">*</span>
              </label>
              {relLoading ? (
                <p className="text-sm text-gray-400">Loading relationships...</p>
              ) : (
                <Select value={submitRelationship} onValueChange={setSubmitRelationship} required>
                  <SelectTrigger className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white shadow-lg rounded-lg border border-gray-200">
                    {relationshipTypes.map((rel: any) => (
                      <SelectItem key={rel.id} value={rel.id}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {relationshipTypes.find((rel: any) => rel.id === submitRelationship)?.value?.toLowerCase() === "other" && (
                <Input
                  placeholder="Please specify..."
                  value={submitOtherRelationship}
                  onChange={(e) => setSubmitOtherRelationship(capitalizeWords(e.target.value))}
                  className="mt-3 w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            <Field
              label="Category"
              placeholder="e.g. Barber, Waitress, Nail Tech"
              value={submitCategory}
              onChange={setSubmitCategory}
              helperText="Use a label that best fits how you may find this person."
              required
            />

            <div className="flex flex-col">
              <label className="mb-2 text-[15px] font-medium text-[#1E293B] tracking-tight">
                Location <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Input
                  placeholder="City or neighborhood..."
                  value={submitLocation}
                  onChange={(e) => setSubmitLocation(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[15px] text-gray-800 placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                />

                {submitLocationSuggestions.length > 0 && (
                  <ul className="absolute top-full z-50 bg-white border rounded-md w-full shadow-md mt-1 max-h-60 overflow-y-auto">
                    {submitLocationSuggestions.map((s: any, idx: number) => (
                      <li
                        key={idx}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          setSubmitLocation(s.description);
                          setSubmitLocationSuggestions([]);
                        }}
                      >
                        <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
                        <span className="font-semibold text-gray-800 text-sm leading-tight">{s.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-1 leading-tight">Type city name to see neighborhoods, or neighborhood to see full location.</p>
            </div>
          </div>

          {/* Results (NO duplicate top card) */}
          <div className="mb-8 sm:mb-10 space-y-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">Results</h3>

            {autoLoading && hasPhoneOrEmail && !selectedPerson && (
              <p className="text-sm text-gray-500 italic">Searching…</p>
            )}

            {showHelperMatchText && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <div className="font-semibold text-sm">We found someone matching this phone/email</div>
                <div className="text-xs mt-1">Select the card below if the avatar/name matches who you meant.</div>
              </div>
            )}

            {!selectedPerson ? (
              <>
                {autoSearched && !autoLoading && combinedResults.length > 0 && (
                  <div className="space-y-3">
                    {combinedResults.slice(0, 10).map((p) => (
                      <SubjectResultCard
                        key={p.kind === "user" ? p.user_id : p.id}
                        subject={p}
                        selectedPerson={selectedPerson}
                        onSelect={(next) => {
                          setSelectedPerson(next);
                          setTempSubject(null);
                        }}
                      />
                    ))}
                  </div>
                )}

                {canShowCreateSubjectCTA && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleCreateTempSubject}
                      className="text-sm text-gray-700 font-medium underline hover:text-black transition"
                    >
                      Subject doesn’t exist yet?
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <SubjectResultCard
                  key={selectedPerson.kind === "user" ? selectedPerson.user_id : selectedPerson.id}
                  subject={selectedPerson}
                  selectedPerson={selectedPerson}
                  onSelect={(next) => {
                    // unselect
                    setSelectedPerson(next);
                    if (!next) setTempSubject(null);
                  }}
                />
                <div className="flex justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPerson(null);
                      setTempSubject(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline transition"
                  >
                    Change subject selection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="mt-8 sm:mt-10 select-none">
            <Label className="block text-lg font-medium mb-3 sm:mb-4">
              Rate Your Experience <span className="text-red-500">*</span>
            </Label>

            <div className="flex items-center justify-start flex-wrap gap-2 sm:gap-3" onTouchStart={(e) => e.stopPropagation()}>
              {Array.from({ length: 10 }).map((_, i) => {
                const starValue = i + 1;
                const currentValue = rating;

                const fillLevel = currentValue >= starValue ? 1 : currentValue >= starValue - 0.5 ? 0.5 : 0;

                const applyClick = (prev: number) => {
                  const half = starValue - 0.5;
                  if (prev < half) return half;
                  if (prev === half) return starValue;
                  if (prev === starValue) return half;
                  return half;
                };

                return (
                  <div
                    key={starValue}
                    className="relative cursor-pointer active:scale-105 transition-transform"
                    style={{ width: 42, height: 42 }}
                    onClick={() => {
                      if (document.body.classList.contains("is-touch")) return;
                      setRating((prev) => {
                        const next = applyClick(prev);
                        return next === prev ? prev : next;
                      });
                      setHoverRating(null);
                    }}
                    onTouchEnd={() => {
                      setRating((prev) => {
                        const half = starValue - 0.5;
                        if (lastTappedStar === starValue) {
                          if (prev === half) return starValue;
                          if (prev === starValue) return half;
                        }
                        setLastTappedStar(starValue);
                        return half;
                      });
                      setHoverRating(null);
                    }}
                  >
                    <Star size={40} className="absolute inset-0 text-gray-300" strokeWidth={1.5} />
                    <div className="absolute inset-0 overflow-hidden star-fill-mask" style={{ width: `${fillLevel * 100}%` }}>
                      <Star size={40} className="text-black fill-black transition-all duration-200 ease-in-out" strokeWidth={1.5} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-sm sm:text-base text-gray-500">Selected rating: {rating ? rating.toFixed(1) : "—"} / 10</p>
              </div>
              {/* Identity Preference (REQUIRED) */}
              <div className="mb-8 mt-8">
                <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base sm:text-lg font-semibold text-gray-900">
                        Identity Preference <span className="text-red-500">*</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 leading-relaxed">
                        Choose how your name is displayed{" "}
                        <span className="font-semibold">if allowed</span> by the AI Credibility Recommendation.
                      </div>
                    </div>

                    {/* On/Off Toggle */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">
                          {identityPreference === "show" ? "Show my name" : "Hide my name"}
                        </span>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={identityPreference === "show"}
                          className={[
                            "relative inline-flex h-7 w-12 items-center rounded-full border transition",
                            identityPreference === "show"
                              ? "bg-black border-black"
                              : "bg-gray-200 border-gray-300",
                          ].join(" ")}
                          onClick={() => {
                            const next: "hide" | "show" =
                              identityPreference === "show" ? "hide" : "show";

                            // confirm if changing after initial choice
                            if (identityTouched) {
                              pendingIdentity.current = next;
                              setConfirmIdentityOpen(true);
                              return;
                            }

                            setIdentityPreference(next);
                            setIdentityTouched(true);
                          }}
                        >
                          <span
                            className={[
                              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                              identityPreference === "show" ? "translate-x-6" : "translate-x-1",
                            ].join(" ")}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Friendly explanation + rules */}
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <div className="font-semibold text-sm">Important</div>
                    <div className="mt-1 text-sm leading-relaxed">
                      Your preference may be overridden:
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>
                          <span className="font-semibold">Evidence-Based:</span> Your choice is respected.
                        </li>
                        <li>
                          <span className="font-semibold">Unclear:</span> Always shows Alias.
                        </li>
                        <li>
                          <span className="font-semibold">Opinion-Based:</span> Always shows Real Name.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Confirm modal */}
                {confirmIdentityOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                      <div className="text-base font-semibold text-gray-900">Are you sure?</div>
                      <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                        You’re about to change your identity preference to{" "}
                        <span className="font-semibold">
                          {pendingIdentity.current === "show" ? "Show my name" : "Hide my name"}
                        </span>
                        .
                        <div className="mt-2 text-xs text-gray-500">
                          This may still be overridden depending on AI Credibility Recommendation.
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2 justify-end">
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            pendingIdentity.current = null;
                            setConfirmIdentityOpen(false);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-900"
                          onClick={() => {
                            const next = pendingIdentity.current;
                            if (next) {
                              setIdentityPreference(next);
                              setIdentityTouched(true);
                            }
                            pendingIdentity.current = null;
                            setConfirmIdentityOpen(false);
                          }}
                        >
                          Yes, change it
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

          {/* Evidence Upload */}
          <div ref={evidenceRef} className="mb-8 mt-8">
            <label className="mb-1 text-sm font-semibold text-gray-700">Evidence Upload</label>

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition"
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">Drag and drop files here or click to browse</p>
              <p className="text-xs text-gray-500">Supported formats: PDF, JPG, PNG, MP4, DOCX (Max 100MB each, up to 10 files)</p>
            </div>

            <input
              id="fileInput"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.mp4,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []);
                setFiles((prev) => {
                  const combined = [...prev, ...newFiles];
                  if (combined.length > 10) return combined.slice(0, 10);
                  return combined;
                });
                e.target.value = "";
              }}
            />

            {files.length > 0 && (
              <div className="mt-5 text-left">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Attached Files</h4>
                <div className="flex flex-col sm:flex-wrap gap-3 w-full">
                  {files.map((file, index) => {
                    const sizeKB = file.size / 1024;
                    const sizeLabel = sizeKB < 1024 ? `${sizeKB.toFixed(0)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2 shadow-sm bg-gray-50 hover:bg-gray-100 transition w-full sm:w-auto sm:min-w-[230px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.name)}
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-800 truncate max-w-[150px]">{file.name}</span>
                            <span className="text-xs text-gray-500">{sizeLabel}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, i) => i !== index))}
                          className="p-1 hover:bg-gray-200 rounded-full transition"
                          title="Remove file"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <label className="mb-1 text-sm font-semibold text-gray-700">
              Experience Details <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              placeholder="Share the details of your experience as clearly and accurately as possible."
              className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Please provide a clear and factual description of your experience.</p>
          </div>

          {/* Terms */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <input type="checkbox" id="terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1" />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-blue-600 hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and confirm that my submission is truthful and complies with DNounce guidelines.
              </label>
            </div>

            <div
              ref={termsRef}
              onScroll={handleTermsScroll}
              className="h-48 sm:h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-600 bg-gray-50 leading-relaxed"
            >
              <h4 className="font-semibold mb-2">Important Legal Notice:</h4>
              <p className="mb-2">
                By submitting this feedback, you acknowledge that DNounce is a public reputation platform and your submission may be publicly visible after AI credibility label classification.
              </p>
              <p className="mb-2">You certify that your submission is truthful to the best of your knowledge and based on either verifiable evidence or honest personal opinion.</p>
              <p className="mb-2">False or malicious submissions may result in permanent account suspension and legal consequences.</p>
              <p className="mb-2">The subject will be notified of this submission and will have the right to respond and challenge the information through our dispute resolution process.</p>
              <p className="mb-2">All submissions undergo AI credibility label classification and may be reviewed by community moderators before publication.</p>
              <p className="mb-2">You retain copyright of your original content but grant DNounce a license to display and distribute it as part of our platform services.</p>
              <p className="mb-2">DNounce is not responsible for the accuracy of user submissions but provides tools for community verification and dispute resolution.</p>
            </div>

            <button
              type="submit"
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
              disabled={!agreedToTerms || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Record"}
            </button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

/* ——— Field Component ——— */
function Field({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  helperText,
  required = false,
  mode = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  helperText?: string;
  required?: boolean;
  mode?: "text" | "phone" | "email";
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let next = raw;

    if (mode === "phone") next = formatPhoneNumber(raw);
    else if (mode === "email") next = raw.trim();
    else next = capitalizeWords(raw);

    onChange(next);
  };

  const inputType = mode === "phone" ? "tel" : mode === "email" ? "email" : "text";

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-[15px] font-medium text-[#1E293B] tracking-tight">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        placeholder={placeholder}
        type={inputType}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[15px] text-gray-800 placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
          disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"
        }`}
      />
      {helperText && <p className="text-xs text-gray-500 mt-1 leading-tight">{helperText}</p>}
    </div>
  );
}

/* ——— Subject Result Card ——— */
function SubjectResultCard({
  subject,
  selectedPerson,
  onSelect,
}: {
  subject: PersonPreview;
  selectedPerson: PersonPreview | null;
  onSelect: (p: PersonPreview | null) => void;
}) {
  const selectedKey = selectedPerson?.kind === "user" ? selectedPerson.subject_uuid : selectedPerson?.id;
  const subjectKey = subject.kind === "user" ? subject.subject_uuid : subject.id;
  const isSelected = selectedKey === subjectKey;

  const avatarUrl = subject.avatar_url || null;

  return (
    <div
      className={`w-full rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4 shadow-sm hover:shadow-md transition cursor-pointer ${
        isSelected ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-white"
      }`}
      onClick={() => onSelect(isSelected ? null : subject)}
    >
      {/* Left: avatar + info */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
            isSelected ? "bg-gray-100 border-2 border-gray-400" : "bg-gray-100"
          }`}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={subject.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base sm:text-sm font-semibold text-gray-900 break-words">
            {subject.name}
            {subject.nickname && <span className="text-gray-500 font-normal"> ({subject.nickname})</span>}
          </div>

          <div className="text-xs sm:text-sm text-gray-600 break-words">
            {subject.organization || "Independent"}
            {subject.location ? ` • ${subject.location}` : ""}
          </div>

          <div className="text-[11px] text-gray-400 font-mono mt-1 truncate">
            {subject.kind === "user" ? <>Subject UUID: {subject.subject_uuid}</> : <>ID: {subject.id}</>}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        {subject.kind === "user" ? (
          <Link
            href={`/subject/${subject.subject_uuid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-700 hover:text-black hover:underline flex items-center justify-center gap-1 border border-gray-300 rounded-full px-3 py-1.5 sm:py-1 bg-white w-full sm:w-auto"
            onClick={(e) => e.stopPropagation()}
          >
            View
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : !subject.id.startsWith("temp-") ? (
          <Link
            href={`/subject/${subject.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-700 hover:text-black hover:underline flex items-center justify-center gap-1 border border-gray-300 rounded-full px-3 py-1.5 sm:py-1 bg-white w-full sm:w-auto"
            onClick={(e) => e.stopPropagation()}
          >
            View
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : null}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(isSelected ? null : subject);
          }}
          className={`flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 sm:py-1 rounded-full border transition w-full sm:w-auto ${
            isSelected ? "border-gray-400 text-gray-700 bg-gray-50 hover:bg-gray-100" : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          {isSelected ? (
            <>
              Selected
              <X className="w-3.5 h-3.5 ml-1 text-gray-500" strokeWidth={2} />
            </>
          ) : (
            "Choose"
          )}
        </button>
      </div>
    </div>
  );
}
