'use client';

import { useRouter } from "next/navigation";

export default function ShareExperienceButton({ token }: { token: string }) {
  const router = useRouter();

  function handleClick() {
    // New users lose redirectTo during onboarding, so also hand off via sessionStorage (same as the claim flow)
    sessionStorage.setItem("request_token", token);
    const redirectTo = `/dashboard/submit?request=${token}`;
    router.push(`/loginsignup?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition"
    >
      Share My Experience &rarr;
    </button>
  );
}
