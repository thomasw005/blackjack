import { getHandValue, isBlackjack, isBust } from "./hand";
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

function payout(playerHand: PlayerHand): number {
    let payout = 0;

    switch (playerHand.result) {
        case "win":
            payout = playerHand.bet;
            break;
        case "lose":
            payout = -playerHand.bet;
            break;
        case "push":
            payout = 0;
            break;
        case "blackjack":
            payout = playerHand.bet * 1.5;
            break;
        case "surrender":
            payout = -playerHand.bet / 2;
            break;
    }

    return payout;
}