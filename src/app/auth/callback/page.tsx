'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code');

      if (code) {
        // ✅ Exchange code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('exchangeCodeForSession error:', error.message);
          router.replace('/loginsignup'); // fallback if OAuth fails
          return;
        }

        // ✅ Get the logged-in user
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          router.replace(`/${user.id}/dashboard/myrecords`); // 🔥 send user straight to dashboard
        } else {
          router.replace('/loginsignup'); // fallback if no user
        }
      } else {
        router.replace('/loginsignup'); // fallback if no code in URL
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return <p className="text-center mt-10">Finishing sign-in…</p>;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<p className="text-center mt-10">Loading…</p>}>
      <AuthCallbackInner />
    </Suspense>
  );
}