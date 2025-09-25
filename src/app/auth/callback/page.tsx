"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CallbackPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const userId = session.user.id;
        router.replace(`/${userId}/dashboard/myrecords`);
      } else {
        router.replace("/loginsignup");
      }
    };

    handleAuth();
  }, [router, supabase]);

  return <p>Signing you in...</p>;
}