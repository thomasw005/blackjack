import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const next = searchParams.get("next") ?? "/email-confirmed";
    const supabase = await createClient();

    // PKCE flow (signup confirmation, password reset)
    const code = searchParams.get("code");
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return NextResponse.redirect(new URL(next, origin));
        console.error("[auth/confirm] exchangeCodeForSession error:", error.message);
        return NextResponse.redirect(new URL("/login?error=invalid-link", origin));
    }

    // Token-hash flow (email change — Supabase sends token_hash for this type)
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) {
            const dest = type.startsWith("email") ? "/email-changed" : next;
            return NextResponse.redirect(new URL(dest, origin));
        }
        console.error("[auth/confirm] verifyOtp error:", error.message);
    }

    return NextResponse.redirect(new URL("/login?error=invalid-link", origin));
}
