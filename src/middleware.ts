import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/game", "/profile", "/leaderboard"];
const AUTH_ONLY = ["/login", "/signup", "/check-email"];

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
    const isAuthOnly = AUTH_ONLY.some((p) => pathname.startsWith(p));

    if (!user && isProtected) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user && isAuthOnly) {
        return NextResponse.redirect(new URL("/game", request.url));
    }

    if (pathname === "/") {
        return NextResponse.redirect(new URL(user ? "/game" : "/login", request.url));
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
