import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/loginsignup", requestUrl.origin));
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: userRow } = await supabase
        .from("users")
        .select("onboarding_complete")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const isOnboarded = userRow?.onboarding_complete || !!user.user_metadata?.onboardingComplete;
      return NextResponse.redirect(
        new URL(isOnboarded ? "/dashboard/myrecords" : "/user-setup", requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL("/loginsignup", requestUrl.origin));
}