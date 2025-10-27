import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a secure Supabase client for server-side requests.
 * Automatically attaches Next.js cookies for session handling.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
