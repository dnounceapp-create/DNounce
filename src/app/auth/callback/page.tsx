"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace("/loginsignup");
        return;
      }

      const onboarded = !!user.user_metadata?.onboardingComplete;

      // Route based on onboarding completion
      router.replace(onboarded ? "/dashboard/myrecords" : "/user-setup");
    };

    run();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-lg text-gray-700">
      Finishing sign-in with Google…
    </div>
  );
}
