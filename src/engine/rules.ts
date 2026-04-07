import { RULES } from "./constants";
import { cardValue } from "./hand";
import { GameState } from "./types";

export function canDouble(state: GameState): boolean {
    if (state.phase !== "player-turn") return false;
    if (!RULES.allowDouble) return false;

    const hand = state.playerHands[state.activeHandIndex];
    if (hand.cards.length !== 2) return false;
    return state.bankroll >= hand.bet;
}

export function canSplit(state: GameState): boolean {
    if (state.phase !== "player-turn") return false;
    if (!RULES.allowSplit) return false;

    const hand = state.playerHands[state.activeHandIndex];
    if (hand.cards.length !== 2) return false;

    if (cardValue(hand.cards[0]) !== cardValue(hand.cards[1])) return false;
    return state.bankroll >= hand.bet;
}

export function canSurrender(state: GameState): boolean {
    if (state.phase !== "player-turn") return false;
    if (!RULES.allowSurrender) return false;

    const hand = state.playerHands[state.activeHandIndex];
    if (hand.cards.length !== 2) return false;
    return !hand.isSplit;
}

export function canTakeInsurance(state: GameState): boolean {
    if (state.phase !== "insurance") return false;
    return state.bankroll >= Math.floor(state.currentBet / 2);
}