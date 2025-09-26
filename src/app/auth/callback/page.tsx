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
        router.replace('/loginsignup');
        return;
      }

      if (!code) {
        console.error('❌ No auth code found');
        router.replace('/loginsignup');
        return;
      }

      try {
        console.log('🔄 Exchanging auth code for session...');
        
        // Fix: Ensure we have both code and code verifier
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        console.log('🔐 Exchange response:', { data, error: exchangeError });

        if (exchangeError) {
          console.error('❌ Exchange error:', exchangeError);
          
          if (exchangeError.message.includes('code verifier')) {
            // PKCE issue - try a different approach
            await handlePKCEFallback(code);
            return;
          }
          
          alert('Authentication failed: ' + exchangeError.message);
          router.replace('/loginsignup');
          return;
        }

        console.log('✅ Session exchange successful!');
        
        // Get the user
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ User error:', userError);
          router.replace('/loginsignup');
          return;
        }

        if (user?.id) {
          console.log('🎯 User authenticated:', user.id);
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          console.error('❌ No user found after authentication');
          router.replace('/loginsignup');
        }

      } catch (catchError) {
        console.error('💥 Unexpected error:', catchError);
        router.replace('/loginsignup');
      }
    };

    const handlePKCEFallback = async (code: string) => {
      console.log('🔄 Trying PKCE fallback...');
      // Sometimes the code verifier is in localStorage
      const codeVerifier = localStorage.getItem('supabase.auth.codeVerifier');
      console.log('🔐 Code verifier from storage:', codeVerifier);
      
      if (!codeVerifier) {
        alert('Authentication error: Missing session data. Please try logging in again.');
        router.replace('/loginsignup');
        return;
      }

      // Manually handle the exchange
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            auth_code: code,
            code_verifier: codeVerifier,
          }),
        });
        
        const data = await response.json();
        console.log('🔐 Manual PKCE response:', data);
        
        if (data.access_token) {
          // Set the session manually
          const { error: setError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          
          if (!setError) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
              router.replace(`/${user.id}/dashboard/myrecords`);
              return;
            }
          }
        }
        
        router.replace('/loginsignup');
      } catch (error) {
        console.error('❌ PKCE fallback failed:', error);
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