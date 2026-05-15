import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyPlayerAction, advanceToNextHand } from "@/engine/round";
import { playDealerHand } from "@/engine/dealer";
import { settleRound } from "@/engine/settle";
import { isBlackjack } from "@/engine/hand";
import { canDouble, canSplit, canSurrender, canTakeInsurance } from "@/engine/rules";
import { getHandValue } from "@/engine/hand";
import { RULES } from "@/engine/constants";
import { ActionType, GameState } from "@/engine/types";
import { loadGameState, saveGameState, completeRound } from "@/lib/db";
import { sanitizeState } from "@/lib/gameUtils";

function validateAction(gameState: GameState, action: ActionType): string | null {
    switch (action) {
        case "hit":
            if (gameState.phase !== "player-turn") return "Not player's turn";
            if (getHandValue(gameState.playerHands[gameState.activeHandIndex]) >= 21) return "Cannot hit on 21";
            return null;
        case "stand":
            if (gameState.phase !== "player-turn") return "Not player's turn";
            return null;
        case "double":
            if (!canDouble(gameState)) return "Cannot double";
            return null;
        case "split":
            if (!canSplit(gameState)) return "Cannot split";
            return null;
        case "surrender":
            if (!canSurrender(gameState)) return "Cannot surrender";
            return null;
        case "insurance":
            if (!canTakeInsurance(gameState)) return "Cannot take insurance";
            return null;
        case "decline-insurance":
            if (gameState.phase !== "insurance") return "No insurance phase active";
            return null;
        default:
            return "Unknown action";
    }
}

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
        const hand = gameState.playerHands[0];
        if (isBlackjack(hand)) {
            hand.isComplete = true;
            advanceToNextHand(gameState);
        }
    }

    if (gameState.phase === "dealer-turn") {
        playDealerHand(gameState, shoe);

        // Resolve insurance before settling
        if (gameState.insuranceBet > 0 && isBlackjack(gameState.dealerHand)) {
            gameState.bankroll += gameState.insuranceBet * (1 + RULES.insurancePayout);
        }

        settleRound(gameState);
        gameState.phase = "settled";

        await completeRound(gameId, user.id, gameState);
    } else {
        await saveGameState(gameId, gameState, shoe);
    }

    return NextResponse.json({ state: sanitizeState(gameState) });
}
