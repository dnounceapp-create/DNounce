export type RoleType = "subject" | "contributor" | "voter" | "citizen";

export const stageShortLabel: Record<number, string> = {
  2: "Private preview",
  3: "Public",
  4: "Challenged",
  5: "Debate",
  6: "Community vote",
  7: "Results",
};


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

// Stage 1 (AI verification) was removed: submission goes straight to Subject Notified.
export const STAGE_ORDER = [2, 3, 4, 5, 6, 7] as const;

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
    label: "Lost voting rights",
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
  2: {
    label: "Private preview",
    happens:
      "The person it's about has been told. For 24 hours, only they and the writer can see it.",
    timeline: {
      summary: "Right after it's submitted",
      start: "onSubmission",
    },
    flags: { isPublic: false, interactionsLocked: true },
    actions: {
      subject: ["👀 Read it privately before it goes public."],
      contributor: ["👀 Read it over before it goes public."],
      voter: ["🚫 Nothing to do yet."],
      citizen: ["🚫 Not visible yet."],
    },
    ui: { chipClass: "bg-purple-100 text-purple-700" },
  },

  3: {
    label: "Public",
    happens: "Anyone can see the record now.",
    timeline: {
      summary: "24 hours after the person it's about is told",
      start: "onPublish",
    },
    flags: { isPublic: true, interactionsLocked: false },
    actions: {
      subject: ["⚖️ Comment, or challenge the record if you see it differently."],
      contributor: ["🗑️ You can take your own record down if you change your mind."],
      voter: ["🚫 Nothing to vote on unless it's challenged."],
      citizen: ["💬 Comment and react."],
    },
    ui: { chipClass: "bg-green-100 text-green-700" },
  },

  4: {
    label: "Challenged",
    happens:
      "The person it's about challenged it, and the writer has been told. In 24 hours, the debate starts.",
    timeline: {
      summary: "As soon as it's challenged",
      start: "onSubjectDispute",
    },
    flags: { isPublic: true, interactionsLocked: true },
    actions: {
      subject: ["Get your side and any evidence ready."],
      contributor: ["Get your side and any evidence ready."],
      voter: ["Read along."],
      citizen: ["Read along. Comments are paused for now."],
    },
    ui: { chipClass: "bg-pink-100 text-pink-700" },
  },

  5: {
    label: "Debate",
    happens:
      "The writer and the person it's about each share their side, with evidence if they have it.",
    timeline: {
      summary: "3 days, starting 24 hours after the challenge",
      start: "onContributorNotifiedOfDispute",
      durationHours: 72,
    },
    flags: { isPublic: true, interactionsLocked: true },
    actions: {
      subject: ["Share your side and any evidence."],
      contributor: ["Share your side and any evidence."],
      voter: ["Read both sides."],
      citizen: ["Read both sides. Comments are paused for now."],
    },
    ui: { chipClass: "bg-orange-100 text-orange-700" },
  },

  6: {
    label: "Community vote",
    happens:
      "People read both sides and pick who they side with, with a short reason.",
    timeline: {
      summary: "2 days, right after the debate ends",
      start: "onDebateEnd",
      durationHours: 48,
    },
    flags: { isPublic: true, interactionsLocked: false },
    actions: {
      subject: ["⏳ Watch the vote. You can't vote on your own record."],
      contributor: ["⏳ Watch the vote. You can't vote on your own record."],
      voter: [
        "✅ Pick a side and say why in a sentence or two.",
        "⚠ 5+ downvotes on your reason → 'Low-Quality Voter'.",
        "🧨 Votes the community flags as bad faith lose their voting rights.",
      ],
      citizen: [
        "👁️ Read the record and comments.",
        "💡 Vote if you're eligible.",
      ],
    },
    ui: { chipClass: "bg-indigo-100 text-indigo-700" },
  },

  7: {
    label: "Results",
    happens:
      "Voting is over. A week later, the record shows where people landed. The record stays up either way.",
    timeline: {
      summary: "Starts when voting ends",
      start: "onVotingEnd",
    },
    flags: { isPublic: true, interactionsLocked: false },
    actions: {
      subject: [
        "✅ See the results once they're out.",
        "⏱ Join the conversation again a week later.",
      ],
      contributor: [
        "✅ See the results once they're out.",
        "⏱ Join the conversation again a week later.",
      ],
      voter: [
        "👁️ See the results. Voting is closed.",
        "💬 Join the conversation again later.",
      ],
      citizen: ["🌐 Read, comment and react."],
    },
    ui: { chipClass: "bg-gray-100 text-gray-700" },
  },
};

/** Outcome labels — final results after voting */
export interface OutcomeLabel {
  label: string;
  color: string;
}

export const outcomeLabels: OutcomeLabel[] = [
  {
    label: "Most people sided with the writer",
    color: "bg-green-100 text-green-700 border border-black/30",
  },
  {
    label: "Most people sided with the person it's about",
    color: "bg-red-100 text-red-700 border border-black/30",
  },
];