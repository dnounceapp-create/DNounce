import { supabase } from "@/lib/supabaseClient";
import { classifyRecord } from "@/lib/ai/classifyRecord";

type SubmitRecordInput = {
  subjectId: string;
  organization?: string;
  location?: string;
  rating: number;
  email_or_phone?: string;
  first_name?: string;
  last_name?: string;
  also_known_as?: string;
  relationship?: string;
  category?: string;
  description: string;
  agree_terms: boolean;
  contributorDisplayName?: string;
};

export async function submitRecord(formData: SubmitRecordInput) {
  // ----------------------------
  // STEP 1 — Validate inputs
  // ----------------------------
  if (!formData.subjectId) throw new Error("Missing subjectId");
  if (!formData.description?.trim()) throw new Error("Missing description");
  if (!formData.rating || formData.rating <= 0) throw new Error("Missing rating");

  // ----------------------------
  // STEP 1b — Prevent self-submission
  // ----------------------------
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user?.id;
  if (authUserId) {
    const { data: selfSubject } = await supabase
      .from("subjects")
      .select("subject_uuid")
      .eq("owner_auth_user_id", authUserId)
      .eq("subject_uuid", formData.subjectId)
      .maybeSingle();
    if (selfSubject) throw new Error("You cannot submit a record about yourself.");
  }

  // -----------------------------------
  // STEP 2 — Insert record into Supabase
  // -----------------------------------
  const { data, error } = await supabase
    .from("records")
    .insert({
      subject_id: formData.subjectId,
      organization: formData.organization || null,
      location: formData.location || null,
      rating: formData.rating,
      email_or_phone: formData.email_or_phone || null,
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      also_known_as: formData.also_known_as || null,
      relationship: formData.relationship || null,
      category: formData.category || null,
      description: formData.description.trim(),
      agree_terms: formData.agree_terms,
      record_type: "pending",
      status: "ai_verification",
      is_published: false,
      record_alias: formData.contributorDisplayName || null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("❌ Record insert failed:", error);
    throw new Error(error?.message || "Record insert failed");
  }

  const recordId = data.id;

  // -------------------------------------------------------
  // STEP 3 — Compute credibility (client-side classifier)
  // -------------------------------------------------------
  const credibility = classifyRecord({
    description: formData.description.trim(),
    rating: formData.rating,
    hasAttachments: false,
  });

  // -------------------------------------------------------
  // STEP 4 — Persist credibility (SERVER SIDE)
  // -------------------------------------------------------
  try {
    const res = await fetch("/api/records/update-credibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, credibility }),
    });
  
    if (!res.ok) {
      const text = await res.text();
      console.error("❌ update-credibility failed:", res.status, text);
    }
  } catch (err) {
    console.error("❌ update-credibility failed:", err);
  }  

  return { recordId, credibility };
}
