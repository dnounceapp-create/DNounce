import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (typeof window !== "undefined") {
  console.log("Supabase URL:", supabaseUrl);
  console.log("Supabase Key (partial):", supabaseAnonKey.substring(0, 10));
}

// ✅ Use the auth helper if available (for components)
export const supabaseBrowser = createClientComponentClient();

// ✅ Use the standard client when needed (server or background)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
