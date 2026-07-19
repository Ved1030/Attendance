import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorCode = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorCode) {
    const errorUrl = new URL("/login", origin);
    errorUrl.searchParams.set("error", errorDescription || errorCode);
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            supabaseResponse = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              supabaseResponse.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const errorUrl = new URL("/login", origin);
  if (!code) {
    errorUrl.searchParams.set(
      "error",
      "Invalid verification link. Please request a new one.",
    );
  } else {
    errorUrl.searchParams.set(
      "error",
      "Verification failed. The link may have expired or already been used.",
    );
  }
  return NextResponse.redirect(errorUrl);
}
