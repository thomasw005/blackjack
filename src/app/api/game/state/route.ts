import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveGame } from "@/lib/db";
import { sanitizeState } from "@/lib/gameUtils";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [active, walletResult, profileResult] = await Promise.all([
        getActiveGame(user.id),
        supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
        supabase.from("profiles").select("username").eq("id", user.id).single(),
    ]);

    const walletBalance = walletResult.data?.balance ?? null;
    const username = profileResult.data?.username ?? null;

    if (!active) return NextResponse.json({ gameId: null, state: null, balance: walletBalance, username });

    return NextResponse.json({
        gameId: active.id,
        state: sanitizeState(active.state.gameState),
        balance: active.state.gameState.bankroll,
        username,
    });
}
