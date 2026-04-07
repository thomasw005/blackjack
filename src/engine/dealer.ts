import { RULES } from "./constants";
import { getHandValue, isSoft } from "./hand";
import { DealerHand, GameState, Shoe } from "./types";
import { drawCard } from "./shoe";

function shouldDealerHit(hand: DealerHand): boolean {
    const value = getHandValue(hand);
    if (value < 17) return true;
    if (value === 17 && RULES.dealerHitsS17 && isSoft(hand)) return true;
    return false;
}

export function playDealerHand(state: GameState, shoe: Shoe) {
    state.dealerHand.holeCardRevealed = true;

    while (shouldDealerHit(state.dealerHand)) {
        state.dealerHand.cards.push(drawCard(shoe));
    }
}