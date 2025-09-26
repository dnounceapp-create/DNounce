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
      // Check if Supabase client is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('❌ Supabase environment variables missing');
        alert('Configuration error. Please contact support.');
        router.replace('/loginsignup');
        return;
      }

      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      console.log('🔐 Auth Callback - Code:', code ? 'YES' : 'NO');
      console.log('🔐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('🔐 Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

      if (error) {
        console.error('❌ OAuth error parameter:', error);
        router.replace('/loginsignup');
        return;
      }

      if (!code) {
        console.error('❌ No code parameter found in URL');
        router.replace('/loginsignup');
        return;
      }

      try {
        console.log('🔄 Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('❌ Exchange error:', exchangeError);
          
          if (exchangeError.message.includes('API key') || exchangeError.status === 401) {
            alert('Configuration error: Invalid API key. Please check environment variables.');
          } else {
            alert('Authentication failed: ' + exchangeError.message);
          }
          
          router.replace('/loginsignup');
          return;
        }

        console.log('✅ Code exchanged successfully');

        // Wait for session to be established
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get user with multiple retries
        let user = null;
        for (let i = 0; i < 5; i++) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('❌ Get user error:', userError);
            break;
          }
          
          if (userData.user?.id) {
            user = userData.user;
            console.log('✅ User found on attempt', i + 1, 'ID:', user.id);
            break;
          }
          
          console.log('🔄 User not found, retrying...', i + 1);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (user?.id) {
          console.log('🎯 Redirecting to dashboard');
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          console.error('❌ No user ID found after retries');
          alert('Authentication completed but user session not found. Please try logging in again.');
          router.replace('/loginsignup');
        }

      } catch (catchError) {
        console.error('❌ Unexpected error:', catchError);
        alert('Authentication error. Please try again.');
        router.replace('/loginsignup');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg">Completing authentication...</p>
        <p className="text-sm text-gray-600">This may take a few seconds</p>
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