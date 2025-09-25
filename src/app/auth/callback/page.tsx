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
      if (!code) {
        router.replace('/loginsignup');
        return;
      }

      // Your Supabase version expects a string, not an object
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('exchangeCodeForSession error:', error.message);
        router.replace('/loginsignup');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.replace(`/${user.id}/dashboard/myrecords`);
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