"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function logout() {
      await supabase.auth.signOut();
      router.replace("/loginsignup");
    }
    logout();
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center text-sm text-gray-500">
      Signing out…
    </div>
  );
}