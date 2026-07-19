import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGame } from "@/lib/db";
import { sanitizeState } from "@/lib/gameUtils";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Not an error — the client falls back to a browser-local guest game.
    if (!user) {
        return NextResponse.json({
            authenticated: false,
            gameId: null,
            state: null,
            balance: null,
            username: null,
            email: null,
        });
    }

    const [active, walletResult, profileResult] = await Promise.all([
        getActiveGame(user.id),
        supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
        supabase.from("profiles").select("username").eq("id", user.id).single(),
    ]);

    const walletBalance = walletResult.data?.balance ?? null;
    const username = profileResult.data?.username ?? null;

    const email = user.email ?? null;

    if (!active) {
        return NextResponse.json({
            authenticated: true,
            gameId: null,
            state: null,
            balance: walletBalance,
            username,
            email,
        });
    }

    return NextResponse.json({
        authenticated: true,
        gameId: active.id,
        state: sanitizeState(active.state.gameState),
        balance: active.state.gameState.bankroll,
        username,
        email,
    });
}
