import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PREFIXES = ["/login", "/auth", "/onboarding", "/portal", "/api"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  let response = NextResponse.next({ request });
  let user = null;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (toSet) => {
            toSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    // Refreshes the session cookie when needed. Authorisation is enforced by RLS, not here.
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {
    // Supabase unreachable or offline
    user = null;
  }

  const hasDemoCookie = Boolean(request.cookies.get("demo_user_email")?.value);
  const isAuthenticated = Boolean(user || hasDemoCookie);

  if (!isAuthenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

