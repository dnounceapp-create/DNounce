"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Prefs = {
  notif_email: boolean;
  notif_push: boolean;
  notif_moderation: boolean;
  notif_subject_lifecycle: boolean;
  notif_subject_evidence: boolean;
  notif_subject_mentions: boolean;
  notif_subject_activity: boolean;
  notif_contributor_lifecycle: boolean;
  notif_contributor_evidence: boolean;
  notif_contributor_mentions: boolean;
  notif_contributor_activity: boolean;
  notif_voter_lifecycle: boolean;
  notif_voter_evidence: boolean;
  notif_voter_mentions: boolean;
  notif_voter_activity: boolean;
  notif_citizen_activity: boolean;
  notif_citizen_mentions: boolean;
  notif_citizen_replies: boolean;
  notif_pinned_lifecycle: boolean;
  notif_pinned_comments: boolean;
  notif_following_lifecycle: boolean;
  notif_following_activity: boolean;
  notif_following_contributor_changes: boolean;
};

const DEFAULTS: Prefs = {
  notif_email: true,
  notif_push: false,
  notif_moderation: true,
  notif_subject_lifecycle: true,
  notif_subject_evidence: true,
  notif_subject_mentions: true,
  notif_subject_activity: true,
  notif_contributor_lifecycle: true,
  notif_contributor_evidence: true,
  notif_contributor_mentions: true,
  notif_contributor_activity: true,
  notif_voter_lifecycle: true,
  notif_voter_evidence: true,
  notif_voter_mentions: true,
  notif_voter_activity: true,
  notif_citizen_activity: true,
  notif_citizen_mentions: true,
  notif_citizen_replies: true,
  notif_pinned_lifecycle: true,
  notif_pinned_comments: false,
  notif_following_lifecycle: true,
  notif_following_activity: true,
  notif_following_contributor_changes: false,
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">{title}</h2>
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
        setPrefs({
          notif_email: data.notif_email,
          notif_push: data.notif_push,
          notif_moderation: data.notif_moderation,
          notif_subject_lifecycle: data.notif_subject_lifecycle,
          notif_subject_evidence: data.notif_subject_evidence,
          notif_subject_mentions: data.notif_subject_mentions,
          notif_subject_activity: data.notif_subject_activity,
          notif_contributor_lifecycle: data.notif_contributor_lifecycle,
          notif_contributor_evidence: data.notif_contributor_evidence,
          notif_contributor_mentions: data.notif_contributor_mentions,
          notif_contributor_activity: data.notif_contributor_activity,
          notif_voter_lifecycle: data.notif_voter_lifecycle,
          notif_voter_evidence: data.notif_voter_evidence,
          notif_voter_mentions: data.notif_voter_mentions,
          notif_voter_activity: data.notif_voter_activity,
          notif_citizen_activity: data.notif_citizen_activity,
          notif_citizen_mentions: data.notif_citizen_mentions,
          notif_citizen_replies: data.notif_citizen_replies,
          notif_pinned_lifecycle: data.notif_pinned_lifecycle,
          notif_pinned_comments: data.notif_pinned_comments,
          notif_following_lifecycle: data.notif_following_lifecycle,
          notif_following_activity: data.notif_following_activity,
          notif_following_contributor_changes: data.notif_following_contributor_changes,
        });
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
          Manage how and when you receive alerts about records you create, are involved in, vote on, pin, or follow.
        </p>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-8">
          <Section title="General">
            <ToggleRow title="Email Notifications" desc="Receive updates via email." value={prefs.notif_email} onChange={set("notif_email")} />
            <ToggleRow title="Push Notifications" desc="Allow alerts on your device or browser." value={prefs.notif_push} onChange={set("notif_push")} />
            <ToggleRow title="Moderation Alerts" desc="Notified when a record you're involved in is reviewed." value={prefs.notif_moderation} onChange={set("notif_moderation")} />
          </Section>

          <Section title="Subject Notifications">
            <ToggleRow title="Lifecycle Updates" desc="When a record about you changes stage." value={prefs.notif_subject_lifecycle} onChange={set("notif_subject_lifecycle")} />
            <ToggleRow title="New Evidence" desc="When new materials are added to a record about you." value={prefs.notif_subject_evidence} onChange={set("notif_subject_evidence")} />
            <ToggleRow title="Mentions" desc="When someone mentions you or requests your response." value={prefs.notif_subject_mentions} onChange={set("notif_subject_mentions")} />
            <ToggleRow title="New Activity" desc="When others comment or engage in a record involving you." value={prefs.notif_subject_activity} onChange={set("notif_subject_activity")} />
          </Section>

          <Section title="Contributor Notifications">
            <ToggleRow title="Lifecycle Updates" desc="When your submitted record changes stage." value={prefs.notif_contributor_lifecycle} onChange={set("notif_contributor_lifecycle")} />
            <ToggleRow title="New Evidence" desc="When new materials are added to your record." value={prefs.notif_contributor_evidence} onChange={set("notif_contributor_evidence")} />
            <ToggleRow title="Mentions" desc="When someone mentions you or requests clarification." value={prefs.notif_contributor_mentions} onChange={set("notif_contributor_mentions")} />
            <ToggleRow title="New Activity" desc="When others comment or engage in your record." value={prefs.notif_contributor_activity} onChange={set("notif_contributor_activity")} />
          </Section>

          <Section title="Voter Notifications">
            <ToggleRow title="Lifecycle Updates" desc="When records you voted on advance stages." value={prefs.notif_voter_lifecycle} onChange={set("notif_voter_lifecycle")} />
            <ToggleRow title="New Evidence" desc="When new materials are added to a record you voted on." value={prefs.notif_voter_evidence} onChange={set("notif_voter_evidence")} />
            <ToggleRow title="Mentions" desc="When someone references your voting activity." value={prefs.notif_voter_mentions} onChange={set("notif_voter_mentions")} />
            <ToggleRow title="New Activity" desc="When discussions occur in records you voted on." value={prefs.notif_voter_activity} onChange={set("notif_voter_activity")} />
          </Section>

          <Section title="Citizen Notifications">
            <ToggleRow title="New Activity" desc="When others comment or engage within a record." value={prefs.notif_citizen_activity} onChange={set("notif_citizen_activity")} />
            <ToggleRow title="Mentions" desc="When someone mentions you or requests your input." value={prefs.notif_citizen_mentions} onChange={set("notif_citizen_mentions")} />
            <ToggleRow title="Replies to Your Comments" desc="When someone responds to your participation." value={prefs.notif_citizen_replies} onChange={set("notif_citizen_replies")} />
          </Section>

          <Section title="Pinned Records">
            <ToggleRow title="Lifecycle Updates" desc="When a pinned record changes stage." value={prefs.notif_pinned_lifecycle} onChange={set("notif_pinned_lifecycle")} />
            <ToggleRow title="New Comments" desc="When new comments appear on records you've pinned." value={prefs.notif_pinned_comments} onChange={set("notif_pinned_comments")} />
          </Section>

          <Section title="Following Records">
            <ToggleRow title="Lifecycle Updates" desc="When a followed record changes stage." value={prefs.notif_following_lifecycle} onChange={set("notif_following_lifecycle")} />
            <ToggleRow title="New Activity" desc="When followed records receive new discussions or evidence." value={prefs.notif_following_activity} onChange={set("notif_following_activity")} />
            <ToggleRow title="Contributor Changes" desc="When new contributors are added to followed records." value={prefs.notif_following_contributor_changes} onChange={set("notif_following_contributor_changes")} />
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
