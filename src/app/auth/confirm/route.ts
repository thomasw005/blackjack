import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    // PKCE flow — Supabase redirects here with a short-lived code after
    // verifying the OTP on its own servers. This is the recommended path.
    const code = searchParams.get("code");

    // Where to land after the exchange (defaults to email-confirmed for signup,
    // callers pass ?next=/update-password for password reset).
    const next = searchParams.get("next") ?? "/email-confirmed";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(new URL(next, origin));
        }
        console.error("[auth/confirm] exchangeCodeForSession error:", error.message);
    }

    return NextResponse.redirect(new URL("/login?error=invalid-link", origin));
}
