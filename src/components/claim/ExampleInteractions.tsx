"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { CLAIM_EXAMPLE_COMMENTS, CLAIM_EXAMPLE_LIKES, randomAlias, swapName } from "@/lib/demoPersonalize";

/**
 * Likes and community comments on an example record (claim page / example record page).
 * Everything here is pretend: it only changes on this screen and isn't saved.
 */

type Dir = 1 | -1 | null;

export function Reactions({ agree, disagree, size = 26 }: { agree: number; disagree: number; size?: number }) {
  const [mine, setMine] = useState<Dir>(null);
  const a = agree + (mine === 1 ? 1 : 0);
  const d = disagree + (mine === -1 ? 1 : 0);
  const circle = (active: boolean): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: 9999,
    border: "2px solid #555",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? "#111827" : "transparent",
    color: active ? "#fff" : "#374151",
  });
  return (
    <div className="flex items-center gap-2 text-xs text-gray-700">
      <button type="button" aria-label="Agree" style={circle(mine === 1)} onClick={() => setMine((m) => (m === 1 ? null : 1))}>
        <ArrowUp className="h-3.5 w-3.5" strokeWidth={3} />
      </button>
      <span className="min-w-[1.5rem]">{a}</span>
      <button type="button" aria-label="Disagree" style={circle(mine === -1)} onClick={() => setMine((m) => (m === -1 ? null : -1))}>
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={3} />
      </button>
      <span className="min-w-[1.5rem]">{d}</span>
    </div>
  );
}

export function exampleLikes(slug: string) {
  return CLAIM_EXAMPLE_LIKES[slug] ?? { agree: 12, disagree: 3 };
}

export function exampleCommentCount(slug: string) {
  return (CLAIM_EXAMPLE_COMMENTS[slug] ?? []).length;
}

function when(ts: string) {
  return new Date(ts).toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });
}

export function Comments({
  slug,
  demoName,
  name,
  title = "Community comments",
  onAdded,
}: {
  slug: string;
  demoName: string;
  name: string;
  title?: string;
  onAdded?: () => void;
}) {
  const seed = (CLAIM_EXAMPLE_COMMENTS[slug] ?? []).map((c) => ({ ...c, body: swapName(c.body, demoName, name) }));
  const [added, setAdded] = useState<{ id: string; alias: string; body: string; ts: string }[]>([]);
  const [body, setBody] = useState("");
  const all = [...seed, ...added.map((c) => ({ ...c, agree: 0, disagree: 0 }))];

  function post() {
    const text = body.trim();
    if (!text) return;
    setAdded((a) => [...a, { id: "you" + Date.now(), alias: randomAlias(), body: text.slice(0, 500), ts: new Date().toISOString() }]);
    setBody("");
    onAdded?.();
  }

  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">💬 {all.length} {all.length === 1 ? "comment" : "comments"}</div>
      </div>
      <div className="mt-3 divide-y">
        {all.map((c) => (
          <div key={c.id} className="py-3">
            <div className="text-xs font-semibold text-gray-800">{c.alias}</div>
            <div className="text-[11px] text-gray-400">{when(c.ts)}</div>
            <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{c.body}</div>
            <div className="mt-2">
              <Reactions agree={c.agree} disagree={c.disagree} size={22} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") post(); }}
          placeholder="Try it: write a comment…"
          className="flex-1 rounded-xl border px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <button type="button" onClick={post} disabled={!body.trim()} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Post
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">Example only. Nothing you post here is saved.</p>
    </div>
  );
}
