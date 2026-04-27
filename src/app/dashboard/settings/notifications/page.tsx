"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Prefs = {
  notif_email: boolean;
  notif_push: boolean;
  notif_tagged: boolean;
  notif_debate_new_statement: boolean;
  notif_debate_reply: boolean;
  notif_community_new_statement: boolean;
  notif_vote_reply: boolean;
  notif_pinned_debate_open: boolean;
  notif_pinned_voting_open: boolean;
  notif_pinned_outcome: boolean;
  notif_pinned_all_activity: boolean;
  notif_following_debate_open: boolean;
  notif_following_voting_open: boolean;
  notif_following_outcome: boolean;
  notif_following_all_activity: boolean;
  notif_citizen_community_activity: boolean;
  notif_verdict_announcement: boolean;
};

const DEFAULTS: Prefs = {
  notif_email: true,
  notif_push: false,
  notif_tagged: true,
  notif_debate_new_statement: true,
  notif_debate_reply: true,
  notif_community_new_statement: true,
  notif_vote_reply: true,
  notif_pinned_debate_open: true,
  notif_pinned_voting_open: true,
  notif_pinned_outcome: true,
  notif_pinned_all_activity: false,
  notif_following_debate_open: true,
  notif_following_voting_open: true,
  notif_following_outcome: true,
  notif_following_all_activity: false,
  notif_citizen_community_activity: false,
  notif_verdict_announcement: true,
};

