import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    applyPlayerAction,
    validateAction,
    resolveRound,
    resolveDeferredBlackjack,
} from "@/engine/round";
import { ActionType } from "@/engine/types";
import { loadGameState, saveGameState, completeRound } from "@/lib/db";
import { sanitizeState } from "@/lib/gameUtils";

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { gameId, action } = body ?? {};

    if (!gameId || !action) {
        return NextResponse.json({ error: "gameId and action are required" }, { status: 400 });
    }

    const loaded = await loadGameState(gameId, user.id);
    if (!loaded) return NextResponse.json({ error: "Game not found" }, { status: 404 });

    const { gameState, shoe } = loaded;

    const validationError = validateAction(gameState, action as ActionType);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    applyPlayerAction(gameState, shoe, action as ActionType);

    // After insurance resolves, check for player blackjack that was deferred
    if (action === "insurance" || action === "decline-insurance") {
        resolveDeferredBlackjack(gameState);
    }

    if (gameState.phase === "dealer-turn") {
        resolveRound(gameState, shoe);
        await completeRound(gameId, user.id, gameState);
    } else {
        await saveGameState(gameId, gameState, shoe);
    }

    return NextResponse.json({ state: sanitizeState(gameState) });
}
