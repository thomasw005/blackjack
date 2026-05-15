import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createShoe } from "@/engine/shoe";
import { startRound } from "@/engine/round";
import { playDealerHand } from "@/engine/dealer";
import { settleRound } from "@/engine/settle";
import { GameState, Shoe } from "@/engine/types";
import { getActiveGame, createGame, saveGameState, completeRound } from "@/lib/db";
import { sanitizeState } from "@/lib/gameUtils";

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const bet = body?.bet;

    if (!Number.isInteger(bet) || bet < 1) {
        return NextResponse.json({ error: "Bet must be a positive integer" }, { status: 400 });
    }

    const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    if (bet > wallet.balance) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const active = await getActiveGame(user.id);
    if (active) {
        return NextResponse.json(
            { error: "Active game already exists", gameId: active.id },
            { status: 409 }
        );
    }

    const gameResult = await createGame(user.id);
    if ("error" in gameResult) {
        console.error("[/api/game/start] createGame failed:", gameResult.error);
        return NextResponse.json({ error: "Failed to create game", detail: gameResult.error }, { status: 500 });
    }
    const gameId = gameResult.id;

    const shoe: Shoe = createShoe();
    const gameState: GameState = {
        playerHands: [],
        dealerHand: { cards: [], holeCardRevealed: false },
        activeHandIndex: 0,
        phase: "betting",
        bankroll: wallet.balance,
        currentBet: 0,
        insuranceOffered: false,
        insuranceBet: 0,
    };

    startRound(gameState, shoe, bet);

    // Player blackjack (non-ace upcard) — dealer plays immediately
    if (gameState.phase === "dealer-turn") {
        playDealerHand(gameState, shoe);
        settleRound(gameState);
        gameState.phase = "settled";
        await completeRound(gameId, user.id, gameState);
    } else {
        await saveGameState(gameId, gameState, shoe);
    }

    return NextResponse.json({ gameId, state: sanitizeState(gameState) });
}
