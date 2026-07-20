import { getHandValue, isBlackjack, isBust } from "./hand";
import { RULES } from "./constants";
import { GameState, PlayerHand, DealerHand } from "./types";

function settleHand(playerHand: PlayerHand, dealerHand: DealerHand) {
    if (playerHand.result === "surrender") return;
    if (isBust(playerHand)) { playerHand.result = "lose"; return; }
    // A natural is decided before anything the dealer does. This has to come ahead of
    // the dealer-bust check: otherwise a player blackjack against a busted dealer is
    // graded "win" and pays even money instead of 3:2.
    if (isBlackjack(playerHand) && isBlackjack(dealerHand)) { playerHand.result = "push"; return; }
    if (isBlackjack(playerHand)) { playerHand.result = "blackjack"; return; }
    if (isBlackjack(dealerHand)) { playerHand.result = "lose"; return; }
    if (isBust(dealerHand)) { playerHand.result = "win"; return; }

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
//
// Odd bets are rounded in the player's favour so the bankroll stays a whole number —
// wallets.balance is an integer column, and completeRound records the round's net as
// round(bet × blackjackPayout) / -floor(bet / 2). Rounding the same way here keeps the
// wallet and the transaction log (which the leaderboard is built from) in agreement.
function payout(playerHand: PlayerHand): number {
    switch (playerHand.result) {
        case "win":       return playerHand.bet * 2;
        case "lose":      return 0;
        case "push":      return playerHand.bet;
        case "blackjack": return playerHand.bet + Math.round(playerHand.bet * RULES.blackjackPayout);
        case "surrender": return Math.ceil(playerHand.bet / 2);
        default:          return 0;
    }
}