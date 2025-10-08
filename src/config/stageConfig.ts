export type RoleType = "subject" | "contributor" | "voter" | "citizen";

export interface StageTimeline {
  summary: string;
  start:
    | "onSubmission"
    | "onAIComplete"
    | "onPublish"
    | "onSubjectDispute"
    | "onContributorNotifiedOfDispute"
    | "onDebateEnd"
    | "onVotingEnd";
  durationHours?: number;
}

export interface StageUI {
  chipClass: string; // Tailwind color badge
}

export interface StageConfig {
  label: string;
  happens: string;
  timeline: StageTimeline;
  flags: {
    isPublic: boolean;
    interactionsLocked: boolean;
  };
  actions: Record<RoleType, string[]>;
  ui: StageUI;
}

export const STAGE_ORDER = [1, 2, 3, 4, 5, 6, 7] as const;

/** Helper — earliest publish rule */
export function computeEarliestPublishAt(
  submittedAt: Date | string,
  aiCompleteAt: Date | string
): Date {
  const sub = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const aiDate = typeof aiCompleteAt === "string" ? new Date(aiCompleteAt) : aiCompleteAt;
  const plus72h = new Date(sub.getTime() + 72 * 60 * 60 * 1000);
  const aiPlus24h = new Date(aiDate.getTime() + 24 * 60 * 60 * 1000);
  return new Date(Math.max(plus72h.getTime(), aiPlus24h.getTime()));
}

/** Voting badge / penalty rules */
export const voterQualityRules = {
  lowQualityBadge: {
    thresholdDownvotes: 5,
    label: "⚠ Low-Quality Voter",
    scope: "per-record" as const,
  },
  convictionBadge: {
    voterFlagPercentThreshold: 33,
    publicApprovalPercentThreshold: 50,
    label: "CONVICTED Lost Voting Right",
    scope: "per-record" as const,
  },
  voting: {
    requireExplanation: true,
  },
};

export function evaluateVoterBadges(input: {
  downvotes: number;
  voterFlagPercent: number;
  publicApprovalPercent: number;
}) {
  const badges: string[] = [];
  if (input.downvotes >= voterQualityRules.lowQualityBadge.thresholdDownvotes) {
    badges.push(voterQualityRules.lowQualityBadge.label);
  }
  if (
    input.voterFlagPercent >= voterQualityRules.convictionBadge.voterFlagPercentThreshold &&
    input.publicApprovalPercent >= voterQualityRules.convictionBadge.publicApprovalPercentThreshold
  ) {
    badges.push(voterQualityRules.convictionBadge.label);
  }
  return badges;
}

