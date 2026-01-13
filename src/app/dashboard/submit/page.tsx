"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Upload, MapPin, FileText, Search, User, X, Loader2, Image, Video, File as FileIcon, Star } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { classifyRecord } from "@/lib/ai/classifyRecord";


/** ——— Subject Search (UI only) ——— */
type SubjectPreview = {
  id: string;
  name: string;
  nickname?: string | null;
  organization?: string | null;
  location?: string | null;
  avatar_url?: string | null;

  // 👇 NEW: these match the columns you just added to `subjects`
  phone?: string | null;
  email?: string | null;
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
    return <Image className="w-4 h-4 text-gray-500" />;
  }

  if (["mp4", "mov", "avi", "mkv"].includes(ext || "")) {
    return <Video className="w-4 h-4 text-gray-500" />;
  }

  if (["pdf", "doc", "docx"].includes(ext || "")) {
    return <FileText className="w-4 h-4 text-gray-500" />;
  }

  return <FileIcon className="w-4 h-4 text-gray-500" />;
}

/* ——— Page Component ——— */
export default function SubmitRecordPage() {
  const [submitPhone, setSubmitPhone] = useState("");
  const { toast } = useToast();
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
  const escapeLike = (s: string) => s.replace(/[%_]/g, ch => `\\${ch}`);
  const [tempSubject, setTempSubject] = useState<SubjectPreview | null>(null);
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
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [displayRealName, setDisplayRealName] = useState(false); // default OFF
  const [showRealNameConfirm, setShowRealNameConfirm] = useState(false);
 
  const fullName = `${submitFirstName.trim()} ${submitLastName.trim()}`.trim();

  /* ——— Fetch Relationship Types (Supabase) ——— */
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

        if (mainRes.error) console.error("relationship_types error:", mainRes.error);
        if (otherRes.error) console.error("relationship_types_other error:", otherRes.error);

        const combined = [
          ...(mainRes.data?.map((r) => ({ id: r.id, label: r.label, value: r.value })) || []),
          ...(otherRes.data?.map((r) => ({ id: r.id, label: r.custom_value, value: r.custom_value })) || []),
        ];        

        // Deduplicate by label (case-insensitive)
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

  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const { data: orgs } = await supabase
          .from("subjects")
          .select("organization")
          .not("organization", "is", null);
  
        const { data: locs } = await supabase
          .from("subjects")
          .select("location")
          .not("location", "is", null);
  
          const uniqueOrgs = [...new Set((orgs || []).map((o) => o.organization?.trim() || ""))]
          .filter(Boolean)
          .sort();
  
          const uniqueLocs = [...new Set((locs || []).map((l) => l.location?.trim() || ""))]
          .filter(Boolean)
          .sort();
  
        setOrgOptions(uniqueOrgs);
        setLocOptions(uniqueLocs);
      } catch (err) {
        console.error("Error loading filter options:", err);
      }
    }
  
    fetchFilterOptions();
  }, []);  

  /* ——— Location Autocomplete (wired to /api/location) ——— */
  useEffect(() => {
    const q = submitLocation.trim();
    if (!q) {
      setSubmitLocationSuggestions([]);
      return;
    }
  
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/location?input=${encodeURIComponent(q)}`);
        if (!res.ok) {
          console.warn("⚠️ Location API failed for submit:", res.status);
          setSubmitLocationSuggestions([]);
          return;
        }

        const data = await res.json().catch(() => ({}));
        setSubmitLocationSuggestions(data?.predictions || []);
      } catch (err) {
        console.error("Submit location suggestions error:", err);
        setSubmitLocationSuggestions([]);
      }
    };
  
    const id = setTimeout(fetchSuggestions, 300); // debounce typing
    return () => clearTimeout(id);
  }, [submitLocation]);  

  const [subjectResults, setSubjectResults] = useState<SubjectPreview[]>([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectSearched, setSubjectSearched] = useState(false); // did we run a search yet?
  const [selectedSubject, setSelectedSubject] = useState<SubjectPreview | null>(null);
  const [subjectQuery, setSubjectQuery] = useState("");
  const isLocked = !!selectedSubject;
  const [orgFilter, setOrgFilter] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [orgOptions, setOrgOptions] = useState<string[]>([]);
  const [locOptions, setLocOptions] = useState<string[]>([]);

  /* ——— Terms Scroll ——— */
  const handleTermsScroll = () => {
    /* placeholder for scroll detection if needed later */
  };

  useEffect(() => {
    if (selectedSubject) {
      setSubmitLocationSuggestions([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (tempSubject) {
      const updated = {
        ...tempSubject,
        name: `${submitFirstName} ${submitLastName}`.trim(),
        nickname: submitNickname || null,
        organization: submitOrganization || null,
        location: submitLocation || null,
      };
      setTempSubject(updated);
      setSelectedSubject(updated);
    }
  }, [submitFirstName, submitLastName, submitNickname, submitOrganization, submitLocation]);   

  // 🔍 Search for existing subjects based on the form fields
  async function handleSubjectSearch() {
    setSubjectSearched(true);

    const name = `${submitFirstName.trim()} ${submitLastName.trim()}`.trim();
    const nick = submitNickname.trim();
    const org  = submitOrganization.trim();
    const loc  = submitLocation.trim();
    const emailRaw = submitEmail.trim();
    const phoneRaw = submitPhone.trim();
    const phoneDigits = phoneRaw.replace(/\D/g, "");

    if (!name && !nick && !org && !loc && !phoneDigits && !emailRaw) {
      toast({
        title: "Missing Information",
        description: "Please enter at least one field before searching.",
      });
      setSubjectSearched(false);
      return;
    }

    setSubjectLoading(true);
    try {
      let q = supabase
        .from("subjects")
        .select("id:subject_uuid, name, nickname, organization, location, avatar_url, phone, email")
        .limit(10);

      // 1) EXACT filters (AND)
      if (phoneDigits) {
        // try exact on multiple common representations
        const phoneCandidates: string[] = [phoneRaw, phoneDigits];
        if (phoneDigits.length === 10) phoneCandidates.push(`+1${phoneDigits}`);
        if (phoneDigits.length === 11 && phoneDigits.startsWith("1")) phoneCandidates.push(`+${phoneDigits}`);

        q = q.in("phone", Array.from(new Set(phoneCandidates)));
      }

      if (emailRaw) {
        // case-insensitive exact (no wildcards)
        q = q.ilike("email", emailRaw); // ILIKE 'value' acts like exact, but case-insensitive
      }

      // 2) BEGINS-WITH filters (AND)
      if (name) q = q.ilike("name", `${escapeLike(name)}%`);
      if (nick) q = q.ilike("nickname", `${escapeLike(nick)}%`);
      if (org)  q = q.ilike("organization", `${escapeLike(org)}%`);
      if (loc)  q = q.ilike("location", `${escapeLike(loc)}%`);

      const { data, error } = await q;
      if (error) throw error;

      setSubjectResults(data || []);
    } catch (err) {
      console.error("Error searching subjects:", err);
      setSubjectResults([]);
      toast({
        title: "Search Failed",
        description: "There was an error searching for subjects. Please try again.",
      });
    } finally {
      setSubjectLoading(false);
    }
  }

  async function handleCreateTempSubject() {
    // 1️⃣ Capture position of Subject Info section
    const subjectTop = subjectInfoRef.current?.getBoundingClientRect().top ?? 0;
    const anchorY = window.scrollY + subjectTop - 100; // small offset for header
  
    // 2️⃣ Create temporary subject
    const tempId = "temp-" + crypto.randomUUID();
    const newTemp = {
      id: tempId,
      name: `${submitFirstName} ${submitLastName}`.trim() || "(Unnamed Subject)",
      nickname: submitNickname || null,
      organization: submitOrganization || null,
      location: submitLocation || null,
      avatar_url: null,
    };
  
    // 3️⃣ Set as selected and reset results
    setTempSubject(newTemp);
    setSelectedSubject(newTemp);
    setSubjectResults([]);
    setSubjectSearched(true);
  
    // 4️⃣ After render, scroll **to subject info area**
    requestAnimationFrame(() => {
      window.scrollTo({ top: anchorY, behavior: "smooth" });
    });
  
    // 5️⃣ Toast
    toast({
      title: "New Subject Placeholder",
      description: "A temporary subject card has been created. Fill in all required details before submitting.",
    });
  }  
     
  async function uploadEvidenceFiles(recordId: string, contributorId: string) {
    if (files.length === 0) return [];
  
    // 2️⃣ Upload each file into the proper folder structure
    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, "_"); // avoid spaces
      const path = `records/${recordId}/contributor_attachments/${contributorId}/${timestamp}-${index}-${safeName}`;
  
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: false });
  
      if (uploadError) {
        console.error("Upload failed for", path, uploadError);
        throw uploadError;
      }
  
      return path;
    });
  
    const paths = await Promise.all(uploadPromises);
  
    // 3️⃣ Store uploaded file paths in record_attachments table
    const { error: insertError } = await supabase
      .from("record_attachments")
      .insert(
        paths.map((p) => ({
          record_id: recordId,
          contributor_id: contributorId,
          path: p,
        }))
      );
  
    if (insertError) {
      console.error("Error saving attachment metadata:", insertError);
      throw insertError;
    }
  
    return paths;
  }    

  async function createContributorAlias(contributorId: string) {
    const { data: alias, error } = await supabase
      .from("contributor_aliases")
      .insert({ contributor_id: contributorId })
      .select("alias_uuid")
      .single();
  
    if (error || !alias) {
      console.error("Error creating contributor alias:", error);
      throw error || new Error("Failed to create contributor alias");
    }
  
    return alias.alias_uuid as string;
  }  

  async function getOrCreateContributorForCurrentUser() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
  
    if (userError || !user) {
      throw new Error("User not authenticated");
    }
  
    const userId = user.id;
  
    // 1️⃣ Try to find existing contributor
    const { data: existing, error: fetchError } = await supabase
      .from("contributors")
      .select("id")
      .eq("user_id", userId)
      .single();
  
    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = "no rows found"
      console.error("Error fetching contributor:", fetchError);
      throw fetchError;
    }
  
    if (existing) {
      return { contributorId: existing.id };
    }
  
    // 2️⃣ If not found, create a new one
    const { data: newContributor, error: insertError } = await supabase
      .from("contributors")
      .insert({ user_id: userId })
      .select("id")
      .single();
  
    if (insertError || !newContributor) {
      console.error("Error creating contributor:", insertError);
      throw insertError || new Error("Contributor creation failed");
    }
  
    return { contributorId: newContributor.id };
  }  

  /* ——— Handle Form Submit ——— */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { data: who, error: whoErr } = await supabase.rpc("whoami");
    console.log("🧠 WHOAMI:", who, whoErr);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    console.log("👤 USER:", userData?.user, userErr);

    const { data: c, error: cErr } = await supabase
      .from("contributors")
      .select("id,user_id")
      .eq("user_id", userData?.user?.id ?? "")
      .single();

    console.log("🧩 CONTRIBUTOR:", c, cErr);

    if (c?.id) {
      const { data: check, error: checkErr } = await supabase.rpc("can_insert_record", {
        _contributor_id: c.id,
      });
      console.log("✅ CAN INSERT:", check, checkErr);
    }

    const isNewSubject =
    !selectedSubject || selectedSubject.id.startsWith("temp-");

      // 🧩 Collect missing fields for *all* submissions
      const missingFields: string[] = [];

      // Always check these core fields
      if (!description.trim()) missingFields.push("Experience details");
      if (!agreedToTerms) missingFields.push("Agree to Terms of Service");
      if (!rating || rating <= 0) missingFields.push("Rating (1–10)");

      // ✅ Always require these for ALL submissions (existing OR new subject)
      if (!submitRelationship) missingFields.push("Relationship");
      if (!submitCategory.trim()) missingFields.push("Category");
      if (!submitLocation.trim()) missingFields.push("Location");

      // ✅ Only require identity/contact fields when creating a NEW subject
      if (!selectedSubject || selectedSubject.id.startsWith("temp-")) {
        if (!submitFirstName.trim()) missingFields.push("First name");
        if (!submitPhone.trim() && !submitEmail.trim())
          missingFields.push("Phone number or Email");
      }

      // 🚨 Show popup if anything’s missing
      if (missingFields.length > 0) {
        toast({
          title: "Missing required information",
          description: `Please fill in: ${missingFields.join(", ")}.`,
        });
        return;
      }

    // ✅ If email is provided, check basic format
    if (submitEmail.trim()) {
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

    // ✅ If phone is provided, ensure it has enough digits
    if (submitPhone.trim()) {
      const digitsOnly = submitPhone.replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number with at least 10 digits.",
        });
        return;
      }
    }

    if (!description.trim()) {
      toast({
        title: "Experience Details Required",
        description: "Please provide a detailed description of your experience before submitting.",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "You must agree to the Terms of Service before submitting.",
      });
      return;
    }

    // ✅ Make sure there is a selected subject (existing or temp)
    if (!selectedSubject) {
      toast({
        title: "Subject Required",
        description: "Please choose an existing subject or create a new one before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecordId = uuidv4(); 
      const { contributorId } = await getOrCreateContributorForCurrentUser();
      const emailOrPhone =
      submitPhone.trim() !== ""
        ? submitPhone.trim()
        : submitEmail.trim() !== ""
        ? submitEmail.trim()
        : null;

      // 2️⃣ Start from the currently selected subject
      let subjectId = selectedSubject.id;

      // 3️⃣ If it's a temporary subject (id starts with "temp-"), create a real subject in Supabase
      if (subjectId.startsWith("temp-")) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Could not get current user:", userError);
          toast({
            title: "Authentication Error",
            description: "Please log in again before submitting a record.",
          });
          return;
        }

        // ✅ Create the new subject in Supabase
        const { data: newSubject, error: newSubjectError } = await supabase
          .from("subjects")
          .insert({
            name: `${submitFirstName} ${submitLastName}`.trim() || "(Unnamed Subject)",
            nickname: submitNickname || null,
            organization: submitOrganization || null,
            location: submitLocation || null,
            phone: submitPhone || null,
            email: submitEmail || null,
          })
          .select("subject_uuid")
          .single();

        if (newSubjectError || !newSubject) {
          console.error("Error creating subject:", newSubjectError);
          toast({
            title: "Error",
            description: "We couldn't save the new subject. Please try again.",
          });
          return;
        }
        subjectId = newSubject.subject_uuid;
      }

      const selectedRel = relationshipTypes.find((r) => r.id === submitRelationship);
      const relationshipValue =
        selectedRel?.value?.toLowerCase() === "other"
          ? (submitOtherRelationship.trim() || null)
          : (selectedRel?.label || null);

      const { data: account, error: accErr } = await supabase
        .from("user_accountdetails")
        .select("first_name,last_name,avatar_url")
        .eq("user_id", userData?.user?.id ?? "")
        .single();
        
      if (accErr) console.warn("Could not load account details:", accErr);
        
      const contributorFullName =
        `${account?.first_name ?? ""} ${account?.last_name ?? ""}`.trim() || null;
        

      const { data: newRecord, error: recordError } = await supabase
        .from("records")
        .insert({
          id: newRecordId,
          subject_id: subjectId,                // ✅ references subjects.subject_uuid
          contributor_id: contributorId,        // ✅ references contributors.id
          record_type: "pending",
          email_or_phone: emailOrPhone,
          first_name: submitFirstName.trim() || null,
          last_name: submitLastName.trim() || null,
          also_known_as: submitNickname || null,
          organization: submitOrganization || null,
          relationship: relationshipValue,
          category: submitCategory || null,
          location: submitLocation || null,
          rating: rating || null,
          description: description.trim() || null,
          agree_terms: agreedToTerms,
          contributor_identity_preference: displayRealName,
          contributor_display_name: displayRealName ? contributorFullName : null,
          contributor_avatar_url: displayRealName ? (account?.avatar_url ?? null) : null,
        })
        .select("id")
        .single();

      if (recordError || !newRecord) {
        console.error("Error creating record:", recordError);
        toast({
          title: "Error",
          description: "We couldn't submit your record. Please try again.",
        });
        return;
      }

      console.log("✅ INSERT OK newRecord:", newRecord);

      // ✅ STEP 3A: Classify immediately (NO AI, NO WEBHOOK)
      const credibility = classifyRecord({
        description: description.trim(),
        rating,
        hasAttachments: files.length > 0,
      });

      // ✅ STEP 3B: Persist credibility to DB (SERVER route)
      const res = await fetch("/api/records/update-credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: newRecord.id,
          credibility,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("❌ SERVER UPDATE ERROR:", json);
        toast({
          title: "Server update failed",
          description: json?.error || "Unknown error",
        });
      } else {
        console.log("✅ SERVER UPDATE OK:", json);
      }

      const recordId = newRecord.id;

      //fetch("/api/ai/process-record", {
        //method: "POST",
          //headers: { "Content-Type": "application/json" },
          //body: JSON.stringify({ recordId: newRecord.id }),
          //}).catch((err) => {
          //console.error("AI process-record failed:", err);
          //});
      

      // 6️⃣ Upload evidence files (still using your existing helper)
      try {
        await uploadEvidenceFiles(newRecordId, contributorId);
      } catch (uploadErr) {
        console.error("Some evidence files failed to upload:", uploadErr);
        toast({
          title: "Record saved, but files failed",
          description:
            "Your record was created, but some evidence files could not be uploaded. You can try adding them again.",
        });
      }

      // 7️⃣ Success – show modal using the new record id
      setSubmittedRecordId(newRecord.id);
      setSubmissionSuccess(true);
      setSubmitPhone("");
      setSubmitEmail("");
      setSubmitFirstName("");
      setSubmitLastName("");
      setSubmitNickname("");
      setSubmitOrganization("");
      setSubmitRelationship("");
      setSubmitOtherRelationship("");
      setSubmitCategory("");
      setSubmitLocation("");
      setDescription("");
      setFiles([]);
      setAgreedToTerms(false);
      setDisplayRealName(false);
      setShowRealNameConfirm(false);
      setSelectedSubject(null);
      setTempSubject(null);
      setSubjectResults([]);
      setSubjectSearched(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestToggleDisplayRealName(next: boolean) {
    // Turning OFF: no confirmation needed
    if (!next) {
      setDisplayRealName(false);
      return;
    }
  
    // Turning ON: require confirm
    setShowRealNameConfirm(true);
  }  
  
  /* ——— Page UI ——— */
  return (
    <form
      onSubmit={handleSubmit}
      className=" w-full max-w-3xl mx-auto px-3 sm:px-5 md:px-8 py-4 sm:py-8 space-y-8 sm:space-y-10"
    >
      <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
            Submit a Record
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-500 max-w-md leading-relaxed">
          Share your verified experience or information to help maintain transparency and community accountability.
        </p>
      </div>

      <Card className="p-4 sm:p-6 md:p-8 bg-white shadow-md rounded-2xl">
        <CardContent className="p-0 sm:p-2">
          {/* ——— Subject Contact Information ——— */}
          <div className="mb-8 sm:mb-10 bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col text-center mb-5 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">Contact Information</h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-lg mx-auto">
                To keep things fair and transparent, please include at least one way for us to notify the subject 
                (either a phone number or an email). We simply send a notice so they have the chance to view and/or respond to the record on their profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 sm:gap-y-5">
              <Field
                label="Phone Number"
                placeholder="e.g. (718) 555-1234"
                value={submitPhone}
                onChange={setSubmitPhone}
                disabled={!!selectedSubject && !selectedSubject.id.startsWith("temp-")}
                required
                mode="phone" 
              />

              <Field
                label="Email Address"
                placeholder="e.g. johndoe@example.com"
                value={submitEmail}
                onChange={setSubmitEmail}
                disabled={!!selectedSubject && !selectedSubject.id.startsWith("temp-")}
                required
                mode="email"
              />
            </div>

            {/* Friendly compliance reminder */}
            <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
              <p>
                <strong>Why we ask:</strong> Every submission triggers a quick notification to the subject, letting them know a record was filed. 
                This ensures fairness and gives them a right to reply or appeal — part of how DNounce stays credible and transparent.
              </p>
            </div>
          </div>
          
          {/* ——— Subject Info Fields ——— */}
          <div
            ref={subjectInfoRef}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8 mb-8 sm:mb-12"
          >
            {/* First Name */}
            <Field
              label="First Name"
              placeholder="e.g. John"
              value={submitFirstName}
              onChange={setSubmitFirstName}
              disabled={!!selectedSubject && !selectedSubject.id.startsWith("temp-")}
              required
            />

            {/* Last Name */}
            <Field
              label="Last Name"
              placeholder="e.g. Doe"
              value={submitLastName}
              onChange={setSubmitLastName}
              disabled={!!selectedSubject && !selectedSubject.id.startsWith("temp-")}
            />

            {/* Also Known As */}
            <Field
              label="Also Known As"
              placeholder="e.g. Johnny"
              value={submitNickname}
              onChange={setSubmitNickname}
              disabled={!!selectedSubject && !selectedSubject.id.startsWith("temp-")}
            />

            {/* Organization / Company */}
            <Field
              label="Organization / Company"
              placeholder="e.g. Acme Inc."
              value={submitOrganization}
              onChange={setSubmitOrganization}
              disabled={!!selectedSubject && !selectedSubject.id.startsWith("temp-")}
            />

            {/* Relationship */}
            <div className="flex flex-col col-span-1 sm:col-span-2 lg:col-span-1">
              <label className="mb-1 text-sm font-semibold text-gray-700">
                Relationship <span className="text-red-500">*</span>
              </label>

              {relLoading ? (
                <p className="text-sm text-gray-400">Loading relationships...</p>
              ) : (
                <Select
                  value={submitRelationship}
                  onValueChange={setSubmitRelationship}
                  required
                >
                  <SelectTrigger className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>

                  <SelectContent className="z-50 bg-white shadow-lg rounded-lg border border-gray-200">
                    {relationshipTypes.map((rel) => (
                      <SelectItem key={rel.id} value={rel.id}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* 👇 Only show if selected relationship's value is "other" */}
              {relationshipTypes.find((rel) => rel.id === submitRelationship)?.value?.toLowerCase() ===
                "other" && (
                <Input
                  placeholder="Please specify..."
                  value={submitOtherRelationship}
                  onChange={(e) => {
                    const value = e.target.value
                      .split(" ")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ");
                    setSubmitOtherRelationship(value);
                  }}
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

            {/* Location (with autocomplete like setup page) */}
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
                        <span className="font-semibold text-gray-800 text-sm leading-tight">
                          {s.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-1 leading-tight">
                Type city name to see neighborhoods, or neighborhood to see full location.
              </p>
            </div>
          </div>

          {/* 🔍 Search Existing Subjects */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end mb-4">
            <button
              type="button"
              onClick={handleSubjectSearch}
              disabled={subjectLoading}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {subjectLoading ? "Searching..." : "Search Existing Subjects"}
            </button>
          </div>

          {subjectResults.length > 0 && (
            <p className="text-xs text-gray-500 mb-1">
              {submitPhone || submitEmail
                ? "Showing matches by phone/email first."
                : "Showing matches by name, nickname, organization, or location."}
            </p>
          )}

          {/* 📋 Results Section */}
          <div className="mb-8 sm:mb-10 space-y-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">
              Results
            </h3>

            {/* 🧩 CASE 1: Selected subject (including temp) */}
            {selectedSubject ? (
              <div className="space-y-3">
                <SubjectResultCard
                  key={selectedSubject.id}
                  subject={selectedSubject}
                  selectedSubject={selectedSubject}
                  onSelect={setSelectedSubject}
                />
                <div className="flex justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject(null);
                      setTempSubject(null);
                      setSubjectResults([]);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 underline transition"
                  >
                    Change subject selection
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 🧩 CASE 2: Search Results */}
                {subjectSearched && (
                  <>
                    {subjectResults.length > 0 ? (
                      <div className="space-y-3">
                        {subjectResults.slice(0, 10).map((subj) => (
                          <SubjectResultCard
                            key={subj.id}
                            subject={subj}
                            selectedSubject={selectedSubject}
                            onSelect={setSelectedSubject}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic text-center sm:text-left py-3">
                        No matching subjects found.
                      </p>
                    )}
                  </>
                )}

                {/* 🧩 CASE 3: Create New Subject Button */}
                {subjectSearched && (
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
            )}
          </div>

          {/* ⭐ Rating Section (with 0.5 steps & correct click order) */}
          <div className="mt-8 sm:mt-10 select-none">
            <Label className="block text-lg font-medium mb-3 sm:mb-4">
              Rate Your Experience <span className="text-red-500">*</span>
            </Label>

            <div
              className="flex items-center justify-start flex-wrap gap-2 sm:gap-3"
              onTouchStart={(e) => e.stopPropagation()}
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const starValue = i + 1;
                const currentValue = rating;

                // 0, 0.5, or 1 fill for this star
                const fillLevel =
                  currentValue >= starValue
                    ? 1
                    : currentValue >= starValue - 0.5
                    ? 0.5
                    : 0;

                const applyClick = (prev: number) => {
                  const half = starValue - 0.5;
                    
                  // 1️⃣ If current rating is below this star’s half → go to half
                  if (prev < half) return half;
                    
                  // 2️⃣ If we’re exactly on this star’s half → go full
                  if (prev === half) return starValue;
                    
                  // 3️⃣ If we’re exactly on this star’s full → go back to half
                  if (prev === starValue) return half;
                    
                  // 4️⃣ If rating is some other higher star → jump to this half
                  return half;
                };    
                
                useEffect(() => {
                  const handleTouchStart = () => {
                    document.body.classList.add("is-touch");
                  };
                
                  window.addEventListener("touchstart", handleTouchStart, { once: true });
                  return () => window.removeEventListener("touchstart", handleTouchStart);
                }, []);                               

                return (
                  <div
                    key={starValue}
                    className="relative cursor-pointer active:scale-105 transition-transform"
                    style={{ width: 42, height: 42 }}
                    onClick={(e) => {
                      // Skip desktop click if it’s a touch device
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
                    
                        // 👇 If same star tapped again, toggle half/full
                        if (lastTappedStar === starValue) {
                          if (prev === half) return starValue;
                          if (prev === starValue) return half;
                        }
                    
                        // 👇 If tapping new star, start at half
                        setLastTappedStar(starValue);
                        return half;
                      });
                      setHoverRating(null);
                    }}                    
                  >
                    {/* Empty base star */}
                    <Star
                      size={40}
                      className="absolute inset-0 text-gray-300"
                      strokeWidth={1.5}
                    />

                    {/* Filled portion (0%, 50%, or 100%) */}
                    <div
                      className="absolute inset-0 overflow-hidden star-fill-mask"
                      style={{ width: `${fillLevel * 100}%` }}
                    >
                      <Star
                        size={40}
                        className="text-black fill-black transition-all duration-200 ease-in-out"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-sm sm:text-base text-gray-500">
              Selected rating: {rating ? rating.toFixed(1) : "—"} / 10
            </p>
          </div>

          {/* Evidence Upload */}
          <div ref={evidenceRef} className="mb-8">
            <label className="mb-1 text-sm font-semibold text-gray-700">
              Evidence Upload
            </label>

            {/* Dropzone */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition"
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, JPG, PNG, MP4, DOCX (Max 100MB each, up to 10 files)
              </p>
            </div>

            {/* Hidden File Input */}
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
                  if (combined.length > 10) {
                    alert("You can only attach up to 10 files.");
                    return combined.slice(0, 10);
                  }
                  return combined;
                });
                e.target.value = "";
              }}
            />

            {/* Attached Files Section (moved below) */}
            {files.length > 0 && (
              <div className="mt-5 text-left">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Attached Files 
                </h4>
                <div className="flex flex-col sm:flex-wrap gap-3 w-full">
                  {files.map((file, index) => {
                    const sizeKB = file.size / 1024;
                    const sizeLabel =sizeKB < 1024
                        ? `${sizeKB} KB`
                        : `${(file.size / 1048576).toFixed(1)} MB`;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2 shadow-sm bg-gray-50 hover:bg-gray-100 transition w-full sm:w-auto sm:min-w-[230px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.name)}
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-800 truncate max-w-[150px]">
                              {file.name}
                            </span>
                            <span className="text-xs text-gray-500">{sizeLabel}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFiles(files.filter((_, i) => i !== index))
                          }
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
              Experience Details
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              placeholder="Share the details of your experience as clearly and accurately as possible."
              className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Please provide a clear and factual description of your experience.
            </p>
          </div>

          {/* Contributor Identity Preference */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  Display Your Name & Profile <span className="text-red-500">*</span>
                </div>
                <div className="mt-1 text-xs text-gray-600 leading-relaxed">
                  If you turn this ON, your name, profile & profile picture will be shown publicly on this record — even if the AI credibility recommendation label would normally anonymize you.
                </div>

                <div className="mt-3 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                  <p className="leading-relaxed">
                    <span className="font-semibold">Warning:</span> This is permanent for this submission. Anyone can see your information.
                  </p>
                </div>
              </div>

              {/* Toggle (mobile-friendly) */}
              <button
                type="button"
                role="switch"
                aria-checked={displayRealName}
                onClick={() => requestToggleDisplayRealName(!displayRealName)}
                className={[
                  "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition",
                  displayRealName ? "bg-black border-black" : "bg-white border-gray-300",
                ].join(" ")}
                title={displayRealName ? "On" : "Off"}
              >
                <span
                  className={[
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                    displayRealName ? "translate-x-6" : "translate-x-1",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("legal-section")?.scrollIntoView({ behavior: "smooth" })
                  }
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
                By submitting this feedback, you acknowledge that DNounce is a public reputation
                platform and your submission may be publicly visible after AI credibility label
                classification.
              </p>
              <p className="mb-2">
                You certify that your submission is truthful to the best of your knowledge and based
                on either verifiable evidence or honest personal opinion.
              </p>
              <p className="mb-2">
                False or malicious submissions may result in permanent account suspension and legal
                consequences.
              </p>
              <p className="mb-2">
                The subject will be notified of this submission and will have the right to respond
                and challenge the information through our dispute resolution process.
              </p>
              <p className="mb-2">
                All submissions undergo AI credibility label classification and may be reviewed by
                community moderators before publication.
              </p>
              <p className="mb-2">
                You retain copyright of your original content but grant DNounce a license to display
                and distribute it as part of our platform services.
              </p>
              <p className="mb-2">
                DNounce is not responsible for the accuracy of user submissions but provides tools
                for community verification and dispute resolution.
              </p>
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

      {submissionSuccess && submittedRecordId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn px-4"
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-xs sm:max-w-sm text-center"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-semibold text-gray-800 mb-2">Record Submitted!</h2>
              <p className="text-sm text-gray-600 mb-6">
                Your record has been successfully submitted and will appear in your dashboard soon.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://www.dnounce.com/record/${submittedRecordId}`;
                    window.location.href = url;
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
                >
                  View Record
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "https://www.dnounce.com/dashboard/records-submitted";
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg transition"
                >
                  Go to Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )} 

      {showRealNameConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setShowRealNameConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>

              <div className="min-w-0">
                <div className="text-base font-semibold text-gray-900">
                  Display your real name publicly?
                </div>
                <div className="mt-1 text-sm text-gray-600 leading-relaxed">
                  Turning this on will show your full name on the public record page.
                  This cannot be undone for this submission.
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowRealNameConfirm(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisplayRealName(true);
                  setShowRealNameConfirm(false);
                }}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Yes, show my name
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
  );
}

