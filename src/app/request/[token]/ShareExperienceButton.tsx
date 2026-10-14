'use client';

import { useRouter } from "next/navigation";

export default function ShareExperienceButton({ token, subjectUuid, relationship }: { token: string; subjectUuid: string; relationship: string }) {
  const router = useRouter();

  function handleClick() {
    // Same subject_id param the subject page's own Submit button uses
    const redirectTo = `/dashboard/submit?subject_id=${subjectUuid}&relationship=${relationship}&request=${token}`;
    // New users lose redirectTo during onboarding, so also hand off via sessionStorage (same as the claim flow)
    sessionStorage.setItem("request_redirect", redirectTo);
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
