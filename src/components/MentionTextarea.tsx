"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type Participant = {
  alias: string;
  user_id: string;
};

async function fetchParticipants(recordId: string): Promise<Participant[]> {
  const [votes, voteReplies, stmts, stmtReplies] = await Promise.all([
    supabase.from("record_votes").select("user_id, author_alias").eq("record_id", recordId),
    supabase.from("record_vote_replies").select("author_user_id, author_alias").eq("record_id", recordId),
    supabase.from("record_community_statements").select("author_user_id, author_alias").eq("record_id", recordId),
    supabase.from("record_community_replies").select("author_user_id, author_alias").eq("record_id", recordId),
  ]);

  const all: Participant[] = [
    ...(votes.data || []).map((r: any) => ({ alias: r.author_alias, user_id: r.user_id })),
    ...(voteReplies.data || []).map((r: any) => ({ alias: r.author_alias, user_id: r.author_user_id })),
    ...(stmts.data || []).map((r: any) => ({ alias: r.author_alias, user_id: r.author_user_id })),
    ...(stmtReplies.data || []).map((r: any) => ({ alias: r.author_alias, user_id: r.author_user_id })),
  ].filter((p) => p.alias && p.user_id);

  // Dedupe by alias
  const seen = new Set<string>();
  return all.filter((p) => {
    if (seen.has(p.alias)) return false;
    seen.add(p.alias);
    return true;
  });
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  recordId: string;
  rows?: number;
  placeholder?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  currentUserAlias?: string | null;
};

export default function MentionTextarea({
  value,
  onChange,
  recordId,
  rows = 3,
  placeholder = "Write something…",
  className = "",
  onClick,
  onMouseDown,
  onKeyDown,
  currentUserAlias,
}: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load participants once
  useEffect(() => {
    if (!recordId) return;
    fetchParticipants(recordId).then((p) => {
      // Exclude current user's own alias
      setParticipants(currentUserAlias ? p.filter((x) => x.alias !== currentUserAlias) : p);
    });
  }, [recordId, currentUserAlias]);

  const filtered = mentionQuery !== null
    ? participants.filter((p) => p.alias.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? 0;
    onChange(text);

    // Detect @mention: find last @ before cursor
    const beforeCursor = text.slice(0, cursor);
    const atIdx = beforeCursor.lastIndexOf("@");

    if (atIdx !== -1) {
      const query = beforeCursor.slice(atIdx + 1);
      // Only show dropdown if no space in query (still typing)
      if (!query.includes(" ") && query.length <= 30) {
        setMentionQuery(query);
        setMentionStart(atIdx);
        setDropdownOpen(true);
        setActiveIndex(0);
        return;
      }
    }

    setDropdownOpen(false);
    setMentionQuery(null);
  }

  function insertMention(alias: string) {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newText = before + "@" + alias + " " + after;
    onChange(newText);
    setDropdownOpen(false);
    setMentionQuery(null);

    // Refocus textarea and place cursor after inserted mention
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = before.length + alias.length + 2;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (dropdownOpen && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[activeIndex].alias);
        return;
      }
      if (e.key === "Escape") {
        setDropdownOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className}
        onClick={onClick}
        onMouseDown={onMouseDown}
      />

      {dropdownOpen && filtered.length > 0 && (
        <div className="absolute z-50 left-0 bottom-full mb-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-[11px] text-gray-400 font-medium">Participants in this record</span>
          </div>
          {filtered.map((p, i) => (
            <button
              key={p.alias}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(p.alias);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition ${
                i === activeIndex ? "bg-blue-50 text-blue-700" : "text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium">@{p.alias}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper: call after any post to notify tagged users ──────────────────────
export async function notifyMentions(recordId: string, body: string, authorUserId: string, authorAlias: string) {
  if (!body.includes("@")) return;
  await supabase.rpc("notify_tagged_users", {
    p_record_id: recordId,
    p_body: body,
    p_author_user_id: authorUserId,
    p_author_alias: authorAlias,
  });
}
