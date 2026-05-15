import { createClient, createAdminClient } from "./supabase/server";
import { isBlackjack } from "@/engine/hand";
import { RULES } from "@/engine/constants";
import { GameState, Shoe } from "@/engine/types";

export async function getActiveGame(userId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("games")
        .select("id, state")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
    return data as { id: string; state: { gameState: GameState; shoe: Shoe } } | null;
}

export async function createGame(userId: string): Promise<{ id: string } | { error: string }> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("games")
        .insert({ user_id: userId, status: "active" })
        .select("id")
        .single();
    if (error || !data) return { error: error?.message ?? "insert returned no data" };
    return { id: data.id };
}

export async function saveGameState(gameId: string, gameState: GameState, shoe: Shoe) {
    const admin = createAdminClient();
    await admin
        .from("games")
        .update({ state: { gameState, shoe } })
        .eq("id", gameId);
}

export async function loadGameState(gameId: string, userId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("games")
        .select("id, state, user_id")
        .eq("id", gameId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
    if (!data?.state) return null;
    return data.state as { gameState: GameState; shoe: Shoe };
}

// Writes hands + transactions, updates wallet, marks game complete.
// Call after settleRound has run and insurance has been resolved.
export async function completeRound(gameId: string, userId: string, gameState: GameState) {
    const admin = createAdminClient();
    const dealerHasBlackjack = isBlackjack(gameState.dealerHand);

    const hands = gameState.playerHands.map((hand, i) => ({
        game_id: gameId,
        hand_index: i,
        player_cards: hand.cards,
        dealer_cards: gameState.dealerHand.cards,
        wager: hand.bet,
        insurance_wager: i === 0 ? gameState.insuranceBet : 0,
        result: hand.result,
        doubled: hand.doubled,
    }));

    // Net profit/loss per hand (relative to what was wagered)
    const transactions = gameState.playerHands.map((hand) => {
        let amount = 0;
        switch (hand.result) {
            case "win":       amount = hand.bet;                                  break;
            case "lose":      amount = -hand.bet;                                 break;
            case "push":      amount = 0;                                         break;
            case "blackjack": amount = Math.round(hand.bet * RULES.blackjackPayout); break;
            case "surrender": amount = -Math.floor(hand.bet / 2);                 break;
        }
        return { user_id: userId, game_id: gameId, type: hand.result ?? "unknown", amount };
    });

    // Insurance transaction (only if player took insurance)
    if (gameState.insuranceBet > 0) {
        const insuranceAmount = dealerHasBlackjack
            ? Math.round(gameState.insuranceBet * RULES.insurancePayout)
            : -gameState.insuranceBet;
        transactions.push({
            user_id: userId,
            game_id: gameId,
            type: dealerHasBlackjack ? "insurance-win" : "insurance-loss",
            amount: insuranceAmount,
        });
    }

    await Promise.all([
        admin.from("hands").insert(hands),
        admin.from("transactions").insert(transactions),
        admin.from("wallets").update({
            balance: gameState.bankroll,
            updated_at: new Date().toISOString(),
        }).eq("user_id", userId),
        admin.from("games").update({
            status: "complete",
            ended_at: new Date().toISOString(),
            outcome_summary: {
                results: gameState.playerHands.map((h) => ({ result: h.result, bet: h.bet })),
                dealerCards: gameState.dealerHand.cards,
                finalBankroll: gameState.bankroll,
            },
            state: null,
        }).eq("id", gameId),
    ]);
}
