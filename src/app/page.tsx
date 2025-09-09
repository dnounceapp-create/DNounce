'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').limit(5);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">dnounce 🚀</h1>
      {loading ? <p>Loading…</p> : <pre className="mt-4 bg-zinc-100 p-4 rounded">{JSON.stringify(rows, null, 2)}</pre>}
    </main>
  );
}
