"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error.message);
        router.push("/loginsignup"); // fallback if something breaks
        return;
      }

      if (session?.user) {
        const userId = session.user.id;
        // ✅ Redirect to your desired dashboard
        router.replace(`/${userId}/dashboard/myrecords`);
      } else {
        router.push("/loginsignup");
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Signing you in...</p>
    </div>
  );
}