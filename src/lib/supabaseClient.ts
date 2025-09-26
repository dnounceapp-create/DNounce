// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Force remove ANY trailing slashes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase URL after cleanup:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`
    Missing Supabase environment variables!
    URL: ${supabaseUrl}
    Key: ${supabaseAnonKey ? 'Exists' : 'Missing'}
  `);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});