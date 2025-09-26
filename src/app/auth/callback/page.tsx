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
      // Debug: log all search parameters
      console.log('🔐 All search parameters:');
      searchParams.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });

      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');
      
      console.log('🔐 Current URL:', window.location.href);
      console.log('🔐 Code parameter:', code);
      console.log('🔐 Error parameter:', error);
      console.log('🔐 Error description:', error_description);

      // Check for OAuth errors first
      if (error) {
        console.error('❌ OAuth error:', error, error_description);
        alert(`OAuth error: ${error_description || error}`);
        router.replace('/loginsignup');
        return;
      }

      if (!code) {
        console.error('❌ No code parameter found in URL');
        console.log('🔐 Full URL search:', window.location.search);
        
        // Check if there are any parameters at all
        if (window.location.search) {
          alert('Authentication response received but missing code. URL: ' + window.location.search);
        } else {
          alert('No authentication response received. The OAuth flow may have been interrupted.');
        }
        
        router.replace('/loginsignup');
        return;
      }

      try {
        console.log('🔄 Exchanging code for session...');
        
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('❌ Exchange error:', exchangeError);
          alert('Authentication failed: ' + exchangeError.message);
          router.replace('/loginsignup');
          return;
        }

        console.log('✅ Code exchanged successfully!');
        
        // Get user with retry logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ Get user error:', userError);
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