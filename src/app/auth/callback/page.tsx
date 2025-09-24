'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Middleware will set/refresh the session from the OAuth callback
      const { data, error } = await supabase.auth.getSession();

      if (error || !data?.session?.user?.id) {
        router.replace('/loginsignup?error=auth');
        return;
      }

      const userId = data.session.user.id;
      router.replace(`/${userId}/dashboard/myrecords`);
    })();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg font-medium">Signing you in…</p>
    </div>
  );
}