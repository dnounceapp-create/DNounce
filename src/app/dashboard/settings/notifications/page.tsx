"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";

export default function NotificationsPage() {
  // General preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [moderationAlerts, setModerationAlerts] = useState(true);

  // SUBJECT
  const [subjectLifecycle, setSubjectLifecycle] = useState(true);
  const [subjectEvidence, setSubjectEvidence] = useState(true);
  const [subjectMentions, setSubjectMentions] = useState(true);
  const [subjectActivity, setSubjectActivity] = useState(true);

  // CONTRIBUTOR
  const [contributorLifecycle, setContributorLifecycle] = useState(true);
  const [contributorEvidence, setContributorEvidence] = useState(true);
  const [contributorMentions, setContributorMentions] = useState(true);
  const [contributorActivity, setContributorActivity] = useState(true);

  // VOTER
  const [voterLifecycle, setVoterLifecycle] = useState(true);
  const [voterEvidence, setVoterEvidence] = useState(true);
  const [voterMentions, setVoterMentions] = useState(true);
  const [voterActivity, setVoterActivity] = useState(true);

  // CITIZEN
  const [citizenReplies, setCitizenReplies] = useState(true);
  const [citizenAnnouncements, setCitizenAnnouncements] = useState(false);
  const [citizenActivity, setCitizenActivity] = useState(true);
  const [citizenMentions, setCitizenMentions] = useState(true);

  // PINNED
  const [pinnedUpdates, setPinnedUpdates] = useState(true);
  const [pinnedComments, setPinnedComments] = useState(false);

  // FOLLOWING
  const [followingNewActivity, setFollowingNewActivity] = useState(true);
  const [followingDecisions, setFollowingDecisions] = useState(true);
  const [followingContributorChanges, setFollowingContributorChanges] = useState(false);

  const handleSave = () => {
    if (pushAlerts && "Notification" in window) {
      Notification.requestPermission().then((result) => {
        if (result !== "granted") {
          alert("Please allow push notifications in your browser settings.");
        }
      });
    }
    alert("✅ Notification preferences saved successfully!");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-gray-600 mb-8">
          Manage how and when you receive alerts about records you create, are involved in, vote on, pin, or follow.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-8">
          {/* General Preferences */}
          <NotificationSection
            title="General Preferences"
            items={[
              {
                title: "Email Notifications",
                desc: "Receive updates about your account and records via email.",
                state: emailAlerts,
                set: setEmailAlerts,
              },
              {
                title: "Push Notifications",
                desc: "Allow alerts on your device or browser.",
                state: pushAlerts,
                set: setPushAlerts,
              },
              {
                title: "Moderation Alerts",
                desc: "Be notified when a record you’re involved in is reviewed or verified by moderators.",
                state: moderationAlerts,
                set: setModerationAlerts,
              },
            ]}
          />

          {/* SUBJECT */}
          <NotificationSection
            title="Subject Notifications"
            items={[
              {
                title: "Escalations & Lifecycle Updates",
                desc:
                  "Get an update whenever a record about you changes stage — including verification, publishing, disputes, voting, or anonymity protections.",
                state: subjectLifecycle,
                set: setSubjectLifecycle,
              },
              {
                title: "New Evidence or Information",
                desc: "When new materials are added to a record about you.",
                state: subjectEvidence,
                set: setSubjectEvidence,
              },
              {
                title: "Mentions & Direct Questions",
                desc: "When someone mentions you or requests your response.",
                state: subjectMentions,
                set: setSubjectMentions,
              },
              {
                title: "New Activity & Discussions",
                desc: "When others comment, mention, or engage within a record involving you.",
                state: subjectActivity,
                set: setSubjectActivity,
              },
            ]}
          />

          {/* CONTRIBUTOR */}
          <NotificationSection
            title="Contributor Notifications"
            items={[
              {
                title: "Escalations & Lifecycle Updates",
                desc:
                  "Be alerted whenever your submitted record changes stage — including verification, publishing, disputes, voting, or anonymity protections.",
                state: contributorLifecycle,
                set: setContributorLifecycle,
              },
              {
                title: "New Evidence or Information",
                desc: "When new materials are added to your record.",
                state: contributorEvidence,
                set: setContributorEvidence,
              },
              {
                title: "Mentions & Direct Questions",
                desc: "When someone mentions you or requests clarification on your record.",
                state: contributorMentions,
                set: setContributorMentions,
              },
              {
                title: "New Activity & Discussions",
                desc: "When others comment, mention, or engage within your record.",
                state: contributorActivity,
                set: setContributorActivity,
              },
            ]}
          />

          {/* VOTER */}
          <NotificationSection
            title="Voter Notifications"
            items={[
              {
                title: "Escalations & Lifecycle Updates",
                desc:
                  "Get notified when records you voted on advance stages — such as verification, debates, voting progress, or anonymity protections.",
                state: voterLifecycle,
                set: setVoterLifecycle,
              },
              {
                title: "New Evidence or Information",
                desc: "When new materials are added to a record you’ve voted on.",
                state: voterEvidence,
                set: setVoterEvidence,
              },
              {
                title: "Mentions & Direct Questions",
                desc: "When someone mentions or references your voting activity.",
                state: voterMentions,
                set: setVoterMentions,
              },
              {
                title: "New Activity & Discussions",
                desc: "When discussions occur in records you’ve participated in through voting.",
                state: voterActivity,
                set: setVoterActivity,
              },
            ]}
          />

          {/* CITIZEN */}
          <NotificationSection
            title="Citizen Notifications"
            items={[
              {
                title: "New Activity & Discussions",
                desc: "When others comment, mention, or engage within a record.",
                state: citizenActivity,
                set: setCitizenActivity,
              },
              {
                title: "Mentions & Direct Questions",
                desc: "When someone mentions you or requests your input in a discussion.",
                state: citizenMentions,
                set: setCitizenMentions,
              },
              {
                title: "Replies to Your Comments",
                desc: "When someone responds to your participation in public threads.",
                state: citizenReplies,
                set: setCitizenReplies,
              },
            ]}
          />

          {/* PINNED */}
          <NotificationSection
            title="Pinned Records"
            items={[
              {
                title: "Escalations & Lifecycle Updates",
                desc:
                  "Get an update whenever a record about you changes stage — including verification, publishing, disputes, voting, or anonymity protections.",
                state: subjectLifecycle,
                set: setSubjectLifecycle,
              },
              {
                title: "New Comments",
                desc: "When new comments appear on records you’ve pinned.",
                state: pinnedComments,
                set: setPinnedComments,
              },
            ]}
          />

          {/* FOLLOWING */}
          <NotificationSection
            title="Following Records"
            items={[
              {
                title: "Escalations & Lifecycle Updates",
                desc:
                  "Get an update whenever a record about you changes stage — including verification, publishing, disputes, voting, or anonymity protections.",
                state: subjectLifecycle,
                set: setSubjectLifecycle,
              },
              {
                title: "New Activity",
                desc: "When followed records receive new discussions or evidence.",
                state: followingNewActivity,
                set: setFollowingNewActivity,
              },
              {
                title: "Contributor Changes",
                desc: "When new contributors are added to followed records.",
                state: followingContributorChanges,
                set: setFollowingContributorChanges,
              },
            ]}
          />

          {/* Save */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ——— helpers ——— */
function ToggleRow({ title, desc, state, set }: any) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
      <div>
        <p className="font-medium text-gray-800">{title}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
      <button
        onClick={() => set(!state)}
        className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
          state
            ? "bg-green-100 text-green-700 border border-green-300"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {state ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}

function NotificationSection({ title, items }: any) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-4">
        {items.map(({ title, desc, state, set }: any) => (
          <ToggleRow key={title} title={title} desc={desc} state={state} set={set} />
        ))}
      </div>
    </section>
  );
}
