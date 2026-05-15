import { getHandValue, isBlackjack, isBust } from "./hand";
import { RULES } from "./constants";
import { GameState, PlayerHand, DealerHand } from "./types";

function settleHand(playerHand: PlayerHand, dealerHand: DealerHand) {
    if (playerHand.result === "surrender") return;
    if (isBust(playerHand)) { playerHand.result = "lose"; return; }
    if (isBust(dealerHand)) { playerHand.result = "win"; return; }
    if (isBlackjack(playerHand) && isBlackjack(dealerHand)) { playerHand.result = "push"; return; }
    if (isBlackjack(playerHand)) { playerHand.result = "blackjack"; return; }
    if (isBlackjack(dealerHand)) { playerHand.result = "lose"; return; }

    const playerTotal = getHandValue(playerHand);
    const dealerTotal = getHandValue(dealerHand);
    if (playerTotal > dealerTotal) playerHand.result = "win";
    else if (playerTotal < dealerTotal) playerHand.result = "lose";
    else playerHand.result = "push";
}

export function settleRound(state: GameState) {
    for (const hand of state.playerHands) {
        settleHand(hand, state.dealerHand);
        state.bankroll += payout(hand);
    }
}

// startRound deducts the bet upfront, so payout returns gross (original bet + winnings).
// win/blackjack: return bet + profit. push: return bet. lose: 0 (bet already gone). surrender: return half.
function payout(playerHand: PlayerHand): number {
    switch (playerHand.result) {
        case "win":       return playerHand.bet * 2;
        case "lose":      return 0;
        case "push":      return playerHand.bet;
        case "blackjack": return playerHand.bet * (1 + RULES.blackjackPayout);
        case "surrender": return playerHand.bet / 2;
        default:          return 0;
    }
}