'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

type Post = {
  id: string; slug: string; title: string; description: string;
  content: string; category: string; read_time: string;
  published: boolean; published_at: string; created_at: string;
};

const CATEGORIES = ["Hiring Guide", "Tenant Guide", "Platform", "How It Works", "News", "Tips"];

const EMPTY: Omit<Post, 'id' | 'created_at'> = {
  slug: '', title: '', description: '', content: '',
  category: 'Hiring Guide', read_time: '5 min read',
  published: false, published_at: new Date().toISOString().split('T')[0],
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Omit<Post, 'id' | 'created_at'> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY, published_at: new Date().toISOString().split('T')[0] });
    setError(null);
  }

  function openEdit(post: Post) {
    setEditingId(post.id);
    setForm({
      slug: post.slug, title: post.title, description: post.description,
      content: post.content, category: post.category, read_time: post.read_time,
      published: post.published, published_at: post.published_at?.split('T')[0] ?? '',
    });
    setError(null);
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      setError("Title, slug, and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      slug: form.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      published_at: form.published ? (form.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      const { error: err } = await supabase.from("blog_posts").update(payload).eq("id", editingId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("blog_posts").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setForm(null);
    setEditingId(null);
    setSuccess(editingId ? "Post updated." : "Post created and live!");
    setTimeout(() => setSuccess(null), 3000);
    await load();
  }

  async function togglePublish(post: Post) {
    await supabase.from("blog_posts").update({
      published: !post.published,
      published_at: !post.published ? new Date().toISOString() : post.published_at,
      updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    await load();
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    setDeleting(id);
    await supabase.from("blog_posts").delete().eq("id", id);
    setDeleting(null);
    await load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-1">Write and publish posts — they go live instantly.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {success && <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{success}</div>}

      {/* Create/Edit Form */}
      {form && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Post" : "New Post"}</h2>
          {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => setForm(f => f ? {...f, title: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')} : f)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Post title" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Slug *</label>
              <input value={form.slug} onChange={e => setForm(f => f ? {...f, slug: e.target.value} : f)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" placeholder="post-url-slug" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => f ? {...f, description: e.target.value} : f)} rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="Short description shown on blog list page" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => f ? {...f, category: e.target.value} : f)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Read Time</label>
              <input value={form.read_time} onChange={e => setForm(f => f ? {...f, read_time: e.target.value} : f)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="5 min read" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Publish Date</label>
              <input type="date" value={form.published_at?.split('T')[0] ?? ''} onChange={e => setForm(f => f ? {...f, published_at: e.target.value} : f)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Content * (Markdown)</label>
            <textarea value={form.content} onChange={e => setForm(f => f ? {...f, content: e.target.value} : f)} rows={20} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 resize-y" placeholder="Write your post in Markdown..." />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.published} onChange={e => setForm(f => f ? {...f, published: e.target.checked} : f)} className="rounded" />
              <span className="text-sm text-gray-700">Publish immediately</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setForm(null); setEditingId(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl border border-gray-200 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">No posts yet. Create your first post above.</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {posts.map((post, i) => (
            <div key={post.id} className={`flex items-center gap-4 px-6 py-4 ${i !== posts.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${post.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {post.published ? '● Live' : '○ Draft'}
                  </span>
                  <span className="text-[10px] text-gray-400">{post.category}</span>
                  <span className="text-[10px] text-gray-400">{post.read_time}</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 truncate">{post.title}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">/blog/{post.slug}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(post)} title={post.published ? "Unpublish" : "Publish"} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                  {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => openEdit(post)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deletePost(post.id)} disabled={deleting === post.id} className="p-2 rounded-lg hover:bg-red-50 transition text-red-400 disabled:opacity-50">
                  {deleting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
