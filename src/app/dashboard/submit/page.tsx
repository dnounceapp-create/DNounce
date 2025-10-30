"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Upload, MapPin, FileText, Search, User, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Link from "next/link";

/* ——— Page Component ——— */
export default function SubmitRecordPage() {
  const [submitName, setSubmitName] = useState("");
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
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]); 

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
            .select("id, label, value")
            .order("label", { ascending: true }),
        ]);

        if (mainRes.error) console.error("relationship_types error:", mainRes.error);
        if (otherRes.error) console.error("relationship_types_other error:", otherRes.error);

        const combined = [...(mainRes.data || []), ...(otherRes.data || [])];

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
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Close only if click is not inside any of our dropdown/input wrappers
      if (!target.closest("[data-subject-search-root]")) {
        setResultsOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /* ——— Location Autocomplete (wired to /api/location) ——— */
  useEffect(() => {
    const q = submitLocation?.trim();
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
        const data = await res.json();
        setSubmitLocationSuggestions(data.predictions || []);
      } catch (err) {
        console.error("Submit location suggestions error:", err);
        setSubmitLocationSuggestions([]);
      }
    };

    const id = setTimeout(fetchSuggestions, 300); // debounce
    return () => clearTimeout(id);
  }, [submitLocation]);

  /** ——— Subject Search (UI only) ——— */
  type SubjectPreview = {
    id: string;
    name: string;
    nickname?: string | null;
    organization?: string | null;
    location?: string | null;
    avatar_url?: string | null;
  };

  const [subjectQuery, setSubjectQuery] = useState("");
  const [subjectResults, setSubjectResults] = useState<SubjectPreview[]>([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false); // show/hide dropdown
  const [selectedSubject, setSelectedSubject] = useState<SubjectPreview | null>(null);
  const isLocked = !!selectedSubject;

  /* ——— Debounced search (UI stub only) ——— */
  useEffect(() => {
    const q = subjectQuery.trim();

    // If user cleared input, close list
    if (!q) {
      setSubjectResults([]);
      setResultsOpen(false);
      return;
    }

    // Start "loading" state
    setSubjectLoading(true);

    const t = setTimeout(async () => {
      // TODO: replace with real search later
      // For now: return empty array or a tiny mock when query has 3+ chars
      let mock: SubjectPreview[] = [];
      if (q.length >= 3) {
        mock = [
          {
            id: "demo-1",
            name: "John Example",
            nickname: "Johnny",
            organization: "AutoFix Garage",
            location: "San Francisco, CA",
          },
          {
            id: "demo-2",
            name: "Jane Sample",
            organization: "Acme Inc.",
            location: "New York, NY",
          },
        ].filter((p) =>
          [p.name, p.nickname, p.organization, p.location]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(q.toLowerCase()))
        ).slice(0, 10);
      }

      setSubjectResults(mock);
      setResultsOpen(true);
      setSubjectLoading(false);
    }, 300); // debounce

    return () => clearTimeout(t);
  }, [subjectQuery]);

  /* ——— Terms Scroll ——— */
  const handleTermsScroll = () => {
    /* placeholder for scroll detection if needed later */
  };

  useEffect(() => {
    if (selectedSubject) {
      setSubmitLocationSuggestions([]);
    }
  }, [selectedSubject]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreedToTerms) {
      alert("You must agree to the Terms of Service.");
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Get the logged-in user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw userError || new Error("No user logged in.");
  
      const user = userData.user;
  
      // Insert into records table
      const { data, error } = await supabase
        .from("records")
        .insert({
          created_by: user.id,
          subject_user_id: selectedSubject?.id || null,
          name: submitName || selectedSubject?.name || "Anonymous",
          nickname: submitNickname,
          organization: submitOrganization,
          relationship_id: submitRelationship || null,
          category: submitCategory,
          location: submitLocation,
          description: document.querySelector("textarea")?.value || "",
        })
        .select()
        .single();
  
      if (error) throw error;
  
      // Redirect to "My Records"
      router.push("/dashboard/myrecords");
    } catch (err) {
      console.error("Error submitting record:", err);
      alert("There was an error submitting your record.");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  /* ——— Page UI ——— */
  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col items-center justify-center text-center mb-10">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Submit a Record
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-500 max-w-md">
        Share your verified experience or information to help maintain transparency and community accountability.
        </p>
      </div>
      <Card className="p-4 sm:p-8 bg-white shadow-lg rounded-xl">
        <CardContent className="p-0">
          
          {/* ——— Subject Finder (UI only) ——— */}
          <div className="mb-8" data-subject-search-root>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Find an Existing Subject</label>
              {selectedSubject ? (
                <button
                  type="button"
                  onClick={() => setSelectedSubject(null)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Clear selected
                </button>
              ) : null}
            </div>

            {/* Search input */}
            <div className="relative">
              <Input
                value={selectedSubject ? selectedSubject.name : subjectQuery}
                onChange={(e) => {
                  // If a subject was selected, typing again will clear selection and start a new query
                  if (selectedSubject) setSelectedSubject(null);
                  setSubjectQuery(e.target.value);
                }}
                onFocus={() => {
                  if (subjectResults.length > 0) setResultsOpen(true);
                }}
                placeholder="Type a name, nickname, or organization…"
                className={`w-full rounded-xl border-gray-300 pr-10 ${selectedSubject ? "bg-green-50" : ""}`}
              />
              {/* right icon */}
              <div className="absolute inset-y-0 right-2 flex items-center">
                {subjectLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Dropdown results */}
              {resultsOpen && subjectResults.length > 0 && !selectedSubject && (
                <ul
                  className="absolute mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto z-50"
                  onMouseDown={(e) => e.preventDefault()} // keep focus for input
                >
                  {subjectResults.slice(0, 10).map((p) => (
                    <li
                      key={p.id}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
                      onClick={() => {
                        setSelectedSubject(p);
                        setSubjectQuery(p.name);
                        setResultsOpen(false);
                      }}
                    >
                      {/* avatar */}
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>

                      {/* text */}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {p.name}{p.nickname ? ` (${p.nickname})` : ""}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {p.organization ? p.organization : "—"}
                          {p.location ? `  •  ${p.location}` : ""}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selected subject preview card (light theme, aligned with global UI) */}
            {selectedSubject && (
              <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 animate-fadeIn">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-green-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>

                  {/* Subject Info */}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex flex-wrap items-center gap-1">
                      {selectedSubject.name}
                      {selectedSubject.nickname && (
                        <span className="text-gray-500 text-xs sm:text-sm">
                          ({selectedSubject.nickname})
                        </span>
                      )}
                    </h3>

                    <p className="text-xs text-gray-600 truncate">
                      {selectedSubject.organization || "Independent"}
                      {selectedSubject.location ? ` • ${selectedSubject.location}` : ""}
                    </p>

                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      ID: {selectedSubject.id}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <Link
                    href={`/subjects/${selectedSubject.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-green-700 hover:text-green-800 hover:underline flex items-center gap-1"
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

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject(null);
                      setSubjectQuery("");
                    }}
                    className="text-gray-400 hover:text-red-600 transition"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}


            {/* Helper text */}
            {!selectedSubject && (
              <p className="text-xs text-gray-500 mt-2">
                Pick one subject if found. If no match appears, you can still continue — we’ll create a subject profile from your entry.
              </p>
            )}
          </div>

          {/* ——— OR Divider ——— */}
          <div className="flex items-center justify-center my-8">
            <div className="h-px bg-gray-200 w-full"></div>
            <span className="mx-3 text-xs uppercase tracking-wider text-gray-400">or</span>
            <div className="h-px bg-gray-200 w-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Subject Name */}
            <Field
              label="Subject's Name"
              placeholder="e.g. John Doe"
              value={submitName}
              onChange={setSubmitName}
              disabled={!!selectedSubject}
            />

            {/* Nickname */}
            <Field
              label="Also Known As"
              placeholder="e.g. Johnny"
              value={submitNickname}
              onChange={setSubmitNickname}
              disabled={!!selectedSubject}
            />

            {/* Organization */}
            <Field
              label="Organization/Company"
              placeholder="e.g. Acme Inc."
              value={submitOrganization}
              onChange={setSubmitOrganization}
              disabled={!!selectedSubject}
            />

            {/* Relationship */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-gray-700">Relationship</label>

              {relLoading ? (
                <p className="text-sm text-gray-400">Loading relationships...</p>
              ) : (
                <Select
                  disabled={isLocked}
                  value={submitRelationship}
                  onValueChange={setSubmitRelationship}
                >
                  <SelectTrigger
                    className={`w-full rounded-lg border-gray-300 ${
                      isLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                    }`}
                  >
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

              {/* Only show the "Other" input if NOT locked and "other" is selected */}
              {!isLocked &&
                relationshipTypes.find((rel) => rel.id === submitRelationship)?.value === "other" && (
                  <Input
                    placeholder="Please specify..."
                    value={submitOtherRelationship}
                    onChange={(e) => setSubmitOtherRelationship(capitalizeWords(e.target.value))}
                    className="mt-3 w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                )}
            </div>

            {/* Category */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-gray-700">Category</label>
              <Input
                placeholder="e.g. Barber, Waitress, Doctor..."
                value={submitCategory}
                onChange={(e) => setSubmitCategory(e.target.value)}
                disabled={isLocked}
                className={`w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 ${
                  isLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use a label that best fits how you may find this person.
              </p>
            </div>

            {/* Location */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-gray-700">Location</label>
              <div className="relative">
                <Input
                  placeholder="City or neighborhood..."
                  type="text"
                  value={submitLocation}
                  onChange={(e) => setSubmitLocation(e.target.value)}
                  disabled={isLocked}
                  className={`w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 ${
                    isLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                  }`}
                />

                {/* Only show suggestions if NOT locked */}
                {!isLocked && submitLocationSuggestions.length > 0 && (
                  <ul className="absolute z-50 bg-white border rounded-md w-full shadow-md mt-1 max-h-60 sm:max-h-80 overflow-y-auto">
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
              <p className="text-xs text-gray-500 mt-1">
                Type city name to see neighborhoods, or neighborhood to see full location.
              </p>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="mb-8">
            <label className="mb-1 text-sm font-semibold text-gray-700">Evidence Upload</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition"
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, JPG, PNG, MP4, DOCX (Max 100MB each)
              </p>
              {files.length > 0 && (
                <ul className="mt-3 text-sm text-gray-600">
                  {files.map((f, i) => (
                    <li key={i} className="truncate">{f.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.mp4,.docx"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>

          {/* Description */}
          <div className="mb-8">
            <label className="mb-1 text-sm font-semibold text-gray-700">Experience Details</label>
            <textarea
              placeholder="Share the details of your experience as clearly and accurately as possible."
              className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              className="h-40 overflow-y-auto border border-gray-200 rounded-lg p-4 text-xs text-gray-600 bg-gray-50"
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

/* ——— Field Reusable Component ——— */
function Field({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-semibold text-gray-700">{label}</label>
      <Input
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(capitalizeWords(e.target.value))}
        disabled={disabled}
        className={`w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 ${
          disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
}
