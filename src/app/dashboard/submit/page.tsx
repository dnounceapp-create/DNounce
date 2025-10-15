"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Upload, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* ——— Page Component ——— */
export default function SubmitRecordPage() {
  const [submitName, setSubmitName] = useState("");
  const [submitNickname, setSubmitNickname] = useState("");
  const [submitOrganization, setSubmitOrganization] = useState("");
  const [submitRelationship, setSubmitRelationship] = useState("");
  const [submitOtherRelationship, setSubmitOtherRelationship] = useState("");
  const [submitLocation, setSubmitLocation] = useState("");
  const [submitLocationSuggestions, setSubmitLocationSuggestions] = useState<any[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [relLoading, setRelLoading] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<any[]>([]);

  const termsRef = useRef<HTMLDivElement>(null);

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

  /* ——— Terms Scroll ——— */
  const handleTermsScroll = () => {
    /* placeholder for scroll detection if needed later */
  };

  /* ——— Page UI ——— */
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Card className="p-4 sm:p-8 bg-white shadow-lg rounded-xl">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Subject Name */}
            <Field
              label="Subject's Name"
              placeholder="e.g. John Doe"
              value={submitName}
              onChange={setSubmitName}
            />

            {/* Nickname */}
            <Field
              label="Also Known As"
              placeholder="e.g. Johnny"
              value={submitNickname}
              onChange={setSubmitNickname}
            />

            {/* Organization */}
            <Field
              label="Organization/Company"
              placeholder="e.g. Acme Inc."
              value={submitOrganization}
              onChange={setSubmitOrganization}
            />

            {/* Relationship */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-gray-700">Relationship</label>
              {relLoading ? (
                <p className="text-sm text-gray-400">Loading relationships...</p>
              ) : (
                <Select value={submitRelationship} onValueChange={setSubmitRelationship}>
                  <SelectTrigger className="w-full rounded-lg border-gray-300">
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

              {/* Show input if "Other" selected */}
              {relationshipTypes.find((rel) => rel.id === submitRelationship)?.value ===
                "other" && (
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
                className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use a label that best fits how you may find this person.
              </p>
            </div>

            {/* Location (wired to /api/location) */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-gray-700">Location</label>
              <div className="relative">
                <Input
                  placeholder="City or neighborhood..."
                  type="text"
                  value={submitLocation}
                  onChange={(e) => setSubmitLocation(e.target.value)}
                  className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                {submitLocationSuggestions.length > 0 && (
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
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, JPG, PNG, MP4, DOCX (Max 100MB each)
              </p>
            </div>
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

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 mb-6 w-full text-center">
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    EXAMPLE ONLY - NOT REAL DATA
                  </p>
                  <p className="text-sm text-yellow-700">
                    This is a demonstration of how profiles appear on DNounce
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-semibold text-gray-700">{label}</label>
      <Input
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(capitalizeWords(e.target.value))}
        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
