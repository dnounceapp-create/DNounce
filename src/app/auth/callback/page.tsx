'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code');
      if (!code) {
        router.replace('/loginsignup');
        return;
      }

      // For your Supabase version, pass the string directly
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