function ToggleRow({
  title,
  desc,
  value,
  onChange,
  locked,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between border rounded-xl p-3 ${locked ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200"}`}>
      <div className="mr-4 flex-1">
        <div className="flex items-center gap-2">
          <p className={`font-medium text-sm ${locked ? "text-gray-400" : "text-gray-800"}`}>{title}</p>
          {locked && <Lock className="w-3 h-3 text-gray-400" />}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      {locked ? (
        <span className="shrink-0 px-4 py-1 rounded-full text-sm font-medium bg-green-50 text-green-600 border border-green-200">
          Always on
        </span>
      ) : (
        <button
          onClick={() => onChange?.(!value)}
          className={`shrink-0 px-4 py-1 rounded-full text-sm font-medium transition-all ${
            value
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {value ? "On" : "Off"}
        </button>
      )}
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

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-gray-500 mb-2 text-sm">
          Control exactly when DNounce alerts you. Locked items cannot be turned off — they protect you from missing critical updates about your records.
        </p>
        <p className="text-gray-400 text-xs mb-8">Everything else is on by default but fully adjustable.</p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">

          {/* ── Delivery ── */}
          <Section title="Delivery" subtitle="How you receive notifications.">
            <ToggleRow title="Email notifications" desc="Receive stage updates and alerts via email." value={prefs.notif_email} onChange={set("notif_email")} />
            <ToggleRow title="Push notifications" desc="Browser or PWA alerts even when DNounce isn't open." value={prefs.notif_push} onChange={set("notif_push")} />
          </Section>

          {/* ── Critical Alerts ── */}
          <Section title="Critical Alerts" subtitle="These cannot be turned off. They ensure you never miss something that requires your action.">
            <ToggleRow locked title="Record stage changes" desc="Every time a record you're involved in moves to a new stage — as subject or contributor." value={true} />
            <ToggleRow locked title="Vote flagged" desc="When your vote explanation is flagged as low quality by the community." value={true} />
            <ToggleRow locked title="Vote convicted" desc="When your vote is disqualified and removed from the final tally." value={true} />
          </Section>

          {/* ── Tags ── */}
          <Section title="Tags" subtitle="When someone mentions or tags you anywhere on DNounce.">
            <ToggleRow title="Tagged in a statement or reply" desc="When someone tags you in a debate statement, vote reply, or community comment." value={prefs.notif_tagged} onChange={set("notif_tagged")} />
          </Section>

          {/* ── Debate ── */}
          <Section title="Debate Activity" subtitle="For records where you are the subject or contributor.">
            <ToggleRow
              title="New opening statement"
              desc="When the other party posts their first statement in the debate."
              value={prefs.notif_debate_new_statement}
              onChange={set("notif_debate_new_statement")}
            />
            <ToggleRow
              title="Reply to your statement"
              desc="When the other party replies to one of your debate statements."
              value={prefs.notif_debate_reply}
              onChange={set("notif_debate_reply")}
            />
          </Section>

          {/* ── Voting ── */}
          <Section title="Voting Activity" subtitle="For records where you cast a vote.">
            <ToggleRow
              title="Reply to your vote"
              desc="When someone replies to your vote statement."
              value={prefs.notif_vote_reply}
              onChange={set("notif_vote_reply")}
            />
          </Section>

          {/* ── Community ── */}
          <Section title="Community Activity" subtitle="For community statements and replies.">
            <ToggleRow
              title="New community statement on your record"
              desc="When a citizen or voter posts a community statement on a record you're involved in."
              value={prefs.notif_community_new_statement}
              onChange={set("notif_community_new_statement")}
            />
            <ToggleRow
              title="Reply to your community statement"
              desc="When someone replies to a community statement you posted. Off by default — turn on if you want to track replies."
              value={prefs.notif_citizen_community_activity}
              onChange={set("notif_citizen_community_activity")}
            />
          </Section>

          {/* ── Verdict ── */}
          <Section title="Verdict" subtitle="For records you voted on or are following.">
            <ToggleRow
              title="Verdict countdown — 24 hours before"
              desc="Get notified the day before a verdict is announced on a record you voted on or follow."
              value={prefs.notif_verdict_announcement}
              onChange={set("notif_verdict_announcement")}
            />
            <ToggleRow
              locked
              title="Verdict announced"
              desc="When the verdict is officially revealed. Always sent to subject and contributor — cannot be turned off."
              value={true}
            />
          </Section>

          {/* ── Pinned ── */}
          <Section title="Pinned Records" subtitle="Records you've pinned to your dashboard.">
            <ToggleRow
              title="Debate opens"
              desc="When a pinned record enters the debate stage."
              value={prefs.notif_pinned_debate_open}
              onChange={set("notif_pinned_debate_open")}
            />
            <ToggleRow
              title="Voting opens"
              desc="When a pinned record enters the community voting stage."
              value={prefs.notif_pinned_voting_open}
              onChange={set("notif_pinned_voting_open")}
            />
            <ToggleRow
              title="Verdict announced"
              desc="When the verdict on a pinned record is officially announced."
              value={prefs.notif_pinned_outcome}
              onChange={set("notif_pinned_outcome")}
            />
            <ToggleRow
              title="All activity"
              desc="Every debate reply, vote reply, community reply, and flag on pinned records. Off by default — can be noisy."
              value={prefs.notif_pinned_all_activity}
              onChange={set("notif_pinned_all_activity")}
            />
          </Section>

          {/* ── Following ── */}
          <Section title="Following Records" subtitle="Records you're following for updates.">
            <ToggleRow
              title="Debate opens"
              desc="When a followed record enters the debate stage."
              value={prefs.notif_following_debate_open}
              onChange={set("notif_following_debate_open")}
            />
            <ToggleRow
              title="Voting opens"
              desc="When a followed record enters the community voting stage."
              value={prefs.notif_following_voting_open}
              onChange={set("notif_following_voting_open")}
            />
            <ToggleRow
              title="Verdict announced"
              desc="When the verdict on a followed record is officially announced."
              value={prefs.notif_following_outcome}
              onChange={set("notif_following_outcome")}
            />
            <ToggleRow
              title="All activity"
              desc="Every debate reply, vote reply, community reply, and flag on followed records. Off by default — can be noisy."
              value={prefs.notif_following_all_activity}
              onChange={set("notif_following_all_activity")}
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