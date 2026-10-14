import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import ShareExperienceButton from "./ShareExperienceButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your experience | DNounce",
  robots: { index: false, follow: false },
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-xl mx-auto px-4 py-12">{children}</div>;
}

export default async function RequestLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: request } = await supabaseAdmin
    .from("record_requests")
    .select("token, status, expires_at, contributor_first_name, subject_uuid, relationship")
    .eq("token", token)
    .maybeSingle();

  if (!request) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This link isn't valid</h1>
        <p className="text-gray-500">Double-check the link you received, or ask the person who sent it for a new one.</p>
      </Shell>
    );
  }

  const expired = request.status === "expired" || new Date(request.expires_at) < new Date();
  if (expired) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">This link has expired</h1>
        <p className="text-gray-500">Requests are valid for 30 days. Ask the person who sent it to send you a new one.</p>
      </Shell>
    );
  }

  if (request.status === "completed") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You've already shared your experience</h1>
        <p className="text-gray-500">Thanks! Your record has been submitted.</p>
      </Shell>
    );
  }

  // Mark as opened the first time
  if (request.status === "sent") {
    await supabaseAdmin
      .from("record_requests")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("token", token)
      .eq("status", "sent");
  }

  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("name")
    .eq("subject_uuid", request.subject_uuid)
    .maybeSingle();

  const name = subject?.name || "Someone";

  return (
    <Shell>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-3">
        {name} asked for your honest experience.
      </h1>
      <p className="text-gray-600 leading-relaxed mb-8">
        Share what it was like — good, bad, or mixed. Your record is yours: {name} can respond to it, but can't change or delete it.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">What happens after you submit</h2>
        <ol className="space-y-3 text-sm text-gray-600">
          <li><span className="font-semibold text-gray-900">1. Your record is reviewed</span> and {name} is notified.</li>
          <li><span className="font-semibold text-gray-900">2. It's published</span> to {name}'s profile.</li>
          <li><span className="font-semibold text-gray-900">3. If {name} disputes it,</span> you'll both have 72 hours to present your side and evidence in a debate.</li>
          <li><span className="font-semibold text-gray-900">4. Then the DNounce community</span> reviews both sides and votes within 48 hours on who they side with.</li>
          <li><span className="font-semibold text-gray-900">5. The verdict is final</span> and shown publicly.</li>
        </ol>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Who is the community?</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Other DNounce members who aren't involved in the record. They read both sides, look at the evidence, and vote. Neither you nor {name} can vote on your own record. Voters are also rated on how fair and consistent their votes are, so careless or biased voting hurts their own standing.
        </p>
      </div>

      <p className="text-sm text-gray-500 mb-4">You'll be notified at every stage, and you can stay anonymous throughout.</p>

      <ShareExperienceButton token={token} subjectUuid={request.subject_uuid} relationship={request.relationship} />
    </Shell>
  );
}
