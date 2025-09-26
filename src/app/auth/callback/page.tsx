// src/app/auth/callback/page.tsx
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

      try {
        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Authentication error:', error.message);
          router.replace('/loginsignup');
          return;
        }

        // Get user with retry logic
        const getUserWithRetry = async (retries = 0): Promise<any> => {
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error) throw error;
          
          if (user?.id) {
            return user;
          }
          
          if (retries < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return getUserWithRetry(retries + 1);
          }
          
          return null;
        };

        const user = await getUserWithRetry();
        
        if (user?.id) {
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          router.replace('/loginsignup');
        }

      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/loginsignup');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}