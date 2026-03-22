"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Prefs = {
  notif_email: boolean;
  notif_push: boolean;

  // Subject
  notif_subject_record_submitted: boolean;
  notif_subject_record_published: boolean;
  notif_subject_dispute_opened: boolean;
  notif_subject_debate_open: boolean;
  notif_subject_voting_started: boolean;
  notif_subject_voting_ended: boolean;
  notif_subject_interaction_unlocked: boolean;
  notif_subject_reply_to_statement: boolean;

  // Contributor
  notif_contributor_ai_complete: boolean;
  notif_contributor_record_published: boolean;
  notif_contributor_record_disputed: boolean;
  notif_contributor_debate_open: boolean;
  notif_contributor_voting_started: boolean;
  notif_contributor_voting_ended: boolean;
  notif_contributor_interaction_unlocked: boolean;
  notif_contributor_reply_to_statement: boolean;

  // Voter
  notif_voter_voting_open: boolean;
  notif_voter_voting_ended: boolean;
  notif_voter_vote_flagged: boolean;
  notif_voter_reply_to_vote: boolean;

  // Citizen
  notif_citizen_reply_to_statement: boolean;
  notif_citizen_record_decided: boolean;

  // Pinned
  notif_pinned_stage_change: boolean;
  notif_pinned_debate_open: boolean;
  notif_pinned_voting_open: boolean;
  notif_pinned_decided: boolean;

  // Following
  notif_following_stage_change: boolean;
  notif_following_debate_open: boolean;
  notif_following_voting_open: boolean;
  notif_following_decided: boolean;
};

const DEFAULTS: Prefs = {
  notif_email: true,
  notif_push: false,

  notif_subject_record_submitted: true,
  notif_subject_record_published: true,
  notif_subject_dispute_opened: true,
  notif_subject_debate_open: true,
  notif_subject_voting_started: true,
  notif_subject_voting_ended: true,
  notif_subject_interaction_unlocked: true,
  notif_subject_reply_to_statement: true,

  notif_contributor_ai_complete: true,
  notif_contributor_record_published: true,
  notif_contributor_record_disputed: true,
  notif_contributor_debate_open: true,
  notif_contributor_voting_started: true,
  notif_contributor_voting_ended: true,
  notif_contributor_interaction_unlocked: true,
  notif_contributor_reply_to_statement: true,

  notif_voter_voting_open: true,
  notif_voter_voting_ended: true,
  notif_voter_vote_flagged: true,
  notif_voter_reply_to_vote: true,

  notif_citizen_reply_to_statement: true,
  notif_citizen_record_decided: false,

  notif_pinned_stage_change: true,
  notif_pinned_debate_open: true,
  notif_pinned_voting_open: true,
  notif_pinned_decided: true,

  notif_following_stage_change: true,
  notif_following_debate_open: true,
  notif_following_voting_open: true,
  notif_following_decided: true,
};

function ToggleRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
      <div className="mr-4">
        <p className="font-medium text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`shrink-0 px-4 py-1 rounded-full text-sm font-medium transition-all ${
          value
            ? "bg-green-100 text-green-700 border border-green-300"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setPrefs((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.keys(DEFAULTS).map((k) => [k, data[k] ?? (DEFAULTS as any)[k]])
          ),
        }));
      }
      setLoading(false);
    }
    load();
  }, []);

  const set = (key: keyof Prefs) => (v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not signed in.");

      if (prefs.notif_push && "Notification" in window) {
        const result = await Notification.requestPermission();
        if (result !== "granted") {
          setToast({ type: "error", msg: "Please allow push notifications in browser settings." });
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("user_preferences")
        .upsert({ user_id: session.user.id, ...prefs, updated_at: new Date().toISOString() });

      if (error) throw error;
      setToast({ type: "success", msg: "Notification preferences saved." });
    } catch (err: any) {
      setToast({ type: "error", msg: err?.message || "Failed to save." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-gray-600 mb-8">
          Control exactly when and how DNounce alerts you — by role and by stage.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">

          {/* ── Delivery ── */}
          <Section title="Delivery" subtitle="How you receive notifications.">
            <ToggleRow title="Email notifications" desc="Receive stage updates and alerts via email." value={prefs.notif_email} onChange={set("notif_email")} />
            <ToggleRow title="Push notifications" desc="Browser or PWA alerts even when DNounce isn't open." value={prefs.notif_push} onChange={set("notif_push")} />
          </Section>

          {/* ── Subject ── */}
          <Section title="Subject" subtitle="You are the person a record is about.">
            <ToggleRow
              title="Record submitted about you"
              desc="When a contributor files a record naming you — before it publishes. You have 24 hours to review privately."
              value={prefs.notif_subject_record_submitted}
              onChange={set("notif_subject_record_submitted")}
            />
            <ToggleRow
              title="Record published"
              desc="When the record goes live and becomes publicly visible."
              value={prefs.notif_subject_record_published}
              onChange={set("notif_subject_record_published")}
            />
            <ToggleRow
              title="Dispute confirmation"
              desc="Confirmation when your deletion request is received and the debate clock starts."
              value={prefs.notif_subject_dispute_opened}
              onChange={set("notif_subject_dispute_opened")}
            />
            <ToggleRow
              title="Debate window opens"
              desc="When the 72-hour debate window starts — time to present your case and respond."
              value={prefs.notif_subject_debate_open}
              onChange={set("notif_subject_debate_open")}
            />
            <ToggleRow
              title="Voting begins"
              desc="When the community starts voting on whether to keep or delete the record."
              value={prefs.notif_subject_voting_started}
              onChange={set("notif_subject_voting_started")}
            />
            <ToggleRow
              title="Voting concluded"
              desc="When the 48-hour vote closes and the outcome is decided."
              value={prefs.notif_subject_voting_ended}
              onChange={set("notif_subject_voting_ended")}
            />
            <ToggleRow
              title="Community interaction unlocked"
              desc="7 days after a decision — you can interact with the community section again."
              value={prefs.notif_subject_interaction_unlocked}
              onChange={set("notif_subject_interaction_unlocked")}
            />
            <ToggleRow
              title="Someone replied to your statement"
              desc="When the contributor replies to your debate statement."
              value={prefs.notif_subject_reply_to_statement}
              onChange={set("notif_subject_reply_to_statement")}
            />
          </Section>

          {/* ── Contributor ── */}
          <Section title="Contributor" subtitle="You submitted the record.">
            <ToggleRow
              title="AI review complete"
              desc="When DNounce AI finishes reviewing your submission and assigns a credibility label."
              value={prefs.notif_contributor_ai_complete}
              onChange={set("notif_contributor_ai_complete")}
            />
            <ToggleRow
              title="Record published"
              desc="When your record goes live publicly."
              value={prefs.notif_contributor_record_published}
              onChange={set("notif_contributor_record_published")}
            />
            <ToggleRow
              title="Record disputed"
              desc="When the subject files a deletion request — debate opens in 24 hours."
              value={prefs.notif_contributor_record_disputed}
              onChange={set("notif_contributor_record_disputed")}
            />
            <ToggleRow
              title="Debate window opens"
              desc="When the 72-hour debate window starts — time to defend your record with evidence."
              value={prefs.notif_contributor_debate_open}
              onChange={set("notif_contributor_debate_open")}
            />
            <ToggleRow
              title="Voting begins"
              desc="When the community starts voting on your record."
              value={prefs.notif_contributor_voting_started}
              onChange={set("notif_contributor_voting_started")}
            />
            <ToggleRow
              title="Voting concluded"
              desc="When the vote closes and the outcome is final."
              value={prefs.notif_contributor_voting_ended}
              onChange={set("notif_contributor_voting_ended")}
            />
            <ToggleRow
              title="Community interaction unlocked"
              desc="7 days after a decision — you can participate in the community section again."
              value={prefs.notif_contributor_interaction_unlocked}
              onChange={set("notif_contributor_interaction_unlocked")}
            />
            <ToggleRow
              title="Someone replied to your statement"
              desc="When the subject replies to your debate statement."
              value={prefs.notif_contributor_reply_to_statement}
              onChange={set("notif_contributor_reply_to_statement")}
            />
          </Section>

          {/* ── Voter ── */}
          <Section title="Voter" subtitle="You submitted a vote on a record.">
            <ToggleRow
              title="Voting window opens"
              desc="When a record you're eligible to vote on enters the 48-hour voting stage."
              value={prefs.notif_voter_voting_open}
              onChange={set("notif_voter_voting_open")}
            />
            <ToggleRow
              title="Voting concluded"
              desc="When the vote closes and you can see the final outcome."
              value={prefs.notif_voter_voting_ended}
              onChange={set("notif_voter_voting_ended")}
            />
            <ToggleRow
              title="Your vote was flagged"
              desc="When the community flags your vote explanation as low quality."
              value={prefs.notif_voter_vote_flagged}
              onChange={set("notif_voter_vote_flagged")}
            />
            <ToggleRow
              title="Someone replied to your vote"
              desc="When another participant replies to your vote statement."
              value={prefs.notif_voter_reply_to_vote}
              onChange={set("notif_voter_reply_to_vote")}
            />
          </Section>

          {/* ── Citizen ── */}
          <Section title="Citizen" subtitle="You participated in the community section of a record.">
            <ToggleRow
              title="Someone replied to your statement"
              desc="When another participant replies to your community statement or comment."
              value={prefs.notif_citizen_reply_to_statement}
              onChange={set("notif_citizen_reply_to_statement")}
            />
            <ToggleRow
              title="Record outcome decided"
              desc="When a record you participated in is officially kept or deleted."
              value={prefs.notif_citizen_record_decided}
              onChange={set("notif_citizen_record_decided")}
            />
          </Section>

          {/* ── Pinned ── */}
          <Section title="Pinned Records" subtitle="Records you've pinned to your dashboard.">
            <ToggleRow
              title="Stage change"
              desc="Any time a pinned record moves to a new stage."
              value={prefs.notif_pinned_stage_change}
              onChange={set("notif_pinned_stage_change")}
            />
            <ToggleRow
              title="Debate opens"
              desc="When a pinned record enters the debate stage."
              value={prefs.notif_pinned_debate_open}
              onChange={set("notif_pinned_debate_open")}
            />
            <ToggleRow
              title="Voting opens"
              desc="When a pinned record enters the voting stage."
              value={prefs.notif_pinned_voting_open}
              onChange={set("notif_pinned_voting_open")}
            />
            <ToggleRow
              title="Outcome decided"
              desc="When a pinned record is officially kept or deleted."
              value={prefs.notif_pinned_decided}
              onChange={set("notif_pinned_decided")}
            />
          </Section>

          {/* ── Following ── */}
          <Section title="Following Records" subtitle="Records you're following for updates.">
            <ToggleRow
              title="Stage change"
              desc="Any time a followed record moves to a new stage."
              value={prefs.notif_following_stage_change}
              onChange={set("notif_following_stage_change")}
            />
            <ToggleRow
              title="Debate opens"
              desc="When a followed record enters the debate stage."
              value={prefs.notif_following_debate_open}
              onChange={set("notif_following_debate_open")}
            />
            <ToggleRow
              title="Voting opens"
              desc="When a followed record enters the voting stage."
              value={prefs.notif_following_voting_open}
              onChange={set("notif_following_voting_open")}
            />
            <ToggleRow
              title="Outcome decided"
              desc="When a followed record is officially kept or deleted."
              value={prefs.notif_following_decided}
              onChange={set("notif_following_decided")}
            />
          </Section>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {toast && (
          <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}