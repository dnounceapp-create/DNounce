"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });

  useEffect(() => {
    (async () => {
      // 1) Complete the PKCE flow: exchange ?code= for a session cookie
      //    (safe to call even if the code was already exchanged)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession();
      if (exchangeError) {
        console.error("exchangeCodeForSession error:", exchangeError);
        router.replace("/loginsignup");
        return;
      }

      // 2) Get the session and redirect to /[userid]/dashboard/myrecords
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        router.replace(`/${userId}/dashboard/myrecords`);
      } else {
        // fallback if no session (e.g., user cancelled)
        router.replace("/loginsignup");
      }
    })();
  }, [router, supabase, params]);

  return <p className="p-6 text-gray-600">Signing you in…</p>;
}