/* ——— Helpers ——— */
function capitalizeWords(value: string) {
  return value
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatPhoneNumber(value: string) {
  // keep only digits
  const digits = value.replace(/\D/g, "").slice(0, 10); // max 10 digits

  const len = digits.length;
  if (len === 0) return "";

  if (len < 4) {
    // 1–3: "123"
    return digits;
  } else if (len < 7) {
    // 4–6: "(123) 4", "(123) 45", "(123) 456"
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  // 7–10: "(123) 456-7", "(123) 456-78", "(123) 456-7890"
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/* ——— Field Reusable Component ——— */
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

    if (mode === "phone") {
      next = formatPhoneNumber(raw);
    } else if (mode === "email") {
      // no capitalization, just trim spaces
      next = raw.trim();
    } else {
      // normal text fields
      next = capitalizeWords(raw);
    }

    onChange(next);
  };

  const inputType =
    mode === "phone" ? "tel" : mode === "email" ? "email" : "text";

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-[15px] font-medium text-[#1E293B] tracking-tight">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>} {/* ✅ Asterisk */}
      </label>
      <Input
        placeholder={placeholder}
        type={inputType}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-[15px] text-gray-800 placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
          disabled
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : "bg-white"
        }`}
      />
      {helperText && (
        <p className="text-xs text-gray-500 mt-1 leading-tight">{helperText}</p>
      )}
    </div>
  );
}

type SubjectResultCardProps = {
  subject: SubjectPreview;
  selectedSubject: SubjectPreview | null;
  onSelect: (s: SubjectPreview | null) => void;
};

function SubjectResultCard({
  subject,
  selectedSubject,
  onSelect,
}: SubjectResultCardProps) {
  const isSelected = selectedSubject?.id === subject.id;

  return (
    <div
      className={`w-full rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4 shadow-sm hover:shadow-md transition cursor-pointer ${
        isSelected ? "border-gray-400 bg-gray-50" : "border-gray-200 bg-white"
      }`}
      onClick={() => onSelect(isSelected ? null : subject)}
    >
      {/* Left section: avatar + info */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSelected ? "bg-gray-100 border-2 border-gray-400" : "bg-gray-100"
          }`}
        >
          <User className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base sm:text-sm font-semibold text-gray-900 break-words">
            {subject.name}
            {subject.nickname && (
              <span className="text-gray-500 font-normal">
                {" "}
                ({subject.nickname})
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-gray-600 break-words">
            {subject.organization || "Independent"}
            {subject.location ? ` • ${subject.location}` : ""}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1 truncate">
            ID: {subject.id}
          </div>
        </div>
      </div>

      {/* Right section: actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        {!subject.id.startsWith("temp-") && (
          <Link
            href={`/subject/${subject.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-700 hover:text-black hover:underline flex items-center justify-center gap-1 border border-gray-300 rounded-full px-3 py-1.5 sm:py-1 bg-white w-full sm:w-auto"
            onClick={(e) => e.stopPropagation()}
          >
            View
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(isSelected ? null : subject);
          }}
          className={`flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 sm:py-1 rounded-full border transition w-full sm:w-auto ${
            isSelected
              ? "border-gray-400 text-gray-700 bg-gray-50 hover:bg-gray-100"
              : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
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


