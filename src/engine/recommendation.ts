import { GameState, ActionType, Recommendation } from "./types";
import { getHandValue, isSoft, cardValue } from "./hand";
import { canDouble, canSplit, canSurrender } from "./rules";

// Returns a basic strategy recommendation for the current player hand.
// Returns null if the phase is not actionable.
export function getRecommendation(state: GameState): Recommendation | null {
    if (state.phase === "insurance") {
        return {
            action: "decline-insurance",
            reason: "Insurance is a losing bet (house edge ~7%). Decline unless counting cards.",
        };
    }

    if (state.phase !== "player-turn") return null;

    const hand = state.playerHands[state.activeHandIndex];
    const upcard = state.dealerHand.cards[0];
    const d = cardValue(upcard); // 2–9, 10 (face cards), 11 (ace)
    const total = getHandValue(hand);
    const soft = isSoft(hand);

    // ── Pairs ────────────────────────────────────────────────────────────────
    const isPair =
        hand.cards.length === 2 &&
        cardValue(hand.cards[0]) === cardValue(hand.cards[1]);

    if (isPair && canSplit(state)) {
        const pv = cardValue(hand.cards[0]);

        if (pv === 11) return { action: "split", reason: "Always split aces." };
        if (pv === 8)  return { action: "split", reason: "Always split 8s." };

        if (pv === 9) {
            if (d !== 7 && d !== 10 && d !== 11)
                return { action: "split", reason: "Split 9s vs 2–9 (except 7)." };
        }
        if (pv === 7 && d >= 2 && d <= 7)
            return { action: "split", reason: "Split 7s vs 2–7." };
        if (pv === 6 && d >= 2 && d <= 6)
            return { action: "split", reason: "Split 6s vs 2–6." };
        if (pv === 4 && (d === 5 || d === 6))
            return { action: "split", reason: "Split 4s vs 5–6." };
        if ((pv === 2 || pv === 3) && d >= 2 && d <= 7)
            return { action: "split", reason: `Split ${pv}s vs 2–7.` };
        // 5-5 and 10-value pairs fall through to hard-total logic
    }

    // ── Surrender ────────────────────────────────────────────────────────────
    if (canSurrender(state)) {
        if (!soft && total === 16 && (d === 9 || d === 10 || d === 11))
            return { action: "surrender", reason: "Surrender hard 16 vs 9/10/A." };
        if (!soft && total === 15 && d === 10)
            return { action: "surrender", reason: "Surrender hard 15 vs 10." };
    }

    // ── Soft totals ───────────────────────────────────────────────────────────
    if (soft) {
        if (total >= 19) return { action: "stand", reason: `Stand on soft ${total}.` };

        if (total === 18) {
            if (canDouble(state) && d >= 2 && d <= 6)
                return { action: "double", reason: "Double soft 18 vs 2–6." };
            if (d === 9 || d === 10 || d === 11)
                return { action: "hit", reason: "Hit soft 18 vs 9/10/A." };
            return { action: "stand", reason: "Stand soft 18 vs 7–8." };
        }

        if (total === 17) {
            if (canDouble(state) && d >= 3 && d <= 6)
                return { action: "double", reason: "Double soft 17 vs 3–6." };
            return { action: "hit", reason: "Hit soft 17." };
        }

        if (total === 15 || total === 16) {
            if (canDouble(state) && d >= 4 && d <= 6)
                return { action: "double", reason: `Double soft ${total} vs 4–6.` };
            return { action: "hit", reason: `Hit soft ${total}.` };
        }

        if (total === 13 || total === 14) {
            if (canDouble(state) && (d === 5 || d === 6))
                return { action: "double", reason: `Double soft ${total} vs 5–6.` };
            return { action: "hit", reason: `Hit soft ${total}.` };
        }

        return { action: "hit", reason: "Hit soft total." };
    }

    // ── Hard totals ───────────────────────────────────────────────────────────
    if (total >= 17) return { action: "stand", reason: "Stand on 17+." };

    if (total === 16) {
        if (d >= 2 && d <= 6) return { action: "stand", reason: "Stand hard 16 vs 2–6." };
        return { action: "hit", reason: "Hit hard 16 vs 7+." };
    }

    if (total === 15) {
        if (d >= 2 && d <= 6) return { action: "stand", reason: "Stand hard 15 vs 2–6." };
        return { action: "hit", reason: "Hit hard 15 vs 7+." };
    }

    if (total === 13 || total === 14) {
        if (d >= 2 && d <= 6) return { action: "stand", reason: `Stand hard ${total} vs 2–6.` };
        return { action: "hit", reason: `Hit hard ${total} vs 7+.` };
    }

    if (total === 12) {
        if (d >= 4 && d <= 6) return { action: "stand", reason: "Stand hard 12 vs 4–6." };
        return { action: "hit", reason: "Hit hard 12." };
    }

    if (total === 11) {
        if (canDouble(state) && d !== 11)
            return { action: "double", reason: "Double 11 vs 2–10." };
        return { action: "hit", reason: "Hit 11 vs ace." };
    }

    if (total === 10) {
        if (canDouble(state) && d >= 2 && d <= 9)
            return { action: "double", reason: "Double 10 vs 2–9." };
        return { action: "hit", reason: "Hit 10 vs 10/A." };
    }

    if (total === 9) {
        if (canDouble(state) && d >= 3 && d <= 6)
            return { action: "double", reason: "Double 9 vs 3–6." };
        return { action: "hit", reason: "Hit 9." };
    }

    return { action: "hit", reason: "Hit 8 or less." };
}
