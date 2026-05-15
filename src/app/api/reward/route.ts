import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveGame } from "@/lib/db";

const REWARD = 10;

export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const [active, walletResult] = await Promise.all([
        getActiveGame(user.id),
        admin.from("wallets").select("balance").eq("user_id", user.id).single(),
    ]);

    if (!walletResult.data) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

    const walletOps = [
        admin.from("wallets").update({ balance: walletResult.data.balance + REWARD, updated_at: new Date().toISOString() }).eq("user_id", user.id),
        admin.from("transactions").insert({ user_id: user.id, type: "reward", amount: REWARD }),
    ];

    if (active) {
        // During an active game, gameState.bankroll is what drives the UI (not the wallet table).
        // Patch it in the saved state so the client and any future reload see the right number.
        const patchedGameState = { ...active.state.gameState, bankroll: active.state.gameState.bankroll + REWARD };
        await Promise.all([
            ...walletOps,
            admin.from("games").update({ state: { gameState: patchedGameState, shoe: active.state.shoe } }).eq("id", active.id),
        ]);
        return NextResponse.json({ balance: patchedGameState.bankroll });
    }

    await Promise.all(walletOps);
    return NextResponse.json({ balance: walletResult.data.balance + REWARD });
}
