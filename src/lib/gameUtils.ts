import { GameState } from "@/engine/types";

// Hide the dealer's hole card until holeCardRevealed is true.
export function sanitizeState(gameState: GameState): GameState {
    if (gameState.dealerHand.holeCardRevealed) return gameState;
    return {
        ...gameState,
        dealerHand: {
            ...gameState.dealerHand,
            cards: gameState.dealerHand.cards.slice(0, 1),
        },
    };
}
