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
        // ✅ exchange code → set session
        const { error } = await supabase.auth.exchangeCodeForSession({ code: code as string });
  
        if (error) {
          console.error('exchangeCodeForSession error:', error.message);
          router.replace('/loginsignup');
          return;
        }
  
        // ✅ wait for user to be available
        const { data: { user } } = await supabase.auth.getUser();
  
        if (user?.id) {
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          // 👀 Instead of throwing user back to login, wait and retry once
          setTimeout(async () => {
            const { data: { user: retryUser } } = await supabase.auth.getUser();
            if (retryUser?.id) {
              router.replace(`/${retryUser.id}/dashboard/myrecords`);
            } else {
              router.replace('/loginsignup');
            }
          }, 1000);
        }
      } else {
        router.replace('/loginsignup');
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