/** Canonical DNounce Record Lifecycle */
export const stageConfig: Record<number, StageConfig> = {
  1: {
    label: "AI Verification in Progress",
    happens:
      "The record is submitted by the contributor; DNounce’s AI reviews it for evidence strength, tone, and credibility before publication.",
    timeline: {
      summary: "Up to 72h from submission",
      start: "onSubmission",
      durationHours: 72,
    },
    flags: { isPublic: false, interactionsLocked: true },
    actions: {
      subject: ["❌ No access yet — record not visible."],
      contributor: [
        "✅ Can view submission in “Records Submitted”.",
        "❌ Cannot edit during AI review.",
        "🗑️ Can delete record if desired.",
      ],
      voter: ["🚫 Not applicable — voters not active yet."],
      citizen: ["🚫 Not visible."],
    },
    ui: { chipClass: "bg-blue-100 text-blue-700" },
  },

  2: {
    label: "Subject Notified",
    happens:
      "The subject (person the record is about) is automatically notified of the pending record. The record remains private while both parties can view it with the AI-generated credibility label.",
    timeline: {
      summary: "Immediately after AI completes",
      start: "onAIComplete",
    },
    flags: { isPublic: false, interactionsLocked: true },
    actions: {
      subject: ["👀 Can privately view and prepare evidence before publication."],
      contributor: ["👀 Can review privately and refine sources or tone."],
      voter: ["🚫 Not active yet."],
      citizen: ["🚫 Not visible."],
    },
    ui: { chipClass: "bg-purple-100 text-purple-700" },
  },

  3: {
    label: "Published",
    happens:
      "The record is published and receives an AI-recommended credibility label, becoming publicly visible on DNounce.",
    timeline: {
      summary:
        "Up to 72 hours of AI verification plus 24 hours — whichever is longer.",
      start: "onPublish",
    },
    flags: { isPublic: true, interactionsLocked: false },
    actions: {
      subject: [
        "⚖️ Can Request Deletion (Dispute Record) or Comment under moderation rules.",
      ],
      contributor: ["🗑️ Can delete their own record if desired."],
      voter: ["🚫 Not active unless the record is escalated."],
      citizen: [
        "💬 Can interact normally (comment, react, flag) as a public participant until escalation.",
      ],
    },
    ui: { chipClass: "bg-green-100 text-green-700" },
  },

  4: {
    label: "Deletion Request (Intake)",
    happens:
      "Subject requests deletion; system locks down for debate setup and notifies contributor.",
    timeline: {
      summary: "Immediate transition when subject disputes",
      start: "onSubjectDispute",
    },
    flags: { isPublic: true, interactionsLocked: true },
    actions: {
      subject: ["Triggers escalation."],
      contributor: ["Prepares response."],
      voter: ["View-only."],
      citizen: ["View-only (interactions locked once escalated)."],
    },
    ui: { chipClass: "bg-pink-100 text-pink-700" },
  },

  5: {
    label: "Subject Dispute & Debate",
    happens:
      "Both parties argue the case with evidence during this active dispute period.",
    timeline: {
      summary: "72h (starts when the contributor is notified of the dispute)",
      start: "onContributorNotifiedOfDispute",
      durationHours: 72,
    },
    flags: { isPublic: true, interactionsLocked: true },
    actions: {
      subject: ["Submit arguments/evidence supporting deletion."],
      contributor: ["Defend post with sources/reasoning."],
      voter: ["View-only."],
      citizen: ["View-only (no comments/reactions during active dispute)."],
    },
    ui: { chipClass: "bg-orange-100 text-orange-700" },
  },

  6: {
    label: "Voting in Progress",
    happens:
      "The record enters community voting — users decide whether to keep or delete based on debate outcomes.",
    timeline: {
      summary: "48h (starts when debate ends)",
      start: "onDebateEnd",
      durationHours: 48,
    },
    flags: { isPublic: true, interactionsLocked: false },
    actions: {
      subject: ["⏳ Can view progress but not interact."],
      contributor: ["⏳ Can observe voting results but cannot intervene."],
      voter: [
        "✅ Can vote (keep/delete) and must add short reasoning.",
        "⚠ 5+ downvotes → 'Low-Quality Voter'.",
        "🧨 ≥33% voter flags + ≥50% public approval → 'CONVICTED Lost Voting Right'.",
      ],
      citizen: [
        "👁️ Can view record and comments.",
        "💡 Can interact only if eligible to vote.",
      ],
    },
    ui: { chipClass: "bg-indigo-100 text-indigo-700" },
  },

  7: {
    label: "Anonymity Active",
    happens:
      "Final decision implemented. If deleted, the subject’s anonymity and privacy protections are reactivated; if kept, the record remains under anonymized format.",
    timeline: {
      summary: "Starts when voting ends",
      start: "onVotingEnd",
    },
    flags: { isPublic: true, interactionsLocked: false },
    actions: {
      subject: [
        "✅ Can view final outcome immediately.",
        "⏱ Can interact again after 1 week.",
      ],
      contributor: [
        "✅ Can view final outcome immediately.",
        "⏱ Can interact again after 1 week.",
      ],
      voter: [
        "👁️ Can see final result but cannot vote anymore.",
        "💬 Can interact again after cooldown.",
      ],
      citizen: ["🌐 Can view and interact publicly as part of the final archive."],
    },
    ui: { chipClass: "bg-gray-100 text-gray-700" },
  },
};
