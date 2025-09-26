import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etfhkltquzhysvmhbkfg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZmhrbHRxdXpoeXN2bWhia2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjE1NTMsImV4cCI6MjA3NDIzNzU1M30.za1h1oCZPD4vPwQllsHrX2_pXrZtrXLOQv63ErN2W6I';

// Minimal configuration - let Supabase handle PKCE automatically
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});