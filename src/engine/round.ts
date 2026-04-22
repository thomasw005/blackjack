import { isBlackjack, isBust } from "./hand";
import { drawCard, reshuffleIfNeeded } from "./shoe";
import { ActionType, GameState, PlayerHand, Shoe } from "./types";

export function startRound(state: GameState, shoe: Shoe, bet: number): void {
    reshuffleIfNeeded(shoe);

    state.bankroll -= bet;
    state.currentBet = bet;
    state.insuranceBet = 0;
    state.insuranceOffered = false;
    state.activeHandIndex = 0;

    const p1 = drawCard(shoe);
    const d1 = drawCard(shoe);
    const p2 = drawCard(shoe);
    const d2 = drawCard(shoe);

    const playerHand: PlayerHand = {
        cards: [p1, p2],
        bet,
        doubled: false,
        isSplit: false,
        isComplete: false,
        result: null,
    };

    state.playerHands = [playerHand];
    state.dealerHand = { cards: [d1, d2], holeCardRevealed: false };

    if (d1.rank === "A") {
        state.insuranceOffered = true;
        state.phase = "insurance";
    } else if (isBlackjack(playerHand)) {
        playerHand.isComplete = true;
        state.phase = "dealer-turn";
    } else {
        state.phase = "player-turn";
    }
}

export function applyPlayerAction(state: GameState, shoe: Shoe, action: ActionType) {
    const hand = state.playerHands[state.activeHandIndex];

    switch (action) {
        case "hit": {
            hand.cards.push(drawCard(shoe));
            if (isBust(hand)) {
                hand.isComplete = true;
                advanceToNextHand(state);
            }
            break;
        }
        case "stand": {
            hand.isComplete = true;
            advanceToNextHand(state);
            break;
        }
        case "double": {
            state.bankroll -= hand.bet;
            hand.bet *= 2;
            hand.doubled = true;
            hand.cards.push(drawCard(shoe));
            hand.isComplete = true;
            advanceToNextHand(state);
            break;
        }
        case "split": {
            state.bankroll -= hand.bet;
            const [card1, card2] = hand.cards;
            const hand1: PlayerHand = {
                cards: [card1, drawCard(shoe)],
                bet: hand.bet,
                doubled: false,
                isSplit: true,
                isComplete: false,
                result: null
            };
            const hand2: PlayerHand = {
                cards: [card2, drawCard(shoe)],
                bet: hand.bet,
                doubled: false,
                isSplit: true,
                isComplete: false,
                result: null
            };
            if (card1.rank === "A") {
                hand1.isComplete = true;
                hand2.isComplete = true;
            }
            state.playerHands.splice(state.activeHandIndex, 1, hand1, hand2);
            if (hand1.isComplete) advanceToNextHand(state);
            break;
        }
        case "surrender": {
            hand.result = "surrender";
            hand.isComplete = true;
            advanceToNextHand(state);
            break;
        }
        case "insurance": {
            const insuranceBet = Math.floor(state.currentBet / 2);
            state.bankroll -= insuranceBet;
            state.insuranceBet = insuranceBet;
            state.phase = "player-turn";
            break;
        }
        case "decline-insurance": {
            state.phase = "player-turn";
            break;
        }
    }
}

export function advanceToNextHand(state: GameState) {
    const nextIndex = state.playerHands.findIndex(
        (hand, i) => i > state.activeHandIndex && !hand.isComplete
    );

    if (nextIndex === -1) {
        state.activeHandIndex = nextIndex;
    } else {
        state.phase = "dealer-turn";
    }
}