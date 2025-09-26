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
      
      console.log('🔐 Auth callback - Code:', code ? 'YES' : 'NO');
      console.log('🔐 Current URL:', window.location.href);

      if (!code) {
        console.error('❌ No code found');
        router.replace('/loginsignup');
        return;
      }

      try {
        console.log('🔄 Exchanging code...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('❌ Exchange error:', error);
          // Show exact error
          alert('Error: ' + error.message);
          router.replace('/loginsignup');
          return;
        }

        console.log('✅ Code exchanged! Getting user...');
        
        // Wait 2 seconds for session
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          console.log('🎯 User found, redirecting to:', `/${user.id}/dashboard/myrecords`);
          router.replace(`/${user.id}/dashboard/myrecords`);
        } else {
          console.error('❌ No user found');
          router.replace('/loginsignup');
        }

      } catch (error) {
        console.error('💥 Unexpected error:', error);
        router.replace('/loginsignup');
      }
    };

    handleAuth();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg">Signing you in...</p>
      </div>
    </div>
  );
}