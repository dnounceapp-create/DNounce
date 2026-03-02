"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  targetType: string;          // e.g. "record_vote_replies"
  targetId: string;            // store as text always
  disabled?: boolean;
  size?: number;               // circle size
  showCounts?: boolean;        // show numbers next to arrows
  className?: string;
};

export default function AgreeDisagree({
  targetType,
  targetId,
  disabled = false,
  size = 28,
  showCounts = true,
  className = "",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [agreeCount, setAgreeCount] = useState(0);
  const [disagreeCount, setDisagreeCount] = useState(0);
  const [myDir, setMyDir] = useState<null | 1 | -1>(null);

  const circleStyle = useMemo(() => {
    // replicates your CSS but lets you resize cleanly
    return {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "9999px",
      border: "2px solid #555",
      fontSize: `${Math.max(14, Math.round(size * 0.62))}px`,
      fontWeight: 800,
      background: "transparent",
      color: "#333",
      lineHeight: 1,
    } as const;
  }, [size]);

  async function load() {
    setLoading(true);
    try {
      // 1) public counts (safe for anon)
      const { data: counts, error: cErr } = await supabase
        .from("reaction_counts")
        .select("agree_count, disagree_count")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();

      if (!cErr) {
        setAgreeCount(Number(counts?.agree_count ?? 0));
        setDisagreeCount(Number(counts?.disagree_count ?? 0));
      }

      // 2) my reaction (only works if authed; RLS blocks others)
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;

      if (!uid) {
        setMyDir(null);
        return;
      }

      const { data: mine } = await supabase
        .from("reactions")
        .select("direction")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("user_id", uid)
        .maybeSingle();

      const d = mine?.direction;
      setMyDir(d === 1 ? 1 : d === -1 ? -1 : null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  // ✅ optional realtime (nice)
  useEffect(() => {
    const ch = supabase
      .channel(`reactions:${targetType}:${targetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions", filter: `target_id=eq.${targetId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  async function toggle(direction: 1 | -1) {
    if (disabled) return;

    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user?.id) {
      alert("Please sign in to react.");
      return;
    }

    const { data, error } = await supabase.rpc("toggle_reaction", {
      p_target_type: targetType,
      p_target_id: targetId,
      p_direction: direction,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setAgreeCount(Number(row?.agree_count ?? 0));
    setDisagreeCount(Number(row?.disagree_count ?? 0));
    setMyDir(row?.my_direction === 1 ? 1 : row?.my_direction === -1 ? -1 : null);
  }

  const btnBase =
    "inline-flex items-center justify-center select-none transition " +
    "hover:bg-[#f0f0f0] active:bg-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed";

  const activeAgree = myDir === 1;
  const activeDisagree = myDir === -1;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => toggle(1)}
        className={btnBase}
        style={{
          ...circleStyle,
          borderColor: activeAgree ? "#111" : "#555",
          background: activeAgree ? "#eaeaea" : "transparent",
        }}
        aria-label="Agree"
        title="Agree"
      >
        ↑
      </button>

      {showCounts ? (
        <span className="text-xs font-semibold text-gray-700 min-w-[18px] text-center">
          {agreeCount}
        </span>
      ) : null}

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => toggle(-1)}
        className={btnBase}
        style={{
          ...circleStyle,
          borderColor: activeDisagree ? "#111" : "#555",
          background: activeDisagree ? "#eaeaea" : "transparent",
        }}
        aria-label="Disagree"
        title="Disagree"
      >
        ↓
      </button>

      {showCounts ? (
        <span className="text-xs font-semibold text-gray-700 min-w-[18px] text-center">
          {disagreeCount}
        </span>
      ) : null}
    </div>
  );
}