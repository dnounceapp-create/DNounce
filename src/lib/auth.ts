"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UseAuthOptions = {
  redirectIfUnauthed?: boolean;
  redirectToSetupIfFirstTime?: boolean;
  loginPath?: string; // default /loginsignup
};

export function useAuth(options: UseAuthOptions = {}) {
  const {
    redirectIfUnauthed = true,
    redirectToSetupIfFirstTime = false,
    loginPath = "/loginsignup",
  } = options;

  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<
    null | NonNullable<
      Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
    >["user"]
  >(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const init = async () => {
      // 1️⃣ Get current session
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      // 2️⃣ Redirect unauthenticated users
      if (!user) {
        if (redirectIfUnauthed) {
          const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
          router.replace(`${loginPath}${next}`);
        }
        setSessionUser(null);
        setLoading(false);
        return;
      }

      // 3️⃣ Save session user
      setSessionUser(user);

      // 4️⃣ Redirect to /user-setup if onboarding incomplete
      const isOnboarded = Boolean(user.user_metadata?.onboardingComplete);
      if (
        redirectToSetupIfFirstTime &&
        !isOnboarded &&
        pathname !== "/user-setup" &&
        !pathname.startsWith("/auth") // avoid loops
      ) {
        router.replace("/user-setup");
        return;
      }

      // 5️⃣ Subscribe to auth changes
      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        const u = newSession?.user ?? null;

        if (!u) {
          if (redirectIfUnauthed) router.replace(loginPath);
          setSessionUser(null);
          return;
        }

        setSessionUser(u);

        if (
          redirectToSetupIfFirstTime &&
          !isOnboarded &&
          pathname !== "/user-setup" &&
          !pathname.startsWith("/auth")
        ) {
          router.replace("/user-setup");
          return;
        }
      });

      unsub = () => sub.subscription.unsubscribe();
      setLoading(false); // ✅ move here to prevent premature render
    };

    init();

    return () => {
      if (unsub) unsub();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectIfUnauthed, redirectToSetupIfFirstTime, loginPath]);

  return { user: sessionUser, loading };
}