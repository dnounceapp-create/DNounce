import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a secure Supabase client for server-side requests.
 * Compatible with Next.js 15 (cookies() is async).
 */
export async function createClient() {
  const cookieStore = await cookies(); // ✅ cookies() returns a Promise now

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
