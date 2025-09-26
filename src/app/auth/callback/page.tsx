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
      const error = searchParams.get('error');
      
      console.log('🔐 Auth callback - Code:', code);
      console.log('🔐 Error param:', error);

      if (error) {
        console.error('❌ OAuth error:', error);
        alert('OAuth error: ' + error);
        router.replace('/loginsignup');
        return;
      }

      if (!code) {
        console.error('❌ No auth code found');
        alert('No authentication code received');
        router.replace('/loginsignup');
        return;
      }

      try {
        console.log('🔄 Exchanging code for session...');
        
        // Simple exchange - let Supabase handle PKCE
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('❌ Exchange error:', exchangeError);
          
          // If PKCE fails, try refreshing the page to restart auth
          if (exchangeError.message.includes('code verifier') || exchangeError.message.includes('non-empty')) {
            alert('Session expired. Please try logging in again.');
            router.replace('/loginsignup');
            return;
          }
          
          alert('Authentication failed: ' + exchangeError.message);
          router.replace('/loginsignup');
          return;
        }

        console.log('✅ Code exchanged successfully!');
        
        // Wait a moment for session to persist
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get user with retry logic
        let user = null;
        for (let i = 0; i < 3; i++) {
          const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('❌ Get user error:', userError);
            break;
          }
          
          if (currentUser?.id) {
            user = currentUser;
            console.log('✅ User found:', user.id);
            break;
          }
          
          console.log('🔄 Waiting for user session...', i + 1);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (user?.id) {
          console.log('🎯 Redirecting to dashboard');
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          console.error('❌ No user found after authentication');
          alert('Authentication completed but user not found. Please try again.');
          router.replace('/loginsignup');
        }

      } catch (catchError) {
        console.error('💥 Unexpected error:', catchError);
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