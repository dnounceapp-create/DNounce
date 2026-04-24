"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UseAuthOptions = {
  redirectIfUnauthed?: boolean;
  redirectToSetupIfFirstTime?: boolean;
  loginPath?: string;
};

export function useAuth(options: UseAuthOptions = {}) {
  const {
    redirectIfUnauthed = true,
    redirectToSetupIfFirstTime = false,
    loginPath = "/loginsignup",
  } = options;

  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<null | NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>["user"]>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const init = async () => {
      // Check cached session first — this is instant, no network call
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      if (user) {
        setSessionUser(user);
        setLoading(false);
        const isOnboarded = Boolean(user.user_metadata?.onboardingComplete);
        if (
          redirectToSetupIfFirstTime &&
          !isOnboarded &&
          pathname !== "/user-setup" &&
          !pathname.startsWith("/auth") &&
          pathname !== "/loginsignup"
        ) {
          router.replace("/user-setup");
        }
        return;
      }

      // No cached session — subscribe to catch OAuth redirects
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        const u = newSession?.user ?? null;
        if (!u) {
          setSessionUser(null);
          return;
        }
        setSessionUser(u);
        setLoading(false);
        const isOnboarded = Boolean(u.user_metadata?.onboardingComplete);
        if (
          redirectToSetupIfFirstTime &&
          !isOnboarded &&
          pathname !== "/user-setup" &&
          pathname !== "/loginsignup" &&
          !pathname.startsWith("/auth")
        ) {
          router.replace("/user-setup");
        }
      });

      unsub = () => sub.subscription.unsubscribe();

      // Short wait for OAuth redirect to fire — 50ms instead of 1000ms
      await new Promise((resolve) => setTimeout(resolve, 50));
      const { data: retry } = await supabase.auth.getSession();
      const retryUser = retry.session?.user ?? null;
      if (!retryUser) {
        if (redirectIfUnauthed) {
          const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
          router.replace(`${loginPath}${next}`);
        }
        setSessionUser(null);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsub) unsub();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectIfUnauthed, redirectToSetupIfFirstTime, loginPath]);

  return { user: sessionUser, loading };
}