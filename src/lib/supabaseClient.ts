import { createClient } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Debug log — will show only first 10 chars for safety
if (typeof window !== "undefined") {
  console.log("Supabase URL:", supabaseUrl);
  console.log("Supabase Key (partial):", supabaseAnonKey?.substring(0, 10));
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
