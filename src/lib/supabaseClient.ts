import { createClient } from '@supabase/supabase-js';

// FORCE remove any trailing slashes - this is the fix
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etfhkltquzhysvmhbkfg.supabase.co').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZmhrbHRxdXpoeXN2bWhia2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjE1NTMsImV4cCI6MjA3NDIzNzU1M30.za1h1oCZPD4vPwQllsHrX2_pXrZtrXLOQv63ErN2W6I';

console.log('🔄 Supabase URL:', supabaseUrl);
console.log('🔄 Anon Key exists:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});