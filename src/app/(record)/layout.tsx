"use client";

import { useAuth } from "@/lib/auth";
import PublicLayout from "./(public)/layout";
import AuthUsersLayout from "./(auth_users)/layout";

export default function RecordRootLayout({ children }: { children: React.ReactNode }) {
  // IMPORTANT:
  // - do NOT redirect here
  // - just detect session and choose a shell
  const { user, loading } = useAuth({
    redirectIfUnauthed: false,
    redirectToSetupIfFirstTime: false,
    loginPath: "/loginsignup",
  });

  // While auth is still checking, don't render the auth layout (it redirects).
  // Keep it simple to avoid flicker/redirect races.
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  // Signed in → dashboard shell
  if (user) {
    return <AuthUsersLayout>{children}</AuthUsersLayout>;
  }

  // Not signed in → public shell
  return <PublicLayout>{children}</PublicLayout>;
}
