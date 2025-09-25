"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Exchange ?code= for a session
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(searchParams.toString());

        if (exchangeError) {
          console.error("exchangeCodeForSession error:", exchangeError);
          router.replace("/loginsignup");
          return;
        }

        // Get the signed-in user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          router.replace("/loginsignup");
        }
      } catch (err) {
        console.error("Callback error:", err);
        router.replace("/loginsignup");
      }
    };

    handleAuth();
  }, [supabase, searchParams, router]);

  return <p>Finishing sign-in…</p>;
}