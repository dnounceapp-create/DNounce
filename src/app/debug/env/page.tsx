// src/app/debug/env/page.tsx (temporary - remove after fixing)
'use client';

export default function DebugEnv() {
  return (
    <div className="p-6">
      <h1>Environment Variables Debug</h1>
      <div className="space-y-2">
        <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'}</p>
        <p><strong>NEXT_PUBLIC_SITE_URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL || 'MISSING'}</p>
        <p><strong>Anon Key exists:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES' : 'NO'}</p>
        <p><strong>Anon Key starts with eyJ:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') ? 'YES' : 'NO'}</p>
      </div>
    </div>
  );
}