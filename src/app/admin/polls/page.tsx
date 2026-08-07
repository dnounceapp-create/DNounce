"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Trash2, X, ChevronRight, ExternalLink, CircleAlert, ShieldOff } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const dynamic = 'force-dynamic';

const OPTION_COLORS = ["#3b82f6", "#6366f1", "#22c55e", "#f97316"];

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "numeric", minute: "2-digit",
  });
}

function fmtDay(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [flagCountsMap, setFlagCountsMap] = useState<Record<string, any>>({});

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPollType, setNewPollType] = useState<'binary' | 'multiple_choice'>('binary');
  const [newOptions, setNewOptions] = useState([
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ]);
  const [newExpiry, setNewExpiry] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadPolls();
  }, []);

  useEffect(() => {
    if (selectedPoll?.id) loadFlagCounts(selectedPoll.id);
    else setFlagCountsMap({});
  }, [selectedPoll?.id]);

  async function loadPolls() {
    setLoading(true);
    const { data: pollsData } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });
    setPolls(pollsData ?? []);

    const { data: votesData } = await supabase
      .from('poll_votes')
      .select('id, poll_id, option_id, reason, created_at, author_alias, user_id');
    const votesMap: Record<string, any[]> = {};
    (votesData ?? []).forEach((v: any) => {
      if (!votesMap[v.poll_id]) votesMap[v.poll_id] = [];
      votesMap[v.poll_id].push(v);
    });
    setVotes(votesMap);
    setLoading(false);
  }

  async function loadFlagCounts(pollId: string) {
    const { data } = await supabase
      .from('poll_vote_flag_counts')
      .select('*')
      .eq('poll_id', pollId);
    const map: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { map[r.poll_vote_id] = r; });
    setFlagCountsMap(map);
  }

  async function createPoll() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const options = newPollType === 'binary'
      ? [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]
      : newOptions.slice(0, 4);
    await supabase.from('polls').insert({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      poll_type: newPollType,
      options,
      status: 'active',
      expires_at: new Date(newExpiry).toISOString(),
    });
    setShowCreateModal(false);
    setNewTitle(""); setNewDescription(""); setNewPollType('binary');
    setNewOptions([{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]);
    setCreating(false);
    await loadPolls();
  }

  async function closePoll(pollId: string) {
    setClosing(true);
    await supabase.from('polls').update({ status: 'closed' }).eq('id', pollId);
    setClosing(false);
    await loadPolls();
    // Refresh selectedPoll from fresh data
    const refreshed = polls.find(p => p.id === pollId);
    if (refreshed) setSelectedPoll({ ...refreshed, status: 'closed' });
  }

  async function deletePoll(pollId: string) {
    await supabase.from('polls').delete().eq('id', pollId);
    setShowDeleteConfirm(null);
    if (selectedPoll?.id === pollId) setSelectedPoll(null);
    await loadPolls();
  }

  function updateOptionLabel(idx: number, label: string) {
    setNewOptions(prev => prev.map((o, i) => i === idx ? { ...o, label } : o));
  }

  function addOption() {
    if (newOptions.length >= 4) return;
    setNewOptions(prev => {
      // Insert new option before the last "Other" if present
      const withoutOther = prev.filter(o => o.id !== 'other');
      const next = [
        ...withoutOther,
        { id: `opt${withoutOther.length + 1}`, label: '' },
      ];
      // Always ensure last is "Other" and locked if we have 4+
      if (next.length >= 3) {
        next.push({ id: 'other', label: 'Other' });
      }
      return next.slice(0, 4);
    });
  }

  function removeOption(idx: number) {
    setNewOptions(prev => prev.filter((_, i) => i !== idx));
  }

  // Derived selected poll data
  const selectedVotes = selectedPoll ? (votes[selectedPoll.id] ?? []) : [];
  const selectedOptions: { id: string; label: string }[] = Array.isArray(selectedPoll?.options) ? selectedPoll.options : [];
  const selectedCounts: Record<string, number> = {};
  selectedOptions.forEach(o => { selectedCounts[o.id] = 0; });
  selectedVotes.forEach((v: any) => { if (v.option_id in selectedCounts) selectedCounts[v.option_id]++; });
  const selectedTotalVotes = selectedVotes.length;
  const chartData = selectedOptions.map((o, i) => ({
    label: o.label,
    votes: selectedCounts[o.id] ?? 0,
    color: OPTION_COLORS[i % OPTION_COLORS.length],
  }));

  function optionLabel(pollId: string, optionId: string) {
    const p = polls.find(pp => pp.id === pollId);
    const opts: { id: string; label: string }[] = Array.isArray(p?.options) ? p.options : [];
    return opts.find(o => o.id === optionId)?.label ?? optionId;
  }

  function optionIdx(pollId: string, optionId: string) {
    const p = polls.find(pp => pp.id === pollId);
    const opts: { id: string; label: string }[] = Array.isArray(p?.options) ? p.options : [];
    return Math.max(0, opts.findIndex(o => o.id === optionId));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Community Polls</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage platform-wide polls. See per-option analytics and moderate vote statements.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          New Poll
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Total Polls</div>
          <div className="text-white text-2xl font-bold">{polls.length}</div>
        </div>
        <div className="bg-gray-900 border border-green-900 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Active</div>
          <div className="text-white text-2xl font-bold">{polls.filter(p => p.status === 'active').length}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Closed</div>
          <div className="text-white text-2xl font-bold">{polls.filter(p => p.status !== 'active').length}</div>
        </div>
        <div className="bg-gray-900 border border-blue-900 rounded-2xl p-4">
          <div className="text-gray-400 text-xs mb-1">Total Votes</div>
          <div className="text-white text-2xl font-bold">{Object.values(votes).reduce((sum, arr) => sum + arr.length, 0)}</div>
        </div>
      </div>

      {/* List + detail split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — poll list */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 text-white text-sm font-semibold">Polls ({polls.length})</div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading…</div>
          ) : polls.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No polls yet. Click "New Poll" to create one.</div>
          ) : (
            <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
              {polls.map(p => {
                const isActive = p.status === 'active' && (!p.expires_at || new Date(p.expires_at) > new Date());
                const voteCount = votes[p.id]?.length ?? 0;
                const isSelected = selectedPoll?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPoll(p)}
                    className={`w-full text-left px-4 py-3 transition ${isSelected ? "bg-gray-800/70" : "hover:bg-gray-800/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${isActive ? "bg-green-900 text-green-300 border-green-700" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-gray-500"}`} />
                        {isActive ? "Active" : "Closed"}
                      </span>
                      {isSelected && <ChevronRight className="w-3 h-3 text-gray-400" />}
                    </div>
                    <div className="text-white text-sm font-medium leading-snug line-clamp-2">{p.title}</div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500">
                      <span>{voteCount} {voteCount === 1 ? "vote" : "votes"}</span>
                      <span>·</span>
                      <span>Ends {fmtDay(p.expires_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — poll detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPoll ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-sm">
              Select a poll from the list to see analytics and vote statements.
            </div>
          ) : (
            <>
              {/* Poll header */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${selectedPoll.status === 'active' ? "bg-green-900 text-green-300 border-green-700" : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedPoll.status === 'active' ? "bg-green-400" : "bg-gray-500"}`} />
                        {selectedPoll.status === 'active' ? "Active" : "Closed"}
                      </span>
                      <span className="text-gray-500 text-[11px]">Expires {fmtDate(selectedPoll.expires_at)}</span>
                    </div>
                    <h2 className="text-white text-lg font-bold leading-tight">{selectedPoll.title}</h2>
                    {selectedPoll.description && (
                      <p className="mt-1.5 text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{selectedPoll.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    href={`/dashboard/community/polls/${selectedPoll.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-900 hover:bg-blue-900/30 transition"
                  >
                    View on site
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {selectedPoll.status === 'active' && (
                    <button
                      onClick={() => closePoll(selectedPoll.id)}
                      disabled={closing}
                      className="inline-flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-yellow-900 hover:bg-yellow-900/30 transition disabled:opacity-50"
                    >
                      <ShieldOff className="w-3 h-3" />
                      {closing ? "Closing…" : "Close Poll"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(selectedPoll.id)}
                    className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-900 hover:bg-red-900/30 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white text-sm font-semibold">Analytics</h3>
                  <span className="text-gray-500 text-xs">{selectedTotalVotes} total {selectedTotalVotes === 1 ? "vote" : "votes"}</span>
                </div>

                {selectedTotalVotes === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">No votes yet.</div>
                ) : (
                  <>
                    {/* Per-option breakdown */}
                    <div className="space-y-3 mb-6">
                      {selectedOptions.map((o, i) => {
                        const c = selectedCounts[o.id] ?? 0;
                        const pct = selectedTotalVotes > 0 ? Math.round((c / selectedTotalVotes) * 100) : 0;
                        return (
                          <div key={o.id}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-white font-medium">{o.label}</span>
                              <span className="text-gray-400">{c} · {pct}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: OPTION_COLORS[i % OPTION_COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bar chart */}
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                          <XAxis
                            dataKey="label"
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            axisLine={{ stroke: "#374151" }}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            axisLine={{ stroke: "#374151" }}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, color: "#fff", fontSize: 12 }}
                            cursor={{ fill: "#1f2937" }}
                          />
                          <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                            {chartData.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {/* Vote statements */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-white text-sm font-semibold">Vote Statements</h3>
                  <span className="text-gray-500 text-xs">{selectedVotes.length}</span>
                </div>
                {selectedVotes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No vote statements yet.</div>
                ) : (
                  <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
                    {selectedVotes.map((v: any) => {
                      const fc = flagCountsMap[v.id];
                      const isConvicted = !!fc?.is_convicted;
                      const isLowQuality = !!fc?.is_low_quality && !isConvicted;
                      const cIdx = optionIdx(selectedPoll.id, v.option_id);
                      const optColor = OPTION_COLORS[cIdx % OPTION_COLORS.length];
                      return (
                        <div key={v.id} className={`px-5 py-4 ${isConvicted ? "opacity-50" : ""}`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                            <div className="min-w-0">
                              <div className="text-white text-xs font-semibold break-all">{v.author_alias}</div>
                              <div className="text-gray-500 text-[11px]">{fmtDate(v.created_at)}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                                style={{ color: optColor, borderColor: optColor + "55", background: optColor + "1a" }}
                              >
                                {optionLabel(selectedPoll.id, v.option_id)}
                              </span>
                              {fc?.flag_count > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-orange-900 bg-orange-900/30 text-orange-300 px-2 py-0.5 text-[11px] font-semibold">
                                  <CircleAlert className="w-3 h-3" />
                                  {fc.flag_count} {fc.flag_count === 1 ? "flag" : "flags"}
                                </span>
                              )}
                              {isConvicted && (
                                <span className="inline-flex items-center rounded-full border border-red-900 bg-red-900/40 text-red-300 px-2 py-0.5 text-[11px] font-semibold">
                                  DISQUALIFIED
                                </span>
                              )}
                              {isLowQuality && (
                                <span className="inline-flex items-center rounded-full border border-yellow-900 bg-yellow-900/30 text-yellow-300 px-2 py-0.5 text-[11px] font-semibold">
                                  ⚠ Low Quality
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{v.reason}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !creating && setShowCreateModal(false)}>
          <div
            className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white text-base font-bold">Create New Poll</h2>
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition disabled:opacity-50"
                disabled={creating}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1.5">Title</label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Should DNounce increase the minimum vote reason to 50 characters?"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1.5">Description (optional)</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Add context for voters…"
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1.5">Poll Type</label>
                <div className="flex gap-1 bg-gray-950 border border-gray-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setNewPollType('binary')}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${newPollType === 'binary' ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"}`}
                  >
                    Binary (Yes / No)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPollType('multiple_choice');
                      // Seed with 3 options when switching to MC, last locked "Other"
                      if (newOptions.length < 3 || newOptions[0].id === 'yes') {
                        setNewOptions([
                          { id: 'opt1', label: '' },
                          { id: 'opt2', label: '' },
                          { id: 'other', label: 'Other' },
                        ]);
                      }
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${newPollType === 'multiple_choice' ? "bg-white text-gray-900" : "text-gray-400 hover:text-white"}`}
                  >
                    Multiple Choice
                  </button>
                </div>
              </div>

              {newPollType === 'multiple_choice' && (
                <div>
                  <label className="block text-gray-300 text-xs font-semibold mb-1.5">Options (max 4, last is "Other")</label>
                  <div className="space-y-2">
                    {newOptions.map((o, idx) => {
                      const isOther = o.id === 'other';
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={o.label}
                            onChange={e => updateOptionLabel(idx, e.target.value)}
                            disabled={isOther}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 disabled:opacity-60"
                          />
                          {!isOther && newOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="text-gray-500 hover:text-red-400 transition p-1.5"
                              aria-label="Remove option"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {newOptions.length < 4 && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-900 hover:bg-blue-900/30 transition"
                      >
                        <Plus className="w-3 h-3" />
                        Add option
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1.5">Expires</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-gray-500"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="text-gray-400 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createPoll}
                disabled={creating || !newTitle.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition"
              >
                {creating ? "Creating…" : "Create Poll"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
          <div
            className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="text-white text-base font-bold">Delete Poll?</h3>
              <p className="mt-2 text-gray-400 text-sm">Are you sure? This will delete all votes permanently. This action cannot be undone.</p>
            </div>
            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="text-gray-400 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePoll(showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
