'use client';
//hi
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // 1) Complete the PKCE flow (sets session cookie)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession();
      if (exchangeError) {
        console.error('exchangeCodeForSession error:', exchangeError.message);
        router.replace('/loginsignup');
        return;
      }

      // 2) Get the signed-in user
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error('getUser error:', error?.message);
        router.replace('/loginsignup');
        return;
      }

      // 3) Redirect to dashboard
      router.replace(`/${user.id}/dashboard/myrecords`);
    };

    handleAuth();
  }, [router, searchParams]);

  return <p className="text-center mt-20">Signing you in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}