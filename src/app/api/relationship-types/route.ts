import { NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  try {
    // Validate envs at runtime
    if (!url || !anon) {
      console.error("Env missing:", { url: !!url, anon: !!anon });
      return NextResponse.json({ error: "Supabase envs missing" }, { status: 500 });
    }

    // Call PostgREST directly (bypasses supabase-js so we can see the real error)
    const restUrl = `${url}/rest/v1/relationship_types?select=id,label,value&order=label`;
    const r = await fetch(restUrl, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      cache: "no-store",
    });

    // If Supabase says the key is bad, we surface the exact response
    if (!r.ok) {
      const text = await r.text();
      console.error("PostgREST error:", r.status, text);
      return NextResponse.json({ error: text || "PostgREST error" }, { status: 500 });
    }

    const data = await r.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (e: any) {
    console.error("Route failure:", e?.message || e